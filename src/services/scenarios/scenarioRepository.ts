import type { Scenario, ScenarioVersion } from '@/types/scenario';
import { mapScenarioRow, mapVersionRow } from '../runs/runRepository';
import { resultData, type SupabaseLike } from '../runs/supabaseClientLike';

// 067F / G49 — Supabase-Repository für Szenario-Stammdaten (Reads für die
// Workspace-Hydrierung). Schreibpfade laufen ausschließlich über den
// atomaren Bundle-RPC in `runs/runRepository` (RLS Default-Deny für direkte
// Writes); hier gibt es keine INSERT/UPDATE/DELETE.

export async function loadScenarios(
  client: SupabaseLike,
  organizationId: string,
): Promise<Scenario[]> {
  const result = await client
    .from('simulation_scenarios')
    .select('*')
    .eq('organization_id', organizationId);
  const rows = resultData<Parameters<typeof mapScenarioRow>[0][]>(result, 'select scenarios');
  return rows.map(mapScenarioRow);
}

export async function loadVersions(
  client: SupabaseLike,
  organizationId: string,
): Promise<ScenarioVersion[]> {
  const result = await client
    .from('simulation_scenario_versions')
    .select('*')
    .eq('organization_id', organizationId);
  const rows = resultData<Parameters<typeof mapVersionRow>[0][]>(result, 'select versions');
  return rows.map(mapVersionRow);
}
