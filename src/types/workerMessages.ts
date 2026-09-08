import { RunManifest } from './scenario';
import { TimeSeriesPoint } from './aggregation';
import {
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
  | 'STARTED'
  | 'PROGRESS'
  | 'PAUSED'
  | 'RESUMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type WorkerState =
  | 'CREATED'
  | 'STARTING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export interface WorkerCommandPayload {
  scenarioId?: string;
  scenarioVersionId?: string;
  manifest?: RunManifest;
  initialState?: SimulationState;
  targetTicks?: number;
  batchSize?: number;
  totalRuns?: number;
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
  finalState?: SimulationState;
  finalMetrics?: SimulationMetrics;
  leads?: SimulationLead[];
  opportunities?: SimulationOpportunity[];
  deals?: SimulationDeal[];
  activities?: SimulationActivity[];
  events?: SimulationEvent[];
  timeSeries?: TimeSeriesPoint[];
  error?: WorkerErrorPayload;
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
