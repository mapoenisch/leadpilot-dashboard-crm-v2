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
 * Wandelt eine Rohzeile aus public.live_kpi_public_feed in einen typisierten LiveKpiSnapshot um.
 */
function mapRowToSnapshot(row: any): LiveKpiSnapshot | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const numValue = typeof row.value === 'number' ? row.value : parseFloat(String(row.value));
  if (isNaN(numValue)) {
    return null;
  }

  return {
    id: String(row.id || ''),
    kpiId: String(row.kpi_id || ''),
    value: numValue,
    unit: String(row.unit || ''),
    occurredAt: String(row.occurred_at || ''),
    qualityStatus: row.quality_status === 'degraded' ? 'degraded' : 'valid',
    sourceSystem: String(row.source_system || ''),
    ingestedAt: String(row.ingested_at || ''),
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
 * Abonniert Realtime-INSERTs auf public.live_kpi_public_feed für die gewünschte kpiId.
 * Liefert ein Subscription-Objekt mit einer deterministischen unsubscribe()-Methode.
 */
export function subscribeToLiveKpi(
  kpiId: string,
  onEvent: (snapshot: LiveKpiSnapshot) => void,
  onConnectionStatus: (status: 'subscribed' | 'offline' | 'error') => void,
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
  const channelId = `live-kpi-${kpiId}-${Math.random().toString(36).substring(2, 9)}`;
  const channel = client
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_kpi_public_feed',
        filter: `kpi_id=eq.${kpiId}`,
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
      if (status === 'SUBSCRIBED') {
        onConnectionStatus('subscribed');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onConnectionStatus('error');
      } else if (status === 'CLOSED') {
        onConnectionStatus('offline');
      }
    });

  let unsubscribed = false;

  return {
    unsubscribe() {
      if (unsubscribed) return;
      unsubscribed = true;
      try {
        client.removeChannel(channel);
      } catch (err) {
        console.warn(`[LiveKpiReadAdapter] Error removing channel "${channelId}":`, err);
      }
    },
  };
}
