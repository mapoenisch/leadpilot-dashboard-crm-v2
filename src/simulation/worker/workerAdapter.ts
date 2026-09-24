import { workerRunner } from './simulation.worker';
import { WorkerMessageCommand, WorkerMessageEvent } from '../../types/workerMessages';

export interface ISimulationWorkerAdapter {
  postMessage(command: WorkerMessageCommand): void;
  onMessage(listener: (evt: WorkerMessageEvent) => void): () => void;
  // 067G / G50 (Nacharbeit P1): Nativer Worker-Crash (error-Event statt
  // Protokollereignis) — der Coordinator behandelt ihn als FAILED und
  // terminiert (kein hängender Worker, kein offenes Promise).
  onError(listener: (err: Error) => void): () => void;
  terminate(): void;
}

/**
 * Real Web Worker Adapter for Browser environments.
 */
export class BrowserWorkerAdapter implements ISimulationWorkerAdapter {
  private worker: Worker;
  private listeners: Set<(evt: WorkerMessageEvent) => void> = new Set();
  private errorListeners: Set<(err: Error) => void> = new Set();

  constructor() {
    this.worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (e: MessageEvent) => {
      this.listeners.forEach((fn) => fn(e.data));
    };
    this.worker.onerror = (e: string | Event) => {
      const message =
        typeof e === 'string' ? e : e instanceof ErrorEvent ? e.message : 'Worker-Crash';
      const err = new Error(`Worker-Crash: ${message}`);
      this.errorListeners.forEach((fn) => fn(err));
    };
  }

  public postMessage(command: WorkerMessageCommand): void {
    this.worker.postMessage(command);
  }

  public onMessage(listener: (evt: WorkerMessageEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onError(listener: (err: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public terminate(): void {
    this.worker.terminate();
    this.listeners.clear();
    this.errorListeners.clear();
  }
}

const activeAdapters: Set<HeadlessTestWorkerAdapter> = new Set();
const globalObj =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
        ? window
        : null;

if (globalObj) {
  (globalObj as { postMessage?: (evt: WorkerMessageEvent) => void }).postMessage = (
    evt: WorkerMessageEvent,
  ) => {
    activeAdapters.forEach((adapter) => adapter.emit(evt));
  };
}

/**
 * In-Memory Test Worker Adapter for Node.js / tsx headless test environments.
 * Strictly used as a test adapter in test scripts where DOM Web Worker is absent.
 */
export class HeadlessTestWorkerAdapter implements ISimulationWorkerAdapter {
  private listeners: Set<(evt: WorkerMessageEvent) => void> = new Set();
  private errorListeners: Set<(err: Error) => void> = new Set();

  constructor() {
    activeAdapters.add(this);
  }

  public emit(evt: WorkerMessageEvent): void {
    this.listeners.forEach((fn) => fn(evt));
  }

  /** Nur für Tests: simuliert einen nativen Worker-Crash. */
  public emitError(err: Error): void {
    this.errorListeners.forEach((fn) => fn(err));
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

  public onError(listener: (err: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public terminate(): void {
    activeAdapters.delete(this);
    this.listeners.clear();
    this.errorListeners.clear();
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
