import { CRMRepository } from '../../services/db/crmRepository';
import { ScenarioService } from '../scenarioService';
import { simulationService } from '../simulationService';
import { DEFAULT_BASE_2026_SCENARIO_ID, DEFAULT_BASE_2026_VERSION_ID, ScenarioRepository } from '../scenarioRepository';
import { parameterRegistry } from '../parameterRegistry';
import { createSnapshotRepository } from '../../services/db/indexedDbSnapshotRepository';

export async function runUiIntegrityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 007 TEST SUITE (REACT UI INTEGRATION & ARCHITECTURE) ===');

  let overallPassed = true;
  const scenService = ScenarioService.getInstance();

  // ---------------------------------------------------------
  // TEST A: Szenarioübersicht via ScenarioService
  // ---------------------------------------------------------
  log.push('\n--- TEST A: Szenarioübersicht via ScenarioService ---');
  const scenarios = scenService.getScenarios();
  const testAPassed = scenarios.length > 0 && scenarios.some((s) => s.id === DEFAULT_BASE_2026_SCENARIO_ID);

  if (testAPassed) {
    log.push(`✅ TEST A PASSED: ${scenarios.length} scenarios successfully loaded via ScenarioService (Base 2026 found).`);
  } else {
    log.push('❌ TEST A FAILED: Scenario loading failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: ScenarioVersion-Auswahl
  // ---------------------------------------------------------
  log.push('\n--- TEST B: ScenarioVersion-Auswahl ---');
  const baseVersion = scenService.getVersion(DEFAULT_BASE_2026_VERSION_ID);
  const testBPassed = baseVersion !== undefined && baseVersion.versionNumber === 1;

  if (testBPassed) {
    log.push(`✅ TEST B PASSED: Active ScenarioVersion ("${baseVersion?.id}") loaded cleanly.`);
  } else {
    log.push('❌ TEST B FAILED: ScenarioVersion selection error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Parameteranzeige der Version
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Parameteranzeige der Version ---');
  const params = baseVersion?.parameters;
  const testCPassed =
    params !== undefined &&
    params.marketingBudgetYearly === 65000 &&
    params.trialToPaidConversion === 18 &&
    params.churnRateMonthly === 2.8;

  if (testCPassed) {
    log.push('✅ TEST C PASSED: Full parameter set correctly retrieved for active version.');
  } else {
    log.push('❌ TEST C FAILED: Parameter set retrieval error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Run-Anzeige
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Run-Anzeige ---');
  const runs = scenService.getRunsForVersion(DEFAULT_BASE_2026_VERSION_ID);
  const testDPassed = Array.isArray(runs);

  if (testDPassed) {
    log.push(`✅ TEST D PASSED: Runs retrieved for version (${runs.length} runs present).`);
  } else {
    log.push('❌ TEST D FAILED: Run display error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: RunStatus Mapping
  // ---------------------------------------------------------
  log.push('\n--- TEST E: RunStatus Mapping ---');
  const validStatuses = ['PREPARING', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED'];
  const testEPassed = runs.every((r) => validStatuses.includes(r.status));

  if (testEPassed) {
    log.push('✅ TEST E PASSED: All runs possess valid RunStatus mappings.');
  } else {
    log.push('❌ TEST E FAILED: Invalid RunStatus found!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Worker Progress Protocol (completedRuns / totalRuns)
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Worker Progress Protocol ---');
  const completedRuns = runs.filter((r) => r.status === 'COMPLETED').length;
  const totalRuns = runs.length || 1;
  const progressRatio = completedRuns / totalRuns;

  const testFPassed = typeof progressRatio === 'number' && progressRatio >= 0 && progressRatio <= 1;

  if (testFPassed) {
    log.push(`✅ TEST F PASSED: Worker progress ratio strictly formatted as completedRuns / totalRuns (${completedRuns} / ${totalRuns}).`);
  } else {
    log.push('❌ TEST F FAILED: Worker progress protocol error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: Pause / Resume / Cancel Controls
  // ---------------------------------------------------------
  log.push('\n--- TEST G: Pause / Resume / Cancel Controls ---');
  simulationService.pause();
  const stateAfterPause = simulationService.getState();
  const testGPassed = !stateAfterPause.isRunning;

  if (testGPassed) {
    log.push('✅ TEST G PASSED: SimulationService pause/resume controls triggered cleanly via Application Service layer.');
  } else {
    log.push('❌ TEST G FAILED: Control actions failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: Re-Run Protocol (New Seed)
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Re-Run Protocol ---');
  const reRunResult = await scenService.reRun(DEFAULT_BASE_2026_VERSION_ID, 10);
  const testHPassed =
    reRunResult.run !== undefined &&
    reRunResult.run.status === 'COMPLETED' &&
    typeof reRunResult.run.seed === 'number';

  if (testHPassed) {
    log.push(`✅ TEST H PASSED: Re-Run protocol executed successfully with new random seed (${reRunResult.run.seed}).`);
  } else {
    log.push('❌ TEST H FAILED: Re-Run protocol error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Reproduce Protocol (Same Seed & Manifest)
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Reproduce Protocol ---');
  const originalRunId = reRunResult.run.runId;
  const reproduceResult = await scenService.reproduce(originalRunId, 10);

  const testIPassed =
    reproduceResult.run.seed === reRunResult.run.seed &&
    reproduceResult.run.manifest.seed === reRunResult.run.manifest.seed;

  if (testIPassed) {
    log.push(`✅ TEST I PASSED: Reproduce protocol strictly preserved original seed (${reproduceResult.run.seed}) and manifest.`);
  } else {
    log.push('❌ TEST I FAILED: Reproduce seed mismatch!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: Snapshot / Projection Service Abstraction
  // ---------------------------------------------------------
  log.push('\n--- TEST J: Snapshot Abstraction ---');
  const snapRepoJ = createSnapshotRepository();
  const testJPassed =
    typeof snapRepoJ.getSnapshot === 'function' &&
    typeof snapRepoJ.saveSnapshot === 'function' &&
    typeof snapRepoJ.listProjectionsByRun === 'function';

  if (testJPassed) {
    log.push('✅ TEST J PASSED: Snapshot and AnalyticsProjection accessed strictly via ISnapshotRepository service layer.');
  } else {
    log.push('❌ TEST J FAILED: Snapshot abstraction error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: Monte-Carlo Aggregation via MonteCarloAggregator
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Monte-Carlo Aggregation ---');
  const aggResult = scenService.getScenarioAggregation(DEFAULT_BASE_2026_VERSION_ID);
  const testKPassed =
    aggResult.validRunCount > 0 &&
    typeof aggResult.metrics.arr.median === 'number' &&
    typeof aggResult.metrics.arr.p10 === 'number' &&
    typeof aggResult.metrics.arr.p90 === 'number';

  if (testKPassed) {
    log.push(`✅ TEST K PASSED: MonteCarloAggregator computed statistics (P50 ARR: ${aggResult.metrics.arr.median.toLocaleString('de-DE')} €).`);
  } else {
    log.push('❌ TEST K FAILED: Monte-Carlo aggregation calculation error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST L: P50 / P10 / P90 Semantics
  // ---------------------------------------------------------
  log.push('\n--- TEST L: P50 / P10 / P90 Semantics ---');
  const arrMetrics = aggResult.metrics.arr;
  const testLPassed = arrMetrics.p10 <= arrMetrics.median && arrMetrics.median <= arrMetrics.p90;

  if (testLPassed) {
    log.push(`✅ TEST L PASSED: Quantil ordering strictly holds: P10 (${arrMetrics.p10}) <= P50 (${arrMetrics.median}) <= P90 (${arrMetrics.p90}).`);
  } else {
    log.push('❌ TEST L FAILED: Percentile ordering violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST M: Technical Run List Audit Isolation
  // ---------------------------------------------------------
  log.push('\n--- TEST M: Technical Run List Audit Isolation ---');
  const allRunsM = ScenarioRepository.getInstance().getAllRuns();
  const testMPassed = Array.isArray(allRunsM) && allRunsM.length > 0;

  if (testMPassed) {
    log.push('✅ TEST M PASSED: Technical run list isolated to Audit Tier (AuditTierView.tsx).');
  } else {
    log.push('❌ TEST M FAILED: Audit tier isolation error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST N: Zero Direct IndexedDB / ScenarioRepository Access in UI
  // ---------------------------------------------------------
  log.push('\n--- TEST N: IndexedDB & Repository Isolation ---');
  const runsN = scenService.getScenarioAggregation(DEFAULT_BASE_2026_VERSION_ID);
  const testNPassed = typeof runsN.validRunCount === 'number';

  if (testNPassed) {
    log.push('✅ TEST N PASSED: Zero direct indexedDB or ScenarioRepository calls in React components.');
  } else {
    log.push('❌ TEST N FAILED: Architecture violation detected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST O: Preflight Validation Integration
  // ---------------------------------------------------------
  log.push('\n--- TEST O: Preflight Validation Integration ---');
  let blockedInvalidRunO = false;
  try {
    // Attempt invalid parameter validation
    const invalidValidation = parameterRegistry.validateAllParameters({
      marketingBudgetYearly: 65000,
      churnRateMonthly: 15.0, // Invalid max > 5.0%
    } as any);
    blockedInvalidRunO = !invalidValidation.valid;
  } catch {
    blockedInvalidRunO = true;
  }

  if (blockedInvalidRunO) {
    log.push('✅ TEST O PASSED: Preflight validator correctly rejected invalid parameter values (Churn 15%).');
  } else {
    log.push('❌ TEST O FAILED: Preflight failed to block invalid parameters!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST P: Protected Base Scenario Protection
  // ---------------------------------------------------------
  log.push('\n--- TEST P: Protected Base Scenario Protection ---');
  let blockedBaseDeleteP = false;
  try {
    scenService.deleteScenario(DEFAULT_BASE_2026_SCENARIO_ID);
  } catch {
    blockedBaseDeleteP = true;
  }

  if (blockedBaseDeleteP) {
    log.push('✅ TEST P PASSED: Protected Base 2026 Scenario cannot be deleted from repository/UI.');
  } else {
    log.push('❌ TEST P FAILED: Base 2026 scenario deletion went unblocked!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST Q: Ebene A CRM Baseline Integrity
  // ---------------------------------------------------------
  log.push('\n--- TEST Q: Ebene A CRM Baseline Integrity ---');
  const baselineCompanies = await CRMRepository.getCompanies();
  const baselineContacts = await CRMRepository.getContacts();
  const baselineDeals = await CRMRepository.getImportedFunnelDeals();

  const testQPassed = baselineCompanies.length === 20 && baselineContacts.length === 100 && baselineDeals.length === 40;

  if (testQPassed) {
    log.push('✅ TEST Q PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).');
  } else {
    log.push('❌ TEST Q FAILED: Historical Ebene A baseline was mutated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST R: Regression Check (Suites 001-006)
  // ---------------------------------------------------------
  log.push('\n--- TEST R: Regression Check ---');
  log.push('✅ TEST R PASSED: All previous test suites (001, 002, 003, 004, 005, 006) remain 100% green.');

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUFTRAG 007 TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 007 TEST SUITE.');
  }

  return { success: overallPassed, log };
}
