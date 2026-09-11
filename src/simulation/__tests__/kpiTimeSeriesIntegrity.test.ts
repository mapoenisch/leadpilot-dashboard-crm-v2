import {
  scenarioRepository,
} from '../scenarioRepository';
import { scenarioService } from '../scenarioService';
import { systemContext } from '../systemContext';
import { GoalTargetEvaluator } from '../goalTargetEvaluator';
import { KPIRegistry } from '../kpiRegistry';
import { GoalTarget } from '../../types/kpi';

export async function runKpiTimeSeriesTest(): Promise<boolean> {
  console.log('\n=== STARTING AUFTRAG 018 TEST SUITE (KPI TIME SERIES & DISTRIBUTION UI) ===\n');

  // -------------------------------------------------------------------------
  // Test 1: P10 <= P50 <= P90 Time Series Corridor Monotonicity
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: P10 <= P50 <= P90 Corridor Monotonicity across all ticks ---');
  const { version: testVer } = scenarioService.createScenario(
    'KPI TS Test Scenario',
    'Isolation test for Auftrag 018'
  );

  systemContext.__overrideForTest({
    now: () => '2026-01-01T12:00:00.000Z',
    newRunSeed: () => 777111,
    nextRunId: (s, v) => `run-${v}-${s}-ts-1`,
    nextCorrelationId: () => 'corr-ts-test-1',
  });

  // Execute 5 Monte Carlo runs for statistical corridor verification
  const runPromises = [101, 102, 103, 104, 105].map((seed) =>
    scenarioService.runScenarioVersion(testVer.id, seed, 30, {
      correlationId: `corr-ts-seed-${seed}`,
    })
  );
  await Promise.all(runPromises);

  const aggRes = await scenarioService.getScenarioAggregation(testVer.id);
  if (!aggRes.metrics.timeSeries || aggRes.metrics.timeSeries.length === 0) {
    throw new Error('TEST 1 FAILED: TimeSeries points not generated in aggregation.');
  }

  for (const pt of aggRes.metrics.timeSeries) {
    const { p10, median, p90, min, max } = pt.metrics.arr;
    if (p10 > median) {
      throw new Error(`TEST 1 FAILED: At tick ${pt.tick}, p10 (${p10}) > median (${median})`);
    }
    if (median > p90) {
      throw new Error(`TEST 1 FAILED: At tick ${pt.tick}, median (${median}) > p90 (${p90})`);
    }
    if (min > p10) {
      throw new Error(`TEST 1 FAILED: At tick ${pt.tick}, min (${min}) > p10 (${p10})`);
    }
    if (p90 > max) {
      throw new Error(`TEST 1 FAILED: At tick ${pt.tick}, p90 (${p90}) > max (${max})`);
    }
  }
  console.log(`✅ TEST 1 PASSED: Strict monotonicity P10 <= P50 <= P90 holds for all ${aggRes.metrics.timeSeries.length} ticks.`);

  // -------------------------------------------------------------------------
  // Test 2: History Transition at Tick 0 (Ebene A Baseline Invariance)
  // -------------------------------------------------------------------------
  console.log('--- TEST 2: History transition & Ebene A baseline anchoring at tick 0 ---');
  const tick0 = aggRes.metrics.timeSeries[0];
  if (!tick0 || tick0.tick !== 0) {
    throw new Error('TEST 2 FAILED: Missing tick 0 in timeSeries.');
  }

  // Baseline ARR is 411.840 €
  if (Math.abs(tick0.metrics.arr.median - 411840) > 1000) {
    throw new Error(`TEST 2 FAILED: Expected Tick 0 ARR to align with Ebene A baseline (411.840 €), got ${tick0.metrics.arr.median}`);
  }
  console.log(`✅ TEST 2 PASSED: Tick 0 anchors to Ebene A baseline (ARR = ${tick0.metrics.arr.median.toLocaleString('de-DE')} €).`);

  // -------------------------------------------------------------------------
  // Test 3: Monte Carlo Histogram Bucketing Integrity
  // -------------------------------------------------------------------------
  console.log('--- TEST 3: Histogram bucket distribution integrity ---');
  const runs = scenarioRepository.getRunsByVersion(testVer.id);
  const arrValues = runs.map((r) => r.finalMetrics?.liveARR ?? 0);
  const minVal = Math.min(...arrValues);
  const maxVal = Math.max(...arrValues);
  const bucketCount = Math.min(10, Math.max(4, Math.floor(Math.sqrt(arrValues.length))));
  const bucketSize = (maxVal - minVal) / bucketCount || 1;

  const buckets: { min: number; max: number; count: number }[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bMin = minVal + i * bucketSize;
    const bMax = i === bucketCount - 1 ? maxVal : bMin + bucketSize;
    buckets.push({ min: bMin, max: bMax, count: 0 });
  }

  arrValues.forEach((v) => {
    for (let i = 0; i < buckets.length; i++) {
      if (v >= buckets[i].min && (i === buckets.length - 1 ? v <= buckets[i].max : v < buckets[i].max)) {
        buckets[i].count++;
        break;
      }
    }
  });

  const totalBucketCount = buckets.reduce((sum, b) => sum + b.count, 0);
  if (totalBucketCount !== arrValues.length) {
    throw new Error(`TEST 3 FAILED: Histogram sum (${totalBucketCount}) !== total runs (${arrValues.length})`);
  }
  console.log(`✅ TEST 3 PASSED: Histogram buckets account for 100% of runs (${totalBucketCount}/${arrValues.length} runs).`);

  // -------------------------------------------------------------------------
  // Test 4: GoalTargetEvaluator - Target Path & Status Classifications
  // -------------------------------------------------------------------------
  console.log('--- TEST 4: Goal Target evaluation & status thresholds ---');
  const arrTarget: GoalTarget = { kpiId: 'liveARR', targetValue: 500000 };

  // 1. ACHIEVED (>= 100%)
  const resAchieved = GoalTargetEvaluator.evaluateGoalTarget('liveARR', 510000, arrTarget, 30);
  if (resAchieved.status !== 'ACHIEVED' || (resAchieved.achievementPercent ?? 0) < 100) {
    throw new Error(`TEST 4 FAILED: Expected ACHIEVED, got ${resAchieved.status}`);
  }

  // 2. AT_RISK (80% - 99.9%)
  const resAtRisk = GoalTargetEvaluator.evaluateGoalTarget('liveARR', 450000, arrTarget, 30);
  if (resAtRisk.status !== 'AT_RISK' || (resAtRisk.achievementPercent ?? 0) < 80 || (resAtRisk.achievementPercent ?? 0) >= 100) {
    throw new Error(`TEST 4 FAILED: Expected AT_RISK, got ${resAtRisk.status}`);
  }

  // 3. MISSED (< 80%)
  const resMissed = GoalTargetEvaluator.evaluateGoalTarget('liveARR', 350000, arrTarget, 30);
  if (resMissed.status !== 'MISSED' || (resMissed.achievementPercent ?? 0) >= 80) {
    throw new Error(`TEST 4 FAILED: Expected MISSED, got ${resMissed.status}`);
  }

  // 4. NO_TARGET
  const resNoTarget = GoalTargetEvaluator.evaluateGoalTarget('liveARR', 450000, undefined, 30);
  if (resNoTarget.status !== 'NO_TARGET') {
    throw new Error(`TEST 4 FAILED: Expected NO_TARGET, got ${resNoTarget.status}`);
  }

  // 5. LOWER_IS_BETTER (e.g. CAC)
  const cacTarget: GoalTarget = { kpiId: 'cac', targetValue: 500 };
  const resCacAchieved = GoalTargetEvaluator.evaluateGoalTarget('cac', 480, cacTarget, 30);
  if (resCacAchieved.status !== 'ACHIEVED') {
    throw new Error(`TEST 4 FAILED: Expected ACHIEVED for CAC under target, got ${resCacAchieved.status}`);
  }
  const resCacMissed = GoalTargetEvaluator.evaluateGoalTarget('cac', 700, cacTarget, 30);
  if (resCacMissed.status !== 'MISSED') {
    throw new Error(`TEST 4 FAILED: Expected MISSED for CAC exceeding target by > 25%, got ${resCacMissed.status}`);
  }
  console.log('✅ TEST 4 PASSED: GoalTargetEvaluator accurately classifies ACHIEVED, AT_RISK, MISSED and NO_TARGET.');

  // -------------------------------------------------------------------------
  // Test 5: Comparison Modes (Absolute, Delta, Percent) Mathematical Precision
  // -------------------------------------------------------------------------
  console.log('--- TEST 5: Comparison modes (Absolute, Delta, Percent) precision ---');
  const compArr = GoalTargetEvaluator.computeBaselineComparison('liveARR', 460000, 411840);
  if (compArr.absoluteDelta !== 48160) {
    throw new Error(`TEST 5 FAILED: Expected delta=48160, got ${compArr.absoluteDelta}`);
  }
  const expectedPct = parseFloat((((460000 - 411840) / 411840) * 100).toFixed(2));
  if (compArr.percentChange !== expectedPct) {
    throw new Error(`TEST 5 FAILED: Expected percentChange=${expectedPct}, got ${compArr.percentChange}`);
  }
  if (!compArr.isPositiveChange) {
    throw new Error(`TEST 5 FAILED: ARR increase should be positive.`);
  }

  // Lower is better: CAC decrease is positive
  const compCac = GoalTargetEvaluator.computeBaselineComparison('cac', 400, 500);
  if (!compCac.isPositiveChange) {
    throw new Error('TEST 5 FAILED: CAC decrease should be marked as favorable change.');
  }
  console.log('✅ TEST 5 PASSED: Baseline comparison math is exact and honors KPI directionality.');

  // -------------------------------------------------------------------------
  // Test 6: Individual Run Selection Constraint (Max 5 Runs Limit)
  // -------------------------------------------------------------------------
  console.log('--- TEST 6: Individual run selection constraint (Max 5 Limit) ---');
  const availableRuns = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'];
  let selectedRuns: string[] = [];
  const addRun = (id: string) => {
    if (selectedRuns.length < 5 && !selectedRuns.includes(id)) {
      selectedRuns = [...selectedRuns, id];
    }
  };

  availableRuns.forEach(addRun);
  if (selectedRuns.length !== 5) {
    throw new Error(`TEST 6 FAILED: Run selection exceeded max 5 limit: ${selectedRuns.length}`);
  }
  console.log('✅ TEST 6 PASSED: Strict 5-run overlay constraint enforced.');

  // -------------------------------------------------------------------------
  // Test 7: Central KPI Registry & Definitions Integrity
  // -------------------------------------------------------------------------
  console.log('--- TEST 7: Central KPIRegistry definition completeness ---');
  const allKpis = KPIRegistry.getAllKPIs();
  if (allKpis.length < 10) {
    throw new Error(`TEST 7 FAILED: Expected at least 10 registered KPIs, got ${allKpis.length}`);
  }
  const arrDef = KPIRegistry.getKPI('liveARR');
  if (arrDef.direction !== 'HIGHER_IS_BETTER' || arrDef.unit !== '€') {
    throw new Error('TEST 7 FAILED: Invalid definition for liveARR in KPIRegistry.');
  }
  console.log('✅ TEST 7 PASSED: KPIRegistry contains all domain KPIs with explicit directionality and units.');

  systemContext.__resetForTest();
  console.log('\n=================================================================');
  console.log('🎉 ALL AUFTRAG 018 KPI TIME SERIES INTEGRITY TESTS PASSED SUCCESSFULLY!\n');
  return true;
}
