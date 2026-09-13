import type { StateCreator } from 'zustand';
import { scenarioService } from '../../simulation/scenarioService';
import { systemContext } from '../../simulation/systemContext';
import { DEFAULT_BASE_2026_VERSION_ID } from '../../simulation/scenarioRepository';
import type { ScenarioAggregationResult } from '../../types/aggregation';
import type { SimulationRun } from '../../types/scenario';
import type { SimulationStoreState } from '../simulationStore';

// Gate G37 (Auftrag 052): Run-Slice — Runs, Aggregation, Fortschritt und die
// Run-Aktionen. Jede Aktion ruft danach refreshData (Scenario-Slice), genau
// wie der bisherige Context.
export interface RunSlice {
  runs: SimulationRun[];
  aggregation: ScenarioAggregationResult;
  workerProgress: { completedRuns: number; totalRuns: number };
  runVersion: (versionId: string) => Promise<void>;
  reRun: (versionId: string) => Promise<void>;
  reproduce: (runId: string) => Promise<void>;
}

export const createRunSlice: StateCreator<SimulationStoreState, [], [], RunSlice> = (_set, get) => {
  const initialRuns = scenarioService.getRunsForVersion(DEFAULT_BASE_2026_VERSION_ID);
  return {
    runs: initialRuns,
    aggregation: scenarioService.getScenarioAggregation(DEFAULT_BASE_2026_VERSION_ID),
    workerProgress: {
      completedRuns: initialRuns.filter((r) => r.status === 'COMPLETED').length,
      totalRuns: initialRuns.length || 1,
    },

    runVersion: async (versionId: string) => {
      await scenarioService.runScenarioVersion(versionId, undefined, undefined, {
        correlationId: systemContext.nextCorrelationId(),
        measures: get().draftMeasures,
      });
      get().refreshData();
    },

    reRun: async (versionId: string) => {
      await scenarioService.reRun(versionId, undefined, {
        correlationId: systemContext.nextCorrelationId(),
        measures: get().draftMeasures,
      });
      get().refreshData();
    },

    reproduce: async (runId: string) => {
      await scenarioService.reproduce(runId);
      get().refreshData();
    },
  };
};
