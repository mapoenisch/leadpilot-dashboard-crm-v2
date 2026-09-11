// Gate G37 (Auftrag 052, Block A): Store-Unit-Tests (node, co-located).
// Nur lesende Aktionen + Store-lokale Measures — keine Service-Mutation,
// damit verify-Suiten unbeeinflusst bleiben.
import { describe, it, expect } from 'vitest';
import { scenarioService } from '../../simulation/scenarioService';
import {
  DEFAULT_BASE_2026_SCENARIO_ID,
  DEFAULT_BASE_2026_VERSION_ID,
} from '../../simulation/scenarioRepository';
import type { Measure } from '../../types/measure';
import { useSimulationStore } from '../simulationStore';

const TEST_MEASURE: Measure = {
  id: 'm-test',
  name: 'Test',
  startTick: 0,
  changes: [{ parameter: 'marketingBudgetYearly', mode: 'set', value: 1 }],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('simulationStore (Block A)', () => {
  it('initialisiert State aus den Singletons (Default-Szenario)', () => {
    const s = useSimulationStore.getState();
    expect(s.activeScenarioId).toBe(DEFAULT_BASE_2026_SCENARIO_ID);
    expect(s.activeVersionId).toBe(DEFAULT_BASE_2026_VERSION_ID);
    expect(s.scenarios.length).toBeGreaterThan(0);
    expect(s.versions.length).toBeGreaterThan(0);
    expect(s.draftMeasures).toEqual([]);
    expect(s.state.tickCount).toBeGreaterThanOrEqual(0);
  });

  it('draftMeasures: add/update/remove/set arbeiten Store-lokal', () => {
    const { addDraftMeasure, updateDraftMeasure, removeDraftMeasure, setDraftMeasures } =
      useSimulationStore.getState();
    addDraftMeasure(TEST_MEASURE);
    expect(useSimulationStore.getState().draftMeasures).toHaveLength(1);
    updateDraftMeasure({ ...TEST_MEASURE, name: 'Neu' });
    expect(useSimulationStore.getState().draftMeasures[0]?.name).toBe('Neu');
    removeDraftMeasure('m-test');
    expect(useSimulationStore.getState().draftMeasures).toHaveLength(0);
    setDraftMeasures([TEST_MEASURE]);
    expect(useSimulationStore.getState().draftMeasures).toHaveLength(1);
    setDraftMeasures([]);
  });

  it('selectVersion setzt die Id und lädt Runs/Aggregation nach', () => {
    const s = useSimulationStore.getState();
    const target = s.versions.find((v) => v.id !== s.activeVersionId) ?? s.versions[0];
    if (!target) throw new Error('Setup: keine Version vorhanden');
    s.selectVersion(target.id);
    const after = useSimulationStore.getState();
    expect(after.activeVersionId).toBe(target.id);
    expect(after.runs).toEqual(scenarioService.getRunsForVersion(target.id));
    // Zurückstellen (lesend, keine Service-Mutation)
    after.selectVersion(DEFAULT_BASE_2026_VERSION_ID);
  });

  it('unverwandte Updates ändern stabile Referenzen nicht (Granularität)', () => {
    const before = useSimulationStore.getState();
    const aggBefore = before.aggregation;
    const progressBefore = before.workerProgress;
    before.setDraftMeasures([]);
    const after = useSimulationStore.getState();
    expect(after.aggregation).toBe(aggBefore);
    expect(after.workerProgress).toBe(progressBefore);
  });
});
