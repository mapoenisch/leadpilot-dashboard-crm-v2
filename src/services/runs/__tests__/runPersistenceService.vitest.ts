import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  persistCompletedRun,
  loadScenarioWorkspace,
  type RunBundle,
} from '../runPersistenceService';
import type { Scenario, ScenarioVersion, SimulationRun } from '@/types/scenario';
import type { SimulationEvent } from '@/types/simulation';
import type { TimeSeriesPoint } from '@/types/aggregation';

function bundle(): RunBundle {
  const scenario: Scenario = {
    id: 'scen-1',
    name: 'Szenario',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentVersionId: 'ver-1',
    isProtected: false,
  };
  const version: ScenarioVersion = {
    id: 'ver-1',
    scenarioId: 'scen-1',
    versionNumber: 1,
    parameters: {
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
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const run: SimulationRun = {
    runId: 'run-1',
    scenarioId: 'scen-1',
    scenarioVersionId: 'ver-1',
    seed: 777001,
    rngState: 777002,
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
      parameters: {
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
      },
      correlationId: 'corr-1',
    },
    correlationId: 'corr-1',
  };
  const events: SimulationEvent[] = [
    {
      id: 'e1',
      tick: 0,
      dayIndex: 0,
      simulatedDate: '2026-01-01',
      type: 'SYSTEM_INFO',
      title: 'Start',
      details: 'Los',
      timestamp: '2026-01-01T00:00:00.000Z',
    },
  ];
  const timeSeries: TimeSeriesPoint[] = [
    {
      tick: 0,
      dayIndex: 0,
      simulatedDate: '2026-01-01',
      metrics: { arr: 411840, mrr: 34320, customers: 66, wonDeals: 0 },
    },
  ];
  return { organizationId: 'org-a', scenario, version, run, events, timeSeries, snapshots: [] };
}

function makeClient() {
  const eq = vi.fn().mockResolvedValue({ data: [], error: null });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const rpc = vi.fn().mockResolvedValue({ data: 'run-1', error: null });
  return { rpc, from, select, eq };
}

describe('067F G49 runPersistenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mappt das Bundle auf den atomaren RPC und liefert die run_id', async () => {
    const client = makeClient();
    const runId = await persistCompletedRun(bundle(), client);
    expect(runId).toBe('run-1');
    expect(client.rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = client.rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(fn).toBe('persist_completed_run');
    expect(args.p_organization_id).toBe('org-a');
    expect(args.p_run).toMatchObject({ runId: 'run-1' });
    expect(args.p_events).toHaveLength(1);
    // Vollobjekt-Konvention: Event und Punkt liegen vollständig im Payload.
    const events = args.p_events as Array<Record<string, unknown>>;
    expect(events[0]?.payload).toMatchObject({ id: 'e1', title: 'Start' });
    const points = args.p_timeseries as Array<Record<string, unknown>>;
    expect(points).toHaveLength(1);
    expect(points[0]?.metrics).toMatchObject({ tick: 0, metrics: { arr: 411840 } });
  });

  it('RPC-Fehler werden nicht verschluckt (RPC_FAILED)', async () => {
    const client = makeClient();
    client.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(persistCompletedRun(bundle(), client)).rejects.toMatchObject({
      name: 'RunPersistenceError',
      code: 'RPC_FAILED',
    });
  });

  it('fehlende Organisation bricht vor jedem DB-Kontakt ab', async () => {
    const client = makeClient();
    const broken = bundle() as unknown as Record<string, unknown>;
    broken.organizationId = '';
    await expect(persistCompletedRun(broken as unknown as RunBundle, client)).rejects.toMatchObject(
      {
        code: 'INVALID_BUNDLE',
      },
    );
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('Mandanten-Mix zwischen Bundle und Manifest bricht ab', async () => {
    const client = makeClient();
    const mixed = bundle();
    mixed.organizationId = 'org-b';
    await expect(persistCompletedRun(mixed, client)).rejects.toMatchObject({
      code: 'INVALID_BUNDLE',
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('ohne konfigurierten Client fail-closed (NOT_CONFIGURED)', async () => {
    await expect(persistCompletedRun(bundle(), null)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
  });

  it('loadScenarioWorkspace filtert mandantengebunden und mappt Zeilen', async () => {
    const client = makeClient();
    client.eq
      .mockResolvedValueOnce({ data: [{ id: 'scen-1', name: 'Szenario' }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'ver-1', scenario_id: 'scen-1' }], error: null })
      .mockResolvedValueOnce({ data: [{ run_id: 'run-1', seed: 7 }], error: null })
      .mockResolvedValueOnce({
        data: [{ run_id: 'run-1', tick: 0, metrics: { tick: 0, metrics: { arr: 1 } } }],
        error: null,
      });
    const workspace = await loadScenarioWorkspace('org-a', client);
    expect(client.from).toHaveBeenCalledWith('simulation_timeseries');
    expect(client.eq).toHaveBeenCalledWith('organization_id', 'org-a');
    expect(workspace.scenarios).toHaveLength(1);
    expect(workspace.versions).toHaveLength(1);
    expect(workspace.runs).toHaveLength(1);
    // Zeitreihe hängt am Run (Aggregation nach Reload intakt).
    const firstRun = workspace.runs[0];
    expect(firstRun).toBeDefined();
    expect(firstRun?.timeSeries).toHaveLength(1);
  });

  it('Workspace-Fehler werden nicht verschluckt (WORKSPACE_FAILED)', async () => {
    const client = makeClient();
    client.eq.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(loadScenarioWorkspace('org-a', client)).rejects.toMatchObject({
      code: 'WORKSPACE_FAILED',
    });
  });
});
