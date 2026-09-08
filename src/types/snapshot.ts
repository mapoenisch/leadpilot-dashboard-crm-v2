import { SimulationState } from './simulation';

export interface AnalyticsProjection {
  snapshotId: string;
  runId: string;
  scenarioId: string;
  scenarioVersionId: string;
  tickId: number;
  simulationDay: number;
  simulatedDate: string;
  arr: number;
  mrr: number;
  customers: number;
  wonDeals: number;
  leadsCount: number;
  opportunitiesCount: number;
  conversionRate: number;
}

export interface SimulationSnapshot {
  snapshotId: string; // Format: ${runId}_tick_${tickId}
  runId: string;
  scenarioId: string;
  scenarioVersionId: string;
  tickId: number;
  simulationDay: number;
  simulatedDate: string;
  modelVersion: string;
  schemaVersion: string;
  baselineVersion: string;
  state: Readonly<SimulationState>;
  projection: Readonly<AnalyticsProjection>;
  createdAt: string; // Technical persistence timestamp
}

export interface SnapshotPersistenceRecord {
  snapshotId: string;
  runId: string;
  scenarioId: string;
  scenarioVersionId: string;
  tickId: number;
  simulationDay: number;
  simulatedDate: string;
  modelVersion: string;
  schemaVersion: string;
  baselineVersion: string;
  serializedState: string;
  projection: AnalyticsProjection;
  createdAt: string;
}

export type PersistenceErrorCode =
  | 'SNAPSHOT_NOT_FOUND'
  | 'PERSISTENCE_ERROR'
  | 'SCHEMA_VERSION_ERROR'
  | 'INTEGRITY_ERROR'
  | 'DUPLICATE_SNAPSHOT';

export class SnapshotError extends Error {
  constructor(public code: PersistenceErrorCode, message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}
