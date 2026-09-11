import { ISimulationService } from './ISimulationService';
import { SimulationEngine } from './engine';
import { DeterministicRNG } from './prng';
import { SimulationEventRules, formatSimulatedDate } from './eventRules';
import {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationSpeed,
  SimulationState,
} from '../types/simulation';

type SimulationEventListener = (event: SimulationEvent | null, state: SimulationState) => void;

const DEFAULT_SEED = 42;

export class SimulationService implements ISimulationService {
  private static instance: SimulationService;
  private timer: number | null = null;
  private listeners: Set<SimulationEventListener> = new Set();

  private rng: DeterministicRNG;
  private leads: SimulationLead[] = [];
  private opportunities: SimulationOpportunity[] = [];
  private deals: SimulationDeal[] = [];
  private activities: SimulationActivity[] = [];
  private events: SimulationEvent[] = [];

  private state: SimulationState;

  private constructor(seed = DEFAULT_SEED) {
    this.rng = new DeterministicRNG(seed);
    const initialMetrics = SimulationEventRules.recalculateMetrics([], [], []);
    const simulatedDate = formatSimulatedDate(0);
    this.state = {
      isRunning: false,
      tickCount: 0,
      dayIndex: 0,
      simulatedDate,
      seed,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: `${simulatedDate} (Tick #0)`,
      simulatedAt: simulatedDate,
      metrics: initialMetrics,
      totalLeadsGenerated: 0,
      totalDealsWon: 0,
      currentARR: initialMetrics.liveARR,
    };
  }

  public static getInstance(): SimulationService {
    if (!SimulationService.instance) {
      SimulationService.instance = new SimulationService();
    }
    return SimulationService.instance;
  }

  public getState(): SimulationState {
    return {
      ...this.state,
      metrics: this.state.metrics ? { ...this.state.metrics } : undefined,
    };
  }

  public getSimulationLeads(): SimulationLead[] {
    return [...this.leads];
  }

  public getOpportunities(): SimulationOpportunity[] {
    return [...this.opportunities];
  }

  public getSimulationDeals(): SimulationDeal[] {
    return [...this.deals];
  }

  public getSimulationActivities(): SimulationActivity[] {
    return [...this.activities];
  }

  public getEvents(): SimulationEvent[] {
    // Return full event history without truncating
    return [...this.events];
  }

  public subscribe(listener: SimulationEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public start(): void {
    if (this.state.isRunning) return;
    this.state.isRunning = true;
    this.scheduleNextTick();

    const startEvent: SimulationEvent = {
      id: `evt-s${this.state.seed}-t${this.state.tickCount}-start`,
      tick: this.state.tickCount,
      dayIndex: this.state.dayIndex,
      simulatedDate: this.state.simulatedDate,
      type: 'SYSTEM_INFO',
      title: 'Simulation gestartet',
      details: `Echtzeit-Simulation läuft im 12-Sekunden Basistakt (Tempo: ${this.state.speed}x, Seed: ${this.state.seed}).`,
      timestamp: `${this.state.simulatedDate} (Tick #${this.state.tickCount})`,
    };
    this.recordEvent(startEvent);
  }

  public pause(): void {
    if (!this.state.isRunning) return;
    this.state.isRunning = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }

    const pauseEvent: SimulationEvent = {
      id: `evt-s${this.state.seed}-t${this.state.tickCount}-pause`,
      tick: this.state.tickCount,
      dayIndex: this.state.dayIndex,
      simulatedDate: this.state.simulatedDate,
      type: 'SYSTEM_INFO',
      title: 'Simulation pausiert',
      details: `Der aktuelle Simulationszustand bei Tick #${this.state.tickCount} wurde eingefroren.`,
      timestamp: `${this.state.simulatedDate} (Tick #${this.state.tickCount})`,
    };
    this.recordEvent(pauseEvent);
  }

  public setSpeed(speed: SimulationSpeed): void {
    this.state.speed = speed;
    if (this.state.isRunning) {
      if (this.timer !== null) window.clearTimeout(this.timer);
      this.scheduleNextTick();
    }
  }

  public resetSimulation(seed = DEFAULT_SEED): void {
    this.pause();
    this.rng = new DeterministicRNG(seed);
    this.leads = [];
    this.opportunities = [];
    this.deals = [];
    this.activities = [];
    this.events = [];
    const initialMetrics = SimulationEventRules.recalculateMetrics([], [], []);
    const simulatedDate = formatSimulatedDate(0);
    this.state = {
      isRunning: false,
      tickCount: 0,
      dayIndex: 0,
      simulatedDate,
      seed,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: `${simulatedDate} (Tick #0)`,
      simulatedAt: simulatedDate,
      metrics: initialMetrics,
      totalLeadsGenerated: 0,
      totalDealsWon: 0,
      currentARR: initialMetrics.liveARR,
    };
    this.notifyListeners(null);
  }

  public executeTick(): void {
    const output = SimulationEngine.executeTick({
      state: this.state,
      rng: this.rng,
      leads: this.leads,
      opportunities: this.opportunities,
      deals: this.deals,
      activities: this.activities,
    });

    this.state = output.state;
    this.leads = output.leads;
    this.opportunities = output.opportunities;
    this.deals = output.deals;
    this.activities = output.activities;

    // Record new events into full store without truncating
    for (const evt of output.newEvents) {
      this.events.unshift(evt);
    }

    const latestEvent = output.newEvents.length > 0 ? output.newEvents[output.newEvents.length - 1] ?? null : null;
    this.notifyListeners(latestEvent);
  }

  private scheduleNextTick(): void {
    const effectiveInterval = Math.max(800, this.state.intervalMs / this.state.speed);
    this.timer = window.setTimeout(() => {
      this.executeTick();
      if (this.state.isRunning) {
        this.scheduleNextTick();
      }
    }, effectiveInterval);
  }

  private recordEvent(event: SimulationEvent): void {
    this.events.unshift(event);
    this.notifyListeners(event);
  }

  private notifyListeners(event: SimulationEvent | null): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(event, currentState));
  }
}

export const simulationService: ISimulationService = SimulationService.getInstance();
