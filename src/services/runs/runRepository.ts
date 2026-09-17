import type { RunManifest, Scenario, ScenarioVersion, SimulationRun } from '@/types/scenario';
import type { SimulationEvent, SimulationEventType } from '@/types/simulation';
import type { TimeSeriesPoint } from '@/types/aggregation';
import type { SimulationSnapshot } from '@/types/snapshot';
import { resultData, type SupabaseLike } from './supabaseClientLike';

// 067F / G49 — Supabase-Repository für Run-Bundles. Jeder Schreibpfad läuft
// über den atomaren RPC `persist_completed_run` (alles oder nichts);
// direkte Tabellen-Inserts gibt es hier nicht (RLS Default-Deny).
// DB-Zeilen (snake_case) werden explizit auf Domänenobjekte abgebildet —
// niemals per Cast.

export interface RunBundlePayload {
  organizationId: string;
  scenario: Scenario;
  version: ScenarioVersion;
  run: SimulationRun;
  events: SimulationEvent[];
  timeSeries: TimeSeriesPoint[];
  snapshots: SimulationSnapshot[];
}

export async function saveRunBundle(
  client: SupabaseLike,
  bundle: RunBundlePayload,
): Promise<string> {
  // Vollobjekt-Konvention (Migration 20260925): Events tragen das komplette
  // Event als Payload, Zeitreihen den kompletten Punkt als `metrics` — die
  // Hydrierung stellt Runs damit inklusive Charts verlustfrei wieder her.
  const result = await client.rpc('persist_completed_run', {
    p_organization_id: bundle.organizationId,
    p_scenario: bundle.scenario,
    p_version: bundle.version,
    p_run: bundle.run,
    p_events: bundle.events.map((event) => ({
      tick: event.tick,
      eventType: event.type,
      title: event.title,
      payload: event,
    })),
    p_timeseries: bundle.timeSeries.map((point) => ({ tick: point.tick, metrics: point })),
    p_snapshots: bundle.snapshots,
  });
  const runId = resultData<string | null>(result, 'persist_completed_run');
  if (!runId) {
    throw new Error('persist_completed_run: leere run_id');
  }
  return runId;
}

interface ScenarioRow {
  id: string;
  name?: string;
  description?: string | null;
  status?: string;
  is_protected?: boolean;
  current_version_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface VersionRow {
  id: string;
  scenario_id?: string;
  version_number?: number;
  parameters?: ScenarioVersion['parameters'];
  description?: string | null;
  created_at?: string;
}

interface RunRow {
  run_id: string;
  scenario_id?: string;
  scenario_version_id?: string;
  seed?: number;
  status?: SimulationRun['status'];
  manifest?: Partial<RunManifest> | null;
  final_metrics?: SimulationRun['finalMetrics'] | null;
  final_state?: SimulationRun['finalState'] | null;
  rng_state?: number | null;
  started_at?: string;
  completed_at?: string | null;
  correlation_id?: string | null;
}

export function mapScenarioRow(row: ScenarioRow): Scenario {
  return {
    id: row.id,
    name: row.name ?? 'Unbenannt',
    description: row.description ?? undefined,
    status: (row.status as Scenario['status']) ?? 'ACTIVE',
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? row.created_at ?? '',
    currentVersionId: row.current_version_id ?? '',
    isProtected: row.is_protected ?? false,
  };
}

export function mapVersionRow(row: VersionRow): ScenarioVersion {
  return {
    id: row.id,
    scenarioId: row.scenario_id ?? '',
    versionNumber: row.version_number ?? 1,
    parameters: row.parameters ?? ({} as ScenarioVersion['parameters']),
    createdAt: row.created_at ?? '',
    description: row.description ?? undefined,
  };
}

export function mapRunRow(row: RunRow): SimulationRun {
  const manifest = (row.manifest ?? {}) as Partial<RunManifest>;
  return {
    runId: row.run_id,
    scenarioId: manifest.scenarioId ?? row.scenario_id ?? '',
    scenarioVersionId: manifest.scenarioVersionId ?? row.scenario_version_id ?? '',
    seed: row.seed ?? manifest.seed ?? 0,
    rngState: row.rng_state ?? manifest.initialRngState ?? row.seed ?? 0,
    modelVersion: manifest.modelVersion ?? '1.0.0-v1',
    schemaVersion: manifest.schemaVersion ?? '1.0.0',
    baselineVersion: manifest.baselineVersion ?? 'unknown',
    status: row.status ?? 'COMPLETED',
    startedAt: row.started_at ?? '',
    completedAt: row.completed_at ?? undefined,
    manifest: manifest as RunManifest,
    finalMetrics: row.final_metrics ?? undefined,
    finalState: row.final_state ?? undefined,
    correlationId: row.correlation_id ?? manifest.correlationId ?? '',
  };
}

interface TimeseriesRow {
  run_id?: string;
  tick?: number;
  metrics?: unknown;
}

interface EventRow {
  id?: number;
  run_id?: string;
  tick?: number;
  event_type?: string;
  title?: string | null;
  payload?: unknown;
}

interface SnapshotRow {
  snapshot_id?: string;
  run_id?: string;
  tick_id?: number;
  state?: unknown;
  projection?: unknown;
  created_at?: string;
}

/** Stellt ein Event aus der Vollobjekt-Konvention wieder her. */
export function mapEventRow(row: EventRow): SimulationEvent {
  const payload = row.payload as Partial<SimulationEvent> | null | undefined;
  if (payload && typeof payload === 'object' && typeof payload.id === 'string') {
    return payload as SimulationEvent;
  }
  return {
    id: `${row.run_id ?? 'run'}-tick-${row.tick ?? 0}`,
    tick: row.tick ?? 0,
    dayIndex: row.tick ?? 0,
    simulatedDate: '',
    type: (row.event_type as SimulationEventType) ?? 'SYSTEM_INFO',
    title: row.title ?? '',
    details: '',
    timestamp: '',
  };
}

/** Stellt einen Snapshot wieder her; Szenario-Kontext kommt aus dem Run. */
export function mapSnapshotRow(row: SnapshotRow, run: SimulationRun): SimulationSnapshot {
  const state = (row.state ?? {}) as SimulationSnapshot['state'];
  const projection = (row.projection ?? {}) as SimulationSnapshot['projection'];
  return {
    snapshotId: row.snapshot_id ?? `${run.runId}_tick_${row.tick_id ?? 0}`,
    runId: run.runId,
    scenarioId: run.scenarioId,
    scenarioVersionId: run.scenarioVersionId,
    tickId: row.tick_id ?? 0,
    simulationDay: 0,
    simulatedDate: '',
    modelVersion: run.modelVersion,
    schemaVersion: run.schemaVersion,
    baselineVersion: run.baselineVersion,
    organizationId: run.manifest.organizationId,
    state,
    projection,
    createdAt: row.created_at ?? '',
  };
}

/** Stellt einen Zeitreihenpunkt aus der Vollobjekt-Konvention wieder her. */
export function mapTimeseriesPoint(row: TimeseriesRow): TimeSeriesPoint {
  const metrics = row.metrics as Record<string, unknown> | null | undefined;
  if (
    metrics &&
    typeof metrics === 'object' &&
    typeof (metrics as { tick?: unknown }).tick === 'number' &&
    typeof (metrics as { metrics?: unknown }).metrics === 'object'
  ) {
    return metrics as unknown as TimeSeriesPoint;
  }
  return {
    tick: row.tick ?? 0,
    dayIndex: row.tick ?? 0,
    simulatedDate: '',
    metrics: (metrics as TimeSeriesPoint['metrics']) ?? {
      arr: 0,
      mrr: 0,
      customers: 0,
      wonDeals: 0,
    },
  };
}

async function selectByOrg<T>(
  client: SupabaseLike,
  table: string,
  organizationId: string,
): Promise<T[]> {
  const result = await client.from(table).select('*').eq('organization_id', organizationId);
  return resultData<T[]>(result, `select ${table}`);
}

export interface WorkspaceRows {
  scenarios: Scenario[];
  versions: ScenarioVersion[];
  runs: SimulationRun[];
  /** Domänen-Events besitzen keine runId — Gruppierung erfolgt beim Laden. */
  eventsByRun: Record<string, SimulationEvent[]>;
  snapshots: SimulationSnapshot[];
}

export async function loadWorkspaceRows(
  client: SupabaseLike,
  organizationId: string,
): Promise<WorkspaceRows> {
  const [scenarioRows, versionRows, runRows, timeseriesRows, eventRows, snapshotRows] =
    await Promise.all([
      selectByOrg<ScenarioRow>(client, 'simulation_scenarios', organizationId),
      selectByOrg<VersionRow>(client, 'simulation_scenario_versions', organizationId),
      selectByOrg<RunRow>(client, 'simulation_runs', organizationId),
      selectByOrg<TimeseriesRow>(client, 'simulation_timeseries', organizationId),
      selectByOrg<EventRow>(client, 'simulation_events', organizationId),
      selectByOrg<SnapshotRow>(client, 'simulation_snapshots', organizationId),
    ]);
  // Zeitreihen gehören zum Run (Aggregation/Charts nach Reload intakt).
  const pointsByRun = new Map<string, TimeSeriesPoint[]>();
  for (const row of timeseriesRows) {
    if (!row.run_id) continue;
    const list = pointsByRun.get(row.run_id) ?? [];
    list.push(mapTimeseriesPoint(row));
    pointsByRun.set(row.run_id, list);
  }
  const runs = runRows.map((row) => {
    const run = mapRunRow(row);
    const points = (pointsByRun.get(run.runId) ?? []).sort((a, b) => a.tick - b.tick);
    return points.length > 0 ? { ...run, timeSeries: points } : run;
  });
  const runsById = new Map(runs.map((run) => [run.runId, run]));
  const snapshots: SimulationSnapshot[] = [];
  for (const row of snapshotRows) {
    const run = row.run_id ? runsById.get(row.run_id) : undefined;
    if (run) snapshots.push(mapSnapshotRow(row, run));
  }
  const eventsByRun: Record<string, SimulationEvent[]> = {};
  for (const row of eventRows) {
    if (!row.run_id || !runsById.has(row.run_id)) continue;
    (eventsByRun[row.run_id] ??= []).push(mapEventRow(row));
  }
  return {
    scenarios: scenarioRows.map(mapScenarioRow),
    versions: versionRows.map(mapVersionRow),
    runs,
    eventsByRun,
    snapshots,
  };
}
