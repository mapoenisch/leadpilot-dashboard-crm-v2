// Charakterisierung: SnapshotMapper (reine Persistenz-Transformationen).
import { describe, it, expect } from 'vitest';
import { SnapshotMapper } from '../snapshotMapper';
import type { SimulationSnapshot } from '../../../types/snapshot';
import type { SimulationState } from '../../../types/simulation';

function state(over: Record<string, unknown> = {}): SimulationState {
  return {
    isRunning: false,
    tickCount: 3,
    dayIndex: 3,
    simulatedDate: '2026-01-04',
    seed: 42,
    speed: 'NORMAL',
    metrics: {
      liveLeads: 10,
      liveMQLs: 4,
      liveSQLs: 2,
      liveHotLeads: 1,
      liveOpportunities: 2,
      livePipelineValue: 50000,
      liveWonDeals: 3,
      liveLostDeals: 1,
      liveCustomers: 66,
      liveMRR: 34320,
      liveARR: 411840,
      conversionRate: 25,
    },
    ...over,
  } as unknown as SimulationState;
}

function snapshot(): SimulationSnapshot {
  return {
    snapshotId: 'run-1_tick_3',
    runId: 'run-1',
    scenarioId: 'scen-1',
    scenarioVersionId: 'ver-1',
    tickId: 3,
    simulationDay: 3,
    simulatedDate: '2026-01-04',
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: 'b1',
    organizationId: 'org-a',
    state: state(),
    projection: SnapshotMapper.createProjection(
      'run-1_tick_3',
      'run-1',
      'scen-1',
      'ver-1',
      3,
      3,
      '2026-01-04',
      state(),
    ),
    createdAt: '2026-01-04T00:00:00.000Z',
  };
}

describe('SnapshotMapper', () => {
  it('Roundtrip erhält alle Felder und friert das Ergebnis ein', () => {
    const record = SnapshotMapper.toPersistenceRecord(snapshot());
    expect(typeof record.serializedState).toBe('string');
    expect(record).toMatchObject({ snapshotId: 'run-1_tick_3', tickId: 3 });
    expect(JSON.parse(record.serializedState)).toMatchObject({ seed: 42 });
    const back = SnapshotMapper.fromPersistenceRecord(record);
    expect(back).toMatchObject({
      snapshotId: 'run-1_tick_3',
      runId: 'run-1',
      simulationDay: 3,
    });
    expect(back.state).toMatchObject({ seed: 42 });
    expect(Object.isFrozen(back.state)).toBe(true);
    expect(Object.isFrozen(back.projection)).toBe(true);
  });

  it('fromPersistenceRecord wirft bei kaputtem JSON statt zu raten', () => {
    const record = SnapshotMapper.toPersistenceRecord(snapshot());
    expect(() =>
      SnapshotMapper.fromPersistenceRecord({ ...record, serializedState: '{kaputt' }),
    ).toThrow();
  });

  it('createProjection spiegelt State-Metriken', () => {
    const proj = SnapshotMapper.createProjection('s', 'r', 'sc', 'v', 1, 1, '2026-01-02', state());
    expect(proj).toMatchObject({ arr: 411840, mrr: 34320, customers: 66, wonDeals: 3 });
  });

  it('createProjection defaultet fehlende Metriken auf 0', () => {
    const proj = SnapshotMapper.createProjection('s', 'r', 'sc', 'v', 0, 0, 'd', {
      tickCount: 0,
    } as SimulationState);
    expect(proj).toMatchObject({
      arr: 0,
      mrr: 0,
      customers: 0,
      wonDeals: 0,
      leadsCount: 0,
      conversionRate: 0,
    });
  });
});
