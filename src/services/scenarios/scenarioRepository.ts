import type { Scenario, ScenarioVersion } from '@/types/scenario';
import { mapScenarioRow, mapVersionRow } from '../runs/runRepository';
import type { SupabaseLike } from '../runs/supabaseClientLike';
import { fetchChunkedTable } from '@/services/db/supabasePagingHelper';

// 067F / G49 — Supabase-Repository für Szenario-Stammdaten (Reads für die
// Workspace-Hydrierung). Schreibpfade laufen ausschließlich über den
// atomaren Bundle-RPC in `runs/runRepository` (RLS Default-Deny für direkte
// Writes); hier gibt es keine INSERT/UPDATE/DELETE.

export async function loadScenarios(
  client: SupabaseLike,
  organizationId: string,
): Promise<Scenario[]> {
  try {
    const rows = await fetchChunkedTable<Parameters<typeof mapScenarioRow>[0]>(
      client,
      'simulation_scenarios',
      {
        filter: { column: 'organization_id', value: organizationId },
        orderColumn: 'created_at',
        ascending: true,
        tieBreakColumn: 'id',
      },
    );
    return rows.map(mapScenarioRow);
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : String(e);
    throw new Error(`select scenarios: ${msg}`);
  }
}

export async function loadVersions(
  client: SupabaseLike,
  organizationId: string,
): Promise<ScenarioVersion[]> {
  try {
    const rows = await fetchChunkedTable<Parameters<typeof mapVersionRow>[0]>(
      client,
      'simulation_scenario_versions',
      {
        filter: { column: 'organization_id', value: organizationId },
        orderColumn: 'created_at',
        ascending: true,
        tieBreakColumn: 'id',
      },
    );
    return rows.map(mapVersionRow);
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : String(e);
    throw new Error(`select versions: ${msg}`);
  }
}
