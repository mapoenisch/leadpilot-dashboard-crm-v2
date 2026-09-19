// Branch-Tests: HeadlessTestWorkerAdapter + createWorkerAdapter (node, kein echter Worker).
// Abgrenzung zu workerIntegrity: dort laufen komplette START/PAUSE/RESUME/CANCEL-
// Läufe über runWorkerTest; hier nur Adapter-Mechanik (Listener, Fan-out, terminate,
// Protokoll-Fehlerpfad) mit minimalen Ticks.
import { describe, it, expect, afterEach } from 'vitest';
import { HeadlessTestWorkerAdapter, createWorkerAdapter } from '../workerAdapter';
import {
  WORKER_PROTOCOL_VERSION,
  type WorkerMessageCommand,
  type WorkerMessageEvent,
} from '../../../types/workerMessages';

function waitForEvent(
  adapter: HeadlessTestWorkerAdapter,
  predicate: (evt: WorkerMessageEvent) => boolean,
  timeoutMs = 8000,
): Promise<WorkerMessageEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timeout nach ${timeoutMs}ms beim Warten auf Worker-Event`));
    }, timeoutMs);
    const unsubscribe = adapter.onMessage((evt) => {
      if (predicate(evt)) {
        clearTimeout(timer);
        unsubscribe();
        resolve(evt);
      }
    });
  });
}

function startCmd(runId: string, requestId: string, targetTicks = 2): WorkerMessageCommand {
  return {
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId,
    requestId,
    payload: { targetTicks, batchSize: 1 },
  };
}

describe('workerAdapter.branch', () => {
  const adapters: HeadlessTestWorkerAdapter[] = [];
  afterEach(() => {
    for (const a of adapters.splice(0)) {
      try {
        a.terminate();
      } catch {
        // bereits terminiert — egal
      }
    }
  });

  it('createWorkerAdapter liefert in node den Headless-Adapter', () => {
    const adapter = createWorkerAdapter();
    expect(adapter).toBeInstanceOf(HeadlessTestWorkerAdapter);
    adapters.push(adapter as HeadlessTestWorkerAdapter);
    (adapter as HeadlessTestWorkerAdapter).terminate();
    adapters.pop();
  });

  it('onMessage/emit stellt zu, unsubscribe beendet die Zustellung', () => {
    const adapter = new HeadlessTestWorkerAdapter();
    adapters.push(adapter);
    const seen: WorkerMessageEvent[] = [];
    const unsubscribe = adapter.onMessage((evt) => seen.push(evt));
    const evt: WorkerMessageEvent = {
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'QUEUED',
      runId: 'r1',
      requestId: 'q1',
      payload: { completedRuns: 0, totalRuns: 1, processedUnits: 0, totalUnits: 2 },
    };
    adapter.emit(evt);
    expect(seen).toHaveLength(1);
    unsubscribe();
    adapter.emit(evt);
    expect(seen).toHaveLength(1);
  });

  it('onError/emitError stellt zu, unsubscribe beendet die Zustellung', () => {
    const adapter = new HeadlessTestWorkerAdapter();
    adapters.push(adapter);
    const seen: Error[] = [];
    const unsubscribe = adapter.onError((err) => seen.push(err));
    const err = new Error('boom');
    adapter.emitError(err);
    expect(seen).toEqual([err]);
    unsubscribe();
    adapter.emitError(new Error('später'));
    expect(seen).toHaveLength(1);
  });

  it('globaler postMessage-Fan-out erreicht aktive Adapter, terminierte nicht', () => {
    const alive = new HeadlessTestWorkerAdapter();
    const dead = new HeadlessTestWorkerAdapter();
    adapters.push(alive);
    const aliveSeen: WorkerMessageEvent[] = [];
    const deadSeen: WorkerMessageEvent[] = [];
    alive.onMessage((evt) => aliveSeen.push(evt));
    dead.onMessage((evt) => deadSeen.push(evt));
    dead.terminate();
    const evt: WorkerMessageEvent = {
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'QUEUED',
      runId: 'fan',
      requestId: 'fan-1',
      payload: { completedRuns: 0, totalRuns: 1, processedUnits: 0, totalUnits: 1 },
    };
    (globalThis as { postMessage: (evt: WorkerMessageEvent) => void }).postMessage(evt);
    expect(aliveSeen).toHaveLength(1);
    expect(deadSeen).toHaveLength(0);
    alive.terminate();
    adapters.pop();
  });

  it('terminate leert Listener — danach keine Zustellung mehr', () => {
    const adapter = new HeadlessTestWorkerAdapter();
    let calls = 0;
    adapter.onMessage(() => calls++);
    adapter.onError(() => calls++);
    adapter.terminate();
    adapter.emit({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'QUEUED',
      runId: 'x',
      requestId: 'y',
      payload: { completedRuns: 0, totalRuns: 1, processedUnits: 0, totalUnits: 1 },
    });
    adapter.emitError(new Error('x'));
    expect(calls).toBe(0);
  });

  it('falsche Protokollversion über postMessage führt zu FAILED/INVALID_PROTOCOL_VERSION', async () => {
    const adapter = new HeadlessTestWorkerAdapter();
    adapters.push(adapter);
    const failed = waitForEvent(adapter, (e) => e.type === 'FAILED');
    adapter.postMessage({
      protocolVersion: '0.9',
      command: 'START',
      runId: 'bad-proto',
      requestId: 'req-bad',
    } as unknown as WorkerMessageCommand);
    const evt = await failed;
    expect(evt.type).toBe('FAILED');
    if (evt.type === 'FAILED') {
      expect(evt.payload!.error!.code).toBe('INVALID_PROTOCOL_VERSION');
      expect(evt.runId).toBe('bad-proto');
    }
  });

  it('minimaler START liefert QUEUED, STARTED und COMPLETED mit Korrelation', async () => {
    const adapter = new HeadlessTestWorkerAdapter();
    adapters.push(adapter);
    const runId = `branch-run-${Date.now()}`;
    const requestId = 'branch-req-1';
    const queued = waitForEvent(adapter, (e) => e.type === 'QUEUED' && e.runId === runId);
    const started = waitForEvent(adapter, (e) => e.type === 'STARTED' && e.runId === runId);
    const completed = waitForEvent(adapter, (e) => e.type === 'COMPLETED' && e.runId === runId);
    adapter.postMessage(startCmd(runId, requestId, 2));
    const [q, s, c] = await Promise.all([queued, started, completed]);
    expect(q.requestId).toBe(requestId);
    expect(s.requestId).toBe(requestId);
    expect(c.requestId).toBe(requestId);
    if (c.type === 'COMPLETED') {
      expect(c.payload!.processedUnits).toBe(2);
      expect(c.payload!.totalUnits).toBe(2);
      expect(c.payload!.finalState).toBeDefined();
    }
  });
});
