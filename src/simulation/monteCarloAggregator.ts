import {
  AggregatedMetrics,
  AggregationError,
  MetricStats,
  ScenarioAggregationResult,
} from '../types/aggregation';
import { SimulationRun } from '../types/scenario';
import { systemContext } from './systemContext';

export class MonteCarloAggregator {
  /**
   * Linear Interpolation Quantile calculation (R-7 / Excel type formula).
   * Rank r = p * (n - 1)
   * k = floor(r), j = ceil(r), weight w = r - k
   * Quantile = (1 - w) * sorted[k] + w * sorted[j]
   */
  public static calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];

    const n = sortedValues.length;
    const r = percentile * (n - 1);
    const k = Math.floor(r);
    const j = Math.ceil(r);
    const w = r - k;

    return (1 - w) * sortedValues[k] + w * sortedValues[j];
  }

  /**
   * Calculates descriptive statistics for a numeric array.
   */
  public static calculateStats(values: number[]): MetricStats {
    if (values.length === 0) {
      return {
        median: 0,
        p10: 0,
        p90: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const min = sorted[0];
    const max = sorted[n - 1];

    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;

    const median = MonteCarloAggregator.calculatePercentile(sorted, 0.5);
    const p10 = MonteCarloAggregator.calculatePercentile(sorted, 0.1);
    const p90 = MonteCarloAggregator.calculatePercentile(sorted, 0.9);

    let stdDev = 0;
    if (n > 1) {
      const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
      stdDev = Math.sqrt(variance);
    }

    return {
      median,
      p10,
      p90,
      mean,
      stdDev,
      min,
      max,
    };
  }

  /**
   * Aggregates completed SimulationRun instances into a ScenarioAggregationResult.
   */
  public static aggregateRuns(runs: SimulationRun[]): ScenarioAggregationResult {
    if (!runs || runs.length === 0) {
      throw new AggregationError(
        'NO_VALID_RUNS',
        'Keine Läufe zur Aggregation übergeben.'
      );
    }

    if (runs.length > 10) {
      throw new AggregationError(
        'MAX_RUNS_EXCEEDED',
        `Maximal 10 Läufe pro Szenario erlaubt (Übergeben: ${runs.length}).`
      );
    }

    // Filter only COMPLETED runs with valid final metrics
    const completedRuns = runs.filter(
      (r) => r.status === 'COMPLETED' && r.finalMetrics
    );

    if (completedRuns.length === 0) {
      throw new AggregationError(
        'NO_VALID_RUNS',
        'Keine abgeschlossenen (COMPLETED) Läufe zur Aggregation vorhanden.'
      );
    }

    // ScenarioVersion Isolation Check
    const targetVersionId = completedRuns[0].scenarioVersionId;
    const targetScenarioId = completedRuns[0].scenarioId;

    for (const run of completedRuns) {
      if (run.scenarioVersionId !== targetVersionId) {
        throw new AggregationError(
          'INCOMPATIBLE_SCENARIO_VERSION',
          `Läufe unterschiedlicher Szenario-Versionen können nicht zusammen aggregiert werden (${run.scenarioVersionId} vs ${targetVersionId}).`
        );
      }
    }

    // Model / Schema / Baseline Compatibility Check
    const firstManifest = completedRuns[0].manifest;
    for (const run of completedRuns) {
      const m = run.manifest;
      if (
        m.modelVersion !== firstManifest.modelVersion ||
        m.schemaVersion !== firstManifest.schemaVersion ||
        m.baselineVersion !== firstManifest.baselineVersion
      ) {
        throw new AggregationError(
          'INCOMPATIBLE_MANIFEST_VERSION',
          `Inkompatible Manifest-Versionen (Model: ${m.modelVersion}, Schema: ${m.schemaVersion}, Baseline: ${m.baselineVersion}).`
        );
      }
    }

    // Sort completed runs deterministically by runId for input order independence
    const orderedRuns = [...completedRuns].sort((a, b) => a.runId.localeCompare(b.runId));

    const arrValues = orderedRuns.map((r) => r.finalMetrics!.liveARR);
    const mrrValues = orderedRuns.map((r) => r.finalMetrics!.liveMRR);
    const customerValues = orderedRuns.map((r) => r.finalMetrics!.liveCustomers);
    const dealValues = orderedRuns.map((r) => r.finalMetrics!.liveWonDeals);

    // Tick-by-tick time series aggregation
    const firstTimeSeries = orderedRuns[0].timeSeries;
    let aggregatedTimeSeries: AggregatedMetrics['timeSeries'] = undefined;

    if (firstTimeSeries && firstTimeSeries.length > 0) {
      const seriesLength = firstTimeSeries.length;

      // 1. Verify tick length and structure across all runs
      for (const run of orderedRuns) {
        if (!run.timeSeries || run.timeSeries.length !== seriesLength) {
          throw new AggregationError(
            'INCOMPATIBLE_TIMESERIES',
            `Inkompatible Zeitreihen-Strukturen oder unterschiedliche Tick-Längen unter den Läufen.`
          );
        }
      }

      // 2. Verify tick-synchronous alignment
      for (let i = 0; i < seriesLength; i++) {
        const expectedTick = firstTimeSeries[i].tick;
        for (const run of orderedRuns) {
          if (run.timeSeries![i].tick !== expectedTick) {
            throw new AggregationError(
              'INCOMPATIBLE_TIMESERIES',
              `Tick-Ausrichtung fehlgeschlagen: Inkompatibler Tick bei Index ${i} (${run.timeSeries![i].tick} vs ${expectedTick}).`
            );
          }
        }
      }

      // 3. Compute per-tick MetricStats for arr, mrr, customers, wonDeals, ebitda, netRevenue, netCashFlow, cumulativeCashFlow
      aggregatedTimeSeries = [];
      for (let i = 0; i < seriesLength; i++) {
        const refPoint = firstTimeSeries[i];
        const tickArr = orderedRuns.map((r) => r.timeSeries![i].metrics.arr);
        const tickMrr = orderedRuns.map((r) => r.timeSeries![i].metrics.mrr);
        const tickCustomers = orderedRuns.map((r) => r.timeSeries![i].metrics.customers);
        const tickWonDeals = orderedRuns.map((r) => r.timeSeries![i].metrics.wonDeals);
        const tickEbitda = orderedRuns.map((r) => r.timeSeries![i].metrics.ebitda ?? 0);
        const tickNetRevenue = orderedRuns.map((r) => r.timeSeries![i].metrics.netRevenue ?? 0);
        const tickNetCashFlow = orderedRuns.map((r) => r.timeSeries![i].metrics.netCashFlow ?? 0);
        const tickCumulativeCashFlow = orderedRuns.map((r) => r.timeSeries![i].metrics.cumulativeCashFlow ?? 0);

        aggregatedTimeSeries.push({
          tick: refPoint.tick,
          dayIndex: refPoint.dayIndex,
          simulatedDate: refPoint.simulatedDate,
          metrics: {
            arr: MonteCarloAggregator.calculateStats(tickArr),
            mrr: MonteCarloAggregator.calculateStats(tickMrr),
            customers: MonteCarloAggregator.calculateStats(tickCustomers),
            wonDeals: MonteCarloAggregator.calculateStats(tickWonDeals),
            ebitda: MonteCarloAggregator.calculateStats(tickEbitda),
            netRevenue: MonteCarloAggregator.calculateStats(tickNetRevenue),
            netCashFlow: MonteCarloAggregator.calculateStats(tickNetCashFlow),
            cumulativeCashFlow: MonteCarloAggregator.calculateStats(tickCumulativeCashFlow),
          },
        });
      }
    }

    const financialMetrics = {
      grossRevenue: MonteCarloAggregator.calculateStats(orderedRuns.map((r) => r.finalMetrics?.financialMetrics?.grossRevenue ?? 0)),
      netRevenue: MonteCarloAggregator.calculateStats(orderedRuns.map((r) => r.finalMetrics?.financialMetrics?.netRevenue ?? 0)),
      ebitda: MonteCarloAggregator.calculateStats(orderedRuns.map((r) => r.finalMetrics?.financialMetrics?.ebitda ?? 0)),
      operatingMargin: MonteCarloAggregator.calculateStats(orderedRuns.map((r) => r.finalMetrics?.financialMetrics?.operatingMargin ?? 0)),
      cac: MonteCarloAggregator.calculateStats(orderedRuns.map((r) => r.finalMetrics?.financialMetrics?.cac ?? 0)),
      netCashFlow: MonteCarloAggregator.calculateStats(orderedRuns.map((r) => r.finalMetrics?.financialMetrics?.netCashFlow ?? 0)),
      cumulativeCashFlow: MonteCarloAggregator.calculateStats(orderedRuns.map((r) => r.finalMetrics?.financialMetrics?.cumulativeCashFlow ?? 0)),
      totalOpex: MonteCarloAggregator.calculateStats(orderedRuns.map((r) => r.finalMetrics?.financialMetrics?.totalOpex ?? 0)),
    };

    const metrics: AggregatedMetrics = {
      arr: MonteCarloAggregator.calculateStats(arrValues),
      mrr: MonteCarloAggregator.calculateStats(mrrValues),
      customers: MonteCarloAggregator.calculateStats(customerValues),
      wonDeals: MonteCarloAggregator.calculateStats(dealValues),
      financialMetrics,
      timeSeries: aggregatedTimeSeries,
    };

    return {
      scenarioId: targetScenarioId,
      scenarioVersionId: targetVersionId,
      runCount: runs.length,
      validRunCount: completedRuns.length,
      metrics,
      aggregatedAt: systemContext.now(),
    };
  }
}
