export interface MetricStats {
  median: number;
  p10: number;
  p90: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

export interface TimeSeriesPoint {
  tick: number;
  dayIndex: number;
  simulatedDate: string;
  metrics: {
    arr: number;
    mrr: number;
    customers: number;
    wonDeals: number;
    ebitda?: number;
    netRevenue?: number;
    netCashFlow?: number;
    cumulativeCashFlow?: number;
  };
}

export interface SimulationRunResult {
  runId: string;
  scenarioId: string;
  scenarioVersionId: string;
  completedAt?: string;
  metrics: {
    arr: number;
    mrr: number;
    customers: number;
    wonDeals: number;
    ebitda?: number;
    netRevenue?: number;
    netCashFlow?: number;
    cumulativeCashFlow?: number;
  };
  timeSeries?: TimeSeriesPoint[];
}

export interface AggregatedMetrics {
  arr: MetricStats;
  mrr: MetricStats;
  customers: MetricStats;
  wonDeals: MetricStats;
  financialMetrics?: {
    grossRevenue: MetricStats;
    netRevenue: MetricStats;
    ebitda: MetricStats;
    operatingMargin: MetricStats;
    cac: MetricStats;
    netCashFlow: MetricStats;
    cumulativeCashFlow: MetricStats;
    totalOpex: MetricStats;
  };
  timeSeries?: {
    tick: number;
    dayIndex: number;
    simulatedDate: string;
    metrics: {
      arr: MetricStats;
      mrr: MetricStats;
      customers: MetricStats;
      wonDeals: MetricStats;
      ebitda?: MetricStats;
      netRevenue?: MetricStats;
      netCashFlow?: MetricStats;
      cumulativeCashFlow?: MetricStats;
    };
  }[];
}

export interface ScenarioAggregationResult {
  scenarioId: string;
  scenarioVersionId: string;
  runCount: number;
  validRunCount: number;
  metrics: AggregatedMetrics;
  aggregatedAt: string;
}

export type AggregationErrorCode =
  | 'NO_VALID_RUNS'
  | 'INCOMPATIBLE_SCENARIO_VERSION'
  | 'INCOMPATIBLE_MANIFEST_VERSION'
  | 'INCOMPATIBLE_TIMESERIES'
  | 'MAX_RUNS_EXCEEDED';

export class AggregationError extends Error {
  constructor(
    public code: AggregationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AggregationError';
  }
}
