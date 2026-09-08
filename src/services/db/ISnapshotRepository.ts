import { AnalyticsProjection, SimulationSnapshot } from '../../types/snapshot';

export interface ISnapshotRepository {
  /**
   * Atomically persists a snapshot and its analytics projection.
   */
  saveSnapshot(snapshot: SimulationSnapshot): Promise<void>;

  /**
   * Retrieves a single full snapshot by its deterministic snapshotId (${runId}_tick_${tickId}).
   */
  getSnapshot(snapshotId: string): Promise<SimulationSnapshot | null>;

  /**
   * Retrieves all full snapshots associated with a specific runId, ordered by tickId ascending.
   */
  getByRun(runId: string): Promise<SimulationSnapshot[]>;

  /**
   * Retrieves a single full snapshot by runId and tickId.
   */
  getByRunAndTick(runId: string, tickId: number): Promise<SimulationSnapshot | null>;

  /**
   * Retrieves the latest snapshot for a specific runId (highest tickId).
   */
  getLatestByRun(runId: string): Promise<SimulationSnapshot | null>;

  /**
   * Efficiently lists compact analytics projections for a runId without loading full simulation states.
   */
  listProjectionsByRun(runId: string): Promise<AnalyticsProjection[]>;

  /**
   * Deletes a single full snapshot by snapshotId.
   */
  deleteSnapshot(snapshotId: string): Promise<void>;

  /**
   * Deletes all snapshots and projections for a specific runId (For explicit full run removal).
   */
  deleteByRun(runId: string): Promise<void>;

  /**
   * Selectively prunes heavy SimulationSnapshots for a run, keeping only specified keepTickIds.
   * Preserves 100% of AnalyticsProjections in STORE_PROJECTIONS.
   */
  pruneSnapshotsForRun(runId: string, keepTickIds: number[]): Promise<{ prunedCount: number; remainingCount: number }>;

  /**
   * Computes storage usage metrics across stored snapshots and projections.
   */
  getStorageMetrics(): Promise<{ totalSnapshots: number; totalProjections: number; estimatedBytes: number }>;
}
