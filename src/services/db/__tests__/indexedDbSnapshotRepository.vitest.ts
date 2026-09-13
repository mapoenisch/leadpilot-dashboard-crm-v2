import { describe, it, expect, beforeEach } from 'vitest';
import {
  IndexedDbSnapshotRepository,
  InMemorySnapshotRepository,
  createSnapshotRepository,
} from '../indexedDbSnapshotRepository';
import { SnapshotMapper } from '../snapshotMapper';
import { SimulationSnapshot, SnapshotError } from '@/types/snapshot';

function createMockSnapshot(runId: string, tickId: number): SimulationSnapshot {
  return {
    snapshotId: `${runId}_tick_${tickId}`,
    runId,
    scenarioId: 'scen_1',
    scenarioVersionId: 'scen_v1',
    tickId,
    simulationDay: tickId * 30,
    simulatedDate: `2026-0${tickId + 1}-01`,
    modelVersion: '1.0.0',
    schemaVersion: '1.0.0',
    baselineVersion: 'v1',
    state: {
      isRunning: false,
      tickCount: tickId,
      dayIndex: tickId * 30,
      simulatedDate: `2026-0${tickId + 1}-01`,
      seed: 12345,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: new Date().toISOString(),
      totalLeadsGenerated: 100,
      totalDealsWon: 10,
      currentARR: 500000 + tickId * 10000,
    },
    projection: {
      snapshotId: `${runId}_tick_${tickId}`,
      runId,
      scenarioId: 'scen_1',
      scenarioVersionId: 'scen_v1',
      tickId,
      simulationDay: tickId * 30,
      simulatedDate: `2026-0${tickId + 1}-01`,
      arr: 500000 + tickId * 10000,
      mrr: 40000,
      customers: 50,
      wonDeals: 10,
      leadsCount: 100,
      opportunitiesCount: 20,
      conversionRate: 0.2,
    },
    createdAt: new Date().toISOString(),
  };
}

describe('IndexedDbSnapshotRepository', () => {
  let repo: IndexedDbSnapshotRepository;

  beforeEach(() => {
    repo = new IndexedDbSnapshotRepository();
  });

  it('speichert und liest Snapshots korrekt', async () => {
    const snap1 = createMockSnapshot('run_1', 0);
    await repo.saveSnapshot(snap1);

    const loaded = await repo.getSnapshot(snap1.snapshotId);
    expect(loaded).not.toBeNull();
    expect(loaded?.snapshotId).toBe(snap1.snapshotId);
    expect(loaded?.runId).toBe('run_1');
    expect(loaded?.tickId).toBe(0);
    expect(loaded?.projection.arr).toBe(500000);
  });

  it('gibt null zurück für unbekannte Snapshot-IDs', async () => {
    const loaded = await repo.getSnapshot('non_existent_id');
    expect(loaded).toBeNull();
  });

  it('listet Snapshots eines Runs sortiert nach tickId', async () => {
    const snap0 = createMockSnapshot('run_sort', 0);
    const snap2 = createMockSnapshot('run_sort', 2);
    const snap1 = createMockSnapshot('run_sort', 1);

    await repo.saveSnapshot(snap2);
    await repo.saveSnapshot(snap0);
    await repo.saveSnapshot(snap1);

    const list = await repo.getByRun('run_sort');
    expect(list.length).toBe(3);
    expect(list[0]?.tickId).toBe(0);
    expect(list[1]?.tickId).toBe(1);
    expect(list[2]?.tickId).toBe(2);
  });

  it('gibt leeres Array zurück wenn keine Snapshots für Run vorhanden', async () => {
    const list = await repo.getByRun('empty_run');
    expect(list).toEqual([]);
  });

  it('liest Snapshot per Run und Tick', async () => {
    const snap = createMockSnapshot('run_tick', 5);
    await repo.saveSnapshot(snap);

    const loaded = await repo.getByRunAndTick('run_tick', 5);
    expect(loaded?.snapshotId).toBe(snap.snapshotId);

    const notFound = await repo.getByRunAndTick('run_tick', 99);
    expect(notFound).toBeNull();
  });

  it('liefert neuesten Snapshot eines Runs', async () => {
    expect(await repo.getLatestByRun('run_latest_empty')).toBeNull();

    await repo.saveSnapshot(createMockSnapshot('run_latest', 1));
    await repo.saveSnapshot(createMockSnapshot('run_latest', 3));
    await repo.saveSnapshot(createMockSnapshot('run_latest', 2));

    const latest = await repo.getLatestByRun('run_latest');
    expect(latest?.tickId).toBe(3);
  });

  it('listet Projektionen eines Runs sortiert', async () => {
    await repo.saveSnapshot(createMockSnapshot('run_proj', 2));
    await repo.saveSnapshot(createMockSnapshot('run_proj', 1));

    const projections = await repo.listProjectionsByRun('run_proj');
    expect(projections.length).toBe(2);
    expect(projections[0]?.tickId).toBe(1);
    expect(projections[1]?.tickId).toBe(2);
  });

  it('löscht einen einzelnen Snapshot', async () => {
    const snap = createMockSnapshot('run_del', 1);
    await repo.saveSnapshot(snap);
    expect(await repo.getSnapshot(snap.snapshotId)).not.toBeNull();

    await repo.deleteSnapshot(snap.snapshotId);
    expect(await repo.getSnapshot(snap.snapshotId)).toBeNull();
  });

  it('löscht alle Snapshots und Projektionen eines Runs', async () => {
    await repo.saveSnapshot(createMockSnapshot('run_del_all', 1));
    await repo.saveSnapshot(createMockSnapshot('run_del_all', 2));

    await repo.deleteByRun('run_del_all');

    const remainingSnaps = await repo.getByRun('run_del_all');
    expect(remainingSnaps.length).toBe(0);
    const remainingProjs = await repo.listProjectionsByRun('run_del_all');
    expect(remainingProjs.length).toBe(0);
  });

  it('prunt Snapshots für einen Run korrekt', async () => {
    await repo.saveSnapshot(createMockSnapshot('run_prune', 0));
    await repo.saveSnapshot(createMockSnapshot('run_prune', 1));
    await repo.saveSnapshot(createMockSnapshot('run_prune', 2));
    await repo.saveSnapshot(createMockSnapshot('run_prune', 3));

    // Alle behalten -> prunedCount 0
    const noPrune = await repo.pruneSnapshotsForRun('run_prune', [0, 1, 2, 3]);
    expect(noPrune.prunedCount).toBe(0);
    expect(noPrune.remainingCount).toBe(4);

    // Ticks 0 und 3 behalten
    const res = await repo.pruneSnapshotsForRun('run_prune', [0, 3]);
    expect(res.prunedCount).toBe(2);
    expect(res.remainingCount).toBe(2);

    const remaining = await repo.getByRun('run_prune');
    expect(remaining.map((s) => s.tickId)).toEqual([0, 3]);
  });

  it('liefert korrekte Storage-Metriken', async () => {
    const metricsBefore = await repo.getStorageMetrics();
    await repo.saveSnapshot(createMockSnapshot('run_metrics', 1));
    const metricsAfter = await repo.getStorageMetrics();

    expect(metricsAfter.totalSnapshots).toBe(metricsBefore.totalSnapshots + 1);
    expect(metricsAfter.totalProjections).toBe(metricsBefore.totalProjections + 1);
    expect(metricsAfter.estimatedBytes).toBe(
      metricsAfter.totalSnapshots * 20480 + metricsAfter.totalProjections * 256,
    );
  });

  it('wirft SnapshotError bei fehlender indexedDB-API', async () => {
    const originalIDB = globalThis.indexedDB;
    // @ts-expect-error simuliere fehlende indexedDB
    delete globalThis.indexedDB;

    const noIdbRepo = new IndexedDbSnapshotRepository();
    await expect(noIdbRepo.getSnapshot('test')).rejects.toThrow(SnapshotError);

    globalThis.indexedDB = originalIDB;
  });
});

describe('InMemorySnapshotRepository', () => {
  let repo: InMemorySnapshotRepository;

  beforeEach(() => {
    repo = new InMemorySnapshotRepository();
  });

  it('unterstützt alle CRUD-, Pruning- und Metrik-Operationen im Speicher', async () => {
    const s0 = createMockSnapshot('mem_run', 0);
    const s1 = createMockSnapshot('mem_run', 1);
    const s2 = createMockSnapshot('mem_run', 2);

    await repo.saveSnapshot(s1);
    await repo.saveSnapshot(s0);
    await repo.saveSnapshot(s2);

    expect(await repo.getSnapshot(s0.snapshotId)).not.toBeNull();
    expect(await repo.getSnapshot('not_found')).toBeNull();

    const byRun = await repo.getByRun('mem_run');
    expect(byRun.map((s) => s.tickId)).toEqual([0, 1, 2]);

    const byRunTick = await repo.getByRunAndTick('mem_run', 1);
    expect(byRunTick?.tickId).toBe(1);

    const latest = await repo.getLatestByRun('mem_run');
    expect(latest?.tickId).toBe(2);

    const projs = await repo.listProjectionsByRun('mem_run');
    expect(projs.map((p) => p.tickId)).toEqual([0, 1, 2]);

    const metrics = await repo.getStorageMetrics();
    expect(metrics.totalSnapshots).toBe(3);
    expect(metrics.totalProjections).toBe(3);

    // Prune
    const pruneRes = await repo.pruneSnapshotsForRun('mem_run', [0, 2]);
    expect(pruneRes.prunedCount).toBe(1);
    expect(pruneRes.remainingCount).toBe(2);

    // Delete single
    await repo.deleteSnapshot(s0.snapshotId);
    expect(await repo.getSnapshot(s0.snapshotId)).toBeNull();

    // Delete by run
    await repo.deleteByRun('mem_run');
    expect((await repo.getByRun('mem_run')).length).toBe(0);
    expect((await repo.listProjectionsByRun('mem_run')).length).toBe(0);

    // Latest on empty
    expect(await repo.getLatestByRun('mem_run')).toBeNull();
  });
});

describe('createSnapshotRepository', () => {
  it('erzeugt ein passendes SnapshotRepository je nach Umgebung', () => {
    const repo = createSnapshotRepository();
    expect(repo).toBeDefined();
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      expect(repo).toBeInstanceOf(IndexedDbSnapshotRepository);
    } else {
      expect(repo).toBeInstanceOf(InMemorySnapshotRepository);
    }
  });
});

describe('SnapshotMapper', () => {
  it('erzeugt korrekte Projection aus SimulationState', () => {
    const mockState = {
      metrics: {
        liveARR: 600000,
        liveMRR: 50000,
        liveCustomers: 80,
        liveWonDeals: 15,
        liveLeads: 120,
        liveOpportunities: 30,
        conversionRate: 0.25,
      },
    } as unknown as Parameters<typeof SnapshotMapper.createProjection>[7];
    const proj = SnapshotMapper.createProjection(
      'snap_1',
      'run_1',
      'scen_1',
      'ver_1',
      2,
      60,
      '2026-03-01',
      mockState,
    );
    expect(proj.snapshotId).toBe('snap_1');
    expect(proj.arr).toBe(600000);
    expect(proj.conversionRate).toBe(0.25);

    // Default Fallbacks bei fehlenden Metriken
    const emptyProj = SnapshotMapper.createProjection(
      'snap_2',
      'run_1',
      'scen_1',
      'ver_1',
      3,
      90,
      '2026-04-01',
      {} as unknown as Parameters<typeof SnapshotMapper.createProjection>[7],
    );
    expect(emptyProj.arr).toBe(0);
    expect(emptyProj.customers).toBe(0);
  });
});
