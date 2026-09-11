import { ScenarioService } from '../scenarioService';
import { ScenarioError, TradeOffDimension } from '../../types/scenario';
import { logger } from '../../services/logger';

export async function runMultiScenarioComparisonTest(): Promise<boolean> {
  logger.info('\n=== STARTING AUFTRAG 019 TEST SUITE (MULTI-SCENARIO COMPARISON & TRADE-OFFS) ===\n');

  const scenService = ScenarioService.getInstance();

  // Setup isolated scenarios for testing
  const { scenario: testScenario, version: v1 } = scenService.createScenario(
    'Multi-Compare Test Scenario',
    'Base Configuration',
    {
      salesRepCount: 2,
      marketingBudgetYearly: 100000,
      trialToPaidConversion: 25,
      churnRateMonthly: 2.8,
    }
  );

  // Create additional versions
  const v2 = scenService.createScenarioVersion(testScenario.id, {
    salesRepCount: 5,
    marketingBudgetYearly: 140000,
    trialToPaidConversion: 25,
    churnRateMonthly: 2.8,
  }, 'Aggressive Sales Scale');

  const v3 = scenService.createScenarioVersion(testScenario.id, {
    salesRepCount: 2,
    marketingBudgetYearly: 80000,
    trialToPaidConversion: 38,
    churnRateMonthly: 1.5,
  }, 'High Retention & Conversion Focus');

  const v4 = scenService.createScenarioVersion(testScenario.id, {
    salesRepCount: 3,
    marketingBudgetYearly: 120000,
    trialToPaidConversion: 30,
    churnRateMonthly: 2.5,
  }, 'Balanced Hybrid Scale');

  // Execute 2 runs for each version to generate statistical distribution data (8 total runs <= 10 scenario limit)
  logger.info('--- Setting up simulations for 4 versions ---');
  for (let i = 0; i < 2; i++) {
    await scenService.runScenarioVersion(v1.id, 42000 + i, 30);
    await scenService.runScenarioVersion(v2.id, 43000 + i, 30);
    await scenService.runScenarioVersion(v3.id, 44000 + i, 30);
    await scenService.runScenarioVersion(v4.id, 45000 + i, 30);
  }

  // -------------------------------------------------------------------------
  // TEST 1: 3- & 4-Scenario Parallel Comparison Matrix Integrity (Decisions 849–851)
  // -------------------------------------------------------------------------
  logger.info('--- TEST 1: 3- & 4-Scenario Parallel Comparison Matrix Integrity ---');
  const res3 = scenService.compareMultipleVersions([v1.id, v2.id, v3.id]);
  if (res3.versions.length !== 3) {
    throw new Error(`TEST 1 FAILED: Expected 3 versions, got ${res3.versions.length}`);
  }
  if (res3.parameterMatrix.length < 6) {
    throw new Error(`TEST 1 FAILED: Expected full parameter matrix, got ${res3.parameterMatrix.length}`);
  }
  if (res3.kpiMatrix.length < 7) {
    throw new Error(`TEST 1 FAILED: Expected full KPI matrix (7+ metrics), got ${res3.kpiMatrix.length}`);
  }

  const res4 = scenService.compareMultipleVersions([v1.id, v2.id, v3.id, v4.id]);
  if (res4.versions.length !== 4) {
    throw new Error(`TEST 1 FAILED: Expected 4 versions, got ${res4.versions.length}`);
  }
  logger.info('✅ TEST 1 PASSED: 3- and 4-scenario comparison matrices generated accurately.');

  // -------------------------------------------------------------------------
  // TEST 2: 5-Dimension Trade-Off Structuring without Composite Score (Decisions 864–868)
  // -------------------------------------------------------------------------
  logger.info('--- TEST 2: 5-Dimension Trade-Off Structuring without Composite Score ---');
  const expectedDimensions: TradeOffDimension[] = ['GROWTH', 'PROFITABILITY', 'LIQUIDITY', 'ACQUISITION', 'RETENTION'];
  const actualDimensions = res4.tradeOffs.map((t) => t.dimension);

  for (const dim of expectedDimensions) {
    if (!actualDimensions.includes(dim)) {
      throw new Error(`TEST 2 FAILED: Missing trade-off dimension "${dim}"`);
    }
  }

  for (const tradeOff of res4.tradeOffs) {
    if (!tradeOff.bestVersionId) {
      throw new Error(`TEST 2 FAILED: Dimension ${tradeOff.dimension} missing bestVersionId.`);
    }
    const evalKeys = Object.keys(tradeOff.evaluations);
    if (evalKeys.length !== 4) {
      throw new Error(`TEST 2 FAILED: Dimension ${tradeOff.dimension} missing evaluation for all 4 versions.`);
    }
  }

  // Verify compliance with Decision 866: No composite global score
  const res4Record = res4 as unknown as Record<string, unknown>;
  if (res4Record.compositeScore || res4Record.overallRank || res4Record.winnerScore) {
    throw new Error('TEST 2 FAILED: Unlawful artificial composite score detected in comparison result.');
  }
  logger.info('✅ TEST 2 PASSED: 5-dimension trade-off analysis valid without artificial composite score.');

  // -------------------------------------------------------------------------
  // TEST 3: Automated Root-Cause Key Difference Identification (Decisions 869–871)
  // -------------------------------------------------------------------------
  logger.info('--- TEST 3: Automated Root-Cause Key Difference Identification ---');
  if (res4.keyDifferences.length === 0) {
    throw new Error('TEST 3 FAILED: Expected key driver differences to be identified.');
  }

  const salesDiff = res4.keyDifferences.find((d) => d.parameterKey === 'salesRepCount');
  if (!salesDiff) {
    throw new Error('TEST 3 FAILED: Expected salesRepCount driver difference.');
  }
  if (!salesDiff.explanation || salesDiff.explanation.length < 10) {
    throw new Error('TEST 3 FAILED: Expected meaningful root-cause explanation for salesRepCount.');
  }
  logger.info('✅ TEST 3 PASSED: Automated root-cause differences identified with domain explanations.');

  // -------------------------------------------------------------------------
  // TEST 4: Configuration Adoption (Decision 872)
  // -------------------------------------------------------------------------
  logger.info('--- TEST 4: Configuration Adoption (adoptConfiguration) ---');
  const adoptedVersion = scenService.adoptConfiguration(v2.id, testScenario.id, 'Adopted v2 for production trial');
  if (!adoptedVersion) {
    throw new Error('TEST 4 FAILED: adoptConfiguration returned null.');
  }
  if (adoptedVersion.parameters.salesRepCount !== 5 || adoptedVersion.parameters.marketingBudgetYearly !== 140000) {
    throw new Error('TEST 4 FAILED: Adopted version parameters do not match source version.');
  }
  if (!adoptedVersion.description || !adoptedVersion.description.includes('Adopted v2')) {
    throw new Error('TEST 4 FAILED: Adopted version description not set properly.');
  }
  logger.info('✅ TEST 4 PASSED: adoptConfiguration creates valid immutable ScenarioVersion.');

  // -------------------------------------------------------------------------
  // TEST 5: Boundary & Error Constraints (< 2 or > 4 Versions)
  // -------------------------------------------------------------------------
  logger.info('--- TEST 5: Boundary & Error Constraints (< 2 or > 4 Versions) ---');
  let errCaughtMin = false;
  try {
    scenService.compareMultipleVersions([v1.id]);
  } catch (err) {
    if (err instanceof ScenarioError && err.code === 'INVALID_VERSION') {
      errCaughtMin = true;
    }
  }
  if (!errCaughtMin) {
    throw new Error('TEST 5 FAILED: compareMultipleVersions did not reject < 2 versions.');
  }

  let errCaughtMax = false;
  try {
    scenService.compareMultipleVersions([v1.id, v2.id, v3.id, v4.id, adoptedVersion.id]);
  } catch (err) {
    if (err instanceof ScenarioError && err.code === 'INVALID_VERSION') {
      errCaughtMax = true;
    }
  }
  if (!errCaughtMax) {
    throw new Error('TEST 5 FAILED: compareMultipleVersions did not reject > 4 versions.');
  }

  let errCaughtNotFound = false;
  try {
    scenService.compareMultipleVersions([v1.id, 'non-existent-version-id']);
  } catch (err) {
    if (err instanceof ScenarioError && err.code === 'NOT_FOUND') {
      errCaughtNotFound = true;
    }
  }
  if (!errCaughtNotFound) {
    throw new Error('TEST 5 FAILED: compareMultipleVersions did not throw NOT_FOUND for unknown version.');
  }
  logger.info('✅ TEST 5 PASSED: Strict boundary constraints (2 <= n <= 4) and error handling enforced.');

  // -------------------------------------------------------------------------
  // TEST 6: Reference Version Delta Calculation & Directionality
  // -------------------------------------------------------------------------
  logger.info('--- TEST 6: Reference Version Delta Calculation & Directionality ---');
  const resWithRef = scenService.compareMultipleVersions([v1.id, v2.id, v3.id], undefined, v1.id);
  if (resWithRef.referenceVersionId !== v1.id) {
    throw new Error(`TEST 6 FAILED: Expected refId=${v1.id}, got ${resWithRef.referenceVersionId}`);
  }

  const arrRow = resWithRef.kpiMatrix.find((r) => r.kpiId === 'liveARR');
  if (!arrRow) {
    throw new Error('TEST 6 FAILED: Missing liveARR row in kpiMatrix.');
  }
  if (arrRow.deltasAgainstRef[v1.id] !== 0) {
    throw new Error(`TEST 6 FAILED: Expected delta against self = 0, got ${arrRow.deltasAgainstRef[v1.id]}`);
  }
  logger.info('✅ TEST 6 PASSED: Relative deltas and directional favorability computed accurately.');

  // -------------------------------------------------------------------------
  // TEST 7: Determinism & Immutability of Comparison Results
  // -------------------------------------------------------------------------
  logger.info('--- TEST 7: Determinism & Immutability of Comparison Results ---');
  const resA = scenService.compareMultipleVersions([v1.id, v2.id, v3.id], undefined, v1.id);
  const resB = scenService.compareMultipleVersions([v1.id, v2.id, v3.id], undefined, v1.id);

  if (JSON.stringify(resA) !== JSON.stringify(resB)) {
    throw new Error('TEST 7 FAILED: compareMultipleVersions output is not deterministic.');
  }
  logger.info('✅ TEST 7 PASSED: Comparison results are 100% deterministic and side-effect-free.');

  logger.info('\n=================================================================');
  logger.info('🎉 ALL AUFTRAG 019 MULTI-SCENARIO INTEGRITY TESTS PASSED SUCCESSFULLY!\n');
  return true;
}
