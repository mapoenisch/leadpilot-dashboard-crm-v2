import { DeterministicRNG } from './prng';
import { SimulationEngine, TickOutput } from './engine';
import { EffectiveParameterResolver } from './effectiveParameterResolver';
import { SalesQueueEntry } from '../types/salesQueue';
import { CSQueueEntry } from '../types/csQueue';
import { ScenarioParameters, SimulationRun } from '../types/scenario';
import { Measure } from '../types/measure';
import { TimeSeriesPoint } from '../types/aggregation';
import {
  HistoricalSimulationMetrics,
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationState,
} from '../types/simulation';

// 067K / G57 — aus scenarioService.ts herausgelöster Tick-Loop (reine
// Code-Bewegung, keine Verhaltensänderung). Der Produktpfad (Browser mit
// Worker) läuft über RunCoordinator; beide rechnen denselben Tick-Loop.
export interface RunExecutionResult {
  run: SimulationRun;
  state: SimulationState;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  events: SimulationEvent[];
}

// 067G / G50 — Main-Thread-Executor, ausschließlich für Tests und
// Headless-Betrieb (Node/jsdom ohne Worker). Der Produktpfad (Browser mit
// Worker) läuft über RunCoordinator; beide rechnen denselben Tick-Loop.
export interface MainThreadTickInput {
  rng: DeterministicRNG;
  initialState: SimulationState;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  historicalMetrics: HistoricalSimulationMetrics;
  baseParameters: ScenarioParameters;
  measures: readonly Measure[];
  targetTicks: number;
  correlationId: string;
  onProgress?: (processedUnits: number, totalUnits: number) => void;
}

export interface TickRunResult {
  state: SimulationState;
  // 067G / G50 (Nacharbeit P1): PRNG-Endzustand des Laufs — im Worker-Pfad
  // aus dem COMPLETED-Payload, sonst aus dem Main-Thread-Rng.
  rngState: number;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  events: SimulationEvent[];
  timeSeries: TimeSeriesPoint[];
}

export function executeTicksMainThread(input: MainThreadTickInput): TickRunResult {
  const resolver = new EffectiveParameterResolver(input.baseParameters, [...input.measures]);
  let queueEntries: SalesQueueEntry[] = [];
  let csQueueEntries: CSQueueEntry[] = [];
  let currentState = input.initialState;
  let leads = [...input.leads];
  let opportunities = [...input.opportunities];
  let deals = [...input.deals];
  let activities = [...input.activities];
  const events: SimulationEvent[] = [];
  const timeSeries: TimeSeriesPoint[] = [];

  for (let i = 0; i < input.targetTicks; i++) {
    const eff = resolver.at(i);
    const output: TickOutput = SimulationEngine.executeTick({
      state: currentState,
      rng: input.rng,
      leads,
      opportunities,
      deals,
      activities,
      historicalMetrics: input.historicalMetrics,
      salesRepCount: eff.salesRepCount,
      csRepCount: eff.csRepCount,
      churnRateMonthly: eff.churnRateMonthly,
      marketingBudgetYearly: eff.marketingBudgetYearly,
      channelMix: eff.channelMix,
      trialToPaidConversion: eff.trialToPaidConversion,
      salesCycleDays: eff.salesCycleDays,
      discountPercent: eff.discountPercent,
      queueEntries,
      csQueueEntries,
    });

    currentState = output.state;
    leads = output.leads;
    opportunities = output.opportunities;
    deals = output.deals;
    activities = output.activities;
    if (output.queueEntries) queueEntries = output.queueEntries;
    if (output.csQueueEntries) csQueueEntries = output.csQueueEntries;

    for (const evt of output.newEvents) {
      if (evt.correlationId === undefined) evt.correlationId = input.correlationId;
      events.unshift(evt);
    }

    timeSeries.push({
      tick: currentState.tickCount,
      dayIndex: currentState.dayIndex,
      simulatedDate: currentState.simulatedDate,
      metrics: {
        arr: currentState.metrics?.liveARR ?? 0,
        mrr: currentState.metrics?.liveMRR ?? 0,
        customers: currentState.metrics?.liveCustomers ?? 0,
        wonDeals: currentState.metrics?.liveWonDeals ?? 0,
        ebitda: currentState.metrics?.financialMetrics?.ebitda ?? 0,
        netRevenue: currentState.metrics?.financialMetrics?.netRevenue ?? 0,
        netCashFlow: currentState.metrics?.financialMetrics?.netCashFlow ?? 0,
        cumulativeCashFlow: currentState.metrics?.financialMetrics?.cumulativeCashFlow ?? 0,
      },
    });
    input.onProgress?.(i + 1, input.targetTicks);
  }

  currentState.isRunning = false;
  return {
    state: currentState,
    rngState: input.rng.getState(),
    leads,
    opportunities,
    deals,
    activities,
    events,
    timeSeries,
  };
}

/** Produktpfad nur mit echtem Worker (Browser); sonst Main-Thread. */
export function shouldUseWorker(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined';
}
