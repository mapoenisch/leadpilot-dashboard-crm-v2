// 067Q / G63: Zwischenstand eines Worker-Laufs an einer Tick-Grenze. Tiefe
// Kopien in beide Richtungen, damit weder der Headless-Adapter (ohne structured
// clone) noch spätere Ticks den gesicherten Stand verändern.
import { DeterministicRNG } from '../prng';
import type { TimeSeriesPoint } from '../../types/aggregation';
import type { CSQueueEntry } from '../../types/csQueue';
import type { SalesQueueEntry } from '../../types/salesQueue';
import type { RunManifest } from '../../types/scenario';
import { RUN_RESUME_SNAPSHOT_SCHEMA, type RunResumeSnapshotBody } from '../../types/runControl';
import type {
  HistoricalSimulationMetrics,
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationState,
} from '../../types/simulation';

export interface WorkerRunFields {
  runId: string;
  manifest: RunManifest;
  rng: DeterministicRNG;
  currentTick: number;
  targetTicks: number;
  correlationId: string;
  historicalMetrics: HistoricalSimulationMetrics;
  currentState: SimulationState;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  queueEntries: SalesQueueEntry[];
  csQueueEntries: CSQueueEntry[];
  events: SimulationEvent[];
  timeSeries: TimeSeriesPoint[];
}

export function buildWorkerSnapshot(f: WorkerRunFields): RunResumeSnapshotBody {
  return structuredClone({
    schema: RUN_RESUME_SNAPSHOT_SCHEMA,
    runId: f.runId,
    organizationId: f.manifest.organizationId,
    scenarioVersionId: f.manifest.scenarioVersionId,
    baselineHash: f.manifest.baselineHash,
    modelVersion: f.manifest.modelVersion,
    schemaVersion: f.manifest.schemaVersion,
    seed: f.manifest.seed,
    tick: f.currentTick,
    targetTicks: f.targetTicks,
    rngState: f.rng.getState(),
    correlationId: f.correlationId,
    manifest: f.manifest,
    historicalMetrics: f.historicalMetrics,
    state: f.currentState,
    leads: f.leads,
    opportunities: f.opportunities,
    deals: f.deals,
    activities: f.activities,
    queueEntries: f.queueEntries,
    csQueueEntries: f.csQueueEntries,
    events: f.events,
    timeSeries: f.timeSeries,
  }) as RunResumeSnapshotBody;
}

export type RestoredWorkerFields = Omit<
  WorkerRunFields,
  'runId' | 'manifest' | 'targetTicks' | 'correlationId'
>;

export function restoreWorkerSnapshot(snapshot: RunResumeSnapshotBody): RestoredWorkerFields {
  const copy = structuredClone(snapshot) as RunResumeSnapshotBody;
  return {
    rng: DeterministicRNG.fromState(copy.seed, copy.rngState),
    currentTick: copy.tick,
    historicalMetrics: copy.historicalMetrics,
    currentState: { ...copy.state, isRunning: true },
    leads: copy.leads,
    opportunities: copy.opportunities,
    deals: copy.deals,
    activities: copy.activities,
    queueEntries: copy.queueEntries,
    csQueueEntries: copy.csQueueEntries,
    events: copy.events,
    timeSeries: copy.timeSeries,
  };
}
