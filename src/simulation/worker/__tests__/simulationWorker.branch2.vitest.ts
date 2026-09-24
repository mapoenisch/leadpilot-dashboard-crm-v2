// Branch2-Tests: simulation.worker Restkanten jenseits von
// simulationWorker.branch.vitest.ts (INVALID_PROTOCOL_VERSION bei null,
// UNKNOWN_COMMAND, MISSING_PAYLOAD bei leerer runId, PAUSE-No-op,
// RESUME-Fehler, CANCEL-Idempotenz) und simulationWorkerStart.branch.vitest.ts
// (Mini-START, initialState/Manifest-Pfade, PAUSE→RESUME, CANCEL im Batch).
// Hier nur dort fehlende Zweige: falscher Versions-String (statt null),
// Manifest ohne runId, targetTicks 0 mit Manifest-Fallback, Manifest+Measures
// (Resolver-Pfad mit definiertem eff), initialState ohne Metriken (?? 0-Arme),
// Engine-Output ohne Queue-Felder (if-false-Arme via Spy), fehlendes
// postMessage (postEvent-No-op). Direkte handleMessage-Aufrufe, KEIN Worker.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { workerRunner } from '../simulation.worker';
import { SimulationEngine } from '../../engine';
import { DEFAULT_BASE_2026_PARAMETERS } from '../../scenarioRepository';
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

describe('simulationWorker.branch2', () => {
  let posted: WorkerMessageEvent[];
  const origPostMessage = (globalThis as Record<string, unknown>).postMessage;

  beforeEach(() => {
    posted = [];
    (globalThis as unknown as { postMessage: (evt: WorkerMessageEvent) => void }).postMessage = (
      evt: WorkerMessageEvent,
    ) => {
      posted.push(evt);
    };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).postMessage = origPostMessage;
    vi.restoreAllMocks();
  });

  it('falscher Versions-String wird mit runId/requestId-Passthrough abgewiesen', () => {
    workerRunner.handleMessage({
      protocolVersion: '2.0',
      command: 'START',
      runId: 'r-badver',
      requestId: 'q-badver',
      payload: { targetTicks: 1 },
    } as unknown as WorkerMessageCommand);
    expect(posted).toHaveLength(1);
    const evt = posted[0]!;
    expect(evt.type).toBe('FAILED');
    if (evt.type === 'FAILED') {
      expect(evt.payload!.error!.code).toBe('INVALID_PROTOCOL_VERSION');
      expect(evt.runId).toBe('r-badver');
      expect(evt.requestId).toBe('q-badver');
      expect(evt.payload!.error!.recoverable).toBe(false);
    }
  });

  it('START mit Manifest ohne runId fällt auf cmd.runId zurück', () => {
    const manifest = {
      scenarioId: 's-b2',
      scenarioVersionId: 'v-b2',
      seed: 11,
      initialRngState: 11,
      modelVersion: 'm1',
      schemaVersion: 's1',
      baselineVersion: 'b1',
      baselineId: 'bl1',
      baselineHash: 'h1',
      organizationId: 'o1',
      createdAt: '2026-01-01T00:00:00.000Z',
      simulationStartDate: '2026-01-01',
      targetTicks: 1,
      parameters: DEFAULT_BASE_2026_PARAMETERS,
      correlationId: 'corr-norunid',
    } as unknown as RunManifest;
    workerRunner.handleMessage(startCmd('r-fallback', 'q-fallback', { manifest }));
    const completed = posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-fallback');
    expect(completed).toBeDefined();
    if (completed?.type === 'COMPLETED') {
      expect(completed.payload?.correlationId).toBe('corr-norunid');
      expect(completed.payload?.finalState?.seed).toBe(11);
    }
  });

  it('targetTicks 0 greift auf Manifest-targetTicks zurück', () => {
    const manifest = {
      runId: 'r-t0',
      scenarioId: 's-b2',
      scenarioVersionId: 'v-b2',
      seed: 5,
      initialRngState: 5,
      modelVersion: 'm1',
      schemaVersion: 's1',
      baselineVersion: 'b1',
      baselineId: 'bl1',
      baselineHash: 'h1',
      organizationId: 'o1',
      createdAt: '2026-01-01T00:00:00.000Z',
      simulationStartDate: '2026-01-01',
      targetTicks: 2,
      parameters: DEFAULT_BASE_2026_PARAMETERS,
      correlationId: '',
    } as unknown as RunManifest;
    workerRunner.handleMessage(startCmd('r-t0', 'q-t0', { targetTicks: 0, manifest }));
    const queued = posted.find((e) => e.type === 'QUEUED' && e.runId === 'r-t0');
    expect(queued?.payload?.totalUnits).toBe(2);
    const completed = posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-t0');
    expect(completed).toBeDefined();
    if (completed?.type === 'COMPLETED') {
      expect(completed.payload?.processedUnits).toBe(2);
    }
  });

  it('START mit Manifest UND Measures nutzt den Resolver-Pfad', () => {
    const manifest = {
      runId: 'r-resolver',
      scenarioId: 's-b2',
      scenarioVersionId: 'v-b2',
      seed: 9,
      initialRngState: 9,
      modelVersion: 'm1',
      schemaVersion: 's1',
      baselineVersion: 'b1',
      baselineId: 'bl1',
      baselineHash: 'h1',
      organizationId: 'o1',
      createdAt: '2026-01-01T00:00:00.000Z',
      simulationStartDate: '2026-01-01',
      targetTicks: 2,
      parameters: DEFAULT_BASE_2026_PARAMETERS,
      correlationId: 'corr-resolver',
    } as unknown as RunManifest;
    workerRunner.handleMessage(
      startCmd('r-resolver', 'q-resolver', {
        manifest,
        measures: [
          {
            id: 'm-reps',
            name: 'Mehr Reps',
            startTick: 0,
            changes: [{ parameter: 'salesRepCount', mode: 'delta', value: 1 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    const completed = posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-resolver');
    expect(completed).toBeDefined();
    if (completed?.type === 'COMPLETED') {
      expect(completed.payload?.finalState?.tickCount).toBe(2);
      expect(completed.payload?.correlationId).toBe('corr-resolver');
    }
  });

  it('initialState ohne Metriken startet den Zeitstrahl mit Nullen', () => {
    const bare = {
      isRunning: true,
      tickCount: 0,
      dayIndex: 0,
      simulatedDate: '2026-01-01',
      seed: 3,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: '2026-01-01 (Tick #0)',
      simulatedAt: '2026-01-01',
      metrics: undefined,
      totalLeadsGenerated: 0,
      totalDealsWon: 0,
      currentARR: 0,
    } as unknown as SimulationState;
    workerRunner.handleMessage(
      startCmd('r-nometrics', 'q-nometrics', { initialState: bare, targetTicks: 1 }),
    );
    const completed = posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-nometrics');
    expect(completed).toBeDefined();
    if (completed?.type === 'COMPLETED') {
      const first = completed.payload?.timeSeries?.[0];
      expect(first?.metrics.arr).toBe(0);
      expect(first?.metrics.mrr).toBe(0);
      expect(first?.metrics.customers).toBe(0);
      expect(first?.metrics.wonDeals).toBe(0);
    }
  });

  it('Engine-Output ohne Queue-Felder vollendet trotzdem (if-false-Arme)', () => {
    const orig = SimulationEngine.executeTick;
    vi.spyOn(SimulationEngine, 'executeTick').mockImplementation((input) => {
      const out = orig(input);
      return { ...out, queueEntries: undefined, csQueueEntries: undefined };
    });
    workerRunner.handleMessage(startCmd('r-noqueues', 'q-noqueues', { targetTicks: 2 }));
    const completed = posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-noqueues');
    expect(completed).toBeDefined();
    if (completed?.type === 'COMPLETED') {
      expect(completed.payload?.processedUnits).toBe(2);
      expect(completed.payload?.finalState?.tickCount).toBe(2);
    }
  });

  it('ohne postMessage postet der Runner nichts und wirft nicht', () => {
    delete (globalThis as Record<string, unknown>).postMessage;
    expect(() =>
      workerRunner.handleMessage(startCmd('r-nopost', 'q-nopost', { targetTicks: 1 })),
    ).not.toThrow();
    expect(posted).toEqual([]);
  });

  it('PAUSE nach COMPLETED ist ein No-op ohne Event', () => {
    workerRunner.handleMessage(startCmd('r-done', 'q-done', { targetTicks: 1 }));
    expect(posted.find((e) => e.type === 'COMPLETED' && e.runId === 'r-done')).toBeDefined();
    posted.length = 0;
    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'PAUSE',
      runId: 'r-done',
      requestId: 'q-done-pause',
    });
    expect(posted).toEqual([]);
  });
});
