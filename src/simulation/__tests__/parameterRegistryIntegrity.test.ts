import { CRMRepository } from '../../services/db/crmRepository';
import { ParameterRegistry } from '../parameterRegistry';
import { PreflightValidator } from '../preflightValidator';
import { ScenarioRepository } from '../scenarioRepository';
import { ScenarioService } from '../scenarioService';
import { ScenarioError } from '../../types/scenario';

export async function runParameterRegistryTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 003 TEST SUITE (PARAMETER REGISTRY & PREFLIGHT VALIDATION) ===');

  const registry = ParameterRegistry.getInstance();
  const repo = ScenarioRepository.getInstance();
  repo.resetToDefaults();
  const service = ScenarioService.getInstance();

  let overallPassed = true;

  // ---------------------------------------------------------
  // TEST A: Registry Completeness (All 7 V1 Control Levers)
  // ---------------------------------------------------------
  log.push('\n--- TEST A: Registry Completeness (7 V1 Control Levers) ---');
  const defs = registry.getAllDefinitions();
  const defKeys = defs.map((d) => d.id);

  const requiredV1Levers = [
    'marketingBudgetYearly',
    'channelMix',
    'trialToPaidConversion',
    'salesRepCount',
    'csRepCount',
    'churnRateMonthly',
    'salesCycleDays',
  ];

  const testAPassed = requiredV1Levers.every((lever) => defKeys.includes(lever));

  if (testAPassed) {
    log.push(`✅ TEST A PASSED: All 7 required V1 control levers are registered in ParameterRegistry.`);
  } else {
    log.push(`❌ TEST A FAILED: Missing required V1 levers in registry! Registered: ${defKeys.join(', ')}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Binding V1 Default Values
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Binding V1 Default Values ---');
  const defaults = registry.getDefaultParameters();

  const defaultsValid =
    defaults.marketingBudgetYearly === 65000 &&
    defaults.channelMix.linkedIn === 38 &&
    defaults.channelMix.seo === 22 &&
    defaults.channelMix.partner === 18 &&
    defaults.channelMix.webinar === 12 &&
    defaults.channelMix.outbound === 10 &&
    defaults.trialToPaidConversion === 18 &&
    defaults.salesRepCount === 2 &&
    defaults.csRepCount === 2 &&
    defaults.churnRateMonthly === 2.8 &&
    defaults.salesCycleDays === 38;

  if (defaultsValid) {
    log.push('✅ TEST B PASSED: ParameterRegistry provides binding V1 defaults (65.000 € Budget, 2.8 % Churn, 38d Cycle, 2 FTE Sales/CS).');
  } else {
    log.push(`❌ TEST B FAILED: Default values diverged! Defaults: ${JSON.stringify(defaults)}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Range Bounds (Churn 0.5 - 5.0 %/Monat)
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Range Bounds (Churn 0.5 - 5.0 %/Monat & Budget 30k - 150k €) ---');
  const errLowChurn = registry.validateSingleParameter('churnRateMonthly', 0.4);
  const errHighChurn = registry.validateSingleParameter('churnRateMonthly', 5.1); // Binding max 5.0%!
  const errLowBudget = registry.validateSingleParameter('marketingBudgetYearly', 25000);
  const errHighBudget = registry.validateSingleParameter('marketingBudgetYearly', 160000);
  const validChurn = registry.validateSingleParameter('churnRateMonthly', 3.5);

  const testCPassed =
    typeof errLowChurn === 'string' &&
    typeof errHighChurn === 'string' &&
    typeof errLowBudget === 'string' &&
    typeof errHighBudget === 'string' &&
    validChurn === null;

  if (testCPassed) {
    log.push('✅ TEST C PASSED: Values outside range correctly rejected (Churn 5.1% rejected due to binding 5.0% max limit). Valid 3.5% accepted.');
  } else {
    log.push(`❌ TEST C FAILED: Range validation failed! Low Churn: ${errLowChurn}, High Churn: ${errHighChurn}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Data Type Validation
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Data Type Validation ---');
  const errStringType = registry.validateSingleParameter('salesRepCount', 'zwei' as any);
  const errNanType = registry.validateSingleParameter('salesCycleDays', NaN);
  const validNumType = registry.validateSingleParameter('salesRepCount', 4);

  const testDPassed = typeof errStringType === 'string' && typeof errNanType === 'string' && validNumType === null;

  if (testDPassed) {
    log.push('✅ TEST D PASSED: Non-numeric values ("zwei", NaN) rejected. Numeric integer (4) accepted.');
  } else {
    log.push('❌ TEST D FAILED: Data type validation allowed invalid non-numeric values!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Channel Mix Normalization & Validation
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Channel Mix Normalization & Validation ---');
  // Mix 1: Valid 100% mix
  const mix1 = { linkedIn: 38, seo: 22, partner: 18, webinar: 12, outbound: 10 };
  const res1 = registry.normalizeChannelMix(mix1);

  // Mix 2: Sum = 80% (Must be auto-normalized proportionally to 100%)
  const mix2 = { linkedIn: 30, seo: 20, partner: 15, webinar: 10, outbound: 5 };
  const res2 = registry.normalizeChannelMix(mix2);
  const sumRes2 = res2.mix.linkedIn + res2.mix.seo + res2.mix.partner + res2.mix.webinar + res2.mix.outbound;

  // Mix 3: Invalid negative value (Must be rejected)
  let mix3Rejected = false;
  try {
    registry.normalizeChannelMix({ linkedIn: -10, seo: 50, partner: 20, webinar: 20, outbound: 20 });
  } catch {
    mix3Rejected = true;
  }

  const testEPassed = !res1.normalized && res2.normalized && Math.abs(sumRes2 - 100) < 0.01 && mix3Rejected;

  if (testEPassed) {
    log.push(`✅ TEST E PASSED: Valid 100% mix accepted unchanged. 80% sum mix proportionally auto-normalized to exact 100.00% (${sumRes2}%). Negative channel value correctly rejected.`);
  } else {
    log.push(`❌ TEST E FAILED: Channel mix normalization failed! SumRes2: ${sumRes2}, Mix3Rejected: ${mix3Rejected}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Full Parameter Set Validation in Preflight
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Full Parameter Set Validation in Preflight ---');
  const { version: validVersion } = service.createScenario('Preflight Test Scenario');
  
  // Corrupt version parameters in repo to test missing parameter detection
  const corruptVersion = JSON.parse(JSON.stringify(validVersion));
  corruptVersion.id = 'ver-corrupt';
  delete corruptVersion.parameters.salesRepCount;
  repo.saveVersion(corruptVersion);

  const preflightCorrupt = PreflightValidator.validateRun('ver-corrupt', 42, repo, registry);
  const testFPassed = !preflightCorrupt.valid && preflightCorrupt.errors.some((e) => e.message.includes('salesRepCount'));

  if (testFPassed) {
    log.push('✅ TEST F PASSED: Preflight validator correctly rejected version missing mandatory parameter "salesRepCount".');
  } else {
    log.push('❌ TEST F FAILED: Preflight validator allowed version with missing mandatory parameter!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: Preflight Zero-Side-Effect Guarantee
  // ---------------------------------------------------------
  log.push('\n--- TEST G: Preflight Zero-Side-Effect Guarantee ---');
  const crmCompaniesBefore = (await CRMRepository.getCompanies()).length;
  const crmContactsBefore = (await CRMRepository.getContacts()).length;

  const preflightRes = PreflightValidator.validateRun(validVersion.id, 42, repo, registry);

  const crmCompaniesAfter = (await CRMRepository.getCompanies()).length;
  const crmContactsAfter = (await CRMRepository.getContacts()).length;

  const testGPassed =
    preflightRes.valid &&
    crmCompaniesBefore === crmCompaniesAfter &&
    crmContactsBefore === crmContactsAfter;

  if (testGPassed) {
    log.push('✅ TEST G PASSED: Preflight validation executed with 100% zero side-effects on state and CRM baseline.');
  } else {
    log.push('❌ TEST G FAILED: Preflight validation produced side-effects!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: Invalid Run Start Blocked by Preflight
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Invalid Run Start Blocked ---');
  let invalidRunBlocked = false;

  try {
    // Attempt to run corrupt version
    await service.runScenarioVersion('ver-corrupt', 42);
  } catch (err) {
    if (err instanceof ScenarioError) {
      invalidRunBlocked = true;
    }
  }

  if (invalidRunBlocked) {
    log.push('✅ TEST H PASSED: ScenarioService.runScenarioVersion() blocked run execution when Preflight failed.');
  } else {
    log.push('❌ TEST H FAILED: Invalid run execution was not blocked by Preflight!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Valid Run Passes Preflight
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Valid Run Passes Preflight ---');
  const validRunResult = await service.runScenarioVersion(validVersion.id, 42, 10);
  const testIPassed = validRunResult.run.status === 'COMPLETED';

  if (testIPassed) {
    log.push(`✅ TEST I PASSED: Valid scenario version passed Preflight and completed run "${validRunResult.run.runId}".`);
  } else {
    log.push('❌ TEST I FAILED: Valid run failed to complete!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: Ebene A CRM Baseline Integrity
  // ---------------------------------------------------------
  log.push('\n--- TEST J: Ebene A CRM Baseline Integrity ---');
  const baselineCompanies = await CRMRepository.getCompanies();
  const baselineContacts = await CRMRepository.getContacts();
  const baselineDeals = await CRMRepository.getImportedFunnelDeals();

  const testJPassed = baselineCompanies.length === 20 && baselineContacts.length === 100 && baselineDeals.length === 40;

  if (testJPassed) {
    log.push('✅ TEST J PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).');
  } else {
    log.push('❌ TEST J FAILED: Historical Ebene A baseline was mutated by parameter validation or preflight!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: Single Source of Truth
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Single Source of Truth ---');
  const repoBaseParams = ScenarioRepository.getInstance().getScenario('scenario-base-2026')?.currentVersionId;
  const baseVersionObj = repoBaseParams ? repo.getVersion(repoBaseParams) : null;
  const registryDefaults = registry.getDefaultParameters();

  const testKPassed =
    baseVersionObj !== null &&
    JSON.stringify(baseVersionObj.parameters) === JSON.stringify(registryDefaults);

  if (testKPassed) {
    log.push('✅ TEST K PASSED: ScenarioRepository base parameters match ParameterRegistry defaults 100%. ParameterRegistry is Single Source of Truth.');
  } else {
    log.push(`❌ TEST K FAILED: Parameter mismatch between Repository defaults and ParameterRegistry!`);
    overallPassed = false;
  }

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUFTRAG 003 TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 003 TEST SUITE.');
  }

  return { success: overallPassed, log };
}
