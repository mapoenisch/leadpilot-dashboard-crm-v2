import { CRMRepository } from '../../services/db/crmRepository';
import { scenarioService } from '../scenarioService';
import { DEFAULT_BASE_2026_VERSION_ID } from '../scenarioRepository';
import { VersionComparisonResult, ScenarioVersion } from '../../types/scenario';

// 067K / G57 — aus scenarioComparisonIntegrity.test.ts herausgelöster
// Schlussteil (TEST AB–X; reine Code-Bewegung, keine Verhaltensänderung).
export async function runScenarioComparisonTailChecks(
  log: string[],
  diffResult: VersionComparisonResult,
  ver2: ScenarioVersion,
): Promise<boolean> {
  let tailPassed = true;

  // ---------------------------------------------------------
  // TEST AB: compareVersions accurately detects unsimulated vs simulated versions
  // ---------------------------------------------------------
  log.push('\n--- TEST AB: compareVersions unsimulated vs simulated semantics ---');
  const testABUnsimulated =
    diffResult.hasRunsB === false &&
    diffResult.summaryExplanation.includes('Simulation ausstehend') &&
    diffResult.kpiComparisons[0]?.hasResultB === false &&
    diffResult.kpiComparisons[0]?.comparisonAB === undefined;

  // Now execute a run for ver2
  await scenarioService.runScenarioVersion(ver2.id, 999111, 20);
  const diffResultSimulated = scenarioService.compareVersions(
    DEFAULT_BASE_2026_VERSION_ID,
    ver2.id,
  );

  const testABSimulated =
    diffResultSimulated.hasRunsB === true &&
    diffResultSimulated.kpiComparisons[0]?.hasResultB === true &&
    diffResultSimulated.kpiComparisons[0]?.comparisonAB !== undefined;

  const testABPassed = testABUnsimulated && testABSimulated;
  if (testABPassed) {
    log.push(
      '✅ TEST AB PASSED: compareVersions semantics distinguish unsimulated from simulated versions cleanly.',
    );
  } else {
    log.push('❌ TEST AB FAILED: Semantic error in unsimulated vs simulated run detection!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST X: Regressionsschutz Ebene A CRM Baseline
  // ---------------------------------------------------------
  log.push('\n--- TEST X: Regressionsschutz Ebene A CRM Baseline ---');
  const companies = await CRMRepository.getCompanies();
  const contacts = await CRMRepository.getContacts();
  const dealsEbeneA = await CRMRepository.getImportedFunnelDeals();

  const testXPassed =
    companies.length === 20 && contacts.length === 100 && dealsEbeneA.length === 40;
  if (testXPassed) {
    log.push(
      `✅ TEST X PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).`,
    );
  } else {
    log.push(
      `❌ TEST X FAILED: Ebene A baseline mutated! Companies: ${companies.length}, Contacts: ${contacts.length}, Deals: ${dealsEbeneA.length}`,
    );
    tailPassed = false;
  }

  return tailPassed;
}
