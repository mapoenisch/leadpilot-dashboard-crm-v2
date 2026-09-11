import { create } from 'zustand';
import { simulationService } from '../simulation/simulationService';
import { createSimulationSlice, type SimulationSlice } from './slices/simulationSlice';
import { createScenarioSlice, type ScenarioSlice } from './slices/scenarioSlice';
import { createRunSlice, type RunSlice } from './slices/runSlice';

// Gate G37 (Auftrag 052): ein Store aus drei Slices (nicht unabhängig
// lauffähig — z. B. braucht previewMeasures die activeVersionId).
export interface SimulationStoreState extends SimulationSlice, ScenarioSlice, RunSlice {}

export const useSimulationStore = create<SimulationStoreState>()((...args) => ({
  ...createSimulationSlice(...args),
  ...createScenarioSlice(...args),
  ...createRunSlice(...args),
}));

// Live-Abo bei Store-Erzeugung (Modul-Ladezeit, Entscheidung 3) — ersetzt das
// Provider-useEffect. Nur simulationSlice-Felder werden synchronisiert, genau
// wie bisher (runs/aggregation kommen aus refreshData nach Aktionen).
const unsubscribeSimulationService = simulationService.subscribe((_event, newState) => {
  const svc = simulationService;
  useSimulationStore.setState({
    state: newState,
    leads: svc.getSimulationLeads(),
    opportunities: svc.getOpportunities(),
    deals: svc.getSimulationDeals(),
    activities: svc.getSimulationActivities(),
    events: svc.getEvents(),
  });
});

// HMR-Prüfung (Entscheidung 3): Vite lädt das Modul im Dev-Modus bei
// Änderung neu — ohne dispose() bliebe die alte Subscription bestehen und
// jede tickt doppelt. Daher explizit aufräumen; in Produktion (kein HMR)
// ist der Zweig toter Code ohne Effekt.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeSimulationService();
  });
}
