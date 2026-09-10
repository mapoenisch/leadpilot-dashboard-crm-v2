/**
 * LeadPilot Live-KPI Read Adapter (Gate G19 — Ebene C)
 *
 * Einzige zulässige Stelle im Frontend für den Lese- und Realtime-Zugriff auf
 * die sichere Projektionstabelle public.live_kpi_public_feed.
 *
 * Greift ausschließlich auf die Projektion zu, niemals auf interne Basistabellen.
 */

import { supabase } from '@/services/db/supabaseClient';

export type LiveKpiReadStatus = 'unconfigured' | 'loading' | 'live' | 'offline' | 'error';

export interface LiveKpiSnapshot {
  id: string;
  kpiId: string;
  value: number;
  unit: string;
  occurredAt: string;
  qualityStatus: 'valid' | 'degraded';
  sourceSystem: string;
  ingestedAt: string;
}

export interface LiveKpiSubscription {
  unsubscribe(): void;
}

/**
 * G34: Feinere Feed-Verbindung (nur für den Kanal, nicht für Komponenten —
 * `LiveKpiReadStatus` bleibt bytegleich, Mapping siehe Store).
 */
export type LiveKpiFeedConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

const BACKOFF_BASE_MS = 1000;
const BACKOFF_FACTOR = 2;
const BACKOFF_CAP_MS = 30_000;

/**
 * G34: Reine Delay-Funktion für Reconnect-Backoff (equal jitter).
 * attempt 0 → [500, 1000], Verdopplung bis Deckel [15000, 30000], nie über 30000.
 */
export function computeBackoffDelay(attempt: number): number {
  const capped = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * BACKOFF_FACTOR ** attempt);
  const half = capped / 2;
  return half + Math.random() * half;
}

/**
 * Wandelt eine Rohzeile aus public.live_kpi_public_feed in einen typisierten LiveKpiSnapshot um.
 */
function mapRowToSnapshot(row: unknown): LiveKpiSnapshot | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const record = row as Record<string, unknown>;
  const numValue = typeof record.value === 'number' ? record.value : parseFloat(String(record.value));
  if (isNaN(numValue)) {
    return null;
  }

  return {
    id: String(record.id || ''),
    kpiId: String(record.kpi_id || ''),
    value: numValue,
    unit: String(record.unit || ''),
    occurredAt: String(record.occurred_at || ''),
    qualityStatus: record.quality_status === 'degraded' ? 'degraded' : 'valid',
    sourceSystem: String(record.source_system || ''),
    ingestedAt: String(record.ingested_at || ''),
  };
}

export function isLiveKpiReadConfigured(): boolean {
  return Boolean(supabase);
}

/**
 * Liest den neuesten Live-KPI-Wert für eine gegebene kpiId aus public.live_kpi_public_feed.
 * Gibt nur bei unkonfiguriertem Supabase oder ohne vorhandene Zeile null zurück.
 * Wirft bei Datenbank- oder Netzwerkfehlern einen Error weiter.
 */
export async function fetchLatestLiveKpi(kpiId: string): Promise<LiveKpiSnapshot | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('live_kpi_public_feed')
    .select('id, kpi_id, value, unit, occurred_at, quality_status, source_system, ingested_at')
    .eq('kpi_id', kpiId)
    .order('occurred_at', { ascending: false })
    .order('ingested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`[LiveKpiReadAdapter] Failed to fetch live KPI "${kpiId}": ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapRowToSnapshot(data);
}

/**
 * Liest die Historienpunkte für eine gegebene kpiId aus public.live_kpi_public_feed
 * seit dem angegebenen Zeitstempel sinceIso, sortiert aufsteigend nach (occurred_at, ingested_at).
 * Begrenzt auf maximal 30 Punkte.
 * Gibt bei unkonfiguriertem Supabase ein leeres Array zurück.
 * Wirft bei ungültigem Limit oder Datenbank-/Netzwerkfehlern einen Error weiter.
 */
export async function fetchLiveKpiHistory(
  kpiId: string,
  sinceIso: string,
  limit: number,
): Promise<LiveKpiSnapshot[]> {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    throw new Error(`[LiveKpiReadAdapter] Invalid limit for fetchLiveKpiHistory: ${limit}`);
  }

  const effectiveLimit = Math.min(30, Math.max(1, Math.floor(limit)));

  if (!supabase) {
    return [];
  }

  // Absteigend sortieren, damit bei mehr als `effectiveLimit` Einträgen garantiert die neuesten Punkte geladen werden
  const { data, error } = await supabase
    .from('live_kpi_public_feed')
    .select('id, kpi_id, value, unit, occurred_at, quality_status, source_system, ingested_at')
    .eq('kpi_id', kpiId)
    .gte('occurred_at', sinceIso)
    .order('occurred_at', { ascending: false })
    .order('ingested_at', { ascending: false })
    .limit(effectiveLimit);

  if (error) {
    throw new Error(`[LiveKpiReadAdapter] Failed to fetch live KPI history for "${kpiId}": ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  const results: LiveKpiSnapshot[] = [];
  for (const row of data) {
    const snapshot = mapRowToSnapshot(row);
    if (snapshot) {
      results.push(snapshot);
    }
  }

  // Rückgabe chronologisch aufsteigend sortieren: (occurred_at ASC, ingested_at ASC)
  results.sort((a, b) => {
    const timeDiff = a.occurredAt.localeCompare(b.occurredAt);
    if (timeDiff !== 0) return timeDiff;
    return a.ingestedAt.localeCompare(b.ingestedAt);
  });

  return results;
}

/**
 * G34: Abonniert EINEN ungefilterten Realtime-Feed auf public.live_kpi_public_feed
 * (statt einem Kanal pro KPI). Jede Insert-Zeile wird via mapRowToSnapshot als
 * Event mit ihrer kpiId zugestellt; der Store verteilt client-seitig.
 *
 * Verbindungsablauf: 'connecting' beim Start → 'live' bei SUBSCRIBED.
 * Bei CHANNEL_ERROR/TIMED_OUT/unerwartetem CLOSED: Kanal abbauen,
 * 'reconnecting' melden, nach computeBackoffDelay(attempt) neu verbinden
 * (attempt steigt, Reset bei SUBSCRIBED). unsubscribe() bricht Timer ab und
 * entfernt den Kanal endgültig.
 */
export function subscribeToLiveKpiFeed(
  onEvent: (snapshot: LiveKpiSnapshot) => void,
  onConnectionStatus: (status: LiveKpiFeedConnectionState) => void,
): LiveKpiSubscription {
  if (!supabase) {
    onConnectionStatus('offline');
    return {
      unsubscribe() {
        // no-op wenn kein Supabase vorhanden
      },
    };
  }

  const client = supabase;
  const channelId = 'live-kpi-feed';
  let attempt = 0;
  let disposed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let currentChannel: Parameters<typeof client.removeChannel>[0] | null = null;

  function teardownChannel(): void {
    if (currentChannel) {
      try {
        client.removeChannel(currentChannel);
      } catch {
        // Stiller Fehler ist ok — Kanal ist ohnehin am Ende (G34-Nacharbeit).
      }
      currentChannel = null;
    }
  }

  function scheduleRetry(): void {
    if (disposed) return;
    teardownChannel();
    onConnectionStatus('reconnecting');
    const delay = computeBackoffDelay(attempt);
    attempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  }

  function connect(): void {
    if (disposed) return;
    if (attempt === 0) {
      onConnectionStatus('connecting');
    }
    currentChannel = client
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_kpi_public_feed',
        },
        (payload) => {
          if (payload && payload.new) {
            const snapshot = mapRowToSnapshot(payload.new);
            if (snapshot) {
              onEvent(snapshot);
            }
          }
        }
      )
      .subscribe((status) => {
        if (disposed) return;
        if (status === 'SUBSCRIBED') {
          attempt = 0;
          onConnectionStatus('live');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          scheduleRetry();
        } else if (status === 'CLOSED') {
          scheduleRetry();
        }
      });
  }

  connect();

  return {
    unsubscribe() {
      if (disposed) return;
      disposed = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      teardownChannel();
    },
  };
}
