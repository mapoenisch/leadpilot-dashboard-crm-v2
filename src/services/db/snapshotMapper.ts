import {
  AnalyticsProjection,
  SimulationSnapshot,
  SnapshotPersistenceRecord,
} from '../../types/snapshot';

export class SnapshotMapper {
  /**
   * Transforms a SimulationSnapshot domain object into a SnapshotPersistenceRecord.
   */
  public static toPersistenceRecord(snapshot: SimulationSnapshot): SnapshotPersistenceRecord {
    return {
      snapshotId: snapshot.snapshotId,
      runId: snapshot.runId,
      scenarioId: snapshot.scenarioId,
      scenarioVersionId: snapshot.scenarioVersionId,
      tickId: snapshot.tickId,
      simulationDay: snapshot.simulationDay,
      simulatedDate: snapshot.simulatedDate,
      modelVersion: snapshot.modelVersion,
      schemaVersion: snapshot.schemaVersion,
      baselineVersion: snapshot.baselineVersion,
      serializedState: JSON.stringify(snapshot.state),
      projection: { ...snapshot.projection },
      createdAt: snapshot.createdAt,
    };
  }

  /**
   * Transforms a SnapshotPersistenceRecord back into an immutable SimulationSnapshot domain object.
   */
  public static fromPersistenceRecord(record: SnapshotPersistenceRecord): SimulationSnapshot {
    const parsedState = JSON.parse(record.serializedState);
    const frozenState = Object.freeze(parsedState);
    const frozenProjection = Object.freeze({ ...record.projection });

    return {
      snapshotId: record.snapshotId,
      runId: record.runId,
      scenarioId: record.scenarioId,
      scenarioVersionId: record.scenarioVersionId,
      tickId: record.tickId,
      simulationDay: record.simulationDay,
      simulatedDate: record.simulatedDate,
      modelVersion: record.modelVersion,
      schemaVersion: record.schemaVersion,
      baselineVersion: record.baselineVersion,
      state: frozenState,
      projection: frozenProjection,
      createdAt: record.createdAt,
    };
  }

  /**
   * Helper to construct a compact AnalyticsProjection from a SimulationState.
   */
  public static createProjection(
    snapshotId: string,
    runId: string,
    scenarioId: string,
    scenarioVersionId: string,
    tickId: number,
    simulationDay: number,
    simulatedDate: string,
    state: any
  ): AnalyticsProjection {
    const metrics = state.metrics || {};
    return {
      snapshotId,
      runId,
      scenarioId,
      scenarioVersionId,
      tickId,
      simulationDay,
      simulatedDate,
      arr: metrics.liveARR || 0,
      mrr: metrics.liveMRR || 0,
      customers: metrics.liveCustomers || 0,
      wonDeals: metrics.liveWonDeals || 0,
      leadsCount: metrics.liveLeads || 0,
      opportunitiesCount: metrics.liveOpportunities || 0,
      conversionRate: metrics.conversionRate || 0,
    };
  }
}
