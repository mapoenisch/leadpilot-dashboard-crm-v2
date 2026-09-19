// Charakterisierung: MonteCarlo-Aggregator, Snapshot-Pruning, Finanzmodell, State-Machine.
import { describe, it, expect } from 'vitest';
import { MonteCarloAggregator } from '../../monteCarloAggregator';
import { SnapshotPruningManager } from '../../snapshotPruningManager';
import { FinancialModelManager } from '../../financialModelManager';
import { StateMachineEvaluator } from '../../stateMachineEvaluator';
import { AggregationError } from '../../../types/aggregation';
import type { SimulationRun } from '../../../types/scenario';
import type { TimeSeriesPoint } from '../../../types/aggregation';
import type { SimulationLead, SimulationDeal } from '../../../types/simulation';
import type { ISnapshotRepository } from '../../../services/db/ISnapshotRepository';

function metrics(arr: number) {
  return {
    liveLeads: 0,
    liveMQLs: 0,
    liveSQLs: 0,
    liveHotLeads: 0,
    liveOpportunities: 0,
    livePipelineValue: 0,
    liveWonDeals: 1,
    liveLostDeals: 0,
    liveCustomers: 5,
    liveMRR: arr / 12,
    liveARR: arr,
    conversionRate: 20,
  };
}

function point(tick: number, arr: number): TimeSeriesPoint {
  return {
    tick,
    dayIndex: tick,
    simulatedDate: '2026-01-01',
    metrics: { arr, mrr: arr / 12, customers: 5, wonDeals: 1 },
  };
}

function completedRun(
  id: string,
  arr: number,
  ticks = [point(0, arr), point(1, arr)],
): SimulationRun {
  return {
    runId: id,
    scenarioId: 'scen-1',
    scenarioVersionId: 'ver-1',
    seed: 1,
    rngState: 1,
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: 'b1',
    status: 'COMPLETED',
    startedAt: '2026-01-01T00:00:00.000Z',
    manifest: {
      runId: id,
      scenarioId: 'scen-1',
      scenarioVersionId: 'ver-1',
      seed: 1,
      initialRngState: 1,
      modelVersion: '1.0.0-v1',
      schemaVersion: '1.0.0',
      baselineVersion: 'b1',
      baselineId: 'b1',
      baselineHash: 'h'.repeat(64),
      organizationId: 'org-a',
      dataSourceId: 'simulated-crm',
      createdAt: '2026-01-01T00:00:00.000Z',
      simulationStartDate: '2026-01-01',
      targetTicks: 2,
      parameters: {
        marketingBudgetYearly: 65000,
        channelMix: { linkedIn: 38, seo: 22, partner: 18, webinar: 12, outbound: 10 },
        trialToPaidConversion: 18,
        salesRepCount: 2,
        csRepCount: 2,
        churnRateMonthly: 2.8,
        salesCycleDays: 38,
        targetPackageFocus: 'Balanced',
        winProbabilityMultiplier: 1,
        discountPercent: 0,
      },
      correlationId: 'c',
    },
    finalMetrics: metrics(arr),
    timeSeries: ticks,
    correlationId: 'c',
  };
}

describe('MonteCarloAggregator', () => {
  it('calculatePercentile: leer/single/Interpolation', () => {
    expect(MonteCarloAggregator.calculatePercentile([], 0.5)).toBe(0);
    expect(MonteCarloAggregator.calculatePercentile([7], 0.9)).toBe(7);
    expect(MonteCarloAggregator.calculatePercentile([0, 10], 0.5)).toBe(5);
    expect(MonteCarloAggregator.calculatePercentile([1, 2, 3, 4], 0)).toBe(1);
    expect(MonteCarloAggregator.calculatePercentile([1, 2, 3, 4], 1)).toBe(4);
  });

  it('calculateStats: leer und Single ohne NaN', () => {
    expect(MonteCarloAggregator.calculateStats([])).toMatchObject({ mean: 0, min: 0, max: 0 });
    const single = MonteCarloAggregator.calculateStats([42]);
    expect(single).toMatchObject({ mean: 42, median: 42, min: 42, max: 42, stdDev: 0 });
    const stats = MonteCarloAggregator.calculateStats([10, 20, 30]);
    expect(stats.mean).toBe(20);
    expect(stats.stdDev).toBeGreaterThan(0);
  });

  it('aggregateRuns: Happy-Path mit 2 Läufen inkl. Zeitreihe', () => {
    const res = MonteCarloAggregator.aggregateRuns([
      completedRun('run-b', 200),
      completedRun('run-a', 100),
    ]);
    expect(res.runCount).toBe(2);
    expect(res.validRunCount).toBe(2);
    expect(res.metrics.arr.mean).toBe(150);
    expect(res.metrics.timeSeries).toHaveLength(2);
    expect(res.aggregatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('aggregateRuns: Fehlerpfade (leer, >10, keine COMPLETED, Versionsmix)', () => {
    expect(() => MonteCarloAggregator.aggregateRuns([])).toThrowError(AggregationError);
    expect(() =>
      MonteCarloAggregator.aggregateRuns(
        Array.from({ length: 11 }, (_, i) => completedRun(`r${i}`, 1)),
      ),
    ).toThrowError(/Maximal 10/);
    const failed = { ...completedRun('run-x', 1), status: 'FAILED' as const };
    expect(() => MonteCarloAggregator.aggregateRuns([failed])).toThrowError(/COMPLETED/);
    const otherVersion = { ...completedRun('run-y', 1), scenarioVersionId: 'ver-2' };
    expect(() =>
      MonteCarloAggregator.aggregateRuns([completedRun('run-z', 1), otherVersion]),
    ).toThrowError(/unterschiedlicher Szenario-Versionen/);
  });

  it('aggregateRuns: inkompatible Zeitreihen werden abgewiesen', () => {
    const short = completedRun('run-a', 100, [point(0, 100)]);
    expect(() =>
      MonteCarloAggregator.aggregateRuns([completedRun('run-b', 100), short]),
    ).toThrowError(/Zeitreihen/);
  });
});

describe('SnapshotPruningManager', () => {
  it('calculateRetentionTicks behält Start, Meilensteine und Ende', () => {
    const keep = SnapshotPruningManager.calculateRetentionTicks(365, 30);
    expect(keep.has(0)).toBe(true);
    expect(keep.has(30)).toBe(true);
    expect(keep.has(360)).toBe(true);
    expect(keep.has(365)).toBe(true);
    expect(keep.has(31)).toBe(false);
  });

  it('Edge: totalTicks 0 und Intervall größer als Total', () => {
    expect([...SnapshotPruningManager.calculateRetentionTicks(0)]).toEqual([0]);
    const keep = SnapshotPruningManager.calculateRetentionTicks(10, 30);
    expect([...keep].sort((a, b) => a - b)).toEqual([0, 10]);
  });

  it('pruneRunSnapshots delegiert an pruneSnapshotsForRun (nie deleteByRun)', async () => {
    let sawDeleteByRun = false;
    const repo = {
      pruneSnapshotsForRun: async (_runId: string, keep: number[]) => ({
        prunedCount: 5,
        remainingCount: keep.length,
      }),
    } as unknown as ISnapshotRepository & { deleteByRun?: unknown };
    (repo as unknown as Record<string, unknown>).deleteByRun = () => {
      sawDeleteByRun = true;
    };
    const summary = await SnapshotPruningManager.pruneRunSnapshots('run-1', repo, 60, 30);
    expect(summary).toMatchObject({ runId: 'run-1', prunedCount: 5, remainingCount: 3 });
    expect(summary.retainedTicks).toEqual([0, 30, 60]);
    expect(sawDeleteByRun).toBe(false);
  });

  it('pruneAllRuns summiert über Läufe', async () => {
    const repo = {
      pruneSnapshotsForRun: async () => ({ prunedCount: 2, remainingCount: 3 }),
    } as unknown as ISnapshotRepository;
    const summary = await SnapshotPruningManager.pruneAllRuns(['a', 'b'], repo, 60, 30);
    expect(summary).toMatchObject({ prunedCount: 4, remainingCount: 6 });
    expect(summary.retainedTicks).toEqual([0, 30, 60]);
  });
});

describe('FinancialModelManager', () => {
  it('Happy-Path: Kosten, Marge und Cashflow sind konsistent', () => {
    const m = FinancialModelManager.calculateFinancialMetrics({
      salesRepCount: 2,
      csRepCount: 2,
      liveARR: 365000,
      deals: [],
      newWonDealsThisTick: 1,
    });
    expect(m.grossRevenue).toBe(1000);
    expect(m.churnLoss).toBe(0);
    expect(m.netRevenue).toBe(1000);
    expect(m.variableSalesCost).toBe(500);
    expect(m.cac).toBeGreaterThan(0);
    expect(m.ebitda).toBe(m.netRevenue - m.totalOpex);
    expect(m.netCashFlow).toBe(m.cashInflow - m.cashOutflow);
    expect(m.cumulativeCashFlow).toBe(m.netCashFlow);
    expect(m.grossProfit).toBe(m.netRevenue);
  });

  it('ohne Neukunden ist CAC 0 (Division-by-Zero-Sicherheit)', () => {
    const m = FinancialModelManager.calculateFinancialMetrics({
      salesRepCount: 1,
      csRepCount: 1,
      liveARR: 0,
      deals: [],
      newWonDealsThisTick: 0,
    });
    expect(m.cac).toBe(0);
    expect(m.grossRevenue).toBe(0);
    expect(m.netRevenue).toBe(0);
  });

  it('negative/kaputte Counts werden normalisiert, Churn mindert Umsatz', () => {
    const m = FinancialModelManager.calculateFinancialMetrics({
      salesRepCount: -2.7,
      csRepCount: 1,
      liveARR: 365000,
      deals: [{ isChurned: true, arr: 36500 } as SimulationDeal],
      newWonDealsThisTick: 2,
      previousCumulativeCashFlow: 100,
      marketingBudgetYearly: 72000,
    });
    expect(m.salesHeadcountCost).toBe(0);
    expect(m.churnLoss).toBe(100);
    expect(m.marketingCost).toBe(200);
    expect(m.cumulativeCashFlow).toBe(100 + m.netCashFlow);
  });
});

describe('StateMachineEvaluator', () => {
  const lead: SimulationLead = {
    id: 'lead-1',
    contactName: 'C',
    companyName: 'ACME',
    email: 'c@acme.test',
    industry: 'IT',
    city: 'Berlin',
    status: 'New',
    score: 80,
    source: 'Inbound',
    estimatedValue: 50000,
    owner: 'Sales',
    createdAtTick: 0,
    lastUpdatedTick: 0,
  };
  const clock = { tick: 5, simulatedDate: '2026-01-06' };

  it('erlaubte Transition erzeugt neues Objekt ohne Seiteneffekt', () => {
    const res = StateMachineEvaluator.validateAndTransitionLead(lead, 'MQL', 'QUALIFY', clock);
    expect(res.success).toBe(true);
    expect(res.updatedEntity?.status).toBe('MQL');
    expect(lead.status).toBe('New');
  });

  it('verbotene Transition liefert Rejected-Eintrag', () => {
    const res = StateMachineEvaluator.validateAndTransitionLead(lead, 'Won', 'CHEAT', clock);
    expect(res.success).toBe(false);
    expect(res.rejectedEntry).toMatchObject({
      entityId: 'lead-1',
      entityType: 'LEAD',
      fromState: 'New',
      toState: 'Won',
      rejectedAtTick: 5,
    });
  });

  it('Deal-Churn genau einmal, danach Rejection', () => {
    const deal = { id: 'deal-1', companyName: 'ACME' } as SimulationDeal;
    const first = StateMachineEvaluator.validateAndTransitionDealChurn(deal, clock);
    expect(first.success).toBe(true);
    expect(first.updatedEntity?.isChurned).toBe(true);
    expect(first.updatedEntity?.churnedAtTick).toBe(5);
    expect(deal.isChurned).toBeFalsy();
    const second = StateMachineEvaluator.validateAndTransitionDealChurn(
      { ...deal, isChurned: true },
      clock,
    );
    expect(second.success).toBe(false);
    expect(second.rejectedEntry?.action).toBe('CHURN_CUSTOMER');
  });
});
