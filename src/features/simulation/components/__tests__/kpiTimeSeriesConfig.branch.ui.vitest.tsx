import { describe, it, expect } from 'vitest';
import { KPI_CONFIGS, RUN_OVERLAY_COLORS } from '../kpiTimeSeriesConfig';
import type { KpiAggSource } from '../kpiTimeSeriesConfig';
import type { MetricStats, TimeSeriesPoint } from '../../../../types/aggregation';
import type { SimulationRun } from '../../../../types/scenario';

function mkStats(median: number): MetricStats {
  return {
    median,
    p10: median - 10,
    p90: median + 10,
    mean: median,
    stdDev: 5,
    min: median - 20,
    max: median + 20,
  };
}

const fullAgg = {
  metrics: {
    arr: mkStats(411840),
    mrr: mkStats(34320),
    customers: mkStats(66),
    wonDeals: mkStats(12),
    financialMetrics: {
      ebitda: mkStats(50000),
      netRevenue: mkStats(420000),
      netCashFlow: mkStats(30000),
    },
  },
} as unknown as KpiAggSource;

const tsPoint: TimeSeriesPoint = {
  tick: 5,
  dayIndex: 5,
  simulatedDate: '06.01.26',
  metrics: {
    arr: 100,
    mrr: 10,
    customers: 5,
    wonDeals: 2,
    ebitda: 7,
    netRevenue: 90,
    netCashFlow: 3,
  },
} as unknown as TimeSeriesPoint;

const tsPointSparse = {
  tick: 5,
  dayIndex: 5,
  simulatedDate: '06.01.26',
  metrics: { arr: 100, mrr: 10, customers: 5, wonDeals: 2 },
} as unknown as TimeSeriesPoint;

describe('kpiTimeSeriesConfig (branch)', () => {
  it('alle sieben timeSeriesExtractor inkl. Fallbacks (?? 0)', () => {
    const byKey = Object.fromEntries(KPI_CONFIGS.map((c) => [c.key, c]));
    expect(byKey.liveARR!.timeSeriesExtractor(tsPoint)).toBe(100);
    expect(byKey.liveMRR!.timeSeriesExtractor(tsPoint)).toBe(10);
    expect(byKey.liveCustomers!.timeSeriesExtractor(tsPoint)).toBe(5);
    expect(byKey.liveWonDeals!.timeSeriesExtractor(tsPoint)).toBe(2);
    expect(byKey.ebitda!.timeSeriesExtractor(tsPoint)).toBe(7);
    expect(byKey.netRevenue!.timeSeriesExtractor(tsPoint)).toBe(90);
    expect(byKey.netCashFlow!.timeSeriesExtractor(tsPoint)).toBe(3);
    // fehlende Finanzfelder -> 0
    expect(byKey.ebitda!.timeSeriesExtractor(tsPointSparse)).toBe(0);
    expect(byKey.netRevenue!.timeSeriesExtractor(tsPointSparse)).toBe(0);
    expect(byKey.netCashFlow!.timeSeriesExtractor(tsPointSparse)).toBe(0);
  });

  it('alle sieben statsExtractor mit befüllter Aggregation', () => {
    const byKey = Object.fromEntries(KPI_CONFIGS.map((c) => [c.key, c]));
    expect(byKey.liveARR!.statsExtractor(fullAgg).median).toBe(411840);
    expect(byKey.liveMRR!.statsExtractor(fullAgg).median).toBe(34320);
    expect(byKey.liveCustomers!.statsExtractor(fullAgg).median).toBe(66);
    expect(byKey.liveWonDeals!.statsExtractor(fullAgg).median).toBe(12);
    expect(byKey.ebitda!.statsExtractor(fullAgg).median).toBe(50000);
    expect(byKey.netRevenue!.statsExtractor(fullAgg).median).toBe(420000);
    expect(byKey.netCashFlow!.statsExtractor(fullAgg).median).toBe(30000);
  });

  it('statsExtractor mit vorhandenen wonDeals nutzt echten Wert (kein Fallback)', () => {
    const agg = { metrics: { wonDeals: mkStats(9) } } as unknown as KpiAggSource;
    expect(KPI_CONFIGS.find((c) => c.key === 'liveWonDeals')?.statsExtractor(agg).median).toBe(9);
  });

  it('alle sieben runValueExtractor: finalMetrics > finalState > 0', () => {
    for (const cfg of KPI_CONFIGS) {
      const fromMetrics = { finalMetrics: nestMetric(cfg.key, 111) } as unknown as SimulationRun;
      const fromState = {
        finalState: { metrics: nestMetric(cfg.key, 222) },
      } as unknown as SimulationRun;
      expect(cfg.runValueExtractor(fromMetrics)).toBe(111);
      expect(cfg.runValueExtractor(fromState)).toBe(222);
      expect(cfg.runValueExtractor({} as SimulationRun)).toBe(0);
      // nur finalMetrics-Hülle ohne Wert -> finalState-Zweig
      const mixed = {
        finalMetrics: {},
        finalState: { metrics: nestMetric(cfg.key, 333) },
      } as unknown as SimulationRun;
      expect(cfg.runValueExtractor(mixed)).toBe(333);
    }
  });

  it('RUN_OVERLAY_COLORS-Index-Arithmetik bleibt im Farbraum', () => {
    for (let i = 0; i < 12; i++) {
      expect(RUN_OVERLAY_COLORS[i % RUN_OVERLAY_COLORS.length]).toMatch(/^#/);
    }
  });
});

function nestMetric(key: string, value: number): Record<string, unknown> {
  if (key === 'liveARR') return { liveARR: value };
  if (key === 'liveMRR') return { liveMRR: value };
  if (key === 'liveCustomers') return { liveCustomers: value };
  if (key === 'liveWonDeals') return { liveWonDeals: value };
  if (key === 'ebitda') return { financialMetrics: { ebitda: value } };
  if (key === 'netRevenue') return { financialMetrics: { netRevenue: value } };
  return { financialMetrics: { netCashFlow: value } };
}
