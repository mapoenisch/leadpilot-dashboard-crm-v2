import { workerRunner } from './simulation.worker';
import { WorkerMessageCommand, WorkerMessageEvent } from '../../types/workerMessages';

export interface ISimulationWorkerAdapter {
  postMessage(command: WorkerMessageCommand): void;
  onMessage(listener: (evt: WorkerMessageEvent) => void): () => void;
  terminate(): void;
}

/**
 * Real Web Worker Adapter for Browser environments.
 */
export class BrowserWorkerAdapter implements ISimulationWorkerAdapter {
  private worker: Worker;
  private listeners: Set<(evt: WorkerMessageEvent) => void> = new Set();

  constructor() {
    this.worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent) => {
      this.listeners.forEach((fn) => fn(e.data));
    };
  }

  public postMessage(command: WorkerMessageCommand): void {
    this.worker.postMessage(command);
  }

  public onMessage(listener: (evt: WorkerMessageEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public terminate(): void {
    this.worker.terminate();
    this.listeners.clear();
  }
}

const activeAdapters: Set<HeadlessTestWorkerAdapter> = new Set();
const globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : null));

if (globalObj) {
  (globalObj as any).postMessage = (evt: WorkerMessageEvent) => {
    activeAdapters.forEach((adapter) => adapter.emit(evt));
  };
}

/**
 * In-Memory Test Worker Adapter for Node.js / tsx headless test environments.
 * Strictly used as a test adapter in test scripts where DOM Web Worker is absent.
 */
export class HeadlessTestWorkerAdapter implements ISimulationWorkerAdapter {
  private listeners: Set<(evt: WorkerMessageEvent) => void> = new Set();

  constructor() {
    activeAdapters.add(this);
  }

  public emit(evt: WorkerMessageEvent): void {
    this.listeners.forEach((fn) => fn(evt));
  }

  public postMessage(command: WorkerMessageCommand): void {
    setTimeout(() => {
      workerRunner.handleMessage(command);
    }, 0);
  }

  public onMessage(listener: (evt: WorkerMessageEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public terminate(): void {
    activeAdapters.delete(this);
    this.listeners.clear();
  }
}

/**
 * Factory function creating appropriate Worker Adapter based on execution environment.
 */
export function createWorkerAdapter(): ISimulationWorkerAdapter {
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    return new BrowserWorkerAdapter();
  }
  return new HeadlessTestWorkerAdapter();
}
