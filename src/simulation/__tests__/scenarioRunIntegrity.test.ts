import { ScenarioRepository } from '../scenarioRepository';
import { ScenarioService } from '../scenarioService';
import { ScenarioError } from '../../types/scenario';

export async function runScenarioRunTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 002 TEST SUITE (SCENARIO, VERSION & RUN INTEGRITY) ===');

  const repo = ScenarioRepository.getInstance();
  repo.resetToDefaults();
  const service = ScenarioService.getInstance();

  let overallPassed = true;

  // ---------------------------------------------------------
  // TEST A: Scenario Versioning & Stable ScenarioId
  // ---------------------------------------------------------
  log.push('\n--- TEST A: Scenario Versioning & Stable ScenarioId ---');
  const { scenario, version: v1 } = service.createScenario(
    'Wachstums-Initiative Q3',
    'Szenario mit erhöhten Marketing-Aufwendungen',
  );
  const v2 = service.createScenarioVersion(
    scenario.id,
    { marketingBudgetYearly: 120000 },
    'Erhöhung auf 120.000 €/Jahr',
  );
  const v3 = service.createScenarioVersion(
    scenario.id,
    { salesRepCount: 4 },
    'Skalierung Vertriebsteam auf 4 FTE',
  );

  const testAPassed =
    v1.scenarioId === scenario.id &&
    v2.scenarioId === scenario.id &&
    v3.scenarioId === scenario.id &&
    v1.versionNumber === 1 &&
    v2.versionNumber === 2 &&
    v3.versionNumber === 3 &&
    v1.id !== v2.id &&
    v2.id !== v3.id;

  if (testAPassed) {
    log.push(
      `✅ TEST A PASSED: Scenario "${scenario.id}" has 3 distinct versions with stable scenarioId.`,
    );
  } else {
    log.push('❌ TEST A FAILED: Scenario IDs or Version numbers diverged!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Full Parameter Set Per Version & Past Immutability
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Full Parameter Set Per Version & Past Immutability ---');
  const v1ParamsBefore = JSON.stringify(v1.parameters);
  const v2HasFullParams =
    typeof v2.parameters.marketingBudgetYearly === 'number' &&
    typeof v2.parameters.salesRepCount === 'number' &&
    typeof v2.parameters.targetPackageFocus === 'string' &&
    typeof v2.parameters.churnRateMonthly === 'number';

  const v1ParamsAfter = JSON.stringify(repo.getVersion(v1.id)?.parameters);
  const testBPassed =
    v2HasFullParams &&
    v1ParamsBefore === v1ParamsAfter &&
    v2.parameters.marketingBudgetYearly === 120000 &&
    v1.parameters.marketingBudgetYearly === 65000;

  if (testBPassed) {
    log.push(
      `✅ TEST B PASSED: Version v2 stores full parameter set (12.000 € budget). Version v1 remains 100% unchanged (5.000 € budget).`,
    );
  } else {
    log.push('❌ TEST B FAILED: Version 1 was mutated or Version 2 is missing full parameter set!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Run Assignment to Scenario and Version
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Run Assignment to Scenario & ScenarioVersion ---');
  const runResult1 = await service.runScenarioVersion(v2.id, 42, 30);
  const run1 = runResult1.run;

  const testCPassed =
    run1.scenarioId === scenario.id &&
    run1.scenarioVersionId === v2.id &&
    run1.status === 'COMPLETED';
  if (testCPassed) {
    log.push(
      `✅ TEST C PASSED: Run "${run1.runId}" correctly references scenario "${run1.scenarioId}" and version "${run1.scenarioVersionId}".`,
    );
  } else {
    log.push('❌ TEST C FAILED: Run assignment mismatch!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Immutable RunManifest Completeness
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Immutable RunManifest Completeness ---');
  const manifest = run1.manifest;
  const manifestComplete =
    Boolean(manifest.runId) &&
    manifest.scenarioId === scenario.id &&
    manifest.scenarioVersionId === v2.id &&
    manifest.seed === 42 &&
    typeof manifest.initialRngState === 'number' &&
    manifest.modelVersion === '1.0.0-v1' &&
    manifest.schemaVersion === '1.0.0' &&
    Boolean(manifest.baselineVersion) &&
    Boolean(manifest.createdAt) &&
    (manifest.simulationStartDate === '2026-01-01' ||
      manifest.simulationStartDate === '01.01.2026') &&
    manifest.targetTicks === 30 &&
    typeof manifest.parameters === 'object';

  const isFrozen = Object.isFrozen(manifest) && Object.isFrozen(manifest.parameters);
  const testDPassed = manifestComplete && isFrozen;

  if (testDPassed) {
    log.push(
      `✅ TEST D PASSED: RunManifest contains all mandatory reproducibility metadata and is 100% frozen/readonly.`,
    );
  } else {
    log.push('❌ TEST D FAILED: RunManifest is incomplete or missing immutability freeze!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Re-Run Protocol ("Erneut ausführen")
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Re-Run Protocol ("Erneut ausführen") ---');
  const reRunResult = await service.reRun(v2.id, 30);
  const runReRun = reRunResult.run;

  const testEPassed =
    runReRun.runId !== run1.runId &&
    runReRun.seed !== run1.seed &&
    runReRun.scenarioVersionId === run1.scenarioVersionId &&
    runReRun.scenarioId === run1.scenarioId;

  if (testEPassed) {
    log.push(
      `✅ TEST E PASSED: Re-Run generated new runId ("${runReRun.runId}") and new seed (${runReRun.seed} vs ${run1.seed}) for same version.`,
    );
  } else {
    log.push('❌ TEST E FAILED: Re-Run reuse existing runId or seed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Reproduce Protocol ("Reproduzieren") Full Equality
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Reproduce Protocol ("Reproduzieren") Full Equality ---');
  const reproResult = await service.reproduce(run1.runId, 30);

  const stateIdentical = JSON.stringify(runResult1.state) === JSON.stringify(reproResult.state);
  const leadsIdentical = JSON.stringify(runResult1.leads) === JSON.stringify(reproResult.leads);
  const dealsIdentical = JSON.stringify(runResult1.deals) === JSON.stringify(reproResult.deals);
  const eventsIdentical = JSON.stringify(runResult1.events) === JSON.stringify(reproResult.events);
  const metricsIdentical =
    JSON.stringify(runResult1.state.metrics) === JSON.stringify(reproResult.state.metrics);

  const testFPassed =
    stateIdentical && leadsIdentical && dealsIdentical && eventsIdentical && metricsIdentical;

  if (testFPassed) {
    log.push(
      `✅ TEST F PASSED: Reproduce using original seed (${run1.seed}) & manifest yielded 100% byte-for-byte identical state, deals, leads, events & ARR (${reproResult.state.metrics?.liveARR} €).`,
    );
  } else {
    log.push(
      `❌ TEST F FAILED: Reproduce output diverged! State: ${stateIdentical}, Leads: ${leadsIdentical}, Deals: ${dealsIdentical}, Events: ${eventsIdentical}`,
    );
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: Immutable Run (Post-start Scenario Modifications)
  // ---------------------------------------------------------
  log.push('\n--- TEST G: Immutable Run (Post-start Scenario Modifications) ---');
  const run1Snapshot = JSON.stringify(repo.getRun(run1.runId));

  // Create v4 version and attempt to modify scenario
  service.createScenarioVersion(scenario.id, { marketingBudgetYearly: 100000 });
  const run1Afterv4 = JSON.stringify(repo.getRun(run1.runId));

  const testGPassed = run1Snapshot === run1Afterv4;
  if (testGPassed) {
    log.push(
      `✅ TEST G PASSED: Creating Version v4 (100.000 € budget) did NOT mutate existing Run "${run1.runId}".`,
    );
  } else {
    log.push('❌ TEST G FAILED: Existing run was mutated by subsequent version creation!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: Max 10 Saved Runs Enforcement
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Max 10 Saved Runs Enforcement ---');
  const scenarioH = service.createScenario('Max Run Limit Scenario').scenario;
  const versionH = repo.getVersionsByScenario(scenarioH.id)[0];
  if (!versionH) {
    throw new Error('TEST H SETUP FAILED: Version für Max-Run-Limit-Szenario fehlt.');
  }

  // Fill repository up to 10 runs
  for (let i = 0; i < 10; i++) {
    await service.runScenarioVersion(versionH.id, 100 + i, 10);
  }

  const savedRunsBefore = repo.getRunsByScenario(scenarioH.id).length;
  let errorCaught = false;

  try {
    // Attempt 11th run creation
    await service.runScenarioVersion(versionH.id, 999, 10);
  } catch (err) {
    if (err instanceof ScenarioError && err.code === 'MAX_RUNS_EXCEEDED') {
      errorCaught = true;
    }
  }

  const testHPassed = savedRunsBefore === 10 && errorCaught;
  if (testHPassed) {
    log.push(
      `✅ TEST H PASSED: 10 runs created successfully. 11th run correctly rejected with MAX_RUNS_EXCEEDED error.`,
    );
  } else {
    log.push(
      `❌ TEST H FAILED: 11th run was not rejected properly! Saved runs count: ${savedRunsBefore}, error caught: ${errorCaught}`,
    );
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Protected Base 2026 Scenario
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Protected Base 2026 Scenario Deletion Rejection ---');
  const baseScenario = repo.getScenario('scenario-base-2026');
  let baseDeleteError = false;

  if (baseScenario && baseScenario.isProtected) {
    try {
      service.deleteScenario('scenario-base-2026');
    } catch (err) {
      if (err instanceof ScenarioError && err.code === 'SCENARIO_PROTECTED_ERROR') {
        baseDeleteError = true;
      }
    }
  }

  const testIPassed =
    Boolean(baseScenario) && baseScenario?.isProtected === true && baseDeleteError;
  if (testIPassed) {
    log.push(
      '✅ TEST I PASSED: Base 2026 Scenario ("scenario-base-2026") is protected and deletion was rejected with SCENARIO_PROTECTED_ERROR.',
    );
  } else {
    log.push(
      `❌ TEST I FAILED: Base 2026 Scenario protection check failed! Protected: ${baseScenario?.isProtected}, Error: ${baseDeleteError}`,
    );
    overallPassed = false;
  }

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUFTRAG 002 TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 002 TEST SUITE.');
  }

  return { success: overallPassed, log };
}
