import { createWorkerAdapter, type ISimulationWorkerAdapter } from './worker/workerAdapter';
import type { RunManifest } from '../types/scenario';
import type { HistoricalSimulationMetrics } from '../types/simulation';
import type { Measure } from '../types/measure';
import type {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationMetrics,
  SimulationOpportunity,
  SimulationState,
} from '../types/simulation';
import type { TimeSeriesPoint } from '../types/aggregation';
import { WORKER_PROTOCOL_VERSION } from '../types/workerMessages';

// 067G / G50 — RunCoordinator: Der Produktpfad rechnet ausschließlich im Web
// Worker. Der Coordinator übersetzt Worker-Ereignisse in die Produktzustände
// queued → running → progress → completed/failed, prüft echten
// Berechnungsfortschritt (monotone Einheiten) und terminiert den Worker bei
// Abschluss, Fehler und Abbruch — kein Leak bei Navigation/Unmount.

export type CoordinatorStatus = 'queued' | 'running' | 'progress' | 'completed' | 'failed';

export interface CoordinatorEvent {
  status: CoordinatorStatus;
  processedUnits: number;
  totalUnits: number;
  correlationId: string;
  error?: { code: string; message: string };
}

export interface CoordinatorRunInput {
  manifest: RunManifest;
  initialState?: SimulationState;
  historicalMetrics?: HistoricalSimulationMetrics;
  measures?: Measure[];
  targetTicks: number;
  correlationId: string;
}

export interface WorkerRunResult {
  finalState: SimulationState;
  // 067G / G50 (Nacharbeit P1): PRNG-Endzustand aus dem Worker — der Service
  // persistiert ihn statt des unveränderten Main-Thread-Starts.
  rngState: number;
  finalMetrics?: SimulationMetrics;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  events: SimulationEvent[];
  timeSeries: TimeSeriesPoint[];
}

export class CoordinatorError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CoordinatorError';
  }
}

const STATUS_BY_EVENT = {
  QUEUED: 'queued',
  STARTED: 'running',
  PROGRESS: 'progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'failed',
} as const;

export class RunCoordinator {
  private readonly adapter: ISimulationWorkerAdapter;
  private readonly listeners = new Set<(evt: CoordinatorEvent) => void>();
  private settled = false;
  private lastProcessedUnits = 0;
  private totalUnits = 0;
  private correlationId = '';
  private runId = '';
  private resolveDone: ((result: WorkerRunResult) => void) | null = null;
  private rejectDone: ((err: CoordinatorError) => void) | null = null;
  private unsubscribeAdapter: (() => void) | null = null;
  private unsubscribeAdapterError: (() => void) | null = null;

  constructor(adapter?: ISimulationWorkerAdapter) {
    this.adapter = adapter ?? createWorkerAdapter();
  }

  public onEvent(listener: (evt: CoordinatorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public execute(input: CoordinatorRunInput): Promise<WorkerRunResult> {
    this.runId = input.manifest.runId;
    this.correlationId = input.correlationId;
    this.totalUnits = input.targetTicks;
    this.unsubscribeAdapter = this.adapter.onMessage((evt) => this.handleWorkerEvent(evt));
    // 067G / G50 (Nacharbeit P1): Nativer Crash kommt als error-Event statt
    // Protokollereignis — als FAILED behandeln und terminieren.
    this.unsubscribeAdapterError = this.adapter.onError((err) =>
      this.fail(new CoordinatorError('WORKER_CRASH', err.message)),
    );
    this.adapter.postMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'START',
      runId: input.manifest.runId,
      requestId: input.correlationId,
      payload: {
        manifest: input.manifest,
        initialState: input.initialState,
        historicalMetrics: input.historicalMetrics,
        measures: input.measures,
        targetTicks: input.targetTicks,
        totalRuns: 1,
      },
    });
    return new Promise<WorkerRunResult>((resolve, reject) => {
      this.resolveDone = resolve;
      this.rejectDone = reject;
    });
  }

  /** Abbruch (Navigation/Unmount): Worker terminieren, Promise verwerfen. */
  public cancel(): void {
    if (this.settled) return;
    this.fail(new CoordinatorError('CANCELLED', 'Run abgebrochen.'));
  }

  private emit(
    status: CoordinatorStatus,
    processedUnits: number,
    error?: { code: string; message: string },
  ): void {
    const evt: CoordinatorEvent = {
      status,
      processedUnits,
      totalUnits: this.totalUnits,
      correlationId: this.correlationId,
      ...(error ? { error } : {}),
    };
    for (const fn of [...this.listeners]) fn(evt);
  }

  private teardown(): void {
    this.settled = true;
    this.unsubscribeAdapter?.();
    this.unsubscribeAdapter = null;
    this.unsubscribeAdapterError?.();
    this.unsubscribeAdapterError = null;
    this.adapter.terminate();
  }

  private fail(err: CoordinatorError): void {
    if (this.settled) return;
    this.emit('failed', Math.max(0, this.lastProcessedUnits), {
      code: err.code,
      message: err.message,
    });
    const reject = this.rejectDone;
    this.teardown();
    reject?.(err);
  }

  private handleWorkerEvent(evt: {
    type: string;
    runId: string;
    payload?: {
      processedUnits?: number;
      totalUnits?: number;
      error?: { code: string; message: string };
      finalState?: SimulationState;
      rngState?: number;
      finalMetrics?: SimulationMetrics;
      leads?: SimulationLead[];
      opportunities?: SimulationOpportunity[];
      deals?: SimulationDeal[];
      activities?: SimulationActivity[];
      events?: SimulationEvent[];
      timeSeries?: TimeSeriesPoint[];
    };
  }): void {
    if (this.settled || evt.runId !== this.runId) return;
    const status = STATUS_BY_EVENT[evt.type as keyof typeof STATUS_BY_EVENT];
    if (!status) return;

    if (status === 'completed') {
      const finalState = evt.payload?.finalState;
      const rngState = evt.payload?.rngState;
      if (!finalState) {
        this.fail(new CoordinatorError('INVALID_RESULT', 'COMPLETED ohne finalState.'));
        return;
      }
      if (typeof rngState !== 'number' || !Number.isFinite(rngState)) {
        this.fail(new CoordinatorError('INVALID_RESULT', 'COMPLETED ohne PRNG-Endzustand.'));
        return;
      }
      this.emit('completed', this.totalUnits);
      const resolve = this.resolveDone;
      const result: WorkerRunResult = {
        finalState,
        rngState,
        finalMetrics: evt.payload?.finalMetrics,
        leads: evt.payload?.leads ?? [],
        opportunities: evt.payload?.opportunities ?? [],
        deals: evt.payload?.deals ?? [],
        activities: evt.payload?.activities ?? [],
        events: evt.payload?.events ?? [],
        timeSeries: evt.payload?.timeSeries ?? [],
      };
      this.teardown();
      resolve?.(result);
      return;
    }

    if (status === 'failed') {
      const code = evt.payload?.error?.code ?? 'WORKER_FAILED';
      const message = evt.payload?.error?.message ?? 'Worker meldete einen Fehler.';
      this.fail(new CoordinatorError(code, message));
      return;
    }

    // Laufende Zustände: Fortschritt muss echt sein — monotone Einheiten
    // innerhalb der Gesamtmenge. Sonst Protokollverstoß (kein Timer-Blindflug).
    const processedUnits =
      typeof evt.payload?.processedUnits === 'number'
        ? evt.payload.processedUnits
        : this.lastProcessedUnits;
    const totalUnits =
      typeof evt.payload?.totalUnits === 'number' ? evt.payload.totalUnits : this.totalUnits;
    if (
      !Number.isFinite(processedUnits) ||
      !Number.isFinite(totalUnits) ||
      totalUnits <= 0 ||
      processedUnits < 0 ||
      processedUnits > totalUnits ||
      processedUnits < this.lastProcessedUnits
    ) {
      this.fail(
        new CoordinatorError(
          'INVALID_PROGRESS',
          `Synthetischer Fortschritt abgewiesen (${this.lastProcessedUnits} → ${String(evt.payload?.processedUnits)} von ${String(evt.payload?.totalUnits)}).`,
        ),
      );
      return;
    }
    this.lastProcessedUnits = processedUnits;
    if (totalUnits !== this.totalUnits) this.totalUnits = totalUnits;
    this.emit(status, processedUnits);
  }
}
