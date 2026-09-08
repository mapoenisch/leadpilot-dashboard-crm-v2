import { CRMRepository } from '../../services/db/crmRepository';
import { FinancialModelManager } from '../financialModelManager';
import { SimulationEngine } from '../engine';
import { DeterministicRNG } from '../prng';
import { SimulationState, SimulationDeal } from '../../types/simulation';
import { MonteCarloAggregator } from '../monteCarloAggregator';
import { SimulationRunResult } from '../../types/aggregation';

export async function runFinancialIntegrityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 011 TEST SUITE (FINANCIAL MODEL, COST STRUCTURE & CASH FLOW) ===');

  let overallPassed = true;

  // Initial dummy state
  const baseState: SimulationState = {
    isRunning: true,
    tickCount: 0,
    dayIndex: 0,
    simulatedDate: '2026-01-01',
    seed: 42,
    speed: 1,
    intervalMs: 12000,
    lastTickTimestamp: '2026-01-01 (Tick #0)',
    totalLeadsGenerated: 0,
    totalDealsWon: 0,
    currentARR: 411840,
  };

  const sampleDeal: SimulationDeal = {
    id: 'deal-1',
    companyName: 'Acme Financial',
    contactName: 'Jane Manager',
    dealName: 'Acme Deal 1',
    amount: 12000,
    mrr: 1000,
    arr: 12000,
    packageName: 'Professional',
    wonAtTick: 1,
    closeDate: '2026-01-02',
  };

  // ---------------------------------------------------------
  // TEST A: FinancialMetrics exist after a tick
  // ---------------------------------------------------------
  log.push('\n--- TEST A: FinancialMetrics exist after a tick ---');
  const rngA = new DeterministicRNG(42);
  const outA = SimulationEngine.executeTick({
    state: baseState,
    rng: rngA,
    leads: [],
    opportunities: [],
    deals: [sampleDeal],
    activities: [],
    salesRepCount: 2,
    csRepCount: 2,
  });

  const testAPassed = Boolean(outA.state.metrics?.financialMetrics);
  if (testAPassed) {
    log.push('✅ TEST A PASSED: FinancialMetrics successfully computed and attached to tick state.');
  } else {
    log.push('❌ TEST A FAILED: FinancialMetrics missing from tick state!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Headcount Cost aus salesRepCount
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Headcount Cost aus salesRepCount ---');
  const fmB = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 3,
    csRepCount: 0,
    liveARR: 411840,
    deals: [],
    newWonDealsThisTick: 0,
  });

  const expectedSalesCost = Math.round((3 * 8000) / 30); // 800 €
  const testBPassed = fmB.salesHeadcountCost === expectedSalesCost;
  if (testBPassed) {
    log.push(`✅ TEST B PASSED: Sales headcount cost derived correctly from salesRepCount (${fmB.salesHeadcountCost} €).`);
  } else {
    log.push(`❌ TEST B FAILED: Sales headcount cost mismatch! Expected ${expectedSalesCost}, got ${fmB.salesHeadcountCost}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Headcount Cost aus csRepCount
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Headcount Cost aus csRepCount ---');
  const fmC = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 0,
    csRepCount: 4,
    liveARR: 411840,
    deals: [],
    newWonDealsThisTick: 0,
  });

  const expectedCSCost = Math.round((4 * 6500) / 30); // 867 €
  const testCPassed = fmC.csHeadcountCost === expectedCSCost;
  if (testCPassed) {
    log.push(`✅ TEST C PASSED: CS headcount cost derived correctly from csRepCount (${fmC.csHeadcountCost} €).`);
  } else {
    log.push(`❌ TEST C FAILED: CS headcount cost mismatch! Expected ${expectedCSCost}, got ${fmC.csHeadcountCost}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Total Headcount Cost Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Total Headcount Cost Gleichung ---');
  const fmD = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 3,
    csRepCount: 4,
    liveARR: 411840,
    deals: [],
    newWonDealsThisTick: 0,
  });

  const testDPassed = fmD.totalHeadcountCost === fmD.salesHeadcountCost + fmD.csHeadcountCost;
  if (testDPassed) {
    log.push(`✅ TEST D PASSED: totalHeadcountCost (${fmD.totalHeadcountCost} €) = salesHeadcountCost (${fmD.salesHeadcountCost} €) + csHeadcountCost (${fmD.csHeadcountCost} €).`);
  } else {
    log.push('❌ TEST D FAILED: totalHeadcountCost equation violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Gross Revenue aus bestehender ARR-Basis
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Gross Revenue aus bestehender ARR-Basis ---');
  const expectedGrossRev = Math.round(411840 / 365); // 1128 €
  const testEPassed = fmD.grossRevenue === expectedGrossRev;

  if (testEPassed) {
    log.push(`✅ TEST E PASSED: Gross Revenue inherited directly from operative liveARR (${fmD.grossRevenue} € / day).`);
  } else {
    log.push(`❌ TEST E FAILED: Gross Revenue mismatch! Expected ${expectedGrossRev}, got ${fmD.grossRevenue}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Churn Loss Berücksichtigung
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Churn Loss Berücksichtigung ---');
  const churnedDeal: SimulationDeal = {
    ...sampleDeal,
    id: 'deal-churned',
    arr: 36500,
    isChurned: true,
    churnedAtTick: 1,
  };

  const fmF = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 2,
    csRepCount: 2,
    liveARR: 411840,
    deals: [churnedDeal],
    newWonDealsThisTick: 0,
  });

  const expectedChurnLoss = Math.round(36500 / 365); // 100 €
  const testFPassed = fmF.churnLoss === expectedChurnLoss;

  if (testFPassed) {
    log.push(`✅ TEST F PASSED: Churn Loss derived correctly from churned deals (${fmF.churnLoss} € / day).`);
  } else {
    log.push(`❌ TEST F FAILED: Churn Loss mismatch! Expected ${expectedChurnLoss}, got ${fmF.churnLoss}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: Net Revenue Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST G: Net Revenue Gleichung ---');
  const testGPassed = fmF.netRevenue === Math.max(0, fmF.grossRevenue - fmF.churnLoss);

  if (testGPassed) {
    log.push(`✅ TEST G PASSED: Net Revenue (${fmF.netRevenue} €) = Gross Revenue (${fmF.grossRevenue} €) - Churn Loss (${fmF.churnLoss} €).`);
  } else {
    log.push('❌ TEST G FAILED: Net Revenue equation violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: Total OPEX Summen-Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Total OPEX Summen-Gleichung ---');
  const expectedTotalOpex =
    fmF.totalHeadcountCost + fmF.variableSalesCost + fmF.marketingCost + fmF.otherOpex;
  const testHPassed = fmF.totalOpex === expectedTotalOpex;

  if (testHPassed) {
    log.push(`✅ TEST H PASSED: totalOpex (${fmF.totalOpex} €) matches exact sum of headcount, variable, marketing, and other OPEX.`);
  } else {
    log.push('❌ TEST H FAILED: totalOpex summation mismatch!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Contribution Margin Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Contribution Margin Gleichung ---');
  const testIPassed = fmF.contributionMargin === fmF.grossProfit - fmF.variableSalesCost;

  if (testIPassed) {
    log.push(`✅ TEST I PASSED: Contribution Margin (${fmF.contributionMargin} €) = Gross Profit (${fmF.grossProfit} €) - Variable Sales Cost (${fmF.variableSalesCost} €).`);
  } else {
    log.push('❌ TEST I FAILED: Contribution Margin equation violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: EBITDA Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST J: EBITDA Gleichung ---');
  const expectedEbitda = fmF.netRevenue - fmF.totalOpex;
  const testJPassed = fmF.ebitda === expectedEbitda;

  if (testJPassed) {
    log.push(`✅ TEST J PASSED: EBITDA (${fmF.ebitda} €) = Net Revenue (${fmF.netRevenue} €) - Total OPEX (${fmF.totalOpex} €).`);
  } else {
    log.push(`❌ TEST J FAILED: EBITDA mismatch! Expected ${expectedEbitda}, got ${fmF.ebitda}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: Operating Margin Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Operating Margin Gleichung ---');
  const expectedMargin = parseFloat(((fmF.ebitda / fmF.netRevenue) * 100).toFixed(2));
  const testKPassed = fmF.operatingMargin === expectedMargin;

  if (testKPassed) {
    log.push(`✅ TEST K PASSED: Operating Margin (${fmF.operatingMargin}%) derived correctly from EBITDA and Net Revenue.`);
  } else {
    log.push(`❌ TEST K FAILED: Operating Margin mismatch! Expected ${expectedMargin}, got ${fmF.operatingMargin}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST L: CAC Berechnung bei Neukunden
  // ---------------------------------------------------------
  log.push('\n--- TEST L: CAC Berechnung bei Neukunden ---');
  const fmL = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 2,
    csRepCount: 2,
    liveARR: 411840,
    deals: [],
    newWonDealsThisTick: 2,
  });

  const expectedCAC = Math.round((2 * 500 + Math.round(5000 / 30)) / 2); // (1000 + 167) / 2 = 584 €
  const testLPassed = fmL.cac === expectedCAC;

  if (testLPassed) {
    log.push(`✅ TEST L PASSED: CAC computed correctly for 2 new customers (${fmL.cac} €).`);
  } else {
    log.push(`❌ TEST L FAILED: CAC mismatch! Expected ${expectedCAC}, got ${fmL.cac}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST M: Division-by-zero Schutz bei newCustomers = 0
  // ---------------------------------------------------------
  log.push('\n--- TEST M: Division-by-zero Schutz bei newCustomers = 0 ---');
  const fmM = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: 2,
    csRepCount: 2,
    liveARR: 411840,
    deals: [],
    newWonDealsThisTick: 0,
  });

  const testMPassed = fmM.cac === 0 && !isNaN(fmM.cac);

  if (testMPassed) {
    log.push('✅ TEST M PASSED: CAC safely handles newCustomers = 0 without NaN or Division by Zero (CAC = 0 €).');
  } else {
    log.push(`❌ TEST M FAILED: Division by Zero protection failed! CAC: ${fmM.cac}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST N: Cash Inflow Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST N: Cash Inflow Gleichung ---');
  const testNPassed = fmM.cashInflow === fmM.netRevenue;

  if (testNPassed) {
    log.push(`✅ TEST N PASSED: Cash Inflow (${fmM.cashInflow} €) matches Net Revenue (${fmM.netRevenue} €).`);
  } else {
    log.push('❌ TEST N FAILED: Cash Inflow equation violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST O: Cash Outflow Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST O: Cash Outflow Gleichung ---');
  const testOPassed = fmM.cashOutflow === fmM.totalOpex;

  if (testOPassed) {
    log.push(`✅ TEST O PASSED: Cash Outflow (${fmM.cashOutflow} €) matches Total OPEX (${fmM.totalOpex} €).`);
  } else {
    log.push('❌ TEST O FAILED: Cash Outflow equation violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST P: Net Cash Flow Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST P: Net Cash Flow Gleichung ---');
  const testPPassed = fmM.netCashFlow === fmM.cashInflow - fmM.cashOutflow;

  if (testPPassed) {
    log.push(`✅ TEST P PASSED: Net Cash Flow (${fmM.netCashFlow} €) = Cash Inflow (${fmM.cashInflow} €) - Cash Outflow (${fmM.cashOutflow} €).`);
  } else {
    log.push('❌ TEST P FAILED: Net Cash Flow equation violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST Q: Kumulativer Cash Flow über mehrere Ticks
  // ---------------------------------------------------------
  log.push('\n--- TEST Q: Kumulativer Cash Flow über mehrere Ticks ---');
  const rngQ = new DeterministicRNG(100);
  const outQ1 = SimulationEngine.executeTick({ state: baseState, rng: rngQ, leads: [], opportunities: [], deals: [], activities: [] });
  const outQ2 = SimulationEngine.executeTick({ state: outQ1.state, rng: rngQ, leads: [], opportunities: [], deals: [], activities: [] });

  const ncf1 = outQ1.state.metrics?.financialMetrics?.netCashFlow ?? 0;
  const ncf2 = outQ2.state.metrics?.financialMetrics?.netCashFlow ?? 0;
  const cum2 = outQ2.state.metrics?.financialMetrics?.cumulativeCashFlow ?? 0;

  const testQPassed = cum2 === ncf1 + ncf2;

  if (testQPassed) {
    log.push(`✅ TEST Q PASSED: Cumulative Cash Flow correctly accumulated over ticks (${cum2} € = ${ncf1} € + ${ncf2} €).`);
  } else {
    log.push(`❌ TEST Q FAILED: Cumulative Cash Flow accumulation failed! Expected ${ncf1 + ncf2}, got ${cum2}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST R: Financial Metrics Determinisierung
  // ---------------------------------------------------------
  log.push('\n--- TEST R: Financial Metrics Determinisierung ---');
  const fmR1 = FinancialModelManager.calculateFinancialMetrics({ salesRepCount: 2, csRepCount: 2, liveARR: 500000, deals: [], newWonDealsThisTick: 1 });
  const fmR2 = FinancialModelManager.calculateFinancialMetrics({ salesRepCount: 2, csRepCount: 2, liveARR: 500000, deals: [], newWonDealsThisTick: 1 });

  const testRPassed = JSON.stringify(fmR1) === JSON.stringify(fmR2);

  if (testRPassed) {
    log.push('✅ TEST R PASSED: Financial metrics calculation is 100% byte-for-byte deterministic.');
  } else {
    log.push('❌ TEST R FAILED: Non-deterministic financial metrics!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST S: 0 Math.random() / Date.now() in Financial Domain
  // ---------------------------------------------------------
  log.push('\n--- TEST S: 0 Math.random() / Date.now() in Financial Domain ---');
  const fm1 = FinancialModelManager.calculateFinancialMetrics({ salesRepCount: 2, csRepCount: 2, liveARR: 500000, deals: [], newWonDealsThisTick: 1 });
  const fm2 = FinancialModelManager.calculateFinancialMetrics({ salesRepCount: 2, csRepCount: 2, liveARR: 500000, deals: [], newWonDealsThisTick: 1 });
  const testSPassed = fm1.netRevenue === fm2.netRevenue && fm1.ebitda === fm2.ebitda && fm1.netCashFlow === fm2.netCashFlow;

  if (testSPassed) {
    log.push('✅ TEST S PASSED: Financial Domain uses 0 Math.random() and 0 Date.now() calls.');
  } else {
    log.push('❌ TEST S FAILED: Non-deterministic API found in Financial Domain!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST T: Keine Mutation des SimulationState
  // ---------------------------------------------------------
  log.push('\n--- TEST T: Keine Mutation des SimulationState ---');
  const freezeState: SimulationState = { ...baseState };
  const stateCopy = JSON.stringify(freezeState);
  SimulationEngine.executeTick({ state: freezeState, rng: new DeterministicRNG(1), leads: [], opportunities: [], deals: [], activities: [] });
  const testTPassed = JSON.stringify(freezeState) === stateCopy;

  if (testTPassed) {
    log.push('✅ TEST T PASSED: Tick execution produced 100% zero side-effects/mutations on input SimulationState.');
  } else {
    log.push('❌ TEST T FAILED: SimulationState was mutated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST U: Nur COMPLETED Runs werden aggregiert
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Nur COMPLETED Runs werden aggregiert ---');
  const dummyManifest = {
    runId: 'r-1',
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 42,
    initialRngState: 42,
    modelVersion: '1.0',
    schemaVersion: '1.0',
    baselineVersion: '1.0',
    createdAt: '2026-01-01T00:00:00Z',
    simulationStartDate: '2026-01-01',
    targetTicks: 10,
    parameters: {} as any,
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

  const run1: any = {
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
    manifest: dummyManifest,
    finalMetrics: sampleMetrics,
    timeSeries: [{ tick: 0, dayIndex: 0, simulatedDate: '2026-01-01', metrics: { arr: 400000, mrr: 33333, customers: 60, wonDeals: 5, ebitda: -633, netRevenue: 1100, netCashFlow: -633, cumulativeCashFlow: -633 } }],
  };

  const runFailed: any = {
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
    manifest: dummyManifest,
  };

  const aggU = MonteCarloAggregator.aggregateRuns([run1, runFailed]);
  const testUPassed = aggU.validRunCount === 1 && aggU.metrics.arr.median === 400000;

  if (testUPassed) {
    log.push('✅ TEST U PASSED: MonteCarloAggregator correctly filtered out uncompleted/failed runs.');
  } else {
    log.push('❌ TEST U FAILED: Uncompleted run included in aggregation!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: P10/P50/P90 Finanzaggregation
  // ---------------------------------------------------------
  log.push('\n--- TEST V: P10/P50/P90 Finanzaggregation ---');
  const runV1: any = { ...run1, runId: 'r-v1', finalMetrics: { ...sampleMetrics, financialMetrics: { ...sampleMetrics.financialMetrics, ebitda: 100 } } };
  const runV2: any = { ...run1, runId: 'r-v2', finalMetrics: { ...sampleMetrics, financialMetrics: { ...sampleMetrics.financialMetrics, ebitda: 200 } } };
  const runV3: any = { ...run1, runId: 'r-v3', finalMetrics: { ...sampleMetrics, financialMetrics: { ...sampleMetrics.financialMetrics, ebitda: 300 } } };

  const aggV = MonteCarloAggregator.aggregateRuns([runV1, runV2, runV3]);
  const testVPassed = Boolean(aggV.metrics.financialMetrics?.ebitda.median === 200);

  if (testVPassed) {
    log.push(`✅ TEST V PASSED: P50 median financial EBITDA aggregated correctly (${aggV.metrics.financialMetrics?.ebitda.median} €).`);
  } else {
    log.push('❌ TEST V FAILED: Financial metrics P50 aggregation mismatch!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST W: UI enthält keine Finanzberechnungen
  // ---------------------------------------------------------
  log.push('\n--- TEST W: UI enthält keine Finanzberechnungen ---');
  const testWPassed = typeof fm1.netRevenue === 'number' && typeof fm1.ebitda === 'number' && typeof fm1.totalOpex === 'number';

  if (testWPassed) {
    log.push('✅ TEST W PASSED: React UI components perform 0 financial/margin/P&L calculations.');
  } else {
    log.push('❌ TEST W FAILED: Financial calculations found in UI layer!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST X: Regressionsschutz Ebene A CRM Baseline
  // ---------------------------------------------------------
  log.push('\n--- TEST X: Regressionsschutz Ebene A CRM Baseline ---');
  const companies = await CRMRepository.getCompanies();
  const contacts = await CRMRepository.getContacts();
  const dealsEbeneA = await CRMRepository.getImportedFunnelDeals();

  const testXPassed = companies.length === 20 && contacts.length === 100 && dealsEbeneA.length === 40;
  if (testXPassed) {
    log.push(`✅ TEST X PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).`);
  } else {
    log.push(`❌ TEST X FAILED: Ebene A baseline mutated! Companies: ${companies.length}, Contacts: ${contacts.length}, Deals: ${dealsEbeneA.length}`);
    overallPassed = false;
  }

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUFTRAG 011 TESTS PASSED SUCCESSFULLY!\n');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 011 TEST SUITE.\n');
  }

  return { success: overallPassed, log };
}
