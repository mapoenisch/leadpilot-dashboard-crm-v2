// Branch-Tests: simulation.worker Mini-START-Varianten + Steuerungs-Happy-Paths.
// Abgrenzung zu simulationWorker.branch.vitest.ts (nur Fehlerkanten:
// INVALID_PROTOCOL_VERSION, UNKNOWN_COMMAND, MISSING_PAYLOAD bei leerer runId,
// PAUSE-No-op, RESUME-Fehler, CANCEL-Idempotenz) und zu workerIntegrity
// (komplette Läufe über den Adapter): hier direkte handleMessage-Aufrufe mit
// kleinen Ticks (≤5, synchron wo batchSize reicht) — Default-Ticks,
// initialState-Seed, Manifest-Pfad (targetTicks/correlationId/seed aus Manifest),
// explizite historicalMetrics/measures, MISSING_PAYLOAD-Recovery sowie
// PAUSE→RESUME- und CANCEL-Happy-Paths. KEIN echter Worker.
import { describe, it, expect, beforeEach } from 'vitest';
import { workerRunner } from '../simulation.worker';
import { SimulationEventRules } from '../../eventRules';
import { DEFAULT_BASE_2026_PARAMETERS } from '../../scenarioRepository';
import { DEFAULT_HISTORICAL_METRICS } from '../../../services/data/baselineMapper';
import {
  WORKER_PROTOCOL_VERSION,
  type WorkerMessageCommand,
  type WorkerMessageEvent,
} from '../../../types/workerMessages';
import type { RunManifest } from '../../../types/scenario';
import type { SimulationState } from '../../../types/simulation';

function startCmd(
  runId: string,
  requestId: string,
  payload?: WorkerMessageCommand['payload'],
): WorkerMessageCommand {
  return { protocolVersion: WORKER_PROTOCOL_VERSION, command: 'START', runId, requestId, payload };
}

function initialStateFixture(seed: number): SimulationState {
  const metrics = SimulationEventRules.recalculateMetrics([], [], []);
  const simulatedDate = '2026-01-01';
  return {
    isRunning: true,
    tickCount: 0,
    dayIndex: 0,
    simulatedDate,
    seed,
    speed: 1,
    intervalMs: 12000,
    lastTickTimestamp: `${simulatedDate} (Tick #0)`,
    simulatedAt: simulatedDate,
    metrics,
    totalLeadsGenerated: 0,
    totalDealsWon: 0,
    currentARR: metrics.liveARR,
  };
}

function manifestFixture(runId: string, targetTicks: number): RunManifest {
  return {
    runId,
    scenarioId: 's-branch',
    scenarioVersionId: 'v-branch',
    seed: 7,
    initialRngState: 7,
    modelVersion: 'm1',
    schemaVersion: 's1',
    baselineVersion: 'b1',
    baselineId: 'bl1',
    baselineHash: 'h1',
    organizationId: 'o1',
    createdAt: '2026-01-01T00:00:00.000Z',
    simulationStartDate: '2026-01-01',
    targetTicks,
    parameters: DEFAULT_BASE_2026_PARAMETERS,
    correlationId: 'corr-manifest',
  } as unknown as RunManifest;
}

function waitFor(
  posted: WorkerMessageEvent[],
  predicate: (evt: WorkerMessageEvent) => boolean,
  timeoutMs = 5000,
): Promise<WorkerMessageEvent> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const found = posted.find(predicate);
      if (found) {
        clearInterval(timer);
        resolve(found);
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Timeout beim Warten auf Worker-Event'));
      }
    }, 10);
  });
}

describe('simulationWorkerStart.branch', () => {
  let posted: WorkerMessageEvent[];

  beforeEach(() => {
    posted = [];
    (globalThis as unknown as { postMessage: (evt: WorkerMessageEvent) => void }).postMessage = (
      evt: WorkerMessageEvent,
    ) => {
      posted.push(evt);
    };
  });

  it('START mit runId aber ohne Payload wird abgewiesen, danach erholt sich der Runner', () => {
    workerRunner.handleMessage(startCmd('r-nopayload', 'q-nopayload'));
    const failed = posted.filter((e) => e.type === 'FAILED');
    expect(failed).toHaveLength(1);
    expect(failed[0]?.payload?.error?.code).toBe('MISSING_PAYLOAD');

    posted.length = 0;
    workerRunner.handleMessage(startCmd('r-recover', 'q-recover', { targetTicks: 1 }));
    expect(posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-recover')).toBeDefined();
  });

  it('minimaler START (1 Tick) läuft synchron QUEUED→STARTED→PROGRESS→COMPLETED', () => {
    workerRunner.handleMessage(startCmd('r-mini', 'q-mini', { targetTicks: 1 }));
    expect(posted.map((e) => e.type)).toEqual(['QUEUED', 'STARTED', 'PROGRESS', 'COMPLETED']);
    const completed = posted.find((e) => e.type === 'COMPLETED')!;
    expect(completed.runId).toBe('r-mini');
    expect(completed.requestId).toBe('q-mini');
    if (completed.type === 'COMPLETED') {
      expect(completed.payload?.processedUnits).toBe(1);
      expect(completed.payload?.totalUnits).toBe(1);
      expect(completed.payload?.correlationId).toBe('');
      expect(typeof completed.payload?.rngState).toBe('number');
      expect(completed.payload?.finalState?.tickCount).toBe(1);
      expect(completed.payload?.finalMetrics).toBeDefined();
      expect(completed.payload?.timeSeries).toHaveLength(2);
    }
  });

  it('START mit initialState übernimmt den Seed und den Zustand', () => {
    workerRunner.handleMessage(
      startCmd('r-init', 'q-init', { initialState: initialStateFixture(7), targetTicks: 1 }),
    );
    const completed = posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-init');
    expect(completed).toBeDefined();
    if (completed?.type === 'COMPLETED') {
      expect(completed.payload?.finalState?.seed).toBe(7);
      expect(completed.payload?.finalState?.tickCount).toBe(1);
    }
  });

  it('START mit Manifest nutzt targetTicks/Seed/correlationId aus dem Manifest', () => {
    workerRunner.handleMessage(
      startCmd('r-manifest', 'q-manifest', { manifest: manifestFixture('r-manifest', 2) }),
    );
    const queued = posted.find((e) => e.type === 'QUEUED' && e.runId === 'r-manifest');
    expect(queued?.payload?.totalUnits).toBe(2);
    expect(queued?.payload?.correlationId).toBe('corr-manifest');
    const completed = posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-manifest');
    expect(completed).toBeDefined();
    if (completed?.type === 'COMPLETED') {
      expect(completed.payload?.processedUnits).toBe(2);
      expect(completed.payload?.finalState?.seed).toBe(7);
    }
  });

  it('START mit expliziten historicalMetrics/measures und totalRuns meldet totalRuns', () => {
    workerRunner.handleMessage(
      startCmd('r-full', 'q-full', {
        targetTicks: 1,
        batchSize: 5,
        totalRuns: 3,
        historicalMetrics: DEFAULT_HISTORICAL_METRICS,
        measures: [],
      }),
    );
    const queued = posted.find((e) => e.type === 'QUEUED' && e.runId === 'r-full');
    expect(queued?.payload?.totalRuns).toBe(3);
    const started = posted.find((e) => e.type === 'STARTED' && e.runId === 'r-full');
    expect(started?.payload?.totalRuns).toBe(3);
    expect(posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-full')).toBeDefined();
  });

  it('PAUSE→RESUME mit Batches pausiert, setzt fort und vollendet', async () => {
    workerRunner.handleMessage(startCmd('r-pr', 'q-pr', { targetTicks: 3, batchSize: 1 }));
    expect(posted.find((e) => e.type === 'STARTED' && e.runId === 'r-pr')).toBeDefined();

    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'PAUSE',
      runId: 'r-pr',
      requestId: 'q-pr-pause',
    });
    const paused = posted.find((e) => e.type === 'PAUSED' && e.runId === 'r-pr');
    expect(paused).toBeDefined();
    expect(paused?.payload?.finalState?.isRunning).toBe(false);

    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'RESUME',
      runId: 'r-pr',
      requestId: 'q-pr-resume',
    });
    expect(posted.find((e) => e.type === 'RESUMED' && e.runId === 'r-pr')).toBeDefined();

    const completed = await waitFor(posted, (e) => e.type === 'COMPLETED' && e.runId === 'r-pr');
    if (completed.type === 'COMPLETED') {
      expect(completed.payload?.processedUnits).toBe(3);
      expect(completed.payload?.finalState?.tickCount).toBe(3);
    }
    expect(posted.some((e) => e.type === 'CANCELLED' && e.runId === 'r-pr')).toBe(false);
  });

  it('CANCEL im laufenden Batch bricht ab ohne COMPLETED', async () => {
    workerRunner.handleMessage(
      startCmd('r-cancelrun', 'q-cancelrun', { targetTicks: 5, batchSize: 1 }),
    );
    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'CANCEL',
      runId: 'r-cancelrun',
      requestId: 'q-cancelrun-1',
    });
    expect(posted.find((e) => e.type === 'CANCELLED' && e.runId === 'r-cancelrun')).toBeDefined();
    await new Promise((r) => setTimeout(r, 150));
    expect(posted.some((e) => e.type === 'COMPLETED' && e.runId === 'r-cancelrun')).toBe(false);
  });
});
