// Branch2-Tests: workerAdapter Browser-Pfad jenseits von
// workerAdapter.branch.vitest.ts (dort nur Headless-Mechanik: Listener,
// Fan-out, terminate, Protokoll-Fehler, Mini-START). Hier nur der dort
// fehlende createWorkerAdapter-Browser-Zweig mit gestubbtem Worker-Global:
// Delegation, onmessage-Fan-out, onerror-Varianten (String / ErrorEvent /
// sonstiges) und terminate. Window ohne Worker fällt auf Headless zurück.
// KEIN echter Worker, Globals werden je Test zurückgesetzt.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BrowserWorkerAdapter,
  HeadlessTestWorkerAdapter,
  createWorkerAdapter,
} from '../workerAdapter';
import { WORKER_PROTOCOL_VERSION, type WorkerMessageEvent } from '../../../types/workerMessages';

class FakeWorker {
  public onmessage: ((e: { data: WorkerMessageEvent }) => void) | null = null;
  public onerror: ((e: unknown) => void) | null = null;
  public posted: unknown[] = [];
  public terminated = false;
  constructor(
    public url: URL,
    public opts: { type: string },
  ) {}
  postMessage(msg: unknown): void {
    this.posted.push(msg);
  }
  terminate(): void {
    this.terminated = true;
  }
}

class FakeErrorEvent {
  constructor(public message: string) {}
}

describe('workerAdapter.branch2', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as Record<string, unknown>).ErrorEvent = FakeErrorEvent;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as Record<string, unknown>).ErrorEvent;
    vi.restoreAllMocks();
  });

  it('window ohne Worker fällt auf Headless zurück', () => {
    vi.stubGlobal('window', {});
    const adapter = createWorkerAdapter();
    expect(adapter).toBeInstanceOf(HeadlessTestWorkerAdapter);
    (adapter as HeadlessTestWorkerAdapter).terminate();
  });

  it('window mit Worker erzeugt den Browser-Adapter und delegiert postMessage', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', FakeWorker);
    const adapter = createWorkerAdapter();
    expect(adapter).toBeInstanceOf(BrowserWorkerAdapter);
    const browser = adapter as BrowserWorkerAdapter;
    const worker = (browser as unknown as { worker: FakeWorker }).worker;
    expect(worker).toBeInstanceOf(FakeWorker);
    browser.postMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'CANCEL',
      runId: 'r-x',
      requestId: 'q-x',
    });
    expect(worker.posted).toHaveLength(1);
    browser.terminate();
    expect(worker.terminated).toBe(true);
  });

  it('onmessage fächert an Listener auf, unsubscribe stoppt', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', FakeWorker);
    const adapter = new BrowserWorkerAdapter();
    const worker = (adapter as unknown as { worker: FakeWorker }).worker;
    const seen: WorkerMessageEvent[] = [];
    const unsubscribe = adapter.onMessage((e) => seen.push(e));
    const evt = {
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'QUEUED',
      runId: 'r-fan',
      requestId: 'q-fan',
      payload: { completedRuns: 0, totalRuns: 1, processedUnits: 0, totalUnits: 1 },
    } as WorkerMessageEvent;
    worker.onmessage?.({ data: evt });
    expect(seen).toEqual([evt]);
    unsubscribe();
    worker.onmessage?.({ data: evt });
    expect(seen).toHaveLength(1);
    adapter.terminate();
  });

  it('onerror mit String meldet dessen Nachricht', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', FakeWorker);
    const adapter = new BrowserWorkerAdapter();
    const worker = (adapter as unknown as { worker: FakeWorker }).worker;
    const seen: Error[] = [];
    adapter.onError((e) => seen.push(e));
    worker.onerror?.('kaputt');
    expect(seen).toHaveLength(1);
    expect(seen[0]?.message).toBe('Worker-Crash: kaputt');
    adapter.terminate();
  });

  it('onerror mit ErrorEvent meldet dessen Nachricht', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', FakeWorker);
    const adapter = new BrowserWorkerAdapter();
    const worker = (adapter as unknown as { worker: FakeWorker }).worker;
    const seen: Error[] = [];
    adapter.onError((e) => seen.push(e));
    worker.onerror?.(new FakeErrorEvent('boom-event'));
    expect(seen).toHaveLength(1);
    expect(seen[0]?.message).toBe('Worker-Crash: boom-event');
    adapter.terminate();
  });

  it('onerror mit sonstigem Objekt fällt auf Worker-Crash zurück', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', FakeWorker);
    const adapter = new BrowserWorkerAdapter();
    const worker = (adapter as unknown as { worker: FakeWorker }).worker;
    const seen: Error[] = [];
    const unsubscribe = adapter.onError((e) => seen.push(e));
    worker.onerror?.({ type: 'error' });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.message).toBe('Worker-Crash: Worker-Crash');
    unsubscribe();
    worker.onerror?.({ type: 'error' });
    expect(seen).toHaveLength(1);
    adapter.terminate();
  });
});
