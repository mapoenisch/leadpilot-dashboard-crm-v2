import { CRMRepository } from '../../services/db/crmRepository';
import { MonteCarloAggregator } from '../monteCarloAggregator';
import { AggregationError } from '../../types/aggregation';
import { RunManifest, RunStatus, SimulationRun } from '../../types/scenario';
import { SimulationMetrics } from '../../types/simulation';

export async function runMonteCarloTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 005 TEST SUITE (MONTE CARLO AGGREGATION) ===');

  let overallPassed = true;

  const mockManifest: RunManifest = {
    runId: 'mock-run',
    scenarioId: 'scen-1',
    scenarioVersionId: 'ver-1',
    seed: 42,
    initialRngState: 42,
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: 'Faktenblatt_v1.1',
    simulationStartDate: '01.01.2026',
    targetTicks: 50,
    parameters: {
      marketingBudgetYearly: 65000,
      channelMix: { linkedIn: 38, seo: 22, partner: 18, webinar: 12, outbound: 10 },
      trialToPaidConversion: 18,
      salesRepCount: 2,
      csRepCount: 2,
      churnRateMonthly: 2.8,
      salesCycleDays: 38,
      targetPackageFocus: 'Growth',
      winProbabilityMultiplier: 1.0,
      discountPercent: 0,
    },
    createdAt: '2026-08-30T16:00:00Z',
    correlationId: 'mock-corr',
  };

  const createMockRun = (
    runId: string,
    arr: number,
    mrr = arr / 12,
    customers = 66,
    wonDeals = 5,
    status: RunStatus = 'COMPLETED',
    versionId = 'ver-1',
    manifestOverrides: Partial<RunManifest> = {}
  ): SimulationRun => {
    const manifest: RunManifest = { ...mockManifest, runId, scenarioVersionId: versionId, ...manifestOverrides };
    const metrics: SimulationMetrics = {
      liveLeads: 10,
      liveMQLs: 5,
      liveSQLs: 3,
      liveHotLeads: 2,
      liveOpportunities: 2,
      livePipelineValue: 10000,
      liveWonDeals: wonDeals,
      liveLostDeals: 1,
      liveCustomers: customers,
      liveMRR: mrr,
      liveARR: arr,
      conversionRate: 18,
    };

    return {
      runId,
      scenarioId: 'scen-1',
      scenarioVersionId: versionId,
      seed: manifest.seed,
      rngState: manifest.initialRngState,
      modelVersion: manifest.modelVersion,
      schemaVersion: manifest.schemaVersion,
      baselineVersion: manifest.baselineVersion,
      manifest,
      status,
      startedAt: '2026-08-30T16:00:00Z',
      completedAt: status === 'COMPLETED' ? '2026-08-30T16:00:05Z' : undefined,
      finalMetrics: status === 'COMPLETED' ? metrics : undefined,
      correlationId: manifest.correlationId,
    };
  };

  // ---------------------------------------------------------
  // TEST A: Single Run Aggregation
  // ---------------------------------------------------------
  log.push('\n--- TEST A: Single Run Aggregation ---');
  const runA = createMockRun('run-a', 400000);
  const resultA = MonteCarloAggregator.aggregateRuns([runA]);
  const statsA = resultA.metrics.arr;

  const testAPassed =
    resultA.validRunCount === 1 &&
    statsA.median === 400000 &&
    statsA.p10 === 400000 &&
    statsA.p90 === 400000 &&
    statsA.mean === 400000 &&
    statsA.min === 400000 &&
    statsA.max === 400000 &&
    statsA.stdDev === 0;

  if (testAPassed) {
    log.push('✅ TEST A PASSED: Single run aggregation yields median = p10 = p90 = mean = min = max (400.000 €) and stdDev = 0.');
  } else {
    log.push('❌ TEST A FAILED: Single run statistics diverged!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Median Calculation (Odd and Even Runs)
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Median Calculation (Odd & Even) ---');
  const runsBOdd = [
    createMockRun('run-b1', 300000),
    createMockRun('run-b2', 400000),
    createMockRun('run-b3', 500000),
  ];
  const resultBOdd = MonteCarloAggregator.aggregateRuns(runsBOdd);

  const runsBEven = [
    createMockRun('run-b1', 100000),
    createMockRun('run-b2', 200000),
    createMockRun('run-b3', 300000),
    createMockRun('run-b4', 400000),
  ];
  const resultBEven = MonteCarloAggregator.aggregateRuns(runsBEven);

  const testBPassed = resultBOdd.metrics.arr.median === 400000 && resultBEven.metrics.arr.median === 250000;

  if (testBPassed) {
    log.push('✅ TEST B PASSED: Median calculated correctly for odd (400.000 €) and even (250.000 €) run sets.');
  } else {
    log.push('❌ TEST B FAILED: Median calculation error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: P10 / P90 Quantiles
  // ---------------------------------------------------------
  log.push('\n--- TEST C: P10 / P90 Quantiles ---');
  // 10 runs with values 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
  const runsC = Array.from({ length: 10 }, (_, i) => createMockRun(`run-c${i}`, (i + 1) * 10));
  const resultC = MonteCarloAggregator.aggregateRuns(runsC);
  const arrC = resultC.metrics.arr;

  // n=10: p10 -> r = 0.1 * 9 = 0.9 -> (1 - 0.9)*10 + 0.9*20 = 19
  // p90 -> r = 0.9 * 9 = 8.1 -> (1 - 0.1)*90 + 0.1*100 = 91
  const testCPassed = arrC.p10 === 19 && arrC.p90 === 91;

  if (testCPassed) {
    log.push(`✅ TEST C PASSED: P10 (${arrC.p10}) and P90 (${arrC.p90}) match exact linear interpolation formula.`);
  } else {
    log.push(`❌ TEST C FAILED: Quantile mismatch! Expected P10=19, P90=91. Got P10=${arrC.p10}, P90=${arrC.p90}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Mean & Sample Standard Deviation
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Mean & Standard Deviation ---');
  const runsD = [
    createMockRun('run-d1', 10),
    createMockRun('run-d2', 20),
    createMockRun('run-d3', 30),
  ];
  const resultD = MonteCarloAggregator.aggregateRuns(runsD);
  const arrD = resultD.metrics.arr;

  // Mean = 20, Sample Variance = ((10-20)^2 + (20-20)^2 + (30-20)^2) / 2 = 100, StdDev = 10
  const testDPassed = arrD.mean === 20 && Math.abs(arrD.stdDev - 10) < 0.0001;

  if (testDPassed) {
    log.push(`✅ TEST D PASSED: Mean (${arrD.mean}) and Sample StdDev (${arrD.stdDev}) calculated with mathematical accuracy.`);
  } else {
    log.push('❌ TEST D FAILED: Mean or StdDev error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Min / Max Bounds
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Min / Max Bounds ---');
  const runsE = [
    createMockRun('run-e1', 150000),
    createMockRun('run-e2', 600000),
    createMockRun('run-e3', 300000),
  ];
  const resultE = MonteCarloAggregator.aggregateRuns(runsE);
  const arrE = resultE.metrics.arr;

  const testEPassed = arrE.min === 150000 && arrE.max === 600000;

  if (testEPassed) {
    log.push(`✅ TEST E PASSED: Min (${arrE.min} €) and Max (${arrE.max} €) bounds correctly captured.`);
  } else {
    log.push('❌ TEST E FAILED: Min/Max error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Outlier Preservation (No Clipping/Winsorization)
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Outlier Preservation ---');
  const runsF = [
    createMockRun('run-f1', 100000),
    createMockRun('run-f2', 400000),
    createMockRun('run-f3', 410000),
    createMockRun('run-f4', 420000),
    createMockRun('run-f5', 1500000), // Extreme valid outlier
  ];
  const resultF = MonteCarloAggregator.aggregateRuns(runsF);
  const arrF = resultF.metrics.arr;

  const testFPassed = arrF.max === 1500000 && arrF.min === 100000;

  if (testFPassed) {
    log.push(`✅ TEST F PASSED: Extreme outlier (1.500.000 €) preserved without clipping or trimming.`);
  } else {
    log.push('❌ TEST F FAILED: Outlier was incorrectly altered!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: Run Filtering (Only COMPLETED Runs)
  // ---------------------------------------------------------
  log.push('\n--- TEST G: Run Filtering (COMPLETED status only) ---');
  const runsG = [
    createMockRun('run-g1', 400000, 33333, 66, 5, 'COMPLETED'),
    createMockRun('run-g2', 500000, 41666, 70, 7, 'COMPLETED'),
    createMockRun('run-g3', 999999, 99999, 99, 9, 'RUNNING'),
    createMockRun('run-g4', 888888, 88888, 88, 8, 'CANCELLED'),
    createMockRun('run-g5', 777777, 77777, 77, 7, 'FAILED'),
  ];
  const resultG = MonteCarloAggregator.aggregateRuns(runsG);

  const testGPassed = resultG.runCount === 5 && resultG.validRunCount === 2 && resultG.metrics.arr.median === 450000;

  if (testGPassed) {
    log.push(`✅ TEST G PASSED: Only 2 COMPLETED runs aggregated out of 5 total (validRunCount: 2, median ARR: 450.000 €).`);
  } else {
    log.push('❌ TEST G FAILED: Non-completed runs were improperly included in aggregation!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: ScenarioVersion Isolation Check
  // ---------------------------------------------------------
  log.push('\n--- TEST H: ScenarioVersion Isolation ---');
  const runsH = [
    createMockRun('run-h1', 400000, 33333, 66, 5, 'COMPLETED', 'ver-1'),
    createMockRun('run-h2', 500000, 41666, 70, 7, 'COMPLETED', 'ver-2'),
  ];

  let testHPassed = false;
  try {
    MonteCarloAggregator.aggregateRuns(runsH);
  } catch (err) {
    testHPassed = err instanceof AggregationError && err.code === 'INCOMPATIBLE_SCENARIO_VERSION';
  }

  if (testHPassed) {
    log.push('✅ TEST H PASSED: Divergent scenarioVersionIds ("ver-1" vs "ver-2") rejected with INCOMPATIBLE_SCENARIO_VERSION.');
  } else {
    log.push('❌ TEST H FAILED: Failed to enforce version isolation!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Model / Baseline Version Compatibility
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Model / Baseline Version Compatibility ---');
  const runsI = [
    createMockRun('run-i1', 400000, 33333, 66, 5, 'COMPLETED', 'ver-1', { modelVersion: '1.0.0-v1' }),
    createMockRun('run-i2', 500000, 41666, 70, 7, 'COMPLETED', 'ver-1', { modelVersion: '2.0.0-v2' }),
  ];

  let testIPassed = false;
  try {
    MonteCarloAggregator.aggregateRuns(runsI);
  } catch (err) {
    testIPassed = err instanceof AggregationError && err.code === 'INCOMPATIBLE_MANIFEST_VERSION';
  }

  if (testIPassed) {
    log.push('✅ TEST I PASSED: Incompatible model versions ("1.0.0-v1" vs "2.0.0-v2") rejected with INCOMPATIBLE_MANIFEST_VERSION.');
  } else {
    log.push('❌ TEST I FAILED: Incompatible model version was allowed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: Input Order Independence
  // ---------------------------------------------------------
  log.push('\n--- TEST J: Input Order Independence ---');
  const runsJOriginal = [
    createMockRun('run-j1', 300000),
    createMockRun('run-j2', 450000),
    createMockRun('run-j3', 500000),
    createMockRun('run-j4', 600000),
  ];
  const pickOriginal = (idx: number): SimulationRun => {
    const run = runsJOriginal[idx];
    if (!run) {
      // Unerreichbar: runsJOriginal enthält 4 Läufe, idx in [0, 3].
      throw new Error(`TEST J SETUP FAILED: runsJOriginal[${idx}] fehlt.`);
    }
    return run;
  };
  const runsJShuffled = [pickOriginal(2), pickOriginal(0), pickOriginal(3), pickOriginal(1)];

  const resultJ1 = MonteCarloAggregator.aggregateRuns(runsJOriginal);
  const resultJ2 = MonteCarloAggregator.aggregateRuns(runsJShuffled);

  const testJPassed =
    JSON.stringify(resultJ1.metrics) === JSON.stringify(resultJ2.metrics);

  if (testJPassed) {
    log.push('✅ TEST J PASSED: Shuffled input order produced 100% byte-for-byte identical aggregation results.');
  } else {
    log.push('❌ TEST J FAILED: Aggregation output depended on input array ordering!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: Input Immutability Guarantee
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Input Immutability Guarantee ---');
  const runK = createMockRun('run-k1', 400000);
  const runKSnapshot = JSON.stringify(runK);

  MonteCarloAggregator.aggregateRuns([runK]);
  const runKAfter = JSON.stringify(runK);

  const testKPassed = runKSnapshot === runKAfter;

  if (testKPassed) {
    log.push('✅ TEST K PASSED: Aggregation executed with 100% zero side-effects on input run objects and manifests.');
  } else {
    log.push('❌ TEST K FAILED: Input run object was mutated during aggregation!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST L: Determinism Guarantee
  // ---------------------------------------------------------
  log.push('\n--- TEST L: Determinism Guarantee ---');
  const runsL = [createMockRun('run-l1', 400000), createMockRun('run-l2', 500000)];
  const resL1 = MonteCarloAggregator.aggregateRuns(runsL);
  const resL2 = MonteCarloAggregator.aggregateRuns(runsL);

  const testLPassed =
    resL1.metrics.arr.median === resL2.metrics.arr.median &&
    resL1.metrics.arr.mean === resL2.metrics.arr.mean &&
    resL1.metrics.arr.stdDev === resL2.metrics.arr.stdDev;

  if (testLPassed) {
    log.push('✅ TEST L PASSED: Repeated aggregation calls yield 100% identical deterministic output.');
  } else {
    log.push('❌ TEST L FAILED: Aggregation was non-deterministic!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST M: Partial Run Set Handling (e.g. 7 completed out of 10 total)
  // ---------------------------------------------------------
  log.push('\n--- TEST M: Partial Run Set Handling ---');
  const runsM: SimulationRun[] = [];
  for (let i = 1; i <= 7; i++) {
    runsM.push(createMockRun(`run-m${i}`, 400000 + i * 10000, 33333, 66, 5, 'COMPLETED'));
  }
  runsM.push(createMockRun('run-m8', 0, 0, 0, 0, 'RUNNING'));
  runsM.push(createMockRun('run-m9', 0, 0, 0, 0, 'RUNNING'));
  runsM.push(createMockRun('run-m10', 0, 0, 0, 0, 'CANCELLED'));

  const resultM = MonteCarloAggregator.aggregateRuns(runsM);

  const testMPassed = resultM.runCount === 10 && resultM.validRunCount === 7;

  if (testMPassed) {
    log.push(`✅ TEST M PASSED: Partial run set (10 total, 7 completed) correctly calculated validRunCount = 7.`);
  } else {
    log.push('❌ TEST M FAILED: Partial run set handling error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST N: Ebene A CRM Baseline Integrity
  // ---------------------------------------------------------
  log.push('\n--- TEST N: Ebene A CRM Baseline Integrity ---');
  const baselineCompanies = await CRMRepository.getCompanies();
  const baselineContacts = await CRMRepository.getContacts();
  const baselineDeals = await CRMRepository.getImportedFunnelDeals();

  const testNPassed = baselineCompanies.length === 20 && baselineContacts.length === 100 && baselineDeals.length === 40;

  if (testNPassed) {
    log.push('✅ TEST N PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).');
  } else {
    log.push('❌ TEST N FAILED: Historical Ebene A baseline was mutated by Monte Carlo aggregation!');
    overallPassed = false;
  }

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUFTRAG 005 TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 005 TEST SUITE.');
  }

  return { success: overallPassed, log };
}
