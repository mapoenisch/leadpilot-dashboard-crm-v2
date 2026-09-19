// Charakterisierung: runRepository (reine Mapper + RPC-/Lade-Pfade über Stub-Client).
import { describe, it, expect, vi } from 'vitest';
import {
  saveRunBundle,
  loadWorkspaceRows,
  mapScenarioRow,
  mapVersionRow,
  mapRunRow,
  mapEventRow,
  mapTimeseriesPoint,
  mapSnapshotRow,
  type RunBundlePayload,
} from '../runRepository';
import type { SupabaseLike } from '../supabaseClientLike';
import type { Scenario, ScenarioVersion, SimulationRun } from '@/types/scenario';
import type { SimulationEvent } from '@/types/simulation';
import type { TimeSeriesPoint } from '@/types/aggregation';

const parameters = {
  marketingBudgetYearly: 65000,
  channelMix: { linkedIn: 38, seo: 22, partner: 18, webinar: 12, outbound: 10 },
  trialToPaidConversion: 18,
  salesRepCount: 2,
  csRepCount: 2,
  churnRateMonthly: 2.8,
  salesCycleDays: 38,
  targetPackageFocus: 'Balanced',
  winProbabilityMultiplier: 1,
  discountPercent: 0,
} as const;

function scenario(): Scenario {
  return {
    id: 'scen-1',
    name: 'Szenario',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentVersionId: 'ver-1',
    isProtected: false,
  };
}

function version(): ScenarioVersion {
  return {
    id: 'ver-1',
    scenarioId: 'scen-1',
    versionNumber: 1,
    parameters: { ...parameters },
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function run(): SimulationRun {
  return {
    runId: 'run-1',
    scenarioId: 'scen-1',
    scenarioVersionId: 'ver-1',
    seed: 777001,
    rngState: 777001,
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: 'baseline-x',
    status: 'COMPLETED',
    startedAt: '2026-01-01T00:00:00.000Z',
    manifest: {
      runId: 'run-1',
      scenarioId: 'scen-1',
      scenarioVersionId: 'ver-1',
      seed: 777001,
      initialRngState: 777001,
      modelVersion: '1.0.0-v1',
      schemaVersion: '1.0.0',
      baselineVersion: 'baseline-x',
      baselineId: 'baseline-x',
      baselineHash: 'h'.repeat(64),
      organizationId: 'org-a',
      dataSourceId: 'simulated-crm',
      createdAt: '2026-01-01T00:00:00.000Z',
      simulationStartDate: '2026-01-01',
      targetTicks: 2,
      parameters: { ...parameters },
      correlationId: 'corr-1',
    },
    correlationId: 'corr-1',
  };
}

function bundle(): RunBundlePayload {
  const event: SimulationEvent = {
    id: 'e1',
    tick: 0,
    dayIndex: 0,
    simulatedDate: '2026-01-01',
    type: 'SYSTEM_INFO',
    title: 'Start',
    details: 'Los',
    timestamp: '2026-01-01T00:00:00.000Z',
  };
  const point: TimeSeriesPoint = {
    tick: 0,
    dayIndex: 0,
    simulatedDate: '2026-01-01',
    metrics: { arr: 100, mrr: 10, customers: 5, wonDeals: 1 },
  };
  return {
    organizationId: 'org-a',
    scenario: scenario(),
    version: version(),
    run: run(),
    events: [event],
    timeSeries: [point],
    snapshots: [],
  };
}

function stubClient(tables: Record<string, unknown[]> = {}, rpcData: unknown = 'run-1') {
  const rpc = vi.fn().mockResolvedValue({ data: rpcData, error: null });
  const eq = vi
    .fn()
    .mockImplementation((_col: string, _val: unknown, table: string) =>
      Promise.resolve({ data: tables[table] ?? [], error: null }),
    );
  const from = vi.fn().mockImplementation((table: string) => ({
    select: vi.fn().mockReturnValue({ eq: (c: string, v: unknown) => eq(c, v, table) }),
  }));
  return { rpc, eq, from } as unknown as SupabaseLike & {
    rpc: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
  };
}

describe('runRepository Mapper', () => {
  it('mapScenarioRow füllt Defaults bei kargen Zeilen', () => {
    expect(mapScenarioRow({ id: 's' })).toMatchObject({
      id: 's',
      name: 'Unbenannt',
      status: 'ACTIVE',
      isProtected: false,
    });
    expect(
      mapScenarioRow({
        id: 's',
        name: 'N',
        description: null,
        status: 'ARCHIVED',
        is_protected: true,
        current_version_id: 'v',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      }),
    ).toMatchObject({ name: 'N', status: 'ARCHIVED', isProtected: true, currentVersionId: 'v' });
  });

  it('mapVersionRow defaultet Version/Parameter', () => {
    expect(mapVersionRow({ id: 'v' })).toMatchObject({ scenarioId: '', versionNumber: 1 });
    expect(mapVersionRow({ id: 'v' }).parameters).toEqual({});
  });

  it('mapRunRow bevorzugt Manifest-Werte, fällt auf Zeilen zurück', () => {
    const mapped = mapRunRow({ run_id: 'run-1', seed: 5, manifest: { scenarioId: 'a' } as never });
    expect(mapped.scenarioId).toBe('a');
    expect(mapped.seed).toBe(5);
    expect(mapped.modelVersion).toBe('1.0.0-v1');
    const bare = mapRunRow({ run_id: 'r', status: 'FAILED' });
    expect(bare.status).toBe('FAILED');
    expect(bare.correlationId).toBe('');
  });

  it('mapEventRow stellt Vollobjekt-Payloads wieder her, sonst Fallback', () => {
    const full = mapEventRow({ payload: { id: 'e9', tick: 3, type: 'X', title: 'T' } });
    expect(full.id).toBe('e9');
    const fallback = mapEventRow({ run_id: 'run-1', tick: 4, event_type: 'LEAD_WON', title: 'T' });
    expect(fallback).toMatchObject({ id: 'run-1-tick-4', tick: 4, title: 'T' });
    expect(mapEventRow({}).tick).toBe(0);
  });

  it('mapTimeseriesPoint erkennt Vollobjekt-metrics, sonst Fallback', () => {
    const full = { tick: 7, dayIndex: 7, simulatedDate: 'd', metrics: { arr: 1 } };
    expect(mapTimeseriesPoint({ metrics: full })).toEqual(full);
    const fallback = mapTimeseriesPoint({ tick: 2 });
    expect(fallback.tick).toBe(2);
    expect(fallback.metrics.customers).toBe(0);
  });

  it('mapSnapshotRow baut IDs und Kontext aus dem Run', () => {
    const snap = mapSnapshotRow(
      { tick_id: 3, state: {}, projection: { simulationDay: 3, simulatedDate: '2026-01-04' } },
      run(),
    );
    expect(snap.snapshotId).toBe('run-1_tick_3');
    expect(snap.runId).toBe('run-1');
    expect(snap.simulationDay).toBe(3);
    expect(snap.organizationId).toBe('org-a');
  });
});

describe('runRepository saveRunBundle', () => {
  it('Happy-Path: RPC-Argumente folgen der Vollobjekt-Konvention', async () => {
    const client = stubClient();
    const runId = await saveRunBundle(client, bundle());
    expect(runId).toBe('run-1');
    const [, args] = (client.rpc as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(args.p_organization_id).toBe('org-a');
    const events = args.p_events as Array<Record<string, unknown>>;
    expect(events[0]).toMatchObject({ tick: 0, eventType: 'SYSTEM_INFO', title: 'Start' });
    expect(events[0]?.payload).toMatchObject({ id: 'e1' });
    const points = args.p_timeseries as Array<Record<string, unknown>>;
    expect(points[0]).toMatchObject({ tick: 0 });
    expect(points[0]?.metrics).toMatchObject({ tick: 0 });
  });

  it('leere run_id wirft statt still zu speichern', async () => {
    await expect(saveRunBundle(stubClient({}, null), bundle())).rejects.toThrow(
      'persist_completed_run: leere run_id',
    );
  });

  it('RPC-Fehler werden nicht verschluckt', async () => {
    const client = stubClient();
    (client.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    });
    await expect(saveRunBundle(client, bundle())).rejects.toThrow('persist_completed_run: boom');
  });
});

describe('runRepository loadWorkspaceRows', () => {
  it('gruppiert Events/Snapshots, hängt Zeitreihen sortiert an Runs', async () => {
    const client = stubClient({
      simulation_scenarios: [{ id: 'scen-1', name: 'S' }],
      simulation_scenario_versions: [{ id: 'ver-1', scenario_id: 'scen-1' }],
      simulation_runs: [{ run_id: 'run-1', seed: 1, manifest: { organizationId: 'org-a' } }],
      simulation_timeseries: [
        { run_id: 'run-1', tick: 1, metrics: { tick: 1, metrics: { arr: 2 } } },
        { run_id: 'run-1', tick: 0, metrics: { tick: 0, metrics: { arr: 1 } } },
      ],
      simulation_events: [
        { run_id: 'run-1', tick: 0, payload: { id: 'e1', tick: 0, title: 'A' } },
        { run_id: 'fremd', tick: 0, title: 'Orphan' },
      ],
      simulation_snapshots: [
        { snapshot_id: 's1', run_id: 'run-1', tick_id: 0, state: {}, projection: {} },
        { snapshot_id: 'orphan', run_id: 'fremd', tick_id: 0, state: {}, projection: {} },
      ],
    });
    const ws = await loadWorkspaceRows(client, 'org-a');
    expect(ws.scenarios).toHaveLength(1);
    expect(ws.runs).toHaveLength(1);
    expect(ws.runs[0]?.timeSeries?.map((p) => p.tick)).toEqual([0, 1]);
    expect(ws.eventsByRun['run-1']).toHaveLength(1);
    expect(ws.eventsByRun['fremd']).toBeUndefined();
    expect(ws.snapshots).toHaveLength(1);
  });

  it('leere Tabellen liefern leere Workspace-Struktur', async () => {
    const ws = await loadWorkspaceRows(stubClient(), 'org-a');
    expect(ws).toEqual({ scenarios: [], versions: [], runs: [], eventsByRun: {}, snapshots: [] });
  });
});
