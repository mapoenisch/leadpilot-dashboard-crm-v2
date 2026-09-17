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
  // 067F / G49: Mit organizationId läuft der Run mandantengebunden und wird
  // danach atomar auf dem Server persistiert (fail-closed); ohne bleibt das
  // bisherige reine In-Memory-Verhalten.
  runVersion: (versionId: string, organizationId?: string) => Promise<void>;
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

    runVersion: async (versionId: string, organizationId?: string) => {
      await scenarioService.runScenarioVersion(versionId, undefined, undefined, {
        correlationId: systemContext.nextCorrelationId(),
        measures: get().draftMeasures,
        ...(organizationId ? { organizationId, persistToServer: true as const } : {}),
      });
      get().refreshData();
    },

    reRun: async (versionId: string) => {
      // 067F / G49 (Nacharbeit P1): Mit hydriertem Workspace läuft der Re-Run
      // mandantengebunden und persistiert; ohne bleibt In-Memory-Verhalten.
      const activeOrganizationId = get().activeOrganizationId ?? undefined;
      await scenarioService.reRun(versionId, undefined, {
        correlationId: systemContext.nextCorrelationId(),
        measures: get().draftMeasures,
        ...(activeOrganizationId
          ? { organizationId: activeOrganizationId, persistToServer: true as const }
          : {}),
      });
      get().refreshData();
    },

    reproduce: async (runId: string) => {
      // 067F / G49 (Nacharbeit P1): Reproduktion persistiert genau dann, wenn
      // ein Workspace hydriert ist (aktiver Mandant).
      const persistToServer = get().activeOrganizationId !== null;
      await scenarioService.reproduce(runId, 50, persistToServer);
      get().refreshData();
    },
  };
};
