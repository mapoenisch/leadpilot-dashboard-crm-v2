// Branch2-Tests: scenarioRunExecutor Fehler- und Rekonstruktionspfade.
// Es existierte keine Executor-direkte Suite (nur Service-/Integrity-Läufe):
// hier ausschließlich runScenarioVersionWith über Stub-Repository
// (getVersion/getScenario/getRunsByScenario/saveRun/saveSnapshots/saveEvents),
// BaselineSnapshotService als In-Memory-Heimat sowie gemockter
// Server-Persistenz (persistCompletedRun) — KEINE echten Netz-/DB-Aufrufe.
// Abgedeckt: NOT_FOUND (Version), VALIDATION_ERROR, MAX_RUNS_EXCEEDED,
// seedOverride, UNKNOWN_SOURCE, Baseline-Rekonstruktion (direkt + file-Präfix),
// ORG_MISMATCH, BASELINE_HASH_MISMATCH (falsch/korrekt), Worker-Pfad via
// runTicksInWorker-Stub (inkl. metriklosem State und persistToServer),
// Snapshot-Dedup (gesehene Snapshots werden nicht erneut gespeichert),
// prune-Pfad mit Snapshot-Repo, onProgress sowie Default-targetTicks.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../../services/runs/runPersistenceService', () => ({
  persistCompletedRun: vi.fn(async () => undefined),
}));

import { runScenarioVersionWith } from '../../scenarioRunExecutor';
import type { TickRunResult } from '../../scenarioTickRunner';
import { ScenarioRepository, DEFAULT_BASE_2026_PARAMETERS } from '../../scenarioRepository';
import { BaselineSnapshotService } from '../../../services/data/baselineSnapshotService';
import { dataSourceRegistry, simulatedCrmSource } from '../../../services/data';
import { BASELINE_PERIOD_START } from '../../constants';
import { systemContext } from '../../systemContext';
import { persistCompletedRun } from '../../../services/runs/runPersistenceService';
import { ScenarioError, type ScenarioVersion } from '../../../types/scenario';

const persistMock = persistCompletedRun as unknown as ReturnType<typeof vi.fn>;

function versionFixture(id: string, scenarioId: string): ScenarioVersion {
  return {
    id,
    scenarioId,
    versionNumber: 1,
    parameters: JSON.parse(JSON.stringify(DEFAULT_BASE_2026_PARAMETERS)),
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function scenarioFixture(id: string) {
  return { id, name: `Szenario ${id}`, status: 'ACTIVE', currentVersionId: 'v-x' };
}

interface CtxOverrides {
  version?: ScenarioVersion | null;
  scenario?: unknown;
  runsByScenario?: unknown[];
  snapshotRepo?: unknown;
}

function stubCtx(overrides: CtxOverrides = {}) {
  const version =
    overrides.version === undefined ? versionFixture('v-b2', 's-b2') : overrides.version;
  const scenario = overrides.scenario === undefined ? scenarioFixture('s-b2') : overrides.scenario;
  const repo = {
    getVersion: vi.fn(() => version),
    getScenario: vi.fn(() => scenario),
    getRunsByScenario: vi.fn(() => overrides.runsByScenario ?? []),
    saveRun: vi.fn(),
    saveSnapshots: vi.fn(),
    saveEvents: vi.fn(),
  };
  return {
    repo: repo as unknown as ScenarioRepository,
    fns: repo,
    getSnapshotRepo: () => overrides.snapshotRepo as never,
    runTicksInWorker: vi.fn(async (): Promise<TickRunResult> => {
      throw new Error('runTicksInWorker darf in node nicht laufen');
    }),
  };
}

describe('scenarioRunExecutor.branch2', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    persistMock.mockClear();
    BaselineSnapshotService.clear();
    systemContext.__resetForTest();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    systemContext.__resetForTest();
    vi.restoreAllMocks();
  });

  it('NOT_FOUND bei unbekannter Version', async () => {
    const ctx = stubCtx({ version: null });
    await expect(
      runScenarioVersionWith(ctx, 'fehlt', 7, 1, { persist: false }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    } satisfies { code: string });
  });

  it('VALIDATION_ERROR bei ungültigem Seed', async () => {
    const ctx = stubCtx();
    await expect(
      runScenarioVersionWith(ctx, 'v-b2', Number.NaN, 1, { persist: false }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('MAX_RUNS_EXCEEDED ab dem zehnten Run', async () => {
    const ctx = stubCtx({ runsByScenario: new Array(10).fill({ status: 'COMPLETED' }) });
    try {
      await runScenarioVersionWith(ctx, 'v-b2', 7, 1, { persist: false });
      throw new Error('kein Wurf');
    } catch (e) {
      expect((e as ScenarioError).code).toBe('MAX_RUNS_EXCEEDED');
    }
  });

  it('seedOverride steuert den Run-Seed', async () => {
    const ctx = stubCtx();
    const res = await runScenarioVersionWith(ctx, 'v-b2', 424242, 1, {
      organizationId: 'org-seed',
      persist: false,
    });
    expect(res.run.seed).toBe(424242);
    expect(res.run.status).toBe('COMPLETED');
    expect(res.run.manifest.organizationId).toBe('org-seed');
  });

  it('UNKNOWN_SOURCE bei unbekannter Baseline-Version', async () => {
    const ctx = stubCtx();
    await expect(
      runScenarioVersionWith(ctx, 'v-b2', 7, 1, {
        baselineVersion: 'branch2-gibt-es-nicht',
        persist: false,
      }),
    ).rejects.toMatchObject({ code: 'UNKNOWN_SOURCE' });
  });

  it('Baseline-Rekonstruktion über direkte Registry-Id', async () => {
    dataSourceRegistry.register({
      info: { ...simulatedCrmSource.info, id: 'branch2-recon-direct' },
      fetchSnapshot: () => simulatedCrmSource.fetchSnapshot(),
    });
    const ctx = stubCtx();
    const res = await runScenarioVersionWith(ctx, 'v-b2', 7, 1, {
      baselineVersion: 'branch2-recon-direct',
      organizationId: 'org-recon',
      persist: false,
    });
    expect(res.run.manifest.baselineVersion).toBe('branch2-recon-direct');
    expect(res.run.manifest.dataSourceId).toBe('branch2-recon-direct');
    expect(BaselineSnapshotService.has('branch2-recon-direct')).toBe(true);
  });

  it('Baseline-Rekonstruktion über baseline-file-Präfix', async () => {
    dataSourceRegistry.register({
      info: { ...simulatedCrmSource.info, id: 'baseline-file:branch2-recon-file' },
      fetchSnapshot: () => simulatedCrmSource.fetchSnapshot(),
    });
    const ctx = stubCtx();
    const res = await runScenarioVersionWith(ctx, 'v-b2', 7, 1, {
      baselineVersion: 'branch2-recon-file',
      persist: false,
    });
    expect(res.run.manifest.baselineVersion).toBe('branch2-recon-file');
    expect(res.run.manifest.dataSourceId).toBe('baseline-file:branch2-recon-file');
  });

  it('ORG_MISMATCH bei fremdem Baseline-Mandanten', async () => {
    const activeId = dataSourceRegistry.getActive().info.id;
    await BaselineSnapshotService.capture(
      activeId,
      'branch2-org-bv',
      BASELINE_PERIOD_START,
      systemContext.now(),
      {
        organizationId: 'org-a',
      },
    );
    const ctx = stubCtx();
    await expect(
      runScenarioVersionWith(ctx, 'v-b2', 7, 1, {
        baselineVersion: 'branch2-org-bv',
        organizationId: 'org-b',
        persist: false,
      }),
    ).rejects.toMatchObject({ code: 'ORG_MISMATCH' });
  });

  it('BASELINE_HASH_MISMATCH bei falschem Hash, Erfolg bei korrektem', async () => {
    const activeId = dataSourceRegistry.getActive().info.id;
    await BaselineSnapshotService.capture(
      activeId,
      'branch2-hash-bv',
      BASELINE_PERIOD_START,
      systemContext.now(),
      {
        organizationId: 'org-h',
      },
    );
    const correct = BaselineSnapshotService.get('branch2-hash-bv').baselineHash;
    const bad = stubCtx();
    await expect(
      runScenarioVersionWith(bad, 'v-b2', 7, 1, {
        baselineVersion: 'branch2-hash-bv',
        organizationId: 'org-h',
        expectedBaselineHash: 'deadbeef',
        persist: false,
      }),
    ).rejects.toMatchObject({ code: 'BASELINE_HASH_MISMATCH' });
    const good = stubCtx();
    const res = await runScenarioVersionWith(good, 'v-b2', 7, 1, {
      baselineVersion: 'branch2-hash-bv',
      organizationId: 'org-h',
      expectedBaselineHash: correct,
      persist: false,
    });
    expect(res.run.status).toBe('COMPLETED');
  });

  it('onProgress wird mit echten Einheiten aufgerufen', async () => {
    const ctx = stubCtx();
    const seen: Array<[number, number]> = [];
    await runScenarioVersionWith(ctx, 'v-b2', 7, 2, {
      persist: false,
      onProgress: (a, b) => seen.push([a, b]),
    });
    expect(seen).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  it('Default-targetTicks 50 ohne explizite Angabe', async () => {
    const ctx = stubCtx();
    const res = await runScenarioVersionWith(ctx, 'v-b2', 7, undefined, { persist: false });
    expect(res.run.manifest.targetTicks).toBe(50);
    expect(res.state.tickCount).toBe(50);
  });

  it('Snapshot-Repo löst deterministisches Pruning nach persistiertem Run aus', async () => {
    const seenRunIds: string[] = [];
    const snapshotRepo = {
      getByRun: vi.fn(async () => []),
      pruneSnapshotsForRun: vi.fn(async (runId: string) => {
        seenRunIds.push(runId);
        return { prunedCount: 0, remainingCount: 0 };
      }),
    };
    const ctx = stubCtx({ snapshotRepo });
    const res = await runScenarioVersionWith(ctx, 'v-b2', 7, 1, { persist: true });
    expect(ctx.fns.saveRun).toHaveBeenCalledTimes(1);
    expect(res.run.status).toBe('COMPLETED');
    await new Promise((r) => setTimeout(r, 20));
    expect(snapshotRepo.pruneSnapshotsForRun).toHaveBeenCalledTimes(1);
    expect(seenRunIds).toEqual([res.run.runId]);
  });

  it('persistToServer ohne Snapshot-Repo speichert Final-Snapshot und ruft Server-Persistenz', async () => {
    const ctx = stubCtx();
    const res = await runScenarioVersionWith(ctx, 'v-b2', 7, 2, {
      persist: true,
      persistToServer: true,
    });
    expect(ctx.fns.saveSnapshots).toHaveBeenCalledTimes(1);
    expect(ctx.fns.saveEvents).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledTimes(1);
    const arg = persistMock.mock.calls[0]?.[0] as { snapshots: unknown[] };
    expect(arg.snapshots).toHaveLength(1);
    expect(res.run.status).toBe('COMPLETED');
  });

  it('persistToServer mit bereits gesehenem Final-Snapshot überspringt saveSnapshots (Dedup)', async () => {
    systemContext.__overrideForTest({ nextRunId: () => 'run-branch2-fixed' });
    const stored = [{ snapshotId: 'run-branch2-fixed_tick_2' }];
    const snapshotRepo = {
      getByRun: vi.fn(async () => stored),
      pruneSnapshotsForRun: vi.fn(async () => ({ prunedCount: 0, remainingCount: 1 })),
    };
    const ctx = stubCtx({ snapshotRepo });
    const res = await runScenarioVersionWith(ctx, 'v-b2', 7, 2, {
      persist: true,
      persistToServer: true,
    });
    expect(res.run.runId).toBe('run-branch2-fixed');
    expect(ctx.fns.saveSnapshots).not.toHaveBeenCalled();
    expect(ctx.fns.saveEvents).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledTimes(1);
    const arg = persistMock.mock.calls[0]?.[0] as { snapshots: unknown[] };
    expect(arg.snapshots).toHaveLength(1);
  });

  it('persistToServer mit fehlendem Szenario wirft NOT_FOUND', async () => {
    const ctx = stubCtx({ scenario: scenarioFixture('s-b2') });
    ctx.fns.getScenario.mockReturnValueOnce(scenarioFixture('s-b2')).mockReturnValue(null);
    let code = '';
    try {
      await runScenarioVersionWith(ctx, 'v-b2', 7, 1, { persist: true, persistToServer: true });
    } catch (e) {
      code = (e as ScenarioError).code as string;
    }
    expect(code).toBe('NOT_FOUND');
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('Worker-Pfad mit metriklosem State setzt finale Null-Projektion (kein Server-Call ohne Flag)', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', class {});
    const bareState = {
      isRunning: true,
      tickCount: 2,
      dayIndex: 2,
      simulatedDate: '2026-01-03',
      seed: 7,
      speed: 1 as const,
      intervalMs: 12000,
      lastTickTimestamp: '2026-01-03 (Tick #2)',
      simulatedAt: '2026-01-03',
      metrics: undefined,
      totalLeadsGenerated: 0,
      totalDealsWon: 0,
      currentARR: 0,
    };
    const ctx = stubCtx();
    ctx.runTicksInWorker.mockImplementation(async () => ({
      state: { ...bareState },
      rngState: 99,
      leads: [],
      opportunities: [],
      deals: [],
      activities: [],
      events: [],
      timeSeries: [],
    }));
    const res = await runScenarioVersionWith(ctx, 'v-b2', 7, 2, {
      persist: true,
      persistToServer: true,
    });
    expect(ctx.runTicksInWorker).toHaveBeenCalledTimes(1);
    expect(res.run.rngState).toBe(99);
    expect(res.run.finalMetrics).toBeUndefined();
    expect(persistMock).toHaveBeenCalledTimes(1);
    const arg = persistMock.mock.calls[0]?.[0] as {
      snapshots: Array<{ projection: Record<string, number> }>;
    };
    expect(arg.snapshots).toHaveLength(1);
    expect(arg.snapshots[0]?.projection).toMatchObject({
      arr: 0,
      mrr: 0,
      customers: 0,
      wonDeals: 0,
      conversionRate: 0,
    });
  });
});
