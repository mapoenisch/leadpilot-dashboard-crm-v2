// 067Q / G63 — Run-Steuerung: Pause, Fortsetzen, Abbruch, Retry und Resume aus
// einem validierten Snapshot (Spec §9, §12). Der Snapshot enthält den kompletten
// Tick-Zustand, damit ein Resume byte-identisch zum ununterbrochenen Lauf ist.
import type { TimeSeriesPoint } from './aggregation';
import type { CSQueueEntry } from './csQueue';
import type { SalesQueueEntry } from './salesQueue';
import type { RunManifest } from './scenario';
import type {
  HistoricalSimulationMetrics,
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationState,
} from './simulation';

export const RUN_RESUME_SNAPSHOT_SCHEMA = 'run-resume-snapshot/1' as const;

export type RunControlCommand = 'pause' | 'resume' | 'cancel' | 'retry' | 'resumeFromSnapshot';

// `pausing`: Worker hat pausiert, der Server-Snapshot wird noch gespeichert.
export type RunControlStatus =
  'queued' | 'running' | 'progress' | 'pausing' | 'paused' | 'completed' | 'cancelled' | 'failed';

export type RunControlErrorCode =
  'SIMULATION_CANCELLED' | 'SIMULATION_RESUME_INVALID' | 'FORBIDDEN' | 'INVALID_STATE_TRANSITION';

export class RunControlError extends Error {
  constructor(
    public code: RunControlErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RunControlError';
  }
}

/** Vollständiger, deterministischer Zwischenstand eines Runs an einer Tick-Grenze. */
export interface RunResumeSnapshotBody {
  schema: typeof RUN_RESUME_SNAPSHOT_SCHEMA;
  runId: string;
  organizationId?: string;
  scenarioVersionId: string;
  baselineHash?: string;
  modelVersion: string;
  schemaVersion: string;
  seed: number;
  /** Anzahl bereits verarbeiteter Ticks (0 < tick < targetTicks). */
  tick: number;
  targetTicks: number;
  rngState: number;
  correlationId: string;
  manifest: RunManifest;
  /** Historische Baseline-Kennzahlen, mit denen der Lauf gestartet wurde. */
  historicalMetrics: HistoricalSimulationMetrics;
  state: SimulationState;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  queueEntries: SalesQueueEntry[];
  csQueueEntries: CSQueueEntry[];
  /** Neueste zuerst — wie im ununterbrochenen Lauf. */
  events: SimulationEvent[];
  /** Zeitreihe inklusive Tick 0 bis zur Pause. */
  timeSeries: TimeSeriesPoint[];
}

export interface RunResumeSnapshot extends RunResumeSnapshotBody {
  /** SHA-256 über die kanonische Serialisierung aller übrigen Felder. */
  snapshotHash: string;
}
