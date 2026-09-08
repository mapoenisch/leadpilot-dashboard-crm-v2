import {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationSpeed,
  SimulationState,
} from '../types/simulation';

export interface ISimulationService {
  start(): void;
  pause(): void;
  setSpeed(speed: SimulationSpeed): void;
  executeTick(): void;
  getState(): SimulationState;
  getSimulationLeads(): SimulationLead[];
  getOpportunities(): SimulationOpportunity[];
  getSimulationDeals(): SimulationDeal[];
  getSimulationActivities(): SimulationActivity[];
  getEvents(): SimulationEvent[];
  subscribe(listener: (event: SimulationEvent | null, state: SimulationState) => void): () => void;
  resetSimulation(seed?: number): void;
}
