// G62 (Auftrag 067P, Step 3b, Nacharbeit P1): System-Health-Service — prueft 5
// Subsysteme ohne Secrets/PII. Der Sync-Check belegt die letzte Synchronisation
// anhand des juengsten Kontakt-Imports (nicht nur Bestand) und bewertet Frische.
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { classifyFreshness, formatDataAge } from '@/services/data/sourceFreshness';

// ---------------------------------------------------------------- Typen
export type HealthStatus = 'ok' | 'degraded' | 'error' | 'unknown';

export interface SubsystemHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number | null;
  message: string;
  checkedAt: string;
}

export interface SystemHealthSnapshot {
  overallStatus: HealthStatus;
  subsystems: Record<string, SubsystemHealth>;
  snapshotAt: string;
}

export type HealthServiceErrorCode = 'NOT_CONFIGURED' | 'UNKNOWN';

export class HealthServiceError extends Error {
  constructor(
    public readonly code: HealthServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HealthServiceError';
  }
}

// ---------------------------------------------------------------- Hilfsfunktionen
function nowIso(): string {
  return new Date().toISOString();
}

function buildSubsystem(
  name: string,
  status: HealthStatus,
  latencyMs: number | null,
  message: string,
): SubsystemHealth {
  return { name, status, latencyMs, message, checkedAt: nowIso() };
}

function deriveOverall(subsystems: Record<string, SubsystemHealth>): HealthStatus {
  const statuses = Object.values(subsystems).map((s) => s.status);
  if (statuses.some((s) => s === 'error')) return 'error';
  if (statuses.some((s) => s === 'degraded')) return 'degraded';
  if (statuses.every((s) => s === 'ok')) return 'ok';
  return 'unknown';
}

// ---------------------------------------------------------------- Subsystem-Checks
async function checkAuth(): Promise<SubsystemHealth> {
  const t0 = Date.now();
  try {
    if (!isSupabaseConfigured || !supabase) {
      return buildSubsystem('auth', 'error', null, 'Supabase nicht konfiguriert.');
    }
    const { data, error } = await supabase.auth.getSession();
    const latency = Date.now() - t0;
    if (error) {
      return buildSubsystem('auth', 'error', latency, 'Auth-Session-Fehler.');
    }
    const hasSession = !!data.session;
    return buildSubsystem(
      'auth',
      hasSession ? 'ok' : 'degraded',
      latency,
      hasSession ? 'Aktive Session vorhanden.' : 'Keine aktive Session.',
    );
  } catch {
    return buildSubsystem('auth', 'error', Date.now() - t0, 'Auth-Check fehlgeschlagen.');
  }
}

async function checkDatabase(): Promise<SubsystemHealth> {
  const t0 = Date.now();
  try {
    if (!isSupabaseConfigured || !supabase) {
      return buildSubsystem('database', 'error', null, 'Supabase nicht konfiguriert.');
    }
    const { error } = await supabase
      .from('organizations')
      .select('id', { count: 'exact', head: true });
    const latency = Date.now() - t0;
    if (error) {
      return buildSubsystem(
        'database',
        'degraded',
        latency,
        'Datenbank-Lesezugriff fehlgeschlagen.',
      );
    }
    return buildSubsystem('database', 'ok', latency, 'Datenbankverbindung aktiv.');
  } catch {
    return buildSubsystem(
      'database',
      'error',
      Date.now() - t0,
      'Datenbankverbindung fehlgeschlagen.',
    );
  }
}

async function checkIngress(): Promise<SubsystemHealth> {
  const t0 = Date.now();
  try {
    if (!isSupabaseConfigured || !supabase) {
      return buildSubsystem('ingress', 'error', null, 'Supabase nicht konfiguriert.');
    }
    const { count, error } = await supabase
      .from('ingress_nonces')
      .select('*', { count: 'exact', head: true });
    const latency = Date.now() - t0;
    if (error) {
      return buildSubsystem('ingress', 'degraded', latency, 'Ingress-Tabelle nicht erreichbar.');
    }
    const nonces = count ?? 0;
    return buildSubsystem(
      'ingress',
      'ok',
      latency,
      `Ingress-Nonce-Store erreichbar (${nonces} Eintraege).`,
    );
  } catch {
    return buildSubsystem('ingress', 'error', Date.now() - t0, 'Ingress-Check fehlgeschlagen.');
  }
}

async function checkSync(): Promise<SubsystemHealth> {
  const t0 = Date.now();
  try {
    if (!isSupabaseConfigured || !supabase) {
      return buildSubsystem('sync', 'error', null, 'Supabase nicht konfiguriert.');
    }
    // Letzte Synchronisation = juengster Kontakt-Import (RLS grenzt auf eigene Org ein).
    // Ein reiner Bestand ohne Zeitbezug belegt weder Erfolg noch Aktualitaet eines Syncs.
    const { data, error, count } = await supabase
      .from('contacts')
      .select('created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(1);
    const latency = Date.now() - t0;
    if (error) {
      return buildSubsystem('sync', 'degraded', latency, 'CRM-Sync-Lesezugriff fehlgeschlagen.');
    }
    const rows = count ?? 0;
    const latest = data?.[0]?.created_at ?? null;
    if (rows === 0 || !latest) {
      return buildSubsystem('sync', 'degraded', latency, 'Noch kein CRM-Import vorhanden.');
    }
    const now = Date.now();
    const age = formatDataAge(latest, now);
    if (classifyFreshness(latest, now) === 'fresh') {
      return buildSubsystem(
        'sync',
        'ok',
        latency,
        `CRM-Sync aktiv (Bestand: ${rows}, letzter Sync ${age}).`,
      );
    }
    return buildSubsystem(
      'sync',
      'degraded',
      latency,
      `Letzter CRM-Sync ${age} (Bestand: ${rows}).`,
    );
  } catch {
    return buildSubsystem('sync', 'error', Date.now() - t0, 'Sync-Check fehlgeschlagen.');
  }
}

function checkWorker(): SubsystemHealth {
  const t0 = Date.now();
  try {
    const supported = typeof Worker !== 'undefined';
    const latency = Date.now() - t0;
    return buildSubsystem(
      'worker',
      supported ? 'ok' : 'error',
      latency,
      supported ? 'Web-Worker-API verfuegbar.' : 'Web-Worker-API nicht unterstuetzt.',
    );
  } catch {
    return buildSubsystem('worker', 'error', Date.now() - t0, 'Worker-Check fehlgeschlagen.');
  }
}

// ---------------------------------------------------------------- Haupt-Export
export async function getSystemHealth(): Promise<SystemHealthSnapshot> {
  if (!isSupabaseConfigured) {
    const msg = 'Supabase nicht konfiguriert.';
    const sub = (name: string): SubsystemHealth => buildSubsystem(name, 'error', null, msg);
    const subsystems = {
      auth: sub('auth'),
      database: sub('database'),
      ingress: sub('ingress'),
      sync: sub('sync'),
      worker: checkWorker(),
    };
    return { overallStatus: 'error', subsystems, snapshotAt: nowIso() };
  }

  const [auth, database, ingress, sync] = await Promise.all([
    checkAuth(),
    checkDatabase(),
    checkIngress(),
    checkSync(),
  ]);
  const worker = checkWorker();

  const subsystems = { auth, database, ingress, sync, worker };
  return {
    overallStatus: deriveOverall(subsystems),
    subsystems,
    snapshotAt: nowIso(),
  };
}

export const systemHealthService = { getSystemHealth };
