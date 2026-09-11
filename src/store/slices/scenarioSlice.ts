import type { StateCreator } from 'zustand';
import { scenarioService } from '../../simulation/scenarioService';
import {
  DEFAULT_BASE_2026_SCENARIO_ID,
  DEFAULT_BASE_2026_VERSION_ID,
} from '../../simulation/scenarioRepository';
import type { ScenarioAggregationResult } from '../../types/aggregation';
import type {
  MultiVersionComparisonResult,
  Scenario,
  ScenarioParameters,
  ScenarioVersion,
  SimulationRun,
} from '../../types/scenario';
import type { GoalTarget } from '../../types/kpi';
import type { Measure, MeasureConflict, MeasureKpiDelta } from '../../types/measure';
import type { RunExecutionResult } from '../../simulation/scenarioService';
import type { SimulationStoreState } from '../simulationStore';

// Gate G37 (Auftrag 052): Scenario-Slice — inkl. draftMeasures (Entscheidung 2:
// previewMeasures braucht activeVersionId) und versions-Snapshot (der Context
// hat versions bei jedem Render frisch gelesen; getVersionsByScenario
// deep-cloned, daher als State statt derived — aktualisiert in refreshData
// und selectScenario, den einzigen Stellen, an denen sich Versionen ändern
// können; kein App-Code mutiert den Service außerhalb des Stores).
export interface ScenarioSlice {
  scenarios: Scenario[];
  activeScenarioId: string;
  activeVersionId: string;
  versions: ScenarioVersion[];
  draftMeasures: Measure[];
  selectScenario: (scenarioId: string) => void;
  selectVersion: (versionId: string) => void;
  createNewVersion: (
    scenarioId: string,
    parameters: Partial<ScenarioParameters>,
    description?: string,
  ) => ScenarioVersion;
  compareMultipleVersions: (
    versionIds: string[],
    targets?: Record<string, GoalTarget>,
    referenceVersionId?: string,
  ) => MultiVersionComparisonResult;
  adoptConfiguration: (
    sourceVersionId: string,
    targetScenarioId: string,
    description?: string,
  ) => ScenarioVersion;
  addDraftMeasure: (measure: Measure) => void;
  updateDraftMeasure: (measure: Measure) => void;
  removeDraftMeasure: (measureId: string) => void;
  setDraftMeasures: (measures: Measure[]) => void;
  previewMeasures: (
    measuresToPreview?: Measure[],
    targetTicks?: number,
  ) => Promise<{
    base: RunExecutionResult;
    withMeasures: RunExecutionResult;
    kpiDeltas: MeasureKpiDelta[];
    conflicts: MeasureConflict[];
  }>;
  refreshData: () => void;
}

function readVersions(activeScenarioId: string): ScenarioVersion[] {
  return scenarioService.getVersionsForScenario(activeScenarioId);
}

function readWorkerProgress(runs: SimulationRun[]): {
  completedRuns: number;
  totalRuns: number;
} {
  return {
    completedRuns: runs.filter((r) => r.status === 'COMPLETED').length,
    totalRuns: runs.length || 1,
  };
}

export const createScenarioSlice: StateCreator<
  SimulationStoreState,
  [],
  [],
  ScenarioSlice
> = (set, get) => ({
  scenarios: scenarioService.getScenarios(),
  activeScenarioId: DEFAULT_BASE_2026_SCENARIO_ID,
  activeVersionId: DEFAULT_BASE_2026_VERSION_ID,
  versions: readVersions(DEFAULT_BASE_2026_SCENARIO_ID),
  draftMeasures: [],

  refreshData: () => {
    const { activeScenarioId, activeVersionId } = get();
    const currentScenarios = scenarioService.getScenarios();
    const currentRuns = scenarioService.getRunsForVersion(activeVersionId);
    const agg: ScenarioAggregationResult =
      scenarioService.getScenarioAggregation(activeVersionId);
    set({
      scenarios: currentScenarios,
      versions: readVersions(activeScenarioId),
      runs: currentRuns,
      aggregation: agg,
      workerProgress: readWorkerProgress(currentRuns),
    });
  },

  selectScenario: (scenarioId: string) => {
    const vers = readVersions(scenarioId);
    const latest = vers[vers.length - 1];
    set({
      activeScenarioId: scenarioId,
      ...(latest ? { activeVersionId: latest.id } : {}),
    });
    get().refreshData();
  },

  selectVersion: (versionId: string) => {
    set({ activeVersionId: versionId });
    get().refreshData();
  },

  createNewVersion: (
    scenarioId: string,
    parameters: Partial<ScenarioParameters>,
    description?: string,
  ): ScenarioVersion => {
    const newVer = scenarioService.createScenarioVersion(scenarioId, parameters, description);
    set({ activeVersionId: newVer.id });
    get().refreshData();
    return newVer;
  },

  compareMultipleVersions: (
    versionIds: string[],
    targets?: Record<string, GoalTarget>,
    referenceVersionId?: string,
  ): MultiVersionComparisonResult =>
    scenarioService.compareMultipleVersions(versionIds, targets, referenceVersionId),

  adoptConfiguration: (
    sourceVersionId: string,
    targetScenarioId: string,
    description?: string,
  ): ScenarioVersion => {
    const newVer = scenarioService.adoptConfiguration(sourceVersionId, targetScenarioId, description);
    set({ activeVersionId: newVer.id });
    get().refreshData();
    return newVer;
  },

  addDraftMeasure: (measure: Measure) => {
    set((s) => ({ draftMeasures: [...s.draftMeasures, measure] }));
  },

  updateDraftMeasure: (measure: Measure) => {
    set((s) => ({
      draftMeasures: s.draftMeasures.map((m) => (m.id === measure.id ? measure : m)),
    }));
  },

  removeDraftMeasure: (measureId: string) => {
    set((s) => ({ draftMeasures: s.draftMeasures.filter((m) => m.id !== measureId) }));
  },

  setDraftMeasures: (measures: Measure[]) => {
    set({ draftMeasures: measures });
  },

  previewMeasures: async (measuresToPreview?: Measure[], targetTicks = 50) => {
    const { activeVersionId, draftMeasures } = get();
    const targetMeasures = measuresToPreview ?? draftMeasures;
    return scenarioService.previewMeasures(activeVersionId, targetMeasures, targetTicks);
  },
});
