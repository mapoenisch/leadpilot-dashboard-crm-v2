import { describe, it, expect } from 'vitest';
import { KPI_CONFIGS, RUN_OVERLAY_COLORS } from '../kpiTimeSeriesConfig';
import type { TimeSeriesPoint } from '../../../../types/aggregation';
import type { SimulationRun } from '../../../../types/scenario';

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
};

describe('kpiTimeSeriesConfig (characterization)', () => {
  it('KPI_CONFIGS enthält alle sieben Kennzahlen mit Baseline und Ziel', () => {
    expect(KPI_CONFIGS.map((c) => c.key)).toEqual([
      'liveARR',
      'liveMRR',
      'liveCustomers',
      'liveWonDeals',
      'ebitda',
      'netRevenue',
      'netCashFlow',
    ]);
    expect(KPI_CONFIGS.find((c) => c.key === 'liveARR')?.baseline).toBe(411840);
    expect(KPI_CONFIGS.find((c) => c.key === 'liveMRR')?.baseline).toBe(34320);
    expect(KPI_CONFIGS.find((c) => c.key === 'liveCustomers')?.baseline).toBe(66);
    for (const cfg of KPI_CONFIGS) {
      expect(cfg.target?.targetValue).toBeGreaterThan(0);
      expect(cfg.unit.length).toBeGreaterThan(0);
    }
  });

  it('timeSeriesExtractor liest je KPI den passenden Messwert', () => {
    expect(KPI_CONFIGS.find((c) => c.key === 'liveARR')?.timeSeriesExtractor(tsPoint)).toBe(100);
    expect(KPI_CONFIGS.find((c) => c.key === 'liveMRR')?.timeSeriesExtractor(tsPoint)).toBe(10);
    expect(KPI_CONFIGS.find((c) => c.key === 'liveCustomers')?.timeSeriesExtractor(tsPoint)).toBe(
      5,
    );
    expect(KPI_CONFIGS.find((c) => c.key === 'ebitda')?.timeSeriesExtractor(tsPoint)).toBe(7);
    expect(KPI_CONFIGS.find((c) => c.key === 'netCashFlow')?.timeSeriesExtractor(tsPoint)).toBe(3);
  });

  it('runValueExtractor priorisiert finalMetrics vor finalState vor 0', () => {
    const liveARR = KPI_CONFIGS.find((c) => c.key === 'liveARR')!;
    const withMetrics = { finalMetrics: { liveARR: 111 } } as unknown as SimulationRun;
    const withState = {
      finalState: { metrics: { liveARR: 222 } },
    } as unknown as SimulationRun;
    expect(liveARR.runValueExtractor(withMetrics)).toBe(111);
    expect(liveARR.runValueExtractor(withState)).toBe(222);
    expect(liveARR.runValueExtractor({} as SimulationRun)).toBe(0);
  });

  it('statsExtractor-Fallbacks liefern neutrale Werte bei fehlenden Finanzkennzahlen', () => {
    const empty = { metrics: {} } as unknown as Parameters<
      NonNullable<(typeof KPI_CONFIGS)[number]['statsExtractor']>
    >[0];
    expect(KPI_CONFIGS.find((c) => c.key === 'liveWonDeals')?.statsExtractor(empty).median).toBe(0);
    expect(KPI_CONFIGS.find((c) => c.key === 'ebitda')?.statsExtractor(empty).median).toBe(0);
    expect(KPI_CONFIGS.find((c) => c.key === 'netCashFlow')?.statsExtractor(empty).median).toBe(0);
    expect(KPI_CONFIGS.find((c) => c.key === 'netRevenue')?.statsExtractor(empty).median).toBe(
      411840,
    );
    expect(RUN_OVERLAY_COLORS).toHaveLength(5);
    for (const color of RUN_OVERLAY_COLORS) {
      expect(color).toMatch(/^#/);
    }
  });
});
