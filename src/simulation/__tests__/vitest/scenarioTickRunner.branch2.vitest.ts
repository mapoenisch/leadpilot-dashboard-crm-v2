// Branch2-Tests: scenarioTickRunner Restkanten jenseits von
// scenarioSplit.branch.vitest.ts (shouldUseWorker false, targetTicks 0,
// 1-Tick-Progress + correlationId-Stempel). Hier nur dort fehlende Zweige:
// Engine-Output ohne queueEntries/csQueueEntries (if-false-Arme), State ohne
// Metriken (?? 0-Arme im Zeitstrahl), Event ohne correlationId (Stempel-Arm)
// sowie 2-Tick-Progress ohne onProgress. Echte Engine via Spy eingehüllt und
// gezielt entleert — deterministisch, keine Endlosschleifen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeTicksMainThread, type MainThreadTickInput } from '../../scenarioTickRunner';
import { SimulationEngine } from '../../engine';
import { SimulationEventRules } from '../../eventRules';
import { DEFAULT_BASE_2026_PARAMETERS } from '../../scenarioRepository';
import { DEFAULT_HISTORICAL_METRICS } from '../../../services/data/baselineMapper';
import { DeterministicRNG } from '../../prng';
import type { SimulationState } from '../../../types/simulation';

function tickInput(
  targetTicks: number,
  onProgress?: MainThreadTickInput['onProgress'],
): MainThreadTickInput {
  const initialMetrics = SimulationEventRules.recalculateMetrics([], [], []);
  const initialState: SimulationState = {
    isRunning: true,
    tickCount: 0,
    dayIndex: 0,
    simulatedDate: '2026-01-01',
    seed: 7,
    speed: 1,
    intervalMs: 12000,
    lastTickTimestamp: '2026-01-01 (Tick #0)',
    simulatedAt: '2026-01-01',
    metrics: initialMetrics,
    totalLeadsGenerated: 0,
    totalDealsWon: 0,
    currentARR: initialMetrics.liveARR,
  };
  return {
    rng: new DeterministicRNG(7),
    initialState,
    leads: [],
    opportunities: [],
    deals: [],
    activities: [],
    historicalMetrics: DEFAULT_HISTORICAL_METRICS,
    baseParameters: { ...DEFAULT_BASE_2026_PARAMETERS },
    measures: [],
    targetTicks,
    correlationId: 'corr-tick-b2',
    ...(onProgress ? { onProgress } : {}),
  };
}

describe('scenarioTickRunner.branch2', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Engine-Output ohne Queue-Felder läuft trotzdem (if-false-Arme)', () => {
    const orig = SimulationEngine.executeTick;
    vi.spyOn(SimulationEngine, 'executeTick').mockImplementation((input) => {
      const out = orig(input);
      return { ...out, queueEntries: undefined, csQueueEntries: undefined };
    });
    const res = executeTicksMainThread(tickInput(2));
    expect(res.state.tickCount).toBe(2);
    expect(res.timeSeries).toHaveLength(2);
    expect(res.state.isRunning).toBe(false);
    expect(typeof res.rngState).toBe('number');
  });

  it('State ohne Metriken schreibt Null-Zeitstrahl (?? 0-Arme)', () => {
    const orig = SimulationEngine.executeTick;
    vi.spyOn(SimulationEngine, 'executeTick').mockImplementation((input) => {
      const out = orig(input);
      return { ...out, state: { ...out.state, metrics: undefined } };
    });
    const res = executeTicksMainThread(tickInput(1));
    expect(res.timeSeries).toHaveLength(1);
    expect(res.timeSeries[0]?.metrics).toMatchObject({
      arr: 0,
      mrr: 0,
      customers: 0,
      wonDeals: 0,
      ebitda: 0,
      netRevenue: 0,
      netCashFlow: 0,
      cumulativeCashFlow: 0,
    });
  });

  it('Event ohne correlationId wird mit Input-Korrelation gestempelt', () => {
    const orig = SimulationEngine.executeTick;
    vi.spyOn(SimulationEngine, 'executeTick').mockImplementation((input) => {
      const out = orig(input);
      const extra = {
        id: 'evt-b2-extra',
        type: 'SYSTEM_INFO',
        title: 'Branch2-Extra',
        tickCount: out.state.tickCount,
      } as unknown as (typeof out.newEvents)[number];
      return { ...out, newEvents: [...out.newEvents, extra] };
    });
    const res = executeTicksMainThread(tickInput(1));
    const extra = res.events.find((e) => (e as { id?: string }).id === 'evt-b2-extra');
    expect(extra).toBeDefined();
    expect(extra?.correlationId).toBe('corr-tick-b2');
  });

  it('zwei Ticks ohne onProgress melden nichts und liefern zwei Punkte', () => {
    const input = tickInput(2);
    expect(input.onProgress).toBeUndefined();
    const res = executeTicksMainThread(input);
    expect(res.timeSeries).toHaveLength(2);
    expect(res.state.tickCount).toBe(2);
  });

  it('Maßnahmen sitzen im Effektiv-Pfad (salesRepCount-Delta verändert Leads-Aufbau nicht krachend)', () => {
    const input = tickInput(2);
    input.measures = [
      {
        id: 'm-tick',
        name: 'Mehr Reps',
        startTick: 0,
        changes: [{ parameter: 'salesRepCount', mode: 'delta', value: 2 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const res = executeTicksMainThread(input);
    expect(res.state.tickCount).toBe(2);
    expect(res.timeSeries).toHaveLength(2);
  });
});
