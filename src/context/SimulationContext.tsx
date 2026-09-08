import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ISimulationService } from '../simulation/ISimulationService';
import { simulationService } from '../simulation/simulationService';
import { scenarioService, ScenarioService } from '../simulation/scenarioService';
import { systemContext } from '../simulation/systemContext';
import { DEFAULT_BASE_2026_SCENARIO_ID, DEFAULT_BASE_2026_VERSION_ID } from '../simulation/scenarioRepository';
import { ScenarioAggregationResult } from '../types/aggregation';
import { Scenario, ScenarioParameters, ScenarioVersion, SimulationRun, MultiVersionComparisonResult } from '../types/scenario';
import { GoalTarget } from '../types/kpi';
import { Measure, MeasureConflict, MeasureKpiDelta } from '../types/measure';
import { RunExecutionResult } from '../simulation/scenarioService';
import {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationSpeed,
  SimulationState,
} from '../types/simulation';

interface SimulationContextValue {
  // Live Simulation Kernel
  service: ISimulationService;
  state: SimulationState;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  events: SimulationEvent[];
  start: () => void;
  pause: () => void;
  setSpeed: (speed: SimulationSpeed) => void;
  resetSimulation: () => void;

  // Scenario & Run Management via ScenarioService
  scenarioService: ScenarioService;
  scenarios: Scenario[];
  activeScenario: Scenario | undefined;
  activeVersion: ScenarioVersion | undefined;
  versions: ScenarioVersion[];
  runs: SimulationRun[];
  aggregation: ScenarioAggregationResult;
  workerProgress: { completedRuns: number; totalRuns: number };

  // Measures (Auftrag 017)
  draftMeasures: Measure[];
  addDraftMeasure: (measure: Measure) => void;
  updateDraftMeasure: (measure: Measure) => void;
  removeDraftMeasure: (measureId: string) => void;
  setDraftMeasures: (measures: Measure[]) => void;
  previewMeasures: (measures?: Measure[], targetTicks?: number) => Promise<{
    base: RunExecutionResult;
    withMeasures: RunExecutionResult;
    kpiDeltas: MeasureKpiDelta[];
    conflicts: MeasureConflict[];
  }>;

  // Multi-Scenario Comparison & Configuration Adoption (Auftrag 019)
  compareMultipleVersions: (versionIds: string[], targets?: Record<string, GoalTarget>, referenceVersionId?: string) => MultiVersionComparisonResult;
  adoptConfiguration: (sourceVersionId: string, targetScenarioId: string, description?: string) => ScenarioVersion;

  // Actions
  selectScenario: (scenarioId: string) => void;
  selectVersion: (versionId: string) => void;
  createNewVersion: (scenarioId: string, parameters: Partial<ScenarioParameters>, description?: string) => ScenarioVersion;
  runVersion: (versionId: string) => Promise<void>;
  reRun: (versionId: string) => Promise<void>;
  reproduce: (runId: string) => Promise<void>;
  refreshData: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export interface SimulationProviderProps {
  children: React.ReactNode;
  service?: ISimulationService;
  scenService?: ScenarioService;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({
  children,
  service = simulationService,
  scenService = scenarioService,
}) => {
  const [state, setState] = useState<SimulationState>(service.getState());
  const [leads, setLeads] = useState<SimulationLead[]>(service.getSimulationLeads());
  const [opportunities, setOpportunities] = useState<SimulationOpportunity[]>(service.getOpportunities());
  const [deals, setDeals] = useState<SimulationDeal[]>(service.getSimulationDeals());
  const [activities, setActivities] = useState<SimulationActivity[]>(service.getSimulationActivities());
  const [events, setEvents] = useState<SimulationEvent[]>(service.getEvents());

  // Scenario & Version State
  const [scenarios, setScenarios] = useState<Scenario[]>(scenService.getScenarios());
  const [activeScenarioId, setActiveScenarioId] = useState<string>(DEFAULT_BASE_2026_SCENARIO_ID);
  const [activeVersionId, setActiveVersionId] = useState<string>(DEFAULT_BASE_2026_VERSION_ID);
  const [runs, setRuns] = useState<SimulationRun[]>(scenService.getRunsForVersion(DEFAULT_BASE_2026_VERSION_ID));
  const [aggregation, setAggregation] = useState<ScenarioAggregationResult>(
    scenService.getScenarioAggregation(DEFAULT_BASE_2026_VERSION_ID)
  );
  const [workerProgress, setWorkerProgress] = useState<{ completedRuns: number; totalRuns: number }>({
    completedRuns: runs.filter((r) => r.status === 'COMPLETED').length,
    totalRuns: runs.length || 1,
  });

  // Draft Measures state for active version (Auftrag 017)
  const [draftMeasures, setDraftMeasures] = useState<Measure[]>([]);

  const addDraftMeasure = useCallback((measure: Measure) => {
    setDraftMeasures((prev) => [...prev, measure]);
  }, []);

  const updateDraftMeasure = useCallback((measure: Measure) => {
    setDraftMeasures((prev) => prev.map((m) => (m.id === measure.id ? measure : m)));
  }, []);

  const removeDraftMeasure = useCallback((measureId: string) => {
    setDraftMeasures((prev) => prev.filter((m) => m.id !== measureId));
  }, []);

  const previewMeasures = useCallback(
    async (measuresToPreview?: Measure[], targetTicks = 50) => {
      const targetMeasures = measuresToPreview ?? draftMeasures;
      return scenService.previewMeasures(activeVersionId, targetMeasures, targetTicks);
    },
    [scenService, activeVersionId, draftMeasures]
  );

  const refreshData = useCallback(() => {
    const currentScenarios = scenService.getScenarios();
    setScenarios(currentScenarios);

    const currentRuns = scenService.getRunsForVersion(activeVersionId);
    setRuns(currentRuns);

    const agg = scenService.getScenarioAggregation(activeVersionId);
    setAggregation(agg);

    const completed = currentRuns.filter((r) => r.status === 'COMPLETED').length;
    setWorkerProgress({
      completedRuns: completed,
      totalRuns: currentRuns.length || 1,
    });
  }, [scenService, activeVersionId]);

  useEffect(() => {
    // Initial sync
    setState(service.getState());
    setLeads(service.getSimulationLeads());
    setOpportunities(service.getOpportunities());
    setDeals(service.getSimulationDeals());
    setActivities(service.getSimulationActivities());
    setEvents(service.getEvents());
    refreshData();

    // Subscribe to live tick updates
    const unsubscribe = service.subscribe((event, newState) => {
      setState(newState);
      setLeads(service.getSimulationLeads());
      setOpportunities(service.getOpportunities());
      setDeals(service.getSimulationDeals());
      setActivities(service.getSimulationActivities());
      setEvents(service.getEvents());
    });

    return () => {
      unsubscribe();
    };
  }, [service, refreshData]);

  const selectScenario = useCallback(
    (scenarioId: string) => {
      setActiveScenarioId(scenarioId);
      const vers = scenService.getVersionsForScenario(scenarioId);
      if (vers.length > 0) {
        const latest = vers[vers.length - 1];
        setActiveVersionId(latest.id);
      }
      refreshData();
    },
    [scenService, refreshData]
  );

  const selectVersion = useCallback(
    (versionId: string) => {
      setActiveVersionId(versionId);
      refreshData();
    },
    [refreshData]
  );

  const createNewVersion = useCallback(
    (scenarioId: string, parameters: Partial<ScenarioParameters>, description?: string): ScenarioVersion => {
      const newVer = scenService.createScenarioVersion(scenarioId, parameters, description);
      setActiveVersionId(newVer.id);
      refreshData();
      return newVer;
    },
    [scenService, refreshData]
  );

  const runVersion = useCallback(
    async (versionId: string) => {
      await scenService.runScenarioVersion(versionId, undefined, undefined, {
        correlationId: systemContext.nextCorrelationId(),
        measures: draftMeasures,
      });
      refreshData();
    },
    [scenService, refreshData, draftMeasures]
  );

  const reRun = useCallback(
    async (versionId: string) => {
      await scenService.reRun(versionId, undefined, {
        correlationId: systemContext.nextCorrelationId(),
        measures: draftMeasures,
      });
      refreshData();
    },
    [scenService, refreshData, draftMeasures]
  );

  const reproduce = useCallback(
    async (runId: string) => {
      await scenService.reproduce(runId);
      refreshData();
    },
    [scenService, refreshData]
  );

  const compareMultipleVersions = useCallback(
    (versionIds: string[], targets?: Record<string, GoalTarget>, referenceVersionId?: string): MultiVersionComparisonResult => {
      return scenService.compareMultipleVersions(versionIds, targets, referenceVersionId);
    },
    [scenService]
  );

  const adoptConfiguration = useCallback(
    (sourceVersionId: string, targetScenarioId: string, description?: string): ScenarioVersion => {
      const newVer = scenService.adoptConfiguration(sourceVersionId, targetScenarioId, description);
      setActiveVersionId(newVer.id);
      refreshData();
      return newVer;
    },
    [scenService, refreshData]
  );

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);
  const versions = scenService.getVersionsForScenario(activeScenarioId);
  const activeVersion = versions.find((v) => v.id === activeVersionId) || versions[versions.length - 1];

  const value: SimulationContextValue = {
    service,
    state,
    leads,
    opportunities,
    deals,
    activities,
    events,
    start: () => service.start(),
    pause: () => service.pause(),
    setSpeed: (speed: SimulationSpeed) => service.setSpeed(speed),
    resetSimulation: () => service.resetSimulation(),

    scenarioService: scenService,
    scenarios,
    activeScenario,
    activeVersion,
    versions,
    runs,
    aggregation,
    workerProgress,

    draftMeasures,
    addDraftMeasure,
    updateDraftMeasure,
    removeDraftMeasure,
    setDraftMeasures,
    previewMeasures,

    compareMultipleVersions,
    adoptConfiguration,

    selectScenario,
    selectVersion,
    createNewVersion,
    runVersion,
    reRun,
    reproduce,
    refreshData,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

export const useSimulation = (): SimulationContextValue => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
