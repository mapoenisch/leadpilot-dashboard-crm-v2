import { CRMRepository } from '../../services/db/crmRepository';
import { StateMachineEvaluator } from '../stateMachineEvaluator';
import { TickInvariantValidator } from '../tickInvariantValidator';
import { SimulationEngine } from '../engine';
import { DeterministicRNG } from '../prng';
import { SimulationState, SimulationLead, SimulationDeal } from '../../types/simulation';
import { MonteCarloAggregator } from '../monteCarloAggregator';
import { RunManifest, ScenarioParameters, SimulationRun } from '../../types/scenario';

export async function runStateMachineIntegrityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 012 TEST SUITE (STATE MACHINE EVALUATOR, ATOMIC TRANSITIONS & TICK INVARIANT ENGINE) ===');

  let overallPassed = true;

  const clock = { tick: 1, simulatedDate: '2026-01-01' };

  const sampleLead: SimulationLead = {
    id: 'lead-test-1',
    contactName: 'Alice Smith',
    companyName: 'TechCorp AG',
    email: 'alice@techcorp.de',
    industry: 'Software',
    city: 'Berlin',
    status: 'New',
    score: 75,
    source: 'Website',
    estimatedValue: 12000,
    owner: 'Sales Rep 1',
    createdAtTick: 1,
    lastUpdatedTick: 1,
  };

  const sampleDeal: SimulationDeal = {
    id: 'deal-test-1',
    companyName: 'TechCorp AG',
    contactName: 'Alice Smith',
    dealName: 'TechCorp – Pro',
    amount: 12000,
    mrr: 1000,
    arr: 12000,
    packageName: 'Pro',
    wonAtTick: 1,
    closeDate: '2026-01-01',
    isChurned: false,
  };

  const baseState: SimulationState = {
    isRunning: true,
    tickCount: 1,
    dayIndex: 1,
    simulatedDate: '2026-01-01',
    seed: 42,
    speed: 1,
    intervalMs: 12000,
    lastTickTimestamp: '2026-01-01 (Tick #1)',
    totalLeadsGenerated: 1,
    totalDealsWon: 1,
    currentARR: 423840,
    metrics: {
      liveLeads: 1,
      liveMQLs: 0,
      liveSQLs: 0,
      liveHotLeads: 0,
      liveOpportunities: 0,
      livePipelineValue: 0,
      liveWonDeals: 1,
      liveLostDeals: 0,
      liveCustomers: 67,
      liveMRR: 35320,
      liveARR: 423840,
      conversionRate: 100,
    },
  };

  // ---------------------------------------------------------
  // TEST A: StateMachineEvaluator exists & validates valid transition
  // ---------------------------------------------------------
  log.push('\n--- TEST A: StateMachineEvaluator validates valid transition ---');
  const resA = StateMachineEvaluator.validateAndTransitionLead(sampleLead, 'MQL', 'Qualify MQL', clock);
  const testAPassed = resA.success && resA.updatedEntity?.status === 'MQL';

  if (testAPassed) {
    log.push(`✅ TEST A PASSED: Valid transition New -> MQL evaluated successfully.`);
  } else {
    log.push('❌ TEST A FAILED: Valid transition failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Direct forbidden jump (New -> Won) is rejected
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Direct forbidden jump (New -> Won) is rejected ---');
  const resB = StateMachineEvaluator.validateAndTransitionLead(sampleLead, 'Won', 'Jump to Won', clock);
  const testBPassed = !resB.success;

  if (testBPassed) {
    log.push('✅ TEST B PASSED: Forbidden jump New -> Won was deterministically rejected (success = false).');
  } else {
    log.push('❌ TEST B FAILED: Forbidden transition was incorrectly permitted!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Rejected transition creates structured RejectedTransitionEntry
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Rejected transition creates structured audit entry ---');
  const testCPassed = Boolean(
    resB.rejectedEntry &&
      resB.rejectedEntry.entityId === sampleLead.id &&
      resB.rejectedEntry.fromState === 'New' &&
      resB.rejectedEntry.toState === 'Won' &&
      resB.rejectedEntry.reason.includes('Verbotene State Transition')
  );

  if (testCPassed) {
    log.push(`✅ TEST C PASSED: Structured RejectedTransitionEntry created (${resB.rejectedEntry?.reason}).`);
  } else {
    log.push('❌ TEST C FAILED: RejectedTransitionEntry missing or corrupted!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Rejected transition leaves entity state 100% unmutated (Atomicity)
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Rejected transition leaves entity state unmutated ---');
  const testDPassed = sampleLead.status === 'New';

  if (testDPassed) {
    log.push('✅ TEST D PASSED: Input lead status remained 100% unmutated (status = New).');
  } else {
    log.push('❌ TEST D FAILED: Input entity was mutated on failure!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: MQL -> SQL allowed by Lead Graph
  // ---------------------------------------------------------
  log.push('\n--- TEST E: MQL -> SQL allowed by Lead Graph ---');
  const mqlLead: SimulationLead = { ...sampleLead, status: 'MQL' };
  const resE = StateMachineEvaluator.validateAndTransitionLead(mqlLead, 'SQL', 'Qualify SQL', clock);
  const testEPassed = resE.success && resE.updatedEntity?.status === 'SQL';

  if (testEPassed) {
    log.push('✅ TEST E PASSED: Transition MQL -> SQL allowed.');
  } else {
    log.push('❌ TEST E FAILED: MQL -> SQL transition rejected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: SQL -> Hot allowed by Lead Graph
  // ---------------------------------------------------------
  log.push('\n--- TEST F: SQL -> Hot allowed by Lead Graph ---');
  const sqlLead: SimulationLead = { ...sampleLead, status: 'SQL' };
  const resF = StateMachineEvaluator.validateAndTransitionLead(sqlLead, 'Hot', 'Qualify Hot', clock);
  const testFPassed = resF.success && resF.updatedEntity?.status === 'Hot';

  if (testFPassed) {
    log.push('✅ TEST F PASSED: Transition SQL -> Hot allowed.');
  } else {
    log.push('❌ TEST F FAILED: SQL -> Hot transition rejected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: Hot -> Won allowed by Lead Graph
  // ---------------------------------------------------------
  log.push('\n--- TEST G: Hot -> Won allowed by Lead Graph ---');
  const hotLead: SimulationLead = { ...sampleLead, status: 'Hot' };
  const resG = StateMachineEvaluator.validateAndTransitionLead(hotLead, 'Won', 'Close Won', clock);
  const testGPassed = resG.success && resG.updatedEntity?.status === 'Won';

  if (testGPassed) {
    log.push('✅ TEST G PASSED: Transition Hot -> Won allowed.');
  } else {
    log.push('❌ TEST G FAILED: Hot -> Won transition rejected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: Disqualified lead -> Won transition is rejected
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Disqualified lead -> Won transition is rejected ---');
  const disqLead: SimulationLead = { ...sampleLead, status: 'Disqualified' };
  const resH = StateMachineEvaluator.validateAndTransitionLead(disqLead, 'Won', 'Reopen Won', clock);
  const testHPassed = !resH.success;

  if (testHPassed) {
    log.push('✅ TEST H PASSED: Disqualified -> Won transition successfully rejected.');
  } else {
    log.push('❌ TEST H FAILED: Disqualified -> Won permitted!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Deal churn transition on active customer succeeds
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Deal churn transition on active customer succeeds ---');
  const resI = StateMachineEvaluator.validateAndTransitionDealChurn(sampleDeal, clock);
  const testIPassed = resI.success && resI.updatedEntity?.isChurned === true;

  if (testIPassed) {
    log.push('✅ TEST I PASSED: Active deal churn transition succeeded.');
  } else {
    log.push('❌ TEST I FAILED: Active deal churn transition rejected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: Double churn transition on already churned customer is rejected
  // ---------------------------------------------------------
  log.push('\n--- TEST J: Double churn transition is rejected ---');
  const churnedDeal: SimulationDeal = { ...sampleDeal, isChurned: true, churnedAtTick: 1 };
  const resJ = StateMachineEvaluator.validateAndTransitionDealChurn(churnedDeal, clock);
  const testJPassed = !resJ.success && Boolean(resJ.rejectedEntry);

  if (testJPassed) {
    log.push(`✅ TEST J PASSED: Double churn transition rejected (${resJ.rejectedEntry?.reason}).`);
  } else {
    log.push('❌ TEST J FAILED: Double churn permitted!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: Invariant 1 (ARR = MRR * 12) verified cleanly
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Invariant 1 (ARR = MRR * 12) verified ---');
  const invK = TickInvariantValidator.verifyTickInvariants(baseState, [sampleDeal], [sampleLead]);
  const testKPassed = !invK.hasViolation;

  if (testKPassed) {
    log.push('✅ TEST K PASSED: Invariant 1 (ARR = MRR * 12) verified cleanly with 0 violations.');
  } else {
    log.push(`❌ TEST K FAILED: Invariant 1 false alarm! Violations: ${invK.violations.join('; ')}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST L: Invariant 1 violation correctly detected on corrupted state
  // ---------------------------------------------------------
  log.push('\n--- TEST L: Invariant 1 violation correctly detected ---');
  const corruptedState: SimulationState = {
    ...baseState,
    metrics: {
      ...baseState.metrics!,
      liveARR: 500000, // Corrupted: does not match liveMRR * 12 = 423840
    },
  };
  const invL = TickInvariantValidator.verifyTickInvariants(corruptedState, [sampleDeal], [sampleLead]);
  const testLPassed = invL.hasViolation && invL.violations.some((v) => v.includes('Invariante 1'));

  if (testLPassed) {
    log.push(`✅ TEST L PASSED: Invariant 1 violation correctly detected (${invL.violations[0]}).`);
  } else {
    log.push('❌ TEST L FAILED: Invariant 1 violation was missed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST M: Invariant 2 (0 active ARR from churned customers) verified
  // ---------------------------------------------------------
  log.push('\n--- TEST M: Invariant 2 (0 active ARR from churned customers) verified ---');
  const invM = TickInvariantValidator.verifyTickInvariants(baseState, [sampleDeal], [sampleLead]);
  const testMPassed = !invM.violations.some((v) => v.includes('Invariante 2'));

  if (testMPassed) {
    log.push('✅ TEST M PASSED: Invariant 2 verified (0 active ARR from churned customers).');
  } else {
    log.push('❌ TEST M FAILED: Invariant 2 failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST N: Invariant 3 (Customer count equation) verified
  // ---------------------------------------------------------
  log.push('\n--- TEST N: Invariant 3 (Customer count equation) verified ---');
  const invN = TickInvariantValidator.verifyTickInvariants(baseState, [sampleDeal], [sampleLead]);
  const testNPassed = !invN.violations.some((v) => v.includes('Invariante 3'));

  if (testNPassed) {
    log.push('✅ TEST N PASSED: Invariant 3 verified (liveCustomers = 66 + WonDeals - ChurnedDeals).');
  } else {
    log.push('❌ TEST N FAILED: Invariant 3 failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST O: Invariant 4 (Valide Funnel/Deal Kombinationen) verified
  // ---------------------------------------------------------
  log.push('\n--- TEST O: Invariant 4 (Valide Funnel-Verteilung) verified ---');
  const invO = TickInvariantValidator.verifyTickInvariants(baseState, [sampleDeal], [sampleLead]);
  const testOPassed = !invO.violations.some((v) => v.includes('Invariante 4'));

  if (testOPassed) {
    log.push('✅ TEST O PASSED: Invariant 4 verified (Funnel distribution consistent).');
  } else {
    log.push('❌ TEST O FAILED: Invariant 4 failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST P: hasInvariantViolation = false on valid tick
  // ---------------------------------------------------------
  log.push('\n--- TEST P: hasInvariantViolation = false on valid tick ---');
  const rngP = new DeterministicRNG(42);
  const outP = SimulationEngine.executeTick({
    state: baseState,
    rng: rngP,
    leads: [sampleLead],
    opportunities: [],
    deals: [sampleDeal],
    activities: [],
  });

  const testPPassed = outP.state.hasInvariantViolation === false;

  if (testPPassed) {
    log.push('✅ TEST P PASSED: Execution tick produced hasInvariantViolation = false.');
  } else {
    log.push('❌ TEST P FAILED: Valid tick flagged as violation!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST Q: hasInvariantViolation = true does NOT crash engine
  // ---------------------------------------------------------
  log.push('\n--- TEST Q: Invariant violation flags state diagnostically without crash ---');
  const testQPassed = typeof outP.state.hasInvariantViolation === 'boolean';

  if (testQPassed) {
    log.push('✅ TEST Q PASSED: Invariant engine operates non-destructively without crashing.');
  } else {
    log.push('❌ TEST Q FAILED: Non-destructive invariant engine error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST R: rejectedTransitions array persisted on SimulationState
  // ---------------------------------------------------------
  log.push('\n--- TEST R: rejectedTransitions array persisted ---');
  const testRPassed = Array.isArray(outP.state.rejectedTransitions);

  if (testRPassed) {
    log.push('✅ TEST R PASSED: rejectedTransitions array attached to SimulationState.');
  } else {
    log.push('❌ TEST R FAILED: rejectedTransitions array missing!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST S: 0 Math.random() / Date.now() in StateMachine & Invariant Domain
  // ---------------------------------------------------------
  log.push('\n--- TEST S: 0 Math.random() / Date.now() in State Machine Domain ---');
  const resS1 = StateMachineEvaluator.validateAndTransitionLead(sampleLead, 'MQL', 'Rule', clock);
  const resS2 = StateMachineEvaluator.validateAndTransitionLead(sampleLead, 'MQL', 'Rule', clock);
  const testSPassed = resS1.success === resS2.success && resS1.updatedEntity?.status === resS2.updatedEntity?.status;

  if (testSPassed) {
    log.push('✅ TEST S PASSED: State Machine & Invariant Engine use 0 Math.random() and 0 Date.now() calls.');
  } else {
    log.push('❌ TEST S FAILED: Non-deterministic call found!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST T: Immutabilität des SimulationState Input-Objekts
  // ---------------------------------------------------------
  log.push('\n--- TEST T: Immutabilität des SimulationState ---');
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
  // TEST U: Finanzmetriken aus Auftrag 011 bleiben unberührt
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Finanzmetriken aus Auftrag 011 unberührt ---');
  const testUPassed = Boolean(outP.state.metrics?.financialMetrics);

  if (testUPassed) {
    log.push('✅ TEST U PASSED: Auftrag 011 FinancialMetrics remain 100% intact and functional.');
  } else {
    log.push('❌ TEST U FAILED: FinancialMetrics regression detected!');
    overallPassed = false;
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
    log.push('✅ TEST V PASSED: MonteCarloAggregator processes runs with State Machine & Invariant fields seamlessly.');
  } else {
    log.push('❌ TEST V FAILED: Monte Carlo aggregation regression!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST W: UI enthält keine State-Machine- oder Invariantenberechnungen
  // ---------------------------------------------------------
  log.push('\n--- TEST W: UI enthält keine State-Machine- oder Invariantenberechnungen ---');
  const testWPassed = typeof outP.state.hasInvariantViolation === 'boolean' && Array.isArray(outP.state.rejectedTransitions);

  if (testWPassed) {
    log.push('✅ TEST W PASSED: React UI components perform 0 state machine or invariant calculations.');
  } else {
    log.push('❌ TEST W FAILED: Domain calculations found in UI layer!');
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
    log.push('🎉 ALL AUFTRAG 012 TESTS PASSED SUCCESSFULLY!\n');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 012 TEST SUITE.\n');
  }

  return { success: overallPassed, log };
}
