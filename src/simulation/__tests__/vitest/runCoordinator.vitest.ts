import { describe, it, expect } from 'vitest';
import { DeterministicRNG } from '../../prng';
import { SimulationEventRules } from '../../eventRules';
import { RunCoordinator, type CoordinatorEvent } from '../../runCoordinator';
import {
  HeadlessTestWorkerAdapter,
  type ISimulationWorkerAdapter,
} from '../../worker/workerAdapter';
import {
  WORKER_PROTOCOL_VERSION,
  type WorkerMessageCommand,
  type WorkerMessageEvent,
} from '../../../types/workerMessages';
import type { RunManifest } from '../../../types/scenario';
import { executeTicksMainThread } from '../../scenarioService';
import { DEFAULT_HISTORICAL_METRICS } from '../../../services/data/baselineMapper';
import type { SimulationState } from '../../../types/simulation';

class StubAdapter implements ISimulationWorkerAdapter {
  posted: WorkerMessageCommand[] = [];
  terminated = false;
  listeners = new Set<(evt: WorkerMessageEvent) => void>();
  errorListeners = new Set<(err: Error) => void>();

  postMessage(command: WorkerMessageCommand): void {
    this.posted.push(command);
  }

  onMessage(listener: (evt: WorkerMessageEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onError(listener: (err: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  terminate(): void {
    this.terminated = true;
    this.listeners.clear();
    this.errorListeners.clear();
  }

  emit(evt: WorkerMessageEvent): void {
    for (const fn of [...this.listeners]) fn(evt);
  }

  crash(err: Error): void {
    for (const fn of [...this.errorListeners]) fn(err);
  }
}

function makeManifest(): RunManifest {
  return {
    runId: 'run-coord-1',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    simulationStartDate: '2026-01-01',
    targetTicks: 10,
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
    correlationId: 'corr-coord-1',
  };
}

function workerEvent(
  type: WorkerMessageEvent['type'],
  extra?: Partial<WorkerMessageEvent['payload']>,
): WorkerMessageEvent {
  return {
    protocolVersion: WORKER_PROTOCOL_VERSION,
    type,
    runId: 'run-coord-1',
    requestId: 'req-coord-1',
    payload: { completedRuns: 0, totalRuns: 1, ...extra },
  };
}

function collect(coordinator: RunCoordinator): CoordinatorEvent[] {
  const seen: CoordinatorEvent[] = [];
  coordinator.onEvent((evt) => {
    seen.push(evt);
  });
  return seen;
}

// 067G / G50 — RunCoordinator: echter Berechnungsfortschritt, kein Timer,
// kein Main-Thread im Produktpfad, kein Worker-Leak.
describe('runCoordinator (G50)', () => {
  it('führt QUEUED→RUNNING→PROGRESS→COMPLETED mit echten Einheiten', async () => {
    const adapter = new StubAdapter();
    const coordinator = new RunCoordinator(adapter);
    const seen = collect(coordinator);

    const done = coordinator.execute({
      manifest: makeManifest(),
      targetTicks: 10,
      correlationId: 'corr-coord-1',
    });
    expect(adapter.posted).toHaveLength(1);
    expect(adapter.posted[0]?.command).toBe('START');

    adapter.emit(workerEvent('QUEUED'));
    adapter.emit(workerEvent('STARTED'));
    adapter.emit(workerEvent('PROGRESS', { processedUnits: 4, totalUnits: 10 }));
    adapter.emit(
      workerEvent('COMPLETED', {
        completedRuns: 1,
        processedUnits: 10,
        totalUnits: 10,
        rngState: 424242,
        finalMetrics: { liveARR: 411840 } as never,
        finalState: { tickCount: 10 } as never,
      }),
    );

    const result = await done;
    expect(result.finalMetrics).toMatchObject({ liveARR: 411840 });
    expect(result.rngState).toBe(424242);
    expect(seen.map((s) => s.status)).toEqual(['queued', 'running', 'progress', 'completed']);
    expect(seen[2]).toMatchObject({ processedUnits: 4, totalUnits: 10 });
    expect(adapter.terminated).toBe(true);
    expect(adapter.listeners.size).toBe(0);
  });

  it('lehnt synthetischen (nicht-monotonen) Fortschritt ab', async () => {
    const adapter = new StubAdapter();
    const coordinator = new RunCoordinator(adapter);
    const seen = collect(coordinator);

    const done = coordinator.execute({
      manifest: makeManifest(),
      targetTicks: 10,
      correlationId: 'corr-coord-1',
    });
    adapter.emit(workerEvent('QUEUED'));
    adapter.emit(workerEvent('STARTED'));
    adapter.emit(workerEvent('PROGRESS', { processedUnits: 5, totalUnits: 10 }));
    // Rücksprung 5 → 3: kein echter Berechnungsfortschritt.
    adapter.emit(workerEvent('PROGRESS', { processedUnits: 3, totalUnits: 10 }));

    await expect(done).rejects.toMatchObject({ code: 'INVALID_PROGRESS' });
    expect(seen[seen.length - 1]?.status).toBe('failed');
    expect(adapter.terminated).toBe(true);
  });

  it('mappt Worker-Fehler auf failed', async () => {
    const adapter = new StubAdapter();
    const coordinator = new RunCoordinator(adapter);
    const seen = collect(coordinator);

    const done = coordinator.execute({
      manifest: makeManifest(),
      targetTicks: 10,
      correlationId: 'corr-coord-1',
    });
    adapter.emit(workerEvent('QUEUED'));
    adapter.emit(
      workerEvent('FAILED', {
        error: { errorId: 'e1', code: 'WORKER_BOOM', message: 'kaputt', recoverable: false },
      }),
    );

    await expect(done).rejects.toMatchObject({ code: 'WORKER_BOOM' });
    expect(seen[seen.length - 1]?.status).toBe('failed');
    expect(adapter.terminated).toBe(true);
  });

  it('cancel terminiert ohne Leak (Navigation/Unmount)', async () => {
    const adapter = new StubAdapter();
    const coordinator = new RunCoordinator(adapter);
    const seen = collect(coordinator);

    const done = coordinator.execute({
      manifest: makeManifest(),
      targetTicks: 10,
      correlationId: 'corr-coord-1',
    });
    adapter.emit(workerEvent('QUEUED'));
    coordinator.cancel();

    // 067Q / G63: Abbruch ist kein Fehlerzustand, sondern SIMULATION_CANCELLED.
    await expect(done).rejects.toMatchObject({ code: 'SIMULATION_CANCELLED' });
    expect(adapter.terminated).toBe(true);
    expect(adapter.listeners.size).toBe(0);
    expect(adapter.errorListeners.size).toBe(0);
    expect(seen[seen.length - 1]?.status).toBe('cancelled');
    expect(adapter.posted.map((c) => c.command)).toEqual(['START', 'CANCEL']);
  });

  it('nativer Worker-Crash wird als FAILED behandelt und terminiert', async () => {
    const adapter = new StubAdapter();
    const coordinator = new RunCoordinator(adapter);
    const seen = collect(coordinator);

    const done = coordinator.execute({
      manifest: makeManifest(),
      targetTicks: 10,
      correlationId: 'corr-coord-1',
    });
    adapter.emit(workerEvent('QUEUED'));
    adapter.emit(workerEvent('PROGRESS', { processedUnits: 2, totalUnits: 10 }));
    adapter.crash(new Error('Worker-Crash: out of memory'));

    await expect(done).rejects.toMatchObject({ code: 'WORKER_CRASH' });
    expect(seen[seen.length - 1]?.status).toBe('failed');
    expect(adapter.terminated).toBe(true);
    expect(adapter.listeners.size).toBe(0);
    expect(adapter.errorListeners.size).toBe(0);
  });

  it('Integration: echter Worker rechnet mit monotonen Einheiten bis COMPLETED', async () => {
    const coordinator = new RunCoordinator(new HeadlessTestWorkerAdapter());
    const seen = collect(coordinator);

    const result = await coordinator.execute({
      manifest: makeManifest(),
      targetTicks: 6,
      correlationId: 'corr-coord-1',
    });

    expect(result.finalMetrics?.liveARR).toBeGreaterThan(0);
    expect(result.timeSeries.length).toBeGreaterThan(0);
    const units = seen.filter((s) => s.status === 'progress').map((s) => s.processedUnits);
    expect(units.length).toBeGreaterThan(0);
    expect(units[units.length - 1]).toBe(6);
    for (let i = 1; i < units.length; i++) {
      expect(units[i]).toBeGreaterThanOrEqual(units[i - 1] ?? 0);
    }
    expect(seen[seen.length - 1]?.status).toBe('completed');
  }, 30_000);

  it('Main-Thread-Executor stimmt mit Worker-Ergebnis überein (Headless-Parität)', async () => {
    const manifest = makeManifest();
    const coordinator = new RunCoordinator(new HeadlessTestWorkerAdapter());
    const viaWorker = await coordinator.execute({
      manifest,
      targetTicks: 6,
      correlationId: 'corr-coord-1',
    });

    const initialMetrics = viaWorker.finalMetrics;
    expect(initialMetrics).toBeDefined();
    const anchorMetrics = SimulationEventRules.recalculateMetrics(
      [],
      [],
      [],
      undefined,
      undefined,
      undefined,
      DEFAULT_HISTORICAL_METRICS.baseCustomers,
      DEFAULT_HISTORICAL_METRICS.baseMRR,
      DEFAULT_HISTORICAL_METRICS.baseARR,
    );
    const state = {
      isRunning: true,
      tickCount: 0,
      dayIndex: 0,
      simulatedDate: '2026-01-01',
      seed: manifest.seed,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: '2026-01-01 (Tick #0)',
      simulatedAt: '2026-01-01',
      metrics: anchorMetrics,
      cumulativeCashFlow: anchorMetrics.financialMetrics?.cumulativeCashFlow ?? 0,
      totalLeadsGenerated: 0,
      totalDealsWon: 0,
      currentARR: anchorMetrics.liveARR,
    } as SimulationState;
    const viaMain = executeTicksMainThread({
      rng: new DeterministicRNG(manifest.seed),
      initialState: state,
      leads: [],
      opportunities: [],
      deals: [],
      activities: [],
      historicalMetrics: { ...DEFAULT_HISTORICAL_METRICS },
      baseParameters: manifest.parameters,
      measures: [],
      targetTicks: 6,
      correlationId: 'corr-coord-1',
    });
    expect(viaMain.state.metrics).toEqual(viaWorker.finalState?.metrics);
    // P1-Gegenfall: PRNG-Endzustand stimmt pfadübergreifend überein.
    const mainEndState = new DeterministicRNG(manifest.seed).getState();
    expect(mainEndState).not.toBe(viaWorker.rngState);
    expect(viaMain.rngState).toBe(viaWorker.rngState);
  }, 30_000);
});
