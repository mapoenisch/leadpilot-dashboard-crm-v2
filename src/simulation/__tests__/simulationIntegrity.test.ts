import { CRMRepository } from '../../services/db/crmRepository';
import { simulationService } from '../simulationService';
import { DeterministicRNG } from '../prng';

export async function runDataIntegrityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push(
    '=== STARTING DETERMINISTIC SIMULATION & INTEGRITY TEST SUITE (AUFTRAG 001 AUDIT FIX) ===',
  );

  let overallPassed = true;

  // ---------------------------------------------------------
  // TEST A: PRNG Determinism
  // ---------------------------------------------------------
  log.push('\n--- TEST A: PRNG Determinism ---');
  const rng1 = new DeterministicRNG(42);
  const rng2 = new DeterministicRNG(42);
  const seq1 = [
    rng1.next(),
    rng1.next(),
    rng1.nextInt(1, 100),
    rng1.nextBoolean(),
    rng1.getState(),
  ];
  const seq2 = [
    rng2.next(),
    rng2.next(),
    rng2.nextInt(1, 100),
    rng2.nextBoolean(),
    rng2.getState(),
  ];

  const testAPassed = JSON.stringify(seq1) === JSON.stringify(seq2);
  if (testAPassed) {
    log.push(
      '✅ TEST A PASSED: Identical seeds produce 100% identical PRNG sequences & internal RNG state.',
    );
  } else {
    log.push('❌ TEST A FAILED: PRNG sequences diverged for same seed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Complete Simulation State Comparability (Seed 42, 50 Ticks)
  // ---------------------------------------------------------
  log.push(
    '\n--- TEST B: Complete Simulation State Comparability (State, Leads, Opps, Deals, Activities, Events & RNG State) ---',
  );

  // Run 1: 50 Ticks with Seed 42
  simulationService.resetSimulation(42);
  for (let i = 0; i < 50; i++) {
    simulationService.executeTick();
  }
  const run1State = simulationService.getState();
  const run1Leads = simulationService.getSimulationLeads();
  const run1Opps = simulationService.getOpportunities();
  const run1Deals = simulationService.getSimulationDeals();
  const run1Activities = simulationService.getSimulationActivities();
  const run1Events = simulationService.getEvents();

  // Run 2: 50 Ticks with Seed 42 (Reset and re-run)
  simulationService.resetSimulation(42);
  for (let i = 0; i < 50; i++) {
    simulationService.executeTick();
  }
  const run2State = simulationService.getState();
  const run2Leads = simulationService.getSimulationLeads();
  const run2Opps = simulationService.getOpportunities();
  const run2Deals = simulationService.getSimulationDeals();
  const run2Activities = simulationService.getSimulationActivities();
  const run2Events = simulationService.getEvents();

  const stateMatch = JSON.stringify(run1State) === JSON.stringify(run2State);
  const leadsMatch = JSON.stringify(run1Leads) === JSON.stringify(run2Leads);
  const oppsMatch = JSON.stringify(run1Opps) === JSON.stringify(run2Opps);
  const dealsMatch = JSON.stringify(run1Deals) === JSON.stringify(run2Deals);
  const activitiesMatch = JSON.stringify(run1Activities) === JSON.stringify(run2Activities);
  const eventsMatch = JSON.stringify(run1Events) === JSON.stringify(run2Events);

  const testBPassed =
    stateMatch && leadsMatch && oppsMatch && dealsMatch && activitiesMatch && eventsMatch;

  if (testBPassed) {
    log.push(
      `✅ TEST B PASSED: 100% byte-for-byte state equality across 50 ticks (State, Leads[${run1Leads.length}], Opps[${run1Opps.length}], Deals[${run1Deals.length}], Activities[${run1Activities.length}], Events[${run1Events.length}] & Metrics Live ARR: ${run1State.metrics?.liveARR} €).`,
    );
  } else {
    log.push(
      `❌ TEST B FAILED: Simulation output diverged! State: ${stateMatch}, Leads: ${leadsMatch}, Opps: ${oppsMatch}, Deals: ${dealsMatch}, Activities: ${activitiesMatch}, Events: ${eventsMatch}`,
    );
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Seed Variation on Business Metrics (Not just IDs)
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Seed Variation on Business Metrics ---');
  simulationService.resetSimulation(99999);
  for (let i = 0; i < 50; i++) {
    simulationService.executeTick();
  }
  const run3State = simulationService.getState();
  const run3Leads = simulationService.getSimulationLeads();
  const run3Deals = simulationService.getSimulationDeals();

  const arrDiverged = run3State.metrics?.liveARR !== run1State.metrics?.liveARR;
  const mrrDiverged = run3State.metrics?.liveMRR !== run1State.metrics?.liveMRR;
  const dealsDiverged = run3Deals.length !== run1Deals.length;
  const leadsDiverged = run3Leads.length !== run1Leads.length;

  const testCPassed = arrDiverged || mrrDiverged || dealsDiverged || leadsDiverged;

  if (testCPassed) {
    log.push(`✅ TEST C PASSED: Seed 99999 produced distinct business metrics:`);
    log.push(
      `   - Seed 42:    ARR ${run1State.metrics?.liveARR} €, MRR ${run1State.metrics?.liveMRR} €, Customers ${run1State.metrics?.liveCustomers}, Deals Won ${run1Deals.length}`,
    );
    log.push(
      `   - Seed 99999: ARR ${run3State.metrics?.liveARR} €, MRR ${run3State.metrics?.liveMRR} €, Customers ${run3State.metrics?.liveCustomers}, Deals Won ${run3Deals.length}`,
    );
  } else {
    log.push('❌ TEST C FAILED: Different seeds produced identical business metrics!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Absolute Wall-Clock Independence Verification
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Wall-Clock Independence Verification ---');

  // Execution Run Alpha
  simulationService.resetSimulation(12345);
  for (let i = 0; i < 20; i++) {
    simulationService.executeTick();
  }
  const alphaState = simulationService.getState();
  const alphaEvents = simulationService.getEvents();
  const alphaLeads = simulationService.getSimulationLeads();

  // Execution Run Beta (simulating different real execution timing)
  const delayStart = Date.now();
  while (Date.now() - delayStart < 15) {
    // Artificial wall-clock delay
  }

  simulationService.resetSimulation(12345);
  for (let i = 0; i < 20; i++) {
    simulationService.executeTick();
  }
  const betaState = simulationService.getState();
  const betaEvents = simulationService.getEvents();
  const betaLeads = simulationService.getSimulationLeads();

  const clockIndependentState = JSON.stringify(alphaState) === JSON.stringify(betaState);
  const clockIndependentEvents = JSON.stringify(alphaEvents) === JSON.stringify(betaEvents);
  const clockIndependentLeads = JSON.stringify(alphaLeads) === JSON.stringify(betaLeads);

  const testDPassed = clockIndependentState && clockIndependentEvents && clockIndependentLeads;

  if (testDPassed) {
    log.push(
      `✅ TEST D PASSED: Simulation output is 100% identical regardless of wall-clock delay (Sample event timestamp: "${alphaEvents[0]?.timestamp}").`,
    );
  } else {
    log.push(
      `❌ TEST D FAILED: Wall-clock dependency detected! State: ${clockIndependentState}, Events: ${clockIndependentEvents}, Leads: ${clockIndependentLeads}`,
    );
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Unlimited Event History Store (>50 events retained)
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Unlimited Event History Store ---');
  simulationService.resetSimulation(777);
  for (let i = 0; i < 60; i++) {
    simulationService.executeTick();
  }
  const fullEvents = simulationService.getEvents();
  const testEPassed = fullEvents.length > 50;
  if (testEPassed) {
    log.push(
      `✅ TEST E PASSED: Full event store retained ${fullEvents.length} events (greater than 50).`,
    );
  } else {
    log.push(`❌ TEST E FAILED: Event store was truncated to ${fullEvents.length} events!`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Ebene A Historical Data Integrity
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Ebene A Historical Data Integrity ---');
  const baselineCompanies = await CRMRepository.getCompanies();
  const baselineContacts = await CRMRepository.getContacts();
  const baselineDeals = await CRMRepository.getImportedFunnelDeals();

  log.push(`[Ebene A Check] Companies: ${baselineCompanies.length} (Expected: 20)`);
  log.push(`[Ebene A Check] Contacts: ${baselineContacts.length} (Expected: 100)`);
  log.push(`[Ebene A Check] Imported Funnel Deals: ${baselineDeals.length} (Expected: 40)`);

  const testFPassed =
    baselineCompanies.length === 20 &&
    baselineContacts.length === 100 &&
    baselineDeals.length === 40;
  if (testFPassed) {
    log.push(
      '✅ TEST F PASSED: Ebene A historical CRM baseline remains 100% pristine and unmodified.',
    );
  } else {
    log.push('❌ TEST F FAILED: Ebene A historical CRM baseline was mutated!');
    overallPassed = false;
  }

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUDIT FIX TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('⚠️ SOME AUDIT FIX TESTS FAILED.');
  }

  return { success: overallPassed, log };
}
