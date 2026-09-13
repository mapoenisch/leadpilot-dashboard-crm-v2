import { GoalTarget } from '../../../types/kpi';
import { AggregatedMetrics, MetricStats, TimeSeriesPoint } from '../../../types/aggregation';
import { SimulationRun } from '../../../types/scenario';

export type AggregatedTimeSeriesPoint = NonNullable<AggregatedMetrics['timeSeries']>[number];

export interface KpiAggSource {
  metrics: {
    arr: MetricStats;
    mrr: MetricStats;
    customers: MetricStats;
    wonDeals?: MetricStats;
    financialMetrics?: {
      ebitda: MetricStats;
      netRevenue: MetricStats;
      netCashFlow: MetricStats;
    };
  };
}

export type SelectedKpiKey =
  | 'liveARR'
  | 'liveMRR'
  | 'liveCustomers'
  | 'liveWonDeals'
  | 'ebitda'
  | 'netRevenue'
  | 'netCashFlow';

export interface KpiConfigItem {
  key: SelectedKpiKey;
  label: string;
  unit: string;
  baseline: number;
  target?: GoalTarget;
  timeSeriesExtractor: (pt: TimeSeriesPoint) => number;
  statsExtractor: (agg: KpiAggSource) => MetricStats;
  runValueExtractor: (run: SimulationRun) => number;
}

export const KPI_CONFIGS: KpiConfigItem[] = [
  {
    key: 'liveARR',
    label: 'ARR (Jährlich wiederkehrend)',
    unit: '€',
    baseline: 411840,
    target: { kpiId: 'liveARR', targetValue: 500000 },
    timeSeriesExtractor: (pt) => pt.metrics.arr,
    statsExtractor: (agg) => agg.metrics.arr,
    runValueExtractor: (r) => r.finalMetrics?.liveARR ?? r.finalState?.metrics?.liveARR ?? 0,
  },
  {
    key: 'liveMRR',
    label: 'MRR (Monatlich wiederkehrend)',
    unit: '€',
    baseline: 34320,
    target: { kpiId: 'liveMRR', targetValue: 41667 },
    timeSeriesExtractor: (pt) => pt.metrics.mrr,
    statsExtractor: (agg) => agg.metrics.mrr,
    runValueExtractor: (r) => r.finalMetrics?.liveMRR ?? r.finalState?.metrics?.liveMRR ?? 0,
  },
  {
    key: 'liveCustomers',
    label: 'Aktive Kunden',
    unit: 'Kunden',
    baseline: 66,
    target: { kpiId: 'liveCustomers', targetValue: 100 },
    timeSeriesExtractor: (pt) => pt.metrics.customers,
    statsExtractor: (agg) => agg.metrics.customers,
    runValueExtractor: (r) =>
      r.finalMetrics?.liveCustomers ?? r.finalState?.metrics?.liveCustomers ?? 0,
  },
  {
    key: 'liveWonDeals',
    label: 'Gewonnene Deals',
    unit: 'Deals',
    baseline: 0,
    target: { kpiId: 'liveWonDeals', targetValue: 34 },
    timeSeriesExtractor: (pt) => pt.metrics.wonDeals,
    statsExtractor: (agg) =>
      (agg.metrics as { wonDeals?: MetricStats }).wonDeals ?? {
        median: 0,
        p10: 0,
        p90: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
      },
    runValueExtractor: (r) =>
      r.finalMetrics?.liveWonDeals ?? r.finalState?.metrics?.liveWonDeals ?? 0,
  },
  {
    key: 'ebitda',
    label: 'EBITDA (Operatives Ergebnis)',
    unit: '€',
    baseline: 0,
    target: { kpiId: 'ebitda', targetValue: 50000 },
    timeSeriesExtractor: (pt) => pt.metrics.ebitda ?? 0,
    statsExtractor: (agg) =>
      agg.metrics.financialMetrics?.ebitda ?? {
        median: 0,
        p10: 0,
        p90: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
      },
    runValueExtractor: (r) =>
      r.finalMetrics?.financialMetrics?.ebitda ??
      r.finalState?.metrics?.financialMetrics?.ebitda ??
      0,
  },
  {
    key: 'netRevenue',
    label: 'Nettoumsatz (Net Revenue)',
    unit: '€',
    baseline: 411840,
    target: { kpiId: 'netRevenue', targetValue: 500000 },
    timeSeriesExtractor: (pt) => pt.metrics.netRevenue ?? 0,
    statsExtractor: (agg) =>
      agg.metrics.financialMetrics?.netRevenue ?? {
        median: 411840,
        p10: 411840,
        p90: 411840,
        mean: 411840,
        stdDev: 0,
        min: 411840,
        max: 411840,
      },
    runValueExtractor: (r) =>
      r.finalMetrics?.financialMetrics?.netRevenue ??
      r.finalState?.metrics?.financialMetrics?.netRevenue ??
      0,
  },
  {
    key: 'netCashFlow',
    label: 'Netto-Cashflow',
    unit: '€',
    baseline: 0,
    target: { kpiId: 'netCashFlow', targetValue: 30000 },
    timeSeriesExtractor: (pt) => pt.metrics.netCashFlow ?? 0,
    statsExtractor: (agg) =>
      agg.metrics.financialMetrics?.netCashFlow ?? {
        median: 0,
        p10: 0,
        p90: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
      },
    runValueExtractor: (r) =>
      r.finalMetrics?.financialMetrics?.netCashFlow ??
      r.finalState?.metrics?.financialMetrics?.netCashFlow ??
      0,
  },
];

export const RUN_OVERLAY_COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4'];
