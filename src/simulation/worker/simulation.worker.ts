import { SimulationEngine } from '../engine';
import { SimulationEventRules, SimulationClock } from '../eventRules';
import { DeterministicRNG } from '../prng';
import { EffectiveParameterResolver } from '../effectiveParameterResolver';
import { DEFAULT_BASE_2026_PARAMETERS } from '../scenarioRepository';
import { DEFAULT_HISTORICAL_METRICS } from '../../services/data/baselineMapper';
import {
  WORKER_PROTOCOL_VERSION,
  WorkerErrorPayload,
  WorkerMessageCommand,
  WorkerMessageEvent,
  WorkerState,
} from '../../types/workerMessages';
import type { RunManifest } from '../../types/scenario';
import { TimeSeriesPoint } from '../../types/aggregation';
import {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationState,
} from '../../types/simulation';
import { SalesQueueEntry } from '../../types/salesQueue';
import { CSQueueEntry } from '../../types/csQueue';
import type { Measure } from '../../types/measure';
import type { RunResumeSnapshotBody } from '../../types/runControl';
import { tickTimeSeriesPoint } from '../scenarioTickRunner';
import { buildWorkerSnapshot, restoreWorkerSnapshot, type WorkerRunFields } from './workerSnapshot';

class SimulationWorkerRunner {
  private state: WorkerState = 'CREATED';
  private runId = '';
  private requestId = '';
  private manifest: RunManifest | null = null;
  private rng: DeterministicRNG | null = null;
  private errorSeq = 0;
  private currentRunId = 'nomanifest';

  private currentState: SimulationState | null = null;
  private currentTick = 0;
  private targetTicks = 50;
  private batchSize = 10;
  private correlationId = '';
  private historicalMetrics = DEFAULT_HISTORICAL_METRICS;
  private baseParameters = DEFAULT_BASE_2026_PARAMETERS;
  private measures: Measure[] = [];

  private completedRuns = 0;
  private totalRuns = 1;

  private leads: SimulationLead[] = [];
  private opportunities: SimulationOpportunity[] = [];
  private deals: SimulationDeal[] = [];
  private activities: SimulationActivity[] = [];
  private events: SimulationEvent[] = [];
  private timeSeries: TimeSeriesPoint[] = [];
  private queueEntries: SalesQueueEntry[] = [];
  private csQueueEntries: CSQueueEntry[] = [];

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    if (typeof self !== 'undefined' && 'addEventListener' in self) {
      self.addEventListener('message', (evt: MessageEvent) => {
        this.handleMessage(evt.data as WorkerMessageCommand);
      });
    }
  }

  public handleMessage(cmd: WorkerMessageCommand): void {
    // Protocol version check
    if (!cmd || cmd.protocolVersion !== WORKER_PROTOCOL_VERSION) {
      this.emitError(cmd?.runId || 'unknown', cmd?.requestId || 'unknown', {
        errorId: `err-${this.currentRunId}-t${this.currentTick}-${this.errorSeq++}`,
        code: 'INVALID_PROTOCOL_VERSION',
        message: `Inkompatible Nachricht. Protokollversion "1.0" erforderlich.`,
        recoverable: false,
      });
      return;
    }

    switch (cmd.command) {
      case 'START':
        this.handleStart(cmd);
        break;
      case 'PAUSE':
        this.handlePause(cmd);
        break;
      case 'RESUME':
        this.handleResume(cmd);
        break;
      case 'CANCEL':
        this.handleCancel(cmd);
        break;
      default:
        this.emitError(cmd.runId, cmd.requestId, {
          errorId: `err-${this.currentRunId}-t${this.currentTick}-${this.errorSeq++}`,
          code: 'UNKNOWN_COMMAND',
          message: `Unbekannter Befehl "${(cmd as { command: string }).command}".`,
          recoverable: false,
        });
    }
  }

  private handleStart(cmd: WorkerMessageCommand): void {
    if (!cmd.payload || !cmd.runId) {
      this.emitError(cmd.runId || 'unknown', cmd.requestId, {
        errorId: `err-${this.currentRunId}-t${this.currentTick}-${this.errorSeq++}`,
        code: 'MISSING_PAYLOAD',
        message: 'START-Befehl erfordert eine runId und ein valides Payload.',
        recoverable: false,
      });
      return;
    }

    const { manifest, initialState, targetTicks, batchSize, totalRuns } = cmd.payload;

    this.currentRunId = manifest?.runId ?? cmd.runId ?? 'nomanifest';
    const seed = manifest ? manifest.seed : initialState ? initialState.seed : 42;
    this.runId = cmd.runId;
    this.requestId = cmd.requestId;
    this.manifest = manifest || null;
    this.rng = new DeterministicRNG(seed);
    // 067G / G50: Baseline-Metriken und Maßnahmen aus dem Coordinator —
    // derselbe deterministische Pfad wie der Service (Anker als Fallback für
    // Aufrufer ohne Baseline-Kontext).
    this.correlationId = manifest?.correlationId ?? '';
    this.historicalMetrics = cmd.payload?.historicalMetrics ?? DEFAULT_HISTORICAL_METRICS;
    this.baseParameters = manifest?.parameters ?? DEFAULT_BASE_2026_PARAMETERS;
    this.measures = cmd.payload?.measures ?? [];

    this.targetTicks = targetTicks || (manifest ? manifest.targetTicks : 50);
    this.batchSize = batchSize || 10;
    this.completedRuns = 0;
    this.totalRuns = totalRuns || 1;
    this.currentTick = 0;

    this.leads = [];
    this.opportunities = [];
    this.deals = [];
    this.activities = [];
    this.events = [];
    this.timeSeries = [];
    this.queueEntries = [];
    this.csQueueEntries = [];

    const initialMetrics = SimulationEventRules.recalculateMetrics([], [], []);
    const simulatedDate = SimulationClock.formatSimulatedDate(0);

    this.currentState = initialState
      ? { ...initialState }
      : {
          isRunning: true,
          tickCount: 0,
          dayIndex: 0,
          simulatedDate,
          seed,
          speed: 1,
          intervalMs: 12000,
          lastTickTimestamp: `${simulatedDate} (Tick #0)`,
          simulatedAt: simulatedDate,
          metrics: initialMetrics,
          totalLeadsGenerated: 0,
          totalDealsWon: 0,
          currentARR: initialMetrics.liveARR,
        };

    // 067Q / G63: Resume an einer gespeicherten Tick-Grenze — PRNG, Zustand
    // und alle Sammlungen exakt wie beim Pausieren, damit der Rest des Laufs
    // byte-identisch zum ununterbrochenen Lauf rechnet.
    const resume = cmd.payload.resumeSnapshot;
    if (resume) {
      Object.assign(this, restoreWorkerSnapshot(resume));
    } else {
      this.timeSeries.push({
        tick: 0,
        dayIndex: 0,
        simulatedDate,
        metrics: {
          arr: this.currentState.metrics?.liveARR ?? 0,
          mrr: this.currentState.metrics?.liveMRR ?? 0,
          customers: this.currentState.metrics?.liveCustomers ?? 0,
          wonDeals: this.currentState.metrics?.liveWonDeals ?? 0,
        },
      });
    }

    this.state = 'RUNNING';

    // 067G / G50: Annahme bestätigt (QUEUED), danach startet die Berechnung.
    this.postEvent({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'QUEUED',
      runId: this.runId,
      requestId: this.requestId,
      payload: {
        completedRuns: this.completedRuns,
        totalRuns: this.totalRuns,
        processedUnits: this.currentTick,
        totalUnits: this.targetTicks,
        correlationId: this.correlationId,
      },
    });

    this.postEvent({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'STARTED',
      runId: this.runId,
      requestId: this.requestId,
      payload: {
        completedRuns: this.completedRuns,
        totalRuns: this.totalRuns,
      },
    });

    this.runBatchLoop();
  }

  private handlePause(cmd: WorkerMessageCommand): void {
    if (this.state !== 'RUNNING') {
      return;
    }

    this.state = 'PAUSED';
    if (this.currentState) {
      this.currentState.isRunning = false;
    }

    this.postEvent({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'PAUSED',
      runId: this.runId,
      requestId: cmd.requestId,
      payload: {
        completedRuns: this.completedRuns,
        totalRuns: this.totalRuns,
        processedUnits: this.currentTick,
        totalUnits: this.targetTicks,
        correlationId: this.correlationId,
        finalState: this.currentState ? { ...this.currentState } : undefined,
        snapshot: this.buildSnapshot(),
      },
    });
  }

  private buildSnapshot(): RunResumeSnapshotBody | undefined {
    // Ohne Manifest (Legacy-Start ohne Run-Kontext) gibt es keinen Snapshot.
    if (!this.manifest || !this.currentState || !this.rng) return undefined;
    // Feldnamen des Runners entsprechen WorkerRunFields (siehe workerSnapshot).
    return buildWorkerSnapshot(this as unknown as WorkerRunFields);
  }

  private handleResume(cmd: WorkerMessageCommand): void {
    if (this.state !== 'PAUSED') {
      this.emitError(cmd.runId, cmd.requestId, {
        errorId: `err-${this.currentRunId}-t${this.currentTick}-${this.errorSeq++}`,
        code: 'INVALID_STATE_TRANSITION',
        message: `RESUME nur aus Zustand PAUSED möglich (Aktueller Zustand: ${this.state}).`,
        recoverable: true,
      });
      return;
    }

    this.state = 'RUNNING';
    if (this.currentState) {
      this.currentState.isRunning = true;
    }

    this.postEvent({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'RESUMED',
      runId: this.runId,
      requestId: cmd.requestId,
      payload: {
        completedRuns: this.completedRuns,
        totalRuns: this.totalRuns,
      },
    });

    this.runBatchLoop();
  }

  private handleCancel(cmd: WorkerMessageCommand): void {
    if (this.state === 'COMPLETED' || this.state === 'CANCELLED') {
      return; // Idempotent
    }

    this.state = 'CANCELLED';
    if (this.currentState) {
      this.currentState.isRunning = false;
    }

    this.postEvent({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'CANCELLED',
      runId: this.runId,
      requestId: cmd.requestId,
      payload: {
        completedRuns: this.completedRuns,
        totalRuns: this.totalRuns,
        processedUnits: this.currentTick,
        totalUnits: this.targetTicks,
        correlationId: this.correlationId,
      },
    });
  }

  private runBatchLoop(): void {
    if (this.state !== 'RUNNING' || !this.currentState || !this.rng) {
      return;
    }

    let ticksInBatch = 0;
    // Maßnahmen pro Tick auflösen — identisch zum Service-Pfad, aber nur mit
    // Manifest-Kontext. Ohne Manifest (Legacy/Test-Aufrufe) gelten exakt die
    // früheren undefined-Defaults (Parität, workerIntegrity TEST I).
    const hasRunContext = this.manifest !== null;
    const resolver = hasRunContext
      ? new EffectiveParameterResolver(this.baseParameters, this.measures)
      : null;

    while (
      this.state === 'RUNNING' &&
      this.currentTick < this.targetTicks &&
      ticksInBatch < this.batchSize
    ) {
      const eff = resolver?.at(this.currentTick);

      const output = SimulationEngine.executeTick({
        state: this.currentState,
        rng: this.rng,
        leads: this.leads,
        opportunities: this.opportunities,
        deals: this.deals,
        activities: this.activities,
        historicalMetrics: this.historicalMetrics,
        salesRepCount: eff?.salesRepCount ?? 2,
        csRepCount: eff?.csRepCount ?? 2,
        churnRateMonthly: eff?.churnRateMonthly ?? 2.8,
        marketingBudgetYearly: eff?.marketingBudgetYearly,
        channelMix: eff?.channelMix,
        trialToPaidConversion: eff?.trialToPaidConversion,
        salesCycleDays: eff?.salesCycleDays,
        discountPercent: eff?.discountPercent,
        queueEntries: this.queueEntries || [],
        csQueueEntries: this.csQueueEntries || [],
      });

      this.currentState = output.state;
      this.leads = output.leads;
      this.opportunities = output.opportunities;
      this.deals = output.deals;
      this.activities = output.activities;
      if (output.queueEntries) {
        this.queueEntries = output.queueEntries;
      }
      if (output.csQueueEntries) {
        this.csQueueEntries = output.csQueueEntries;
      }

      for (const evt of output.newEvents) {
        this.events.unshift(evt);
      }

      this.timeSeries.push(tickTimeSeriesPoint(this.currentState));

      this.currentTick += 1;
      ticksInBatch += 1;
    }

    if (this.state !== 'RUNNING') {
      return;
    }

    // Check completion condition
    if (this.currentTick >= this.targetTicks) {
      this.completedRuns = 1; // Strict completedRuns metric
      this.state = 'COMPLETED';
      this.currentState.isRunning = false;

      // Progress event: 1 / 1
      this.postEvent({
        protocolVersion: WORKER_PROTOCOL_VERSION,
        type: 'PROGRESS',
        runId: this.runId,
        requestId: this.requestId,
        payload: {
          completedRuns: 1,
          totalRuns: 1,
          processedUnits: this.currentTick,
          totalUnits: this.targetTicks,
          correlationId: this.correlationId,
        },
      });

      // Completed event
      this.postEvent({
        protocolVersion: WORKER_PROTOCOL_VERSION,
        type: 'COMPLETED',
        runId: this.runId,
        requestId: this.requestId,
        payload: {
          completedRuns: 1,
          totalRuns: 1,
          processedUnits: this.currentTick,
          totalUnits: this.targetTicks,
          correlationId: this.correlationId,
          // 067G / G50 (Nacharbeit P1): PRNG-Endzustand für Audit/Persistenz.
          rngState: this.rng ? this.rng.getState() : 0,
          finalState: this.currentState,
          finalMetrics: this.currentState.metrics,
          leads: this.leads,
          opportunities: this.opportunities,
          deals: this.deals,
          activities: this.activities,
          events: this.events,
          timeSeries: this.timeSeries,
        },
      });
    } else {
      // Send progress event
      this.postEvent({
        protocolVersion: WORKER_PROTOCOL_VERSION,
        type: 'PROGRESS',
        runId: this.runId,
        requestId: this.requestId,
        payload: {
          completedRuns: 0,
          totalRuns: 1,
          processedUnits: this.currentTick,
          totalUnits: this.targetTicks,
          correlationId: this.correlationId,
        },
      });

      // Schedule next batch
      setTimeout(() => this.runBatchLoop(), 0);
    }
  }

  private emitError(runId: string, requestId: string, error: WorkerErrorPayload): void {
    this.state = 'FAILED';
    this.postEvent({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'FAILED',
      runId,
      requestId,
      payload: { error },
    });
  }

  private postEvent(evt: WorkerMessageEvent): void {
    // globalThis ist im Worker, im Browser und in Node vorhanden (ES2020).
    const postMessage = (globalThis as { postMessage?: unknown }).postMessage;
    if (typeof postMessage === 'function') {
      (postMessage as (message: WorkerMessageEvent) => void)(evt);
    }
  }
}

// Instantiate worker runner
export const workerRunner = new SimulationWorkerRunner();
