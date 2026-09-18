// 067K / G57 — gemeinsame Fixtures für die Scenario-Split-Branch-Tests
// (aus scenarioSplit.branch.vitest.ts herausgelöst, keine Verhaltensänderung).
import { DeterministicRNG } from '../../prng';
import { ScenarioRepository, DEFAULT_BASE_2026_PARAMETERS } from '../../scenarioRepository';
import { SimulationEventRules } from '../../eventRules';
import { DEFAULT_HISTORICAL_METRICS } from '../../../services/data/baselineMapper';
import type { MainThreadTickInput } from '../../scenarioTickRunner';
import type {
  KpiMatrixRow,
  KpiMatrixValue,
  ParameterMatrixRow,
  ScenarioVersion,
  SimulationRun,
} from '../../../types/scenario';
import type { ScenarioAggregationResult } from '../../../types/aggregation';
import type { SimulationState } from '../../../types/simulation';

export function versionFixture(
  id: string,
  scenarioId: string,
  versionNumber: number,
  params = {},
): ScenarioVersion {
  return {
    id,
    scenarioId,
    versionNumber,
    parameters: { ...DEFAULT_BASE_2026_PARAMETERS, ...params },
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

export function stubRepo(
  versions: ScenarioVersion[],
  runsByVersion: Record<string, SimulationRun[]> = {},
) {
  return {
    getVersion: (vid: string) => versions.find((v) => v.id === vid) ?? null,
    getScenario: () => null,
    getVersionsByScenario: (sid: string) => versions.filter((v) => v.scenarioId === sid),
    getRunsByVersion: (vid: string) => runsByVersion[vid] ?? [],
  } as unknown as ScenarioRepository;
}

export function tickInput(
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
    correlationId: 'corr-edge-1',
    onProgress,
  };
}

export function kpiRow(
  kpiId: string,
  medians: Record<string, number | undefined>,
  direction: KpiMatrixRow['direction'] = 'HIGHER_IS_BETTER',
): KpiMatrixRow {
  const valuesByVersionId: Record<string, KpiMatrixValue | undefined> = {};
  for (const [vid, median] of Object.entries(medians)) {
    valuesByVersionId[vid] =
      median === undefined ? undefined : { median, p10: median, p90: median, mean: median };
  }
  return {
    kpiId,
    label: kpiId,
    unit: '€',
    direction,
    baselineValue: 0,
    valuesByVersionId,
    deltasAgainstRef: {},
    percentAgainstRef: {},
    isFavorableAgainstRef: {},
  };
}

export function tradeMatrix(a: number, b: number): KpiMatrixRow[] {
  return [
    kpiRow('liveARR', { 'v-1': a, 'v-2': b }, 'HIGHER_IS_BETTER'),
    kpiRow('ebitda', { 'v-1': a, 'v-2': b }, 'HIGHER_IS_BETTER'),
    kpiRow('netCashFlow', { 'v-1': a, 'v-2': b }, 'HIGHER_IS_BETTER'),
    kpiRow('cac', { 'v-1': a, 'v-2': b }, 'LOWER_IS_BETTER'),
    kpiRow('liveCustomers', { 'v-1': a, 'v-2': b }, 'HIGHER_IS_BETTER'),
  ];
}

export function paramRow(
  key: ParameterMatrixRow['key'],
  changed: Record<string, boolean>,
): ParameterMatrixRow {
  return {
    key,
    label: String(key),
    unit: '',
    valuesByVersionId: {},
    formattedValuesByVersionId: {},
    hasChangedAgainstRef: changed,
  };
}

export function stats(median: number) {
  return { median, p10: median, p90: median, mean: median, stdDev: 0, min: median, max: median };
}

export function fakeAgg(
  versionId: string,
  validRunCount: number,
  arrMedian: number,
  timeSeriesLen: number,
): ScenarioAggregationResult {
  return {
    scenarioId: 's-1',
    scenarioVersionId: versionId,
    runCount: validRunCount,
    validRunCount,
    aggregatedAt: '2026-01-01T00:00:00.000Z',
    metrics: {
      arr: stats(arrMedian),
      mrr: stats(100),
      customers: stats(10),
      wonDeals: stats(1),
      timeSeries: Array.from({ length: timeSeriesLen }, (_, tick) => ({
        tick,
        dayIndex: tick,
        simulatedDate: '2026-01-01',
        metrics: {
          arr: stats(arrMedian),
          mrr: stats(100),
          customers: stats(10),
          wonDeals: stats(1),
        },
      })),
    },
  };
}
