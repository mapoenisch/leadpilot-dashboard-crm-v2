import type { Scenario, ScenarioVersion, SimulationRun } from '@/types/scenario';
import type { SimulationEvent } from '@/types/simulation';
import type { TimeSeriesPoint } from '@/types/aggregation';
import type { SimulationSnapshot } from '@/types/snapshot';
import { loadWorkspaceRows, saveRunBundle } from './runRepository';
import { resolveClient, type SupabaseLike } from './supabaseClientLike';

// 067F / G49 — Persistenz-Service für abgeschlossene Runs. Validiert das
// Bundle fail-closed vor jedem DB-Kontakt (Mandant vorhanden, kein
// Mandanten-Mix mit dem Manifest, IDs konsistent) und meldet jeden
// Persistenzfehler als `RunPersistenceError` — nichts wird verschluckt.

export interface RunBundle {
  organizationId: string;
  scenario: Scenario;
  version: ScenarioVersion;
  run: SimulationRun;
  events: SimulationEvent[];
  timeSeries: TimeSeriesPoint[];
  snapshots: SimulationSnapshot[];
}

export type RunPersistenceErrorCode =
  'NOT_CONFIGURED' | 'INVALID_BUNDLE' | 'RPC_FAILED' | 'WORKSPACE_FAILED';

export class RunPersistenceError extends Error {
  constructor(
    public code: RunPersistenceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RunPersistenceError';
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function assertValidBundle(bundle: RunBundle): void {
  if (!bundle || !isNonEmptyString(bundle.organizationId)) {
    throw new RunPersistenceError('INVALID_BUNDLE', 'Bundle ohne organizationId.');
  }
  if (!isNonEmptyString(bundle.scenario?.id) || !isNonEmptyString(bundle.version?.id)) {
    throw new RunPersistenceError('INVALID_BUNDLE', 'Bundle ohne Szenario-/Versions-Id.');
  }
  if (bundle.version.scenarioId !== bundle.scenario.id) {
    throw new RunPersistenceError('INVALID_BUNDLE', 'Version gehört nicht zum Szenario.');
  }
  if (!isNonEmptyString(bundle.run?.runId)) {
    throw new RunPersistenceError('INVALID_BUNDLE', 'Bundle ohne runId.');
  }
  if (bundle.run.scenarioVersionId !== bundle.version.id) {
    throw new RunPersistenceError('INVALID_BUNDLE', 'Run gehört nicht zur Version.');
  }
  const manifestOrg = bundle.run.manifest?.organizationId;
  if (!isNonEmptyString(manifestOrg) || manifestOrg !== bundle.organizationId) {
    throw new RunPersistenceError(
      'INVALID_BUNDLE',
      'Bundle-Mandant weicht vom Manifest-Mandanten ab.',
    );
  }
}

/** Speichert einen abgeschlossenen Run vollständig oder gar nicht (RPC). */
export async function persistCompletedRun(
  bundle: RunBundle,
  client?: SupabaseLike | null,
): Promise<string> {
  assertValidBundle(bundle);
  const resolved = resolveClient(client);
  if (!resolved) {
    throw new RunPersistenceError(
      'NOT_CONFIGURED',
      'Supabase ist nicht konfiguriert — kein stiller In-Memory-Fallback.',
    );
  }
  try {
    return await saveRunBundle(resolved, bundle);
  } catch (e) {
    if (e instanceof RunPersistenceError) throw e;
    throw new RunPersistenceError(
      'RPC_FAILED',
      e instanceof Error ? e.message : 'Unbekannter Persistenzfehler.',
    );
  }
}

export interface ScenarioWorkspace {
  scenarios: Scenario[];
  versions: ScenarioVersion[];
  runs: SimulationRun[];
  eventsByRun: Record<string, SimulationEvent[]>;
  snapshots: SimulationSnapshot[];
}

/** Lädt Szenarien, Versionen und Runs genau eines Mandanten. */
export async function loadScenarioWorkspace(
  organizationId: string,
  client?: SupabaseLike | null,
): Promise<ScenarioWorkspace> {
  if (!isNonEmptyString(organizationId)) {
    throw new RunPersistenceError('INVALID_BUNDLE', 'Workspace ohne organizationId.');
  }
  const resolved = resolveClient(client);
  if (!resolved) {
    throw new RunPersistenceError(
      'NOT_CONFIGURED',
      'Supabase ist nicht konfiguriert — kein stiller In-Memory-Fallback.',
    );
  }
  try {
    return await loadWorkspaceRows(resolved, organizationId);
  } catch (e) {
    if (e instanceof RunPersistenceError) throw e;
    throw new RunPersistenceError(
      'WORKSPACE_FAILED',
      e instanceof Error ? e.message : 'Unbekannter Ladefehler.',
    );
  }
}
