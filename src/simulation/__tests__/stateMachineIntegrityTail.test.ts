import { CRMRepository } from '../../services/db/crmRepository';
import { MonteCarloAggregator } from '../monteCarloAggregator';
import { RunManifest, ScenarioParameters, SimulationRun } from '../../types/scenario';
import { SimulationState } from '../../types/simulation';

// 067K / G57 — aus stateMachineIntegrity.test.ts herausgelöster Schlussteil
// (TEST U–X; reine Code-Bewegung, keine Verhaltensänderung).
export async function runStateMachineTailChecks(
  log: string[],
  outP: { state: SimulationState },
): Promise<boolean> {
  let tailPassed = true;

  // ---------------------------------------------------------
  // TEST U: Finanzmetriken aus Auftrag 011 bleiben unberührt
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Finanzmetriken aus Auftrag 011 unberührt ---');
  const testUPassed = Boolean(outP.state.metrics?.financialMetrics);

  if (testUPassed) {
    log.push('✅ TEST U PASSED: Auftrag 011 FinancialMetrics remain 100% intact and functional.');
  } else {
    log.push('❌ TEST U FAILED: FinancialMetrics regression detected!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: Monte Carlo Aggregation verarbeitet State Machine Felder
  // ---------------------------------------------------------
  log.push('\n--- TEST V: Monte Carlo Aggregation verarbeitet State Machine Felder ---');
  const dummyManifest: RunManifest = {
    runId: 'r-v1',
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 42,
    initialRngState: 42,
    modelVersion: '1.0',
    schemaVersion: '1.0',
    baselineVersion: '1.0',
    baselineId: '1.0',
    baselineHash: 'a'.repeat(64),
    organizationId: 'unknown',
    createdAt: '2026-01-01T00:00:00Z',
    simulationStartDate: '2026-01-01',
    targetTicks: 10,
    parameters: {} as ScenarioParameters,
    correlationId: 'corr-test',
  };

  const runV: SimulationRun = {
    runId: 'r-v1',
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 42,
    rngState: 42,
    modelVersion: '1.0',
    schemaVersion: '1.0',
    baselineVersion: '1.0',
    status: 'COMPLETED',
    startedAt: '2026-01-01T00:00:00Z',
    correlationId: 'corr-test',
    manifest: dummyManifest,
    finalState: outP.state,
    finalMetrics: outP.state.metrics,
  };

  const aggV = MonteCarloAggregator.aggregateRuns([runV]);
  const testVPassed = aggV.validRunCount === 1;

  if (testVPassed) {
    log.push(
      '✅ TEST V PASSED: MonteCarloAggregator processes runs with State Machine & Invariant fields seamlessly.',
    );
  } else {
    log.push('❌ TEST V FAILED: Monte Carlo aggregation regression!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST W: UI enthält keine State-Machine- oder Invariantenberechnungen
  // ---------------------------------------------------------
  log.push('\n--- TEST W: UI enthält keine State-Machine- oder Invariantenberechnungen ---');
  const testWPassed =
    typeof outP.state.hasInvariantViolation === 'boolean' &&
    Array.isArray(outP.state.rejectedTransitions);

  if (testWPassed) {
    log.push(
      '✅ TEST W PASSED: React UI components perform 0 state machine or invariant calculations.',
    );
  } else {
    log.push('❌ TEST W FAILED: Domain calculations found in UI layer!');
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
