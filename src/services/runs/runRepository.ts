import type { RunManifest, Scenario, ScenarioVersion, SimulationRun } from '@/types/scenario';
import type { SimulationEvent } from '@/types/simulation';
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
  const result = await client.rpc('persist_completed_run', {
    p_organization_id: bundle.organizationId,
    p_scenario: bundle.scenario,
    p_version: bundle.version,
    p_run: bundle.run,
    p_events: bundle.events,
    p_timeseries: bundle.timeSeries,
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
    correlationId: row.correlation_id ?? manifest.correlationId ?? '',
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
}

export async function loadWorkspaceRows(
  client: SupabaseLike,
  organizationId: string,
): Promise<WorkspaceRows> {
  const [scenarioRows, versionRows, runRows] = await Promise.all([
    selectByOrg<ScenarioRow>(client, 'simulation_scenarios', organizationId),
    selectByOrg<VersionRow>(client, 'simulation_scenario_versions', organizationId),
    selectByOrg<RunRow>(client, 'simulation_runs', organizationId),
  ]);
  return {
    scenarios: scenarioRows.map(mapScenarioRow),
    versions: versionRows.map(mapVersionRow),
    runs: runRows.map(mapRunRow),
  };
}
