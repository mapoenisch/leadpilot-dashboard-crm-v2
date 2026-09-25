import type { Scenario, ScenarioVersion, SimulationRun } from '@/types/scenario';
import type { SimulationEvent } from '@/types/simulation';
import type { TimeSeriesPoint } from '@/types/aggregation';
import type { SimulationSnapshot } from '@/types/snapshot';
import type { RunResumeSnapshot } from '@/types/runControl';
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

// ------------------------------------------------ 067Q / G63: Run-Steuerung
// Pausen-Snapshots und Steuerbefehle laufen ausschließlich über RPCs mit
// Rollen- und Mandantenprüfung in der Datenbank (Migration 20261001). Fehler
// propagieren fail-closed — kein stiller In-Memory-Fallback.

function requireClient(client?: SupabaseLike | null): SupabaseLike {
  const resolved = resolveClient(client);
  if (!resolved) {
    throw new RunPersistenceError(
      'NOT_CONFIGURED',
      'Supabase ist nicht konfiguriert — kein stiller In-Memory-Fallback.',
    );
  }
  return resolved;
}

async function callRpc(
  client: SupabaseLike,
  fn: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const result = await client.rpc(fn, args);
  if (result.error) throw new RunPersistenceError('RPC_FAILED', `${fn}: ${result.error.message}`);
  return result.data;
}

/** Speichert den versiegelten Zwischenstand eines pausierten Runs (Upsert). */
export async function persistRunPause(
  snapshot: RunResumeSnapshot,
  client?: SupabaseLike | null,
): Promise<void> {
  if (!isNonEmptyString(snapshot?.organizationId) || !isNonEmptyString(snapshot.runId)) {
    throw new RunPersistenceError('INVALID_BUNDLE', 'Pausen-Snapshot ohne Organisation oder Run.');
  }
  await callRpc(requireClient(client), 'save_run_pause', {
    p_organization_id: snapshot.organizationId,
    p_run_id: snapshot.runId,
    p_snapshot: snapshot,
    p_snapshot_hash: snapshot.snapshotHash,
  });
}

/** Verwirft einen gespeicherten Pausen-Snapshot (Abbruch). */
export async function discardRunPause(
  organizationId: string,
  runId: string,
  client?: SupabaseLike | null,
): Promise<boolean> {
  const data = await callRpc(requireClient(client), 'discard_run_pause', {
    p_organization_id: organizationId,
    p_run_id: runId,
  });
  return data === true;
}

export type RunControlAuditAction = 'resumed' | 'cancelled' | 'retried';

/** Protokolliert einen Steuerbefehl im Audit-Log (ohne PII). */
export async function recordRunControl(
  organizationId: string,
  runId: string,
  action: RunControlAuditAction,
  correlationId: string,
  client?: SupabaseLike | null,
): Promise<void> {
  await callRpc(requireClient(client), 'record_run_control', {
    p_organization_id: organizationId,
    p_run_id: runId,
    p_action: action,
    p_correlation_id: correlationId,
  });
}

/** Lädt die gespeicherten Pausen-Snapshots genau eines Mandanten (RLS). */
export async function loadRunPauses(
  organizationId: string,
  client?: SupabaseLike | null,
): Promise<RunResumeSnapshot[]> {
  if (!isNonEmptyString(organizationId)) {
    throw new RunPersistenceError('INVALID_BUNDLE', 'Pausen ohne organizationId.');
  }
  const result = await requireClient(client)
    .from('simulation_run_pauses')
    .select('snapshot')
    .eq('organization_id', organizationId);
  if (result.error) {
    throw new RunPersistenceError(
      'WORKSPACE_FAILED',
      `simulation_run_pauses: ${result.error.message}`,
    );
  }
  const rows = (result.data as Array<{ snapshot: RunResumeSnapshot }> | null) ?? [];
  return rows.map((row) => row.snapshot);
}
