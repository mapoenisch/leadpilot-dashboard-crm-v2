import { useRef } from 'react';
import { useStore } from 'zustand/react';
import { shallow } from 'zustand/vanilla/shallow';
import { useSimulationStore } from './simulationStore';
import type { SimulationStoreState } from './simulationStore';

// Gate G37 (Auftrag 052): ein Hook pro logischem Bedarf — kein rohes
// useSimulationStore(s => s.x) in Komponenten (Muster analog useCrmQueries).
//
// Lokaler useShallow-Ersatz für Objekt-Selektoren (Entscheidung 4): weder
// 'zustand/react/shallow' noch 'zustand/traditional' sind nutzbar — ersteres
// fällt per manualChunks (/react/ im Modulpfad) in den react-vendor-Chunk
// und erzeugt einen zyklischen Chunk-Edge vendor<->react-vendor (App-Boot
// bricht mit T.createContext auf uninitialisiertem Namespace), letzteres
// braucht das nicht installierte use-sync-external-store-Shim. Diese
// 15-Zeilen-Variante nutzt nur vanilla-shallow + React-Bordmittel.
function useShallowSelector<T>(selector: (s: SimulationStoreState) => T): T {
  const ref = useRef<{ value: T } | null>(null);
  return useStore(useSimulationStore, (s) => {
    const next = selector(s);
    const prev = ref.current;
    if (prev !== null && shallow(prev.value, next)) {
      return prev.value;
    }
    ref.current = { value: next };
    return next;
  });
}

// — simulationSlice —
export function useSimulationState() {
  return useSimulationStore((s) => s.state);
}

export function useSimulationLeads() {
  return useSimulationStore((s) => s.leads);
}

export function useSimulationOpportunities() {
  return useSimulationStore((s) => s.opportunities);
}

export function useSimulationDeals() {
  return useSimulationStore((s) => s.deals);
}

export function useSimulationActivities() {
  return useSimulationStore((s) => s.activities);
}

export function useSimulationEvents() {
  return useSimulationStore((s) => s.events);
}

export function useSimulationControls() {
  return useShallowSelector((s) => ({
      start: s.start,
      pause: s.pause,
      setSpeed: s.setSpeed,
      resetSimulation: s.resetSimulation,
    }));
}

// — scenarioSlice —
export function useScenarios() {
  return useSimulationStore((s) => s.scenarios);
}

export function useActiveScenarioId() {
  return useSimulationStore((s) => s.activeScenarioId);
}

export function useActiveScenario() {
  return useSimulationStore((s) => s.scenarios.find((sc) => sc.id === s.activeScenarioId));
}

export function useActiveVersionId() {
  return useSimulationStore((s) => s.activeVersionId);
}

export function useScenarioVersions() {
  return useShallowSelector((s) => s.versions);
}

export function useActiveVersion() {
  return useSimulationStore((s) => {
    const v = s.versions.find((x) => x.id === s.activeVersionId);
    return v ?? s.versions[s.versions.length - 1];
  });
}

export function useScenarioActions() {
  return useShallowSelector((s) => ({
      selectScenario: s.selectScenario,
      selectVersion: s.selectVersion,
      createNewVersion: s.createNewVersion,
      compareMultipleVersions: s.compareMultipleVersions,
      adoptConfiguration: s.adoptConfiguration,
    }));
}

export function useDraftMeasures() {
  return useSimulationStore((s) => s.draftMeasures);
}

export function useMeasureActions() {
  return useShallowSelector((s) => ({
      addDraftMeasure: s.addDraftMeasure,
      updateDraftMeasure: s.updateDraftMeasure,
      removeDraftMeasure: s.removeDraftMeasure,
      setDraftMeasures: s.setDraftMeasures,
      previewMeasures: s.previewMeasures,
    }));
}

// — runSlice —
export function useRuns() {
  return useSimulationStore((s) => s.runs);
}

export function useAggregation() {
  return useSimulationStore((s) => s.aggregation);
}

export function useWorkerProgress() {
  return useSimulationStore((s) => s.workerProgress);
}

export function useRunActions() {
  return useShallowSelector((s) => ({
      runVersion: s.runVersion,
      reRun: s.reRun,
      reproduce: s.reproduce,
      refreshData: s.refreshData,
    }));
}
