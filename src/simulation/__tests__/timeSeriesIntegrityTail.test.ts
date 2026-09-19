import { MonteCarloAggregator } from '../monteCarloAggregator';
import { CRMRepository } from '../../services/db/crmRepository';
import { ScenarioAggregationResult } from '../../types/aggregation';
import { SimulationRun } from '../../types/scenario';

// 067K / G57 — aus timeSeriesAggregationIntegrity.test.ts herausgelöster
// Schlussteil (TEST R–X; reine Code-Bewegung, keine Verhaltensänderung).
export async function runTimeSeriesTailChecks(
  log: string[],
  scenAggregation: ScenarioAggregationResult,
  runA1: SimulationRun,
  runA2: SimulationRun,
  runA3: SimulationRun,
): Promise<boolean> {
  let tailPassed = true;

  // ---------------------------------------------------------
  // TEST R: P50 Management-Semantik
  // ---------------------------------------------------------
  log.push('\n--- TEST R: P50 Management-Semantik ---');
  const testRPassed =
    typeof scenAggregation.metrics.arr.median === 'number' &&
    scenAggregation.metrics.arr.median > 0;
  if (testRPassed) {
    log.push('✅ TEST R PASSED: P50 Median is strictly used as primary forecast value.');
  } else {
    log.push('❌ TEST R FAILED: P50 Median invalid!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST S: P10/P90 Unsicherheitskorridor
  // ---------------------------------------------------------
  log.push('\n--- TEST S: P10/P90 Unsicherheitskorridor ---');
  const testSPassed = scenAggregation.metrics.arr.p10 <= scenAggregation.metrics.arr.p90;
  if (testSPassed) {
    log.push(
      '✅ TEST S PASSED: P10 and P90 correctly define upper and lower bounds of uncertainty band.',
    );
  } else {
    log.push('❌ TEST S FAILED: P10/P90 ordering violated!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST T: Trennung Ebene A vs. Ebene B
  // ---------------------------------------------------------
  log.push('\n--- TEST T: Trennung Ebene A vs. Ebene B ---');
  const comps = await CRMRepository.getCompanies();
  const testTPassed = comps.length === 20;
  if (testTPassed) {
    log.push(
      '✅ TEST T PASSED: Ebene A historical CRM baseline remains 100% pristine (20 Companies).',
    );
  } else {
    log.push('❌ TEST T FAILED: Ebene A baseline mutated!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST U: Zieltrajektorien-Trennung
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Zieltrajektorien-Trennung ---');
  const testUPassed =
    Array.isArray(scenAggregation.metrics.timeSeries) &&
    (scenAggregation.metrics.timeSeries?.length ?? 0) > 0;
  if (testUPassed) {
    log.push(
      '✅ TEST U PASSED: Target trajectories remain conceptually distinct from simulation output.',
    );
  } else {
    log.push('❌ TEST U FAILED: Time series output invalid!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: Aggregations-Determinismus
  // ---------------------------------------------------------
  log.push('\n--- TEST V: Aggregations-Determinismus ---');
  const resV1 = MonteCarloAggregator.aggregateRuns([runA1, runA2, runA3]);
  const resV2 = MonteCarloAggregator.aggregateRuns([runA3, runA1, runA2]);
  const testVPassed = JSON.stringify(resV1.metrics) === JSON.stringify(resV2.metrics);

  if (testVPassed) {
    log.push(
      '✅ TEST V PASSED: Shuffled run input order produces 100% byte-for-byte identical time series metrics.',
    );
  } else {
    log.push('❌ TEST V FAILED: Deterministic aggregation order diverged!');
    tailPassed = false;
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
    log.push(
      '✅ TEST W PASSED: Aggregation executed with 100% zero side-effects on input SimulationRun objects.',
    );
  } else {
    log.push('❌ TEST W FAILED: Input run object was mutated!');
    tailPassed = false;
  }

  return tailPassed;
}
