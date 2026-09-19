import { ISnapshotRepository } from '../services/db/ISnapshotRepository';

export interface PruneSummary {
  runId?: string;
  prunedCount: number;
  remainingCount: number;
  retainedTicks: number[];
}

/**
 * Deterministic Snapshot Pruning Manager (Auftrag 013).
 * Manages physical deletion of heavy intermediate SimulationSnapshots
 * while retaining 100% of AnalyticsProjections, Event Logs, and key milestone states.
 */
export class SnapshotPruningManager {
  /**
   * Deterministically calculates the exact set of tick IDs to preserve.
   * Preserves:
   * - Tick 0 (Initial Baseline State)
   * - Milestone Ticks (Every milestoneInterval ticks, e.g. 30, 60, 90...)
   * - Final Tick (exact tickCount === totalTicks)
   */
  public static calculateRetentionTicks(totalTicks: number, milestoneInterval = 30): Set<number> {
    const keep = new Set<number>();
    keep.add(0); // Initial baseline state

    for (let t = milestoneInterval; t <= totalTicks; t += milestoneInterval) {
      keep.add(t);
    }

    keep.add(totalTicks); // Terminal final tick (guaranteed retention)

    return keep;
  }

  /**
   * Selective pruning of intermediate snapshots for a specific run.
   * MUST use repo.pruneSnapshotsForRun (MUST NOT call repo.deleteByRun).
   */
  public static async pruneRunSnapshots(
    runId: string,
    repo: ISnapshotRepository,
    targetTicks = 365,
    milestoneInterval = 30,
  ): Promise<PruneSummary> {
    const keepSet = this.calculateRetentionTicks(targetTicks, milestoneInterval);
    const keepArray = Array.from(keepSet).sort((a, b) => a - b);

    // Execute selective pruning (never uses deleteByRun)
    const result = await repo.pruneSnapshotsForRun(runId, keepArray);

    return {
      runId,
      prunedCount: result.prunedCount,
      remainingCount: result.remainingCount,
      retainedTicks: keepArray,
    };
  }

  /**
   * Batch prunes intermediate snapshots across multiple runs.
   */
  public static async pruneAllRuns(
    runIds: string[],
    repo: ISnapshotRepository,
    targetTicks = 365,
    milestoneInterval = 30,
  ): Promise<PruneSummary> {
    let totalPruned = 0;
    let totalRemaining = 0;

    for (const runId of runIds) {
      const summary = await this.pruneRunSnapshots(runId, repo, targetTicks, milestoneInterval);
      totalPruned += summary.prunedCount;
      totalRemaining += summary.remainingCount;
    }

    const keepArray = Array.from(this.calculateRetentionTicks(targetTicks, milestoneInterval)).sort(
      (a, b) => a - b,
    );

    return {
      prunedCount: totalPruned,
      remainingCount: totalRemaining,
      retainedTicks: keepArray,
    };
  }
}
