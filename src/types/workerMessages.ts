import { RunManifest } from './scenario';
import { TimeSeriesPoint } from './aggregation';
import { Measure } from './measure';
import type { RunResumeSnapshotBody } from './runControl';
import {
  HistoricalSimulationMetrics,
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationMetrics,
  SimulationOpportunity,
  SimulationState,
} from './simulation';

export const WORKER_PROTOCOL_VERSION = '1.0' as const;

export type WorkerCommandType = 'START' | 'PAUSE' | 'RESUME' | 'CANCEL';

export type WorkerEventType =
  'QUEUED' | 'STARTED' | 'PROGRESS' | 'PAUSED' | 'RESUMED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export type WorkerState =
  'CREATED' | 'STARTING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface WorkerCommandPayload {
  scenarioId?: string;
  scenarioVersionId?: string;
  manifest?: RunManifest;
  initialState?: SimulationState;
  // 067G / G50: Historische Kennzahlen und Maßnahmen aus dem Baseline-Input —
  // der Worker rechnet denselben deterministischen Pfad wie der Service.
  historicalMetrics?: HistoricalSimulationMetrics;
  measures?: Measure[];
  targetTicks?: number;
  batchSize?: number;
  totalRuns?: number;
  // 067Q / G63: Start an einer gespeicherten Tick-Grenze statt bei Tick 0.
  resumeSnapshot?: RunResumeSnapshotBody;
}

export interface WorkerErrorPayload {
  errorId: string;
  code: string;
  message: string;
  recoverable: boolean;
}

export interface WorkerEventPayload {
  completedRuns?: number;
  totalRuns?: number;
  // 067G / G50: Echte Berechnungseinheiten (Ticks) statt Timer — monoton,
  // vom Coordinator gegen synthetischen Fortschritt geprüft.
  processedUnits?: number;
  totalUnits?: number;
  correlationId?: string;
  // 067G / G50 (Nacharbeit P1): PRNG-Endzustand des Worker-Laufs — der
  // Service persistiert ihn statt des unveränderten Main-Thread-Starts.
  rngState?: number;
  finalState?: SimulationState;
  finalMetrics?: SimulationMetrics;
  leads?: SimulationLead[];
  opportunities?: SimulationOpportunity[];
  deals?: SimulationDeal[];
  activities?: SimulationActivity[];
  events?: SimulationEvent[];
  timeSeries?: TimeSeriesPoint[];
  error?: WorkerErrorPayload;
  // 067Q / G63: Vollständiger Zwischenstand bei PAUSED (ohne Hash — den
  // berechnet der Main-Thread über die kanonische Serialisierung).
  snapshot?: RunResumeSnapshotBody;
}

export interface WorkerMessageCommand {
  protocolVersion: typeof WORKER_PROTOCOL_VERSION;
  command: WorkerCommandType;
  runId: string;
  requestId: string;
  payload?: WorkerCommandPayload;
}

export interface WorkerMessageEvent {
  protocolVersion: typeof WORKER_PROTOCOL_VERSION;
  type: WorkerEventType;
  runId: string;
  requestId: string;
  payload?: WorkerEventPayload;
}
