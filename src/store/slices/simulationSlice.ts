import type { StateCreator } from 'zustand';
import { simulationService } from '../../simulation/simulationService';
import type {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationSpeed,
  SimulationState,
} from '../../types/simulation';
import type { SimulationStoreState } from '../simulationStore';

// Gate G37 (Auftrag 052): Live-Kernel-Slice — vormals useState-Spiegel im
// SimulationContext, jetzt direkt aus simulationService gelesen.
export interface SimulationSlice {
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
}

export const createSimulationSlice: StateCreator<
  SimulationStoreState,
  [],
  [],
  SimulationSlice
> = () => ({
  state: simulationService.getState(),
  leads: simulationService.getSimulationLeads(),
  opportunities: simulationService.getOpportunities(),
  deals: simulationService.getSimulationDeals(),
  activities: simulationService.getSimulationActivities(),
  events: simulationService.getEvents(),
  start: () => simulationService.start(),
  pause: () => simulationService.pause(),
  setSpeed: (speed: SimulationSpeed) => simulationService.setSpeed(speed),
  resetSimulation: () => simulationService.resetSimulation(),
});
