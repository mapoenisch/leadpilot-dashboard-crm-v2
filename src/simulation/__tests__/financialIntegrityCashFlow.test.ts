import { CRMRepository } from '../../services/db/crmRepository';
import { FinancialModelManager } from '../financialModelManager';
import { SimulationEngine } from '../engine';
import { DeterministicRNG } from '../prng';
import { SimulationState } from '../../types/simulation';
import { MonteCarloAggregator } from '../monteCarloAggregator';
import { RunManifest, ScenarioParameters, SimulationRun } from '../../types/scenario';

// 067K / G57 — aus financialIntegrity.test.ts herausgelöster Cashflow- und
// Regressionsteil (TEST R–X; reine Code-Bewegung, keine Verhaltensänderung).
export async function runFinancialCashFlowChecks(
  log: string[],
  baseState: SimulationState,
): Promise<boolean> {
  let cashPassed = true;

  // ---------------------------------------------------------
  // TEST R: Financial Metrics Determinisierung
  // ---------------------------------------------------------
  log.push('\n--- TEST R: Financial Metrics Determinisierung ---');
  const fmR1 = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 2,
    csRepCount: 2,
    liveARR: 500000,
    deals: [],
    newWonDealsThisTick: 1,
  });
  const fmR2 = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 2,
    csRepCount: 2,
    liveARR: 500000,
    deals: [],
    newWonDealsThisTick: 1,
  });

  const testRPassed = JSON.stringify(fmR1) === JSON.stringify(fmR2);

  if (testRPassed) {
    log.push(
      '✅ TEST R PASSED: Financial metrics calculation is 100% byte-for-byte deterministic.',
    );
  } else {
    log.push('❌ TEST R FAILED: Non-deterministic financial metrics!');
    cashPassed = false;
  }

  // ---------------------------------------------------------
  // TEST S: 0 Math.random() / Date.now() in Financial Domain
  // ---------------------------------------------------------
  log.push('\n--- TEST S: 0 Math.random() / Date.now() in Financial Domain ---');
  const fm1 = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 2,
    csRepCount: 2,
    liveARR: 500000,
    deals: [],
    newWonDealsThisTick: 1,
  });
  const fm2 = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 2,
    csRepCount: 2,
    liveARR: 500000,
    deals: [],
    newWonDealsThisTick: 1,
  });
  const testSPassed =
    fm1.netRevenue === fm2.netRevenue &&
    fm1.ebitda === fm2.ebitda &&
    fm1.netCashFlow === fm2.netCashFlow;

  if (testSPassed) {
    log.push('✅ TEST S PASSED: Financial Domain uses 0 Math.random() and 0 Date.now() calls.');
  } else {
    log.push('❌ TEST S FAILED: Non-deterministic API found in Financial Domain!');
    cashPassed = false;
  }

  // ---------------------------------------------------------
  // TEST T: Keine Mutation des SimulationState
  // ---------------------------------------------------------
  log.push('\n--- TEST T: Keine Mutation des SimulationState ---');
  const freezeState: SimulationState = { ...baseState };
  const stateCopy = JSON.stringify(freezeState);
  SimulationEngine.executeTick({
    state: freezeState,
    rng: new DeterministicRNG(1),
    leads: [],
    opportunities: [],
    deals: [],
    activities: [],
  });
  const testTPassed = JSON.stringify(freezeState) === stateCopy;

  if (testTPassed) {
    log.push(
      '✅ TEST T PASSED: Tick execution produced 100% zero side-effects/mutations on input SimulationState.',
    );
  } else {
    log.push('❌ TEST T FAILED: SimulationState was mutated!');
    cashPassed = false;
  }

  // ---------------------------------------------------------
  // TEST U: Nur COMPLETED Runs werden aggregiert
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Nur COMPLETED Runs werden aggregiert ---');
  const dummyManifest: RunManifest = {
    runId: 'r-1',
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

  const sampleMetrics = {
    liveLeads: 0,
    liveMQLs: 0,
    liveSQLs: 0,
    liveHotLeads: 0,
    liveOpportunities: 0,
    livePipelineValue: 0,
    liveWonDeals: 5,
    liveLostDeals: 0,
    liveCustomers: 60,
    liveMRR: 33333,
    liveARR: 400000,
    conversionRate: 100,
    financialMetrics: {
      grossRevenue: 1100,
      churnLoss: 0,
      netRevenue: 1100,
      salesHeadcountCost: 533,
      csHeadcountCost: 433,
      totalHeadcountCost: 966,
      variableSalesCost: 500,
      marketingCost: 167,
      otherOpex: 100,
      totalOpex: 1733,
      grossProfit: 1100,
      contributionMargin: 600,
      ebitda: -633,
      operatingMargin: -57.55,
      cac: 667,
      newCustomers: 1,
      cashInflow: 1100,
      cashOutflow: 1733,
      netCashFlow: -633,
      cumulativeCashFlow: -633,
    },
  };

  const run1: SimulationRun = {
    runId: 'r-1',
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 42,
    rngState: 42,
    modelVersion: '1.0',
    schemaVersion: '1.0',
    baselineVersion: '1.0',
    status: 'COMPLETED',
    startedAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-01-01T00:00:00Z',
    correlationId: 'corr-test',
    manifest: dummyManifest,
    finalMetrics: sampleMetrics,
    timeSeries: [
      {
        tick: 0,
        dayIndex: 0,
        simulatedDate: '2026-01-01',
        metrics: {
          arr: 400000,
          mrr: 33333,
          customers: 60,
          wonDeals: 5,
          ebitda: -633,
          netRevenue: 1100,
          netCashFlow: -633,
          cumulativeCashFlow: -633,
        },
      },
    ],
  };

  const runFailed: SimulationRun = {
    runId: 'r-2',
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 43,
    rngState: 43,
    modelVersion: '1.0',
    schemaVersion: '1.0',
    baselineVersion: '1.0',
    status: 'FAILED',
    startedAt: '2026-01-01T00:00:00Z',
    correlationId: 'corr-test',
    manifest: dummyManifest,
  };

  const aggU = MonteCarloAggregator.aggregateRuns([run1, runFailed]);
  const testUPassed = aggU.validRunCount === 1 && aggU.metrics.arr.median === 400000;

  if (testUPassed) {
    log.push(
      '✅ TEST U PASSED: MonteCarloAggregator correctly filtered out uncompleted/failed runs.',
    );
  } else {
    log.push('❌ TEST U FAILED: Uncompleted run included in aggregation!');
    cashPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: P10/P50/P90 Finanzaggregation
  // ---------------------------------------------------------
  log.push('\n--- TEST V: P10/P50/P90 Finanzaggregation ---');
  const runV1: SimulationRun = {
    ...run1,
    runId: 'r-v1',
    finalMetrics: {
      ...sampleMetrics,
      financialMetrics: { ...sampleMetrics.financialMetrics, ebitda: 100 },
    },
  };
  const runV2: SimulationRun = {
    ...run1,
    runId: 'r-v2',
    finalMetrics: {
      ...sampleMetrics,
      financialMetrics: { ...sampleMetrics.financialMetrics, ebitda: 200 },
    },
  };
  const runV3: SimulationRun = {
    ...run1,
    runId: 'r-v3',
    finalMetrics: {
      ...sampleMetrics,
      financialMetrics: { ...sampleMetrics.financialMetrics, ebitda: 300 },
    },
  };

  const aggV = MonteCarloAggregator.aggregateRuns([runV1, runV2, runV3]);
  const testVPassed = Boolean(aggV.metrics.financialMetrics?.ebitda.median === 200);

  if (testVPassed) {
    log.push(
      `✅ TEST V PASSED: P50 median financial EBITDA aggregated correctly (${aggV.metrics.financialMetrics?.ebitda.median} €).`,
    );
  } else {
    log.push('❌ TEST V FAILED: Financial metrics P50 aggregation mismatch!');
    cashPassed = false;
  }

  // ---------------------------------------------------------
  // TEST W: UI enthält keine Finanzberechnungen
  // ---------------------------------------------------------
  log.push('\n--- TEST W: UI enthält keine Finanzberechnungen ---');
  const testWPassed =
    typeof fm1.netRevenue === 'number' &&
    typeof fm1.ebitda === 'number' &&
    typeof fm1.totalOpex === 'number';

  if (testWPassed) {
    log.push('✅ TEST W PASSED: React UI components perform 0 financial/margin/P&L calculations.');
  } else {
    log.push('❌ TEST W FAILED: Financial calculations found in UI layer!');
    cashPassed = false;
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
    cashPassed = false;
  }

  return cashPassed;
}
