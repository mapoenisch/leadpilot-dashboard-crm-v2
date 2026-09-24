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
import { WORKER_PROTOCOL_VERSION, type WorkerCommandType } from '../types/workerMessages';
import type { RunResumeSnapshotBody } from '../types/runControl';

// 067G / G50 — RunCoordinator: Der Produktpfad rechnet ausschließlich im Web
// Worker. Der Coordinator übersetzt Worker-Ereignisse in die Produktzustände
// queued → running → progress → completed/failed, prüft echten
// Berechnungsfortschritt (monotone Einheiten) und terminiert den Worker bei
// Abschluss, Fehler und Abbruch — kein Leak bei Navigation/Unmount.
// 067Q / G63: Pause/Fortsetzen/Abbruch kooperativ über das Worker-Protokoll;
// der Worker nimmt Befehle nur zwischen zwei Ticks an. PAUSED liefert einen
// vollständigen Zwischenstand, ein Abbruch endet mit SIMULATION_CANCELLED.

export type CoordinatorStatus =
  'queued' | 'running' | 'progress' | 'paused' | 'completed' | 'cancelled' | 'failed';

export interface CoordinatorEvent {
  status: CoordinatorStatus;
  processedUnits: number;
  totalUnits: number;
  correlationId: string;
  error?: { code: string; message: string };
  /** Nur bei `paused`: Zwischenstand an der Tick-Grenze (ohne Hash). */
  snapshot?: RunResumeSnapshotBody;
}

export interface CoordinatorRunInput {
  manifest: RunManifest;
  initialState?: SimulationState;
  historicalMetrics?: HistoricalSimulationMetrics;
  measures?: Measure[];
  targetTicks: number;
  correlationId: string;
  /** 067Q / G63: Start an einer gespeicherten, validierten Tick-Grenze. */
  resumeSnapshot?: RunResumeSnapshotBody;
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
  PAUSED: 'paused',
  RESUMED: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export class RunCoordinator {
  private readonly adapter: ISimulationWorkerAdapter;
  private readonly listeners = new Set<(evt: CoordinatorEvent) => void>();
  private settled = false;
  private lastProcessedUnits = 0;
  private totalUnits = 0;
  private correlationId = '';
  private runId = '';
  private status: CoordinatorStatus | null = null;
  private pendingCommand: 'PAUSE' | 'RESUME' | null = null;
  private lastSnapshot: RunResumeSnapshotBody | null = null;
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
    this.lastProcessedUnits = input.resumeSnapshot?.tick ?? 0;
    this.status = 'queued';
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
        ...(input.resumeSnapshot ? { resumeSnapshot: input.resumeSnapshot } : {}),
      },
    });
    return new Promise<WorkerRunResult>((resolve, reject) => {
      this.resolveDone = resolve;
      this.rejectDone = reject;
    });
  }

  public getStatus(): CoordinatorStatus | null {
    return this.status;
  }

  public getRunId(): string {
    return this.runId;
  }

  /** Zwischenstand der letzten Pause (null, solange nie pausiert wurde). */
  public getLastSnapshot(): RunResumeSnapshotBody | null {
    return this.lastSnapshot;
  }

  /**
   * Pause an der nächsten Tick-Grenze. Idempotent: bereits pausiert oder
   * Pause unterwegs → kein zweiter Befehl (Rückgabe false).
   */
  public pause(): boolean {
    if (this.settled || this.pendingCommand || this.status === 'paused') return false;
    return this.send('PAUSE');
  }

  /** Fortsetzen nur aus `paused`; sonst kein Befehl (Rückgabe false). */
  public resume(): boolean {
    if (this.settled || this.pendingCommand || this.status !== 'paused') return false;
    return this.send('RESUME');
  }

  /**
   * Abbruch (Benutzer, Navigation, Unmount): CANCEL an den Worker, danach sofort
   * terminieren — Ergebnis ist SIMULATION_CANCELLED, nie ein stiller Erfolg.
   */
  public cancel(): void {
    if (this.settled) return;
    this.adapter.postMessage(this.command('CANCEL'));
    this.fail(new CoordinatorError('SIMULATION_CANCELLED', 'Run abgebrochen.'), 'cancelled');
  }

  private command(command: WorkerCommandType) {
    return {
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command,
      runId: this.runId,
      requestId: this.correlationId,
    };
  }

  private send(command: 'PAUSE' | 'RESUME'): boolean {
    this.pendingCommand = command;
    this.adapter.postMessage(this.command(command));
    return true;
  }

  private emit(
    status: CoordinatorStatus,
    processedUnits: number,
    error?: { code: string; message: string },
    snapshot?: RunResumeSnapshotBody,
  ): void {
    const evt: CoordinatorEvent = {
      status,
      processedUnits,
      totalUnits: this.totalUnits,
      correlationId: this.correlationId,
      ...(error ? { error } : {}),
      ...(snapshot ? { snapshot } : {}),
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

  private fail(err: CoordinatorError, status: 'failed' | 'cancelled' = 'failed'): void {
    if (this.settled) return;
    this.status = status;
    this.emit(status, Math.max(0, this.lastProcessedUnits), {
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
      snapshot?: RunResumeSnapshotBody;
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

    if (status === 'cancelled') {
      this.fail(new CoordinatorError('SIMULATION_CANCELLED', 'Run abgebrochen.'), 'cancelled');
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
    if (evt.type === 'PAUSED' || evt.type === 'RESUMED') this.pendingCommand = null;
    this.status = status;
    if (status === 'paused') {
      this.lastSnapshot = evt.payload?.snapshot ?? null;
      this.emit(status, processedUnits, undefined, evt.payload?.snapshot);
      return;
    }
    this.emit(status, processedUnits);
  }
}
