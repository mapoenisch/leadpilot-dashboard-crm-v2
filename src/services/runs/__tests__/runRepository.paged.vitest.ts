import { describe, it, expect, vi } from 'vitest';
import { loadWorkspaceRows } from '../runRepository';
import { loadScenarios, loadVersions } from '../../scenarios/scenarioRepository';
import type { SupabaseLike } from '../supabaseClientLike';

describe('runRepository & scenarioRepository - Paginierung und Vollbestandsabruf (Auftrag 156)', () => {
  function createPagedClientMock(totalRows: number, orgId = 'org_test') {
    const scenarios = Array.from({ length: totalRows }, (_, i) => ({
      id: `scen_${i + 1}`,
      name: `Scenario ${i + 1}`,
      organization_id: orgId,
      status: 'ACTIVE',
      is_protected: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }));

    const versions = Array.from({ length: totalRows }, (_, i) => ({
      id: `ver_${i + 1}`,
      scenario_id: `scen_${i + 1}`,
      organization_id: orgId,
      version_number: 1,
      parameters: {},
      created_at: '2026-01-01T00:00:00Z',
    }));

    const runs = Array.from({ length: totalRows }, (_, i) => ({
      run_id: `run_${i + 1}`,
      organization_id: orgId,
      scenario_id: `scen_${i + 1}`,
      version_id: `ver_${i + 1}`,
      seed: 42,
      run_date: '2026-01-01T00:00:00Z',
      status: 'SUCCESS',
      created_at: '2026-01-01T00:00:00Z',
    }));

    const events = Array.from({ length: totalRows }, (_, i) => ({
      id: i + 1,
      organization_id: orgId,
      run_id: `run_1`,
      event_type: 'LEAD_QUALIFIED',
      simulated_date: '2026-01-02T00:00:00Z',
      payload: {},
    }));

    const points = Array.from({ length: totalRows }, (_, i) => ({
      run_id: `run_1`,
      tick: i,
      organization_id: orgId,
      simulated_date: '2026-01-02T00:00:00Z',
      metrics: { arr: 1000, mrr: 100, customers: 5, wonDeals: 2 },
    }));

    const snapshots = Array.from({ length: totalRows }, (_, i) => ({
      snapshot_id: `snap_${i + 1}`,
      organization_id: orgId,
      run_id: `run_1`,
      tick_id: i,
      created_at: '2026-01-01T00:00:00Z',
      state: {},
    }));

    const tableMap: Record<string, Record<string, unknown>[]> = {
      simulation_scenarios: scenarios,
      simulation_scenario_versions: versions,
      simulation_runs: runs,
      simulation_events: events,
      simulation_timeseries: points,
      simulation_snapshots: snapshots,
    };

    const fromMock = vi.fn((table: string) => {
      let filtered = [...(tableMap[table] ?? [])];
      let rangeBounds: { from: number; to: number } | null = null;
      let orderError: Error | null = null;

      const builder = {
        select: vi.fn(() => builder),
        order: vi.fn((col: string) => {
          const sampleRow = (tableMap[table] ?? [])[0];
          if (sampleRow && !(col in sampleRow)) {
            orderError = new Error(`column "${col}" does not exist on table "${table}"`);
          }
          return builder;
        }),
        eq: vi.fn((col: string, val: unknown) => {
          filtered = filtered.filter((row: Record<string, unknown>) => row[col] === val);
          return builder;
        }),
        range: vi.fn((from: number, to: number) => {
          rangeBounds = { from, to };
          return builder;
        }),
        then: async (
          resolve: (val: { data: unknown[]; error: unknown }) => void,
          reject?: (err: unknown) => void,
        ) => {
          if (orderError) {
            if (reject) {
              reject(orderError);
            } else {
              resolve({ data: null as unknown as unknown[], error: orderError });
            }
            return;
          }
          if (rangeBounds) {
            const chunk = filtered.slice(rangeBounds.from, rangeBounds.to + 1);
            resolve({ data: chunk.slice(0, 1000), error: null });
          } else {
            // PostgREST max_rows = 1000 ohne .range()
            resolve({ data: filtered.slice(0, 1000), error: null });
          }
        },
      };

      return builder;
    });

    return {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: fromMock,
    } as unknown as SupabaseLike;
  }

  it('ROT-NACHWEIS: loadScenarios lädt bei 1.500 Einträgen alle Zeilen', async () => {
    const client = createPagedClientMock(1500);
    const scenarios = await loadScenarios(client, 'org_test');
    expect(scenarios).toHaveLength(1500);
  });

  it('ROT-NACHWEIS: loadVersions lädt bei 1.500 Einträgen alle Zeilen', async () => {
    const client = createPagedClientMock(1500);
    const versions = await loadVersions(client, 'org_test');
    expect(versions).toHaveLength(1500);
  });

  it('ROT-NACHWEIS: loadWorkspaceRows lädt bei 1.500 Events und Points alle Zeilen', async () => {
    const client = createPagedClientMock(1500);
    const workspace = await loadWorkspaceRows(client, 'org_test');
    expect(workspace.runs).toHaveLength(1500);
    expect(workspace.eventsByRun['run_1']).toHaveLength(1500);
    expect(workspace.snapshots).toHaveLength(1500);
  });
});
