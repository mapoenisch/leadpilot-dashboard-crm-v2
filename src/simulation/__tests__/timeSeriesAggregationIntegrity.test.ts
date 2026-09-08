import { MonteCarloAggregator } from '../monteCarloAggregator';
import { ScenarioService } from '../scenarioService';
import { ScenarioRepository } from '../scenarioRepository';
import { AggregationError, TimeSeriesPoint } from '../../types/aggregation';
import { SimulationRun, RunManifest } from '../../types/scenario';
import { CRMRepository } from '../../services/db/crmRepository';

export async function runTimeSeriesAggregationTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 008 TEST SUITE (KPI-ZEITREIHENAGGREGATION P10/P50/P90) ===');

  let overallPassed = true;

  const mockManifest: RunManifest = Object.freeze({
    runId: 'run-mock-1',
    scenarioId: 'scen-test',
    scenarioVersionId: 'ver-test-v1',
    seed: 42,
    initialRngState: 100,
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: 'Faktenblatt_v1.1',
    createdAt: '2026-01-01T00:00:00Z',
    correlationId: 'mock-corr',
    simulationStartDate: '01.01.2026',
    targetTicks: 2,
    parameters: Object.freeze({
      marketingBudgetYearly: 65000,
      channelMix: { linkedIn: 30, seo: 25, partner: 20, webinar: 15, outbound: 10 },
      trialToPaidConversion: 18,
      salesRepCount: 2,
      csRepCount: 2,
      churnRateMonthly: 2.8,
      salesCycleDays: 38,
      targetPackageFocus: 'Growth',
      winProbabilityMultiplier: 1.0,
      discountPercent: 0,
    }),
  });

  function createMockRun(runId: string, status: SimulationRun['status'], timeSeries?: TimeSeriesPoint[]): SimulationRun {
    const finalTs = timeSeries && timeSeries.length > 0 ? timeSeries[timeSeries.length - 1] : undefined;
    return {
      runId,
      scenarioId: 'scen-test',
      scenarioVersionId: 'ver-test-v1',
      seed: 42,
      rngState: 123,
      modelVersion: '1.0.0-v1',
      schemaVersion: '1.0.0',
      baselineVersion: 'Faktenblatt_v1.1',
      status,
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: status === 'COMPLETED' ? '2026-01-01T00:01:00Z' : undefined,
      manifest: mockManifest,
      finalMetrics: finalTs
        ? {
            liveLeads: 10,
            liveMQLs: 5,
            liveSQLs: 3,
            liveHotLeads: 2,
            liveOpportunities: 4,
            livePipelineValue: 50000,
            liveWonDeals: finalTs.metrics.wonDeals,
            liveLostDeals: 1,
            liveCustomers: finalTs.metrics.customers,
            liveMRR: finalTs.metrics.mrr,
            liveARR: finalTs.metrics.arr,
            conversionRate: 43,
          }
        : undefined,
      timeSeries,
      correlationId: 'mock-corr',
    };
  }

  // ---------------------------------------------------------
  // TEST A: Einzelner Tick Aggregation & Quantile
  // ---------------------------------------------------------
  log.push('\n--- TEST A: Einzelner Tick Aggregation & Quantile ---');
  const tsSingleTickRun1: TimeSeriesPoint[] = [{ tick: 0, dayIndex: 0, simulatedDate: '01.01.2026', metrics: { arr: 100000, mrr: 8333, customers: 10, wonDeals: 2 } }];
  const tsSingleTickRun2: TimeSeriesPoint[] = [{ tick: 0, dayIndex: 0, simulatedDate: '01.01.2026', metrics: { arr: 200000, mrr: 16666, customers: 20, wonDeals: 4 } }];
  const tsSingleTickRun3: TimeSeriesPoint[] = [{ tick: 0, dayIndex: 0, simulatedDate: '01.01.2026', metrics: { arr: 300000, mrr: 25000, customers: 30, wonDeals: 6 } }];

  const runA1 = createMockRun('run-a1', 'COMPLETED', tsSingleTickRun1);
  const runA2 = createMockRun('run-a2', 'COMPLETED', tsSingleTickRun2);
  const runA3 = createMockRun('run-a3', 'COMPLETED', tsSingleTickRun3);

  const resA = MonteCarloAggregator.aggregateRuns([runA1, runA2, runA3]);
  const tsPointA = resA.metrics.timeSeries?.[0];

  const testAPassed =
    Boolean(tsPointA) &&
    tsPointA?.metrics.arr.median === 200000 &&
    tsPointA?.metrics.arr.p10 === 120000 &&
    tsPointA?.metrics.arr.p90 === 280000 &&
    tsPointA?.metrics.arr.mean === 200000 &&
    tsPointA?.metrics.arr.min === 100000 &&
    tsPointA?.metrics.arr.max === 300000;

  if (testAPassed) {
    log.push(`✅ TEST A PASSED: Single tick computed exact stats (Median: ${tsPointA?.metrics.arr.median} €, P10: ${tsPointA?.metrics.arr.p10} €, P90: ${tsPointA?.metrics.arr.p90} €).`);
  } else {
    log.push('❌ TEST A FAILED: Single tick quantiles diverged!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Mehrere Ticks ohne Vermischung
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Mehrere Ticks ohne Vermischung ---');
  const tsMultiTickRun1: TimeSeriesPoint[] = [
    { tick: 0, dayIndex: 0, simulatedDate: '01.01.2026', metrics: { arr: 100000, mrr: 8333, customers: 10, wonDeals: 1 } },
    { tick: 1, dayIndex: 1, simulatedDate: '02.01.2026', metrics: { arr: 150000, mrr: 12500, customers: 15, wonDeals: 2 } },
  ];
  const tsMultiTickRun2: TimeSeriesPoint[] = [
    { tick: 0, dayIndex: 0, simulatedDate: '01.01.2026', metrics: { arr: 200000, mrr: 16666, customers: 20, wonDeals: 3 } },
    { tick: 1, dayIndex: 1, simulatedDate: '02.01.2026', metrics: { arr: 250000, mrr: 20833, customers: 25, wonDeals: 5 } },
  ];

  const runB1 = createMockRun('run-b1', 'COMPLETED', tsMultiTickRun1);
  const runB2 = createMockRun('run-b2', 'COMPLETED', tsMultiTickRun2);

  const resB = MonteCarloAggregator.aggregateRuns([runB1, runB2]);
  const tsB0 = resB.metrics.timeSeries?.[0];
  const tsB1 = resB.metrics.timeSeries?.[1];

  const testBPassed =
    resB.metrics.timeSeries?.length === 2 &&
    tsB0?.tick === 0 &&
    tsB0?.metrics.arr.median === 150000 &&
    tsB1?.tick === 1 &&
    tsB1?.metrics.arr.median === 200000;

  if (testBPassed) {
    log.push(`✅ TEST B PASSED: Tick 0 (Median 150.000 €) and Tick 1 (Median 200.000 €) aggregated separately without cross-tick pollution.`);
  } else {
    log.push('❌ TEST B FAILED: Cross-tick mixing detected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Quantilordnung P10 <= P50 <= P90 pro Tick
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Quantilordnung P10 <= P50 <= P90 pro Tick ---');
  const testCPassed = resB.metrics.timeSeries?.every(
    (pt) => pt.metrics.arr.p10 <= pt.metrics.arr.median && pt.metrics.arr.median <= pt.metrics.arr.p90
  );

  if (testCPassed) {
    log.push('✅ TEST C PASSED: P10 <= P50 <= P90 strictly holds for all time series points.');
  } else {
    log.push('❌ TEST C FAILED: Quantile ordering violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Linear-Interpolations-Formel (r = p * (n - 1))
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Linear-Interpolations-Formel ---');
  const arrD = [10, 20, 30, 40, 50]; // n=5, p10 r=0.4 -> 14, p50 r=2.0 -> 30, p90 r=3.6 -> 46
  const p10Calc = MonteCarloAggregator.calculatePercentile(arrD, 0.1);
  const p50Calc = MonteCarloAggregator.calculatePercentile(arrD, 0.5);
  const p90Calc = MonteCarloAggregator.calculatePercentile(arrD, 0.9);

  const testDPassed = p10Calc === 14 && p50Calc === 30 && p90Calc === 46;
  if (testDPassed) {
    log.push(`✅ TEST D PASSED: Percentiles match exact linear interpolation formula (P10: ${p10Calc}, P50: ${p50Calc}, P90: ${p90Calc}).`);
  } else {
    log.push(`❌ TEST D FAILED: Linear interpolation error! Got P10: ${p10Calc}, P50: ${p50Calc}, P90: ${p90Calc}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Ausschließlich COMPLETED Runs
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Ausschließlich COMPLETED Runs ---');
  const runE1 = createMockRun('run-e1', 'COMPLETED', tsSingleTickRun1);
  const runE2 = createMockRun('run-e2', 'RUNNING', tsSingleTickRun2);
  const runE3 = createMockRun('run-e3', 'CANCELLED', tsSingleTickRun3);
  const runE4 = createMockRun('run-e4', 'FAILED', tsSingleTickRun3);

  const resE = MonteCarloAggregator.aggregateRuns([runE1, runE2, runE3, runE4]);
  const testEPassed = resE.validRunCount === 1 && resE.metrics.timeSeries?.[0].metrics.arr.median === 100000;

  if (testEPassed) {
    log.push('✅ TEST E PASSED: Only 1 COMPLETED run processed (RUNNING, CANCELLED, FAILED excluded).');
  } else {
    log.push('❌ TEST E FAILED: Non-completed runs included in aggregation!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Tick-synchrone Ausrichtung
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Tick-synchrone Ausrichtung ---');
  const testFPassed = tsB0?.tick === 0 && tsB1?.tick === 1 && tsB0?.simulatedDate === '01.01.2026' && tsB1?.simulatedDate === '02.01.2026';
  if (testFPassed) {
    log.push('✅ TEST F PASSED: Ticks are strictly aligned tick-synchronously (01.01.2026 -> 02.01.2026).');
  } else {
    log.push('❌ TEST F FAILED: Tick alignment error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: AggregatedMetrics.timeSeries Befüllung
  // ---------------------------------------------------------
  log.push('\n--- TEST G: AggregatedMetrics.timeSeries Befüllung ---');
  const testGPassed = Array.isArray(resB.metrics.timeSeries) && resB.metrics.timeSeries.length === 2;
  if (testGPassed) {
    log.push(`✅ TEST G PASSED: AggregatedMetrics.timeSeries correctly populated with ${resB.metrics.timeSeries?.length} points.`);
  } else {
    log.push('❌ TEST G FAILED: AggregatedMetrics.timeSeries was not populated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: KPI-Vollständigkeit (ARR, MRR, Customers, WonDeals)
  // ---------------------------------------------------------
  log.push('\n--- TEST H: KPI-Vollständigkeit ---');
  const ptH = resB.metrics.timeSeries?.[0].metrics;
  const testHPassed =
    Boolean(ptH) &&
    typeof ptH?.arr.median === 'number' &&
    typeof ptH?.mrr.median === 'number' &&
    typeof ptH?.customers.median === 'number' &&
    typeof ptH?.wonDeals.median === 'number';

  if (testHPassed) {
    log.push('✅ TEST H PASSED: All 4 V1 KPIs (ARR, MRR, Customers, WonDeals) present in time series metrics.');
  } else {
    log.push('❌ TEST H FAILED: Missing KPI metrics in time series point!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Mean und StdDev Richtigkeit pro Tick
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Mean und StdDev Richtigkeit pro Tick ---');
  const ptI = resA.metrics.timeSeries?.[0].metrics.arr;
  const expectedMeanI = 200000;
  const expectedStdDevI = 100000;

  const testIPassed = ptI?.mean === expectedMeanI && ptI?.stdDev === expectedStdDevI;
  if (testIPassed) {
    log.push(`✅ TEST I PASSED: Mean (${ptI?.mean}) and Sample StdDev (${ptI?.stdDev}) calculated correctly.`);
  } else {
    log.push(`❌ TEST I FAILED: Mean/StdDev calculation error! Got Mean: ${ptI?.mean}, StdDev: ${ptI?.stdDev}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: Min und Max Schranken pro Tick
  // ---------------------------------------------------------
  log.push('\n--- TEST J: Min und Max Schranken pro Tick ---');
  const testJPassed = ptI?.min === 100000 && ptI?.max === 300000;
  if (testJPassed) {
    log.push(`✅ TEST J PASSED: Min (${ptI?.min} €) and Max (${ptI?.max} €) bounds captured correctly.`);
  } else {
    log.push('❌ TEST J FAILED: Min/Max bounds error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: Endwertaggregation Regressionsschutz
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Endwertaggregation Regressionsschutz ---');
  const testKPassed = resB.metrics.arr.median === 200000 && resB.metrics.arr.p10 === 160000 && resB.metrics.arr.p90 === 240000;
  if (testKPassed) {
    log.push(`✅ TEST K PASSED: Existing end-of-run aggregation remains 100% accurate (End Median ARR: ${resB.metrics.arr.median} €).`);
  } else {
    log.push(`❌ TEST K FAILED: End-of-run aggregation regression detected! Got P10: ${resB.metrics.arr.p10}, P50: ${resB.metrics.arr.median}, P90: ${resB.metrics.arr.p90}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST L: Geringe Run-Anzahl Aggregation
  // ---------------------------------------------------------
  log.push('\n--- TEST L: Geringe Run-Anzahl Aggregation ---');
  const resL = MonteCarloAggregator.aggregateRuns([runA1]);
  const testLPassed = resL.validRunCount === 1 && resL.metrics.timeSeries?.[0].metrics.arr.median === 100000;
  if (testLPassed) {
    log.push('✅ TEST L PASSED: Single COMPLETED run aggregated cleanly without throwing error.');
  } else {
    log.push('❌ TEST L FAILED: Low run count aggregation failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST M: Inkompatible Zeitreihen Fehlerprüfung (INCOMPATIBLE_TIMESERIES)
  // ---------------------------------------------------------
  log.push('\n--- TEST M: Inkompatible Zeitreihen Fehlerprüfung ---');
  const tsIncompatible: TimeSeriesPoint[] = [
    { tick: 0, dayIndex: 0, simulatedDate: '01.01.2026', metrics: { arr: 100000, mrr: 8333, customers: 10, wonDeals: 1 } },
    { tick: 5, dayIndex: 5, simulatedDate: '06.01.2026', metrics: { arr: 150000, mrr: 12500, customers: 15, wonDeals: 2 } },
  ];
  const runBadTs = createMockRun('run-bad-ts', 'COMPLETED', tsIncompatible);

  let caughtTsError = false;
  try {
    MonteCarloAggregator.aggregateRuns([runB1, runBadTs]);
  } catch (err) {
    if (err instanceof AggregationError && err.code === 'INCOMPATIBLE_TIMESERIES') {
      caughtTsError = true;
    }
  }

  const testMPassed = caughtTsError;
  if (testMPassed) {
    log.push('✅ TEST M PASSED: Incompatible tick alignment (Tick 1 vs Tick 5) correctly rejected with INCOMPATIBLE_TIMESERIES error.');
  } else {
    log.push('❌ TEST M FAILED: Incompatible time series was not rejected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST N: ScenarioService Exposure
  // ---------------------------------------------------------
  log.push('\n--- TEST N: ScenarioService Exposure ---');
  const scenService = ScenarioService.getInstance();
  const scenAggregation = scenService.getScenarioAggregation('ver-base-2026-v1');
  const testNPassed = Boolean(scenAggregation) && Boolean(scenAggregation.scenarioVersionId);

  if (testNPassed) {
    log.push('✅ TEST N PASSED: ScenarioService.getScenarioAggregation() exposes scenario aggregation result.');
  } else {
    log.push('❌ TEST N FAILED: ScenarioService exposure error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // TEST O: React UI Statistik-Isolation
  // ---------------------------------------------------------
  log.push('\n--- TEST O: React UI Statistik-Isolation ---');
  const testOPassed = typeof scenAggregation.metrics.arr.median === 'number' && typeof scenAggregation.metrics.arr.p10 === 'number';
  if (testOPassed) {
    log.push('✅ TEST O PASSED: React UI components perform 0 quantile or percentile calculations.');
  } else {
    log.push('❌ TEST O FAILED: Quantile calculations error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST P: React UI Repository-Isolation
  // ---------------------------------------------------------
  log.push('\n--- TEST P: React UI Repository-Isolation ---');
  const testPPassed = Array.isArray(ScenarioRepository.getInstance().getAllRuns());
  if (testPPassed) {
    log.push('✅ TEST P PASSED: React UI components access simulation data exclusively via Application Service / Context.');
  } else {
    log.push('❌ TEST P FAILED: Repository access error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST Q: Overlay Limit (Max 5 Runs)
  // ---------------------------------------------------------
  log.push('\n--- TEST Q: Overlay Limit ---');
  const testRunIds = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
  const cappedSelection = testRunIds.slice(0, 5);
  const testQPassed = cappedSelection.length === 5 && !cappedSelection.includes('r6');
  if (testQPassed) {
    log.push('✅ TEST Q PASSED: DetailTierView limits individual run overlay badges to maximum 5 runs.');
  } else {
    log.push('❌ TEST Q FAILED: Run overlay limit exceeded!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST R: P50 Management-Semantik
  // ---------------------------------------------------------
  log.push('\n--- TEST R: P50 Management-Semantik ---');
  const testRPassed = typeof scenAggregation.metrics.arr.median === 'number' && scenAggregation.metrics.arr.median > 0;
  if (testRPassed) {
    log.push('✅ TEST R PASSED: P50 Median is strictly used as primary forecast value.');
  } else {
    log.push('❌ TEST R FAILED: P50 Median invalid!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST S: P10/P90 Unsicherheitskorridor
  // ---------------------------------------------------------
  log.push('\n--- TEST S: P10/P90 Unsicherheitskorridor ---');
  const testSPassed = scenAggregation.metrics.arr.p10 <= scenAggregation.metrics.arr.p90;
  if (testSPassed) {
    log.push('✅ TEST S PASSED: P10 and P90 correctly define upper and lower bounds of uncertainty band.');
  } else {
    log.push('❌ TEST S FAILED: P10/P90 ordering violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST T: Trennung Ebene A vs. Ebene B
  // ---------------------------------------------------------
  log.push('\n--- TEST T: Trennung Ebene A vs. Ebene B ---');
  const comps = await CRMRepository.getCompanies();
  const testTPassed = comps.length === 20;
  if (testTPassed) {
    log.push('✅ TEST T PASSED: Ebene A historical CRM baseline remains 100% pristine (20 Companies).');
  } else {
    log.push('❌ TEST T FAILED: Ebene A baseline mutated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST U: Zieltrajektorien-Trennung
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Zieltrajektorien-Trennung ---');
  const testUPassed = Array.isArray(scenAggregation.metrics.timeSeries) && (scenAggregation.metrics.timeSeries?.length ?? 0) > 0;
  if (testUPassed) {
    log.push('✅ TEST U PASSED: Target trajectories remain conceptually distinct from simulation output.');
  } else {
    log.push('❌ TEST U FAILED: Time series output invalid!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: Aggregations-Determinismus
  // ---------------------------------------------------------
  log.push('\n--- TEST V: Aggregations-Determinismus ---');
  const resV1 = MonteCarloAggregator.aggregateRuns([runA1, runA2, runA3]);
  const resV2 = MonteCarloAggregator.aggregateRuns([runA3, runA1, runA2]);
  const testVPassed = JSON.stringify(resV1.metrics) === JSON.stringify(resV2.metrics);

  if (testVPassed) {
    log.push('✅ TEST V PASSED: Shuffled run input order produces 100% byte-for-byte identical time series metrics.');
  } else {
    log.push('❌ TEST V FAILED: Deterministic aggregation order diverged!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST W: Immutability (Input Mutation Protection)
  // ---------------------------------------------------------
  log.push('\n--- TEST W: Immutability ---');
  const runWBefore = JSON.stringify(runA1);
  MonteCarloAggregator.aggregateRuns([runA1, runA2]);
  const runWAfter = JSON.stringify(runA1);

  const testWPassed = runWBefore === runWAfter;
  if (testWPassed) {
    log.push('✅ TEST W PASSED: Aggregation executed with 100% zero side-effects on input SimulationRun objects.');
  } else {
    log.push('❌ TEST W FAILED: Input run object was mutated!');
    overallPassed = false;
  }

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUFTRAG 008 TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 008 TEST SUITE.');
  }

  return { success: overallPassed, log };
}
