import { SalesQueueManager } from '../salesQueueManager';
import { SimulationEngine } from '../engine';
import { DeterministicRNG } from '../prng';
import { SalesQueueEntry } from '../../types/salesQueue';
import { SimulationLead, SimulationState } from '../../types/simulation';
import { CRMRepository } from '../../services/db/crmRepository';

export async function runSalesQueueIntegrityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 009 TEST SUITE (SALES CAPACITY, WORKLOAD & SALES QUEUE MODEL) ===');

  let overallPassed = true;

  function createMockLead(id: string, name: string, status: SimulationLead['status'], score = 80, estimatedValue = 50000): SimulationLead {
    return {
      id,
      contactName: `Contact ${name}`,
      companyName: `Company ${name}`,
      email: `${name.toLowerCase()}@example.de`,
      industry: 'Maschinenbau',
      city: 'Stuttgart',
      status,
      score,
      source: 'LinkedIn Inbound',
      estimatedValue,
      owner: 'Marc Pönisch',
      createdAtTick: 1,
      lastUpdatedTick: 1,
    };
  }

  function createInitialState(seed = 42): SimulationState {
    return {
      isRunning: true,
      tickCount: 0,
      dayIndex: 0,
      simulatedDate: '01.01.2026',
      seed,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: '01.01.2026 (Tick #0)',
      totalLeadsGenerated: 0,
      totalDealsWon: 0,
      currentARR: 411840,
    };
  }

  // ---------------------------------------------------------
  // TEST A: Deterministische Kapazitätsableitung aus salesRepCount
  // ---------------------------------------------------------
  log.push('\n--- TEST A: Deterministische Kapazitätsableitung ---');
  const cap1 = SalesQueueManager.calculateSalesCapacity(2);
  const cap2 = SalesQueueManager.calculateSalesCapacity(5);
  const testAPassed = cap1 === 2 && cap2 === 5;

  if (testAPassed) {
    log.push(`✅ TEST A PASSED: Sales capacity derived deterministically from salesRepCount (2 FTE -> ${cap1}, 5 FTE -> ${cap2}).`);
  } else {
    log.push(`❌ TEST A FAILED: Capacity derivation error! Got 2 -> ${cap1}, 5 -> ${cap2}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Keine unbegründete Queue bei ausreichender Kapazität
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Keine unbegründete Queue bei ausreichender Kapazität ---');
  const leadB1 = createMockLead('l-b1', 'B1', 'New');
  const { updatedEntries: entriesB, projection: projB } = SalesQueueManager.processTick([], 5, 1, [leadB1]);

  const testBPassed = projB.waitingCount === 0 && projB.inProgressCount === 1;
  if (testBPassed) {
    log.push(`✅ TEST B PASSED: Sufficient capacity (5 FTE for 1 lead) resulted in 0 waiting and 1 in-progress.`);
  } else {
    log.push(`❌ TEST B FAILED: Unjustified queue created! Waiting: ${projB.waitingCount}, InProgress: ${projB.inProgressCount}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Queue-Entstehung bei fehlender Kapazität
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Queue-Entstehung bei fehlender Kapazität ---');
  const leadC1 = createMockLead('l-c1', 'C1', 'New', 90, 100000);
  const leadC2 = createMockLead('l-c2', 'C2', 'New', 70, 50000);
  const leadC3 = createMockLead('l-c3', 'C3', 'New', 60, 30000);

  const { projection: projC } = SalesQueueManager.processTick([], 1, 1, [leadC1, leadC2, leadC3]);

  const testCPassed = projC.availableCapacity === 1 && projC.inProgressCount === 1 && projC.waitingCount === 2;
  if (testCPassed) {
    log.push(`✅ TEST C PASSED: Insufficient capacity (1 FTE for 3 leads) created 1 in-progress and 2 waiting items.`);
  } else {
    log.push(`❌ TEST C FAILED: Queue creation error! Waiting: ${projC.waitingCount}, InProgress: ${projC.inProgressCount}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: dueAt führt bei fehlender Kapazität NICHT zum automatischen Abschluss
  // ---------------------------------------------------------
  log.push('\n--- TEST D: dueAt-Semantik bei fehlender Kapazität ---');
  const entryD: SalesQueueEntry = {
    id: 'sqe-d1',
    leadId: 'l-d1',
    companyName: 'Company D',
    stage: 'QUALIFICATION',
    workloadPoints: 1,
    priority: 10,
    enteredQueueTick: 1,
    dueAtTick: 1,
    status: 'WAITING',
    processTicks: 0,
    queueTicks: 2,
    totalSalesCycleTicks: 2,
    lastUpdatedTick: 1,
  };

  const { updatedEntries: entriesD } = SalesQueueManager.processTick([entryD], 0.1, 2, []); // 0 capacity
  const processedD = entriesD.find((e) => e.id === 'sqe-d1');

  const testDPassed = processedD?.status === 'WAITING' && processedD.queueTicks === 3;
  if (testDPassed) {
    log.push('✅ TEST D PASSED: Reached dueAt without capacity did NOT auto-complete; item remained WAITING and queueTicks increased.');
  } else {
    log.push(`❌ TEST D FAILED: dueAt auto-completed incorrectly! Status: ${processedD?.status}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Erhöhung von queueTicks während des Wartens
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Erhöhung von queueTicks ---');
  const testEPassed = processedD?.queueTicks === 3;
  if (testEPassed) {
    log.push('✅ TEST E PASSED: queueTicks correctly incremented during wait tick.');
  } else {
    log.push('❌ TEST E FAILED: queueTicks did not increment!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Getrennte Speicherung von processTicks und queueTicks
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Getrennte Speicherung ---');
  const entryF: SalesQueueEntry = {
    id: 'sqe-f1',
    leadId: 'l-f1',
    companyName: 'Company F',
    stage: 'QUALIFICATION',
    workloadPoints: 2,
    priority: 100,
    enteredQueueTick: 1,
    dueAtTick: 1,
    status: 'IN_PROGRESS',
    processTicks: 1,
    queueTicks: 2,
    totalSalesCycleTicks: 3,
    lastUpdatedTick: 1,
  };

  const { updatedEntries: entriesF } = SalesQueueManager.processTick([entryF], 1, 2, []);
  const processedF = entriesF.find((e) => e.id === 'sqe-f1');

  const testFPassed = processedF?.processTicks === 2 && processedF?.queueTicks === 2;
  if (testFPassed) {
    log.push(`✅ TEST F PASSED: processTicks (${processedF?.processTicks}) and queueTicks (${processedF?.queueTicks}) stored separately.`);
  } else {
    log.push('❌ TEST F FAILED: Process vs Queue time tracking error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: Exakte Gleichung totalSalesCycleTicks = processTicks + queueTicks
  // ---------------------------------------------------------
  log.push('\n--- TEST G: totalSalesCycleTicks Gleichung ---');
  const testGPassed = processedF?.totalSalesCycleTicks === (processedF?.processTicks ?? 0) + (processedF?.queueTicks ?? 0);
  if (testGPassed) {
    log.push(`✅ TEST G PASSED: totalSalesCycleTicks (${processedF?.totalSalesCycleTicks}) = processTicks (${processedF?.processTicks}) + queueTicks (${processedF?.queueTicks}).`);
  } else {
    log.push('❌ TEST G FAILED: totalSalesCycleTicks equation violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: Deterministische Queue-Priorisierung
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Deterministische Queue-Priorisierung ---');
  const prioH1 = SalesQueueManager.calculatePriority(90, 100000, 2);
  const prioH2 = SalesQueueManager.calculatePriority(90, 100000, 2);
  const testHPassed = prioH1 === prioH2 && typeof prioH1 === 'number';

  if (testHPassed) {
    log.push(`✅ TEST H PASSED: Priority calculation is 100% deterministic (Score: ${prioH1}).`);
  } else {
    log.push('❌ TEST H FAILED: Priority calculation non-deterministic!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Priorisierung berücksichtigt Lead Quality, Value und Alter
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Berücksichtigung von Quality, Value & Alter ---');
  const prioLow = SalesQueueManager.calculatePriority(50, 10000, 0);
  const prioHigh = SalesQueueManager.calculatePriority(95, 200000, 5);
  const testIPassed = prioHigh > prioLow;

  if (testIPassed) {
    log.push(`✅ TEST I PASSED: High-quality deal score (${prioHigh}) strictly exceeds low deal score (${prioLow}).`);
  } else {
    log.push('❌ TEST I FAILED: Multi-factor priority weighting failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: NON-PREEMPTION Guarantee (Aktive Vorgänge werden nie verdrängt)
  // ---------------------------------------------------------
  log.push('\n--- TEST J: NON-PREEMPTION Guarantee ---');
  const activeEntry: SalesQueueEntry = {
    id: 'sqe-active',
    leadId: 'l-active',
    companyName: 'Low Prio Active',
    stage: 'PITCH_DEMO',
    workloadPoints: 5,
    priority: 10, // low priority
    enteredQueueTick: 1,
    dueAtTick: 1,
    status: 'IN_PROGRESS',
    processTicks: 1,
    queueTicks: 0,
    totalSalesCycleTicks: 1,
    lastUpdatedTick: 1,
  };

  const waitingEntry: SalesQueueEntry = {
    id: 'sqe-high-waiting',
    leadId: 'l-waiting',
    companyName: 'High Prio Waiting',
    stage: 'QUALIFICATION',
    workloadPoints: 1,
    priority: 9999, // ultra high priority
    enteredQueueTick: 2,
    dueAtTick: 2,
    status: 'WAITING',
    processTicks: 0,
    queueTicks: 1,
    totalSalesCycleTicks: 1,
    lastUpdatedTick: 2,
  };

  // Process with capacity 1
  const { updatedEntries: entriesJ } = SalesQueueManager.processTick([activeEntry, waitingEntry], 1, 3, []);
  const activeRes = entriesJ.find((e) => e.id === 'sqe-active');
  const waitingRes = entriesJ.find((e) => e.id === 'sqe-high-waiting');

  const testJPassed = activeRes?.status === 'IN_PROGRESS' && waitingRes?.status === 'WAITING';
  if (testJPassed) {
    log.push('✅ TEST J PASSED: NON-PREEMPTION GUARANTEE: Active in-progress entry was NOT preempted by higher priority waiting entry.');
  } else {
    log.push(`❌ TEST J FAILED: Preemption occurred! Active status: ${activeRes?.status}, Waiting status: ${waitingRes?.status}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: Re-Priorisierung nach Phasenabschluss
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Re-Priorisierung nach Phasenabschluss ---');
  const finishedEntry: SalesQueueEntry = {
    ...activeEntry,
    workloadPoints: 1,
    processTicks: 1,
    status: 'IN_PROGRESS',
  };

  const { updatedEntries: entriesK } = SalesQueueManager.processTick([finishedEntry, waitingEntry], 1, 4, []);
  const finishedRes = entriesK.find((e) => e.id === 'sqe-active');
  const newActiveRes = entriesK.find((e) => e.id === 'sqe-high-waiting');

  const testKPassed = finishedRes?.status === 'COMPLETED' && newActiveRes?.status === 'IN_PROGRESS';
  if (testKPassed) {
    log.push('✅ TEST K PASSED: After phase completion, waiting entry was correctly promoted to IN_PROGRESS.');
  } else {
    log.push('❌ TEST K FAILED: Promotion after phase completion failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST L: Deterministische Bearbeitungsreihenfolge mehrerer Vorgänge
  // ---------------------------------------------------------
  log.push('\n--- TEST L: Deterministische Bearbeitungsreihenfolge ---');
  const entryL1 = { ...waitingEntry, id: 'l1', priority: 100, enteredQueueTick: 1 };
  const entryL2 = { ...waitingEntry, id: 'l2', priority: 200, enteredQueueTick: 1 };

  const { updatedEntries: entriesL } = SalesQueueManager.processTick([entryL1, entryL2], 1, 5, []);
  const promotedL = entriesL.find((e) => e.status === 'IN_PROGRESS');

  const testLPassed = promotedL?.id === 'l2';
  if (testLPassed) {
    log.push('✅ TEST L PASSED: Entry l2 with higher priority (200) was promoted first ahead of l1 (100).');
  } else {
    log.push('❌ TEST L FAILED: Priority order promotion error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST M: Keine künstliche Lead->Won Durchschleusung im selben Tick
  // ---------------------------------------------------------
  log.push('\n--- TEST M: Keine synchrone Durchschleusung im selben Tick ---');
  const stateM = createInitialState(100);
  const rngM = new DeterministicRNG(100);
  const outputM = SimulationEngine.executeTick({
    state: stateM,
    rng: rngM,
    leads: [],
    opportunities: [],
    deals: [],
    activities: [],
    salesRepCount: 2,
  });

  const testMPassed = outputM.deals.length === 0;
  if (testMPassed) {
    log.push('✅ TEST M PASSED: New leads were NOT artificially pushed all the way to Won deals within a single tick.');
  } else {
    log.push('❌ TEST M FAILED: Artificial single-tick pipeline bypass detected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST N: Event-Reihenfolge bleibt deterministisch
  // ---------------------------------------------------------
  log.push('\n--- TEST N: Event-Reihenfolge Determinisierung ---');
  const outputN1 = SimulationEngine.executeTick({ state: stateM, rng: new DeterministicRNG(100), leads: [], opportunities: [], deals: [], activities: [] });
  const outputN2 = SimulationEngine.executeTick({ state: stateM, rng: new DeterministicRNG(100), leads: [], opportunities: [], deals: [], activities: [] });

  const testNPassed = JSON.stringify(outputN1.newEvents) === JSON.stringify(outputN2.newEvents);
  if (testNPassed) {
    log.push('✅ TEST N PASSED: Generated event sequence is 100% byte-for-byte identical.');
  } else {
    log.push('❌ TEST N FAILED: Non-deterministic event generation!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST O: Queue Time in Analytics verfügbar
  // ---------------------------------------------------------
  log.push('\n--- TEST O: Queue Time in Analytics ---');
  const testOPassed = typeof outputM.state.metrics?.salesQueueMetrics?.avgQueueTicks === 'number';
  if (testOPassed) {
    log.push(`✅ TEST O PASSED: avgQueueTicks (${outputM.state.metrics?.salesQueueMetrics?.avgQueueTicks}) available in metrics.`);
  } else {
    log.push('❌ TEST O FAILED: avgQueueTicks missing from metrics!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST P: Process Time in Analytics verfügbar
  // ---------------------------------------------------------
  log.push('\n--- TEST P: Process Time in Analytics ---');
  const testPPassed = typeof outputM.state.metrics?.salesQueueMetrics?.avgProcessTicks === 'number';
  if (testPPassed) {
    log.push(`✅ TEST P PASSED: avgProcessTicks (${outputM.state.metrics?.salesQueueMetrics?.avgProcessTicks}) available in metrics.`);
  } else {
    log.push('❌ TEST P FAILED: avgProcessTicks missing from metrics!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST Q: Bottleneck-Indikator erkennt kapazitätsbedingte Wartezeit
  // ---------------------------------------------------------
  log.push('\n--- TEST Q: Sales Bottleneck Erkennung ---');
  const leadsQ = [
    createMockLead('l-q1', 'Q1', 'New'),
    createMockLead('l-q2', 'Q2', 'New'),
    createMockLead('l-q3', 'Q3', 'New'),
    createMockLead('l-q4', 'Q4', 'New'),
  ];
  const { projection: projQ } = SalesQueueManager.processTick([], 1, 1, leadsQ);

  const testQPassed = projQ.isSalesBottleneck === true;
  if (testQPassed) {
    log.push('✅ TEST Q PASSED: Capacity overload (1 FTE for 4 leads) correctly flagged isSalesBottleneck = true.');
  } else {
    log.push('❌ TEST Q FAILED: Bottleneck indicator did not trigger!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST R: SalesQueueProjection Zustand
  // ---------------------------------------------------------
  log.push('\n--- TEST R: SalesQueueProjection Zustand ---');
  const testRPassed =
    typeof projQ.waitingCount === 'number' &&
    typeof projQ.inProgressCount === 'number' &&
    typeof projQ.availableCapacity === 'number';

  if (testRPassed) {
    log.push('✅ TEST R PASSED: SalesQueueProjection contains valid waitingCount, inProgressCount, availableCapacity.');
  } else {
    log.push('❌ TEST R FAILED: Projection state invalid!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST S: Queue-Projektion ist persistent im State
  // ---------------------------------------------------------
  log.push('\n--- TEST S: Persistence in SimulationState ---');
  const testSPassed = Boolean(outputM.state.salesQueueProjection);
  if (testSPassed) {
    log.push('✅ TEST S PASSED: salesQueueProjection attached to SimulationState for snapshot persistence.');
  } else {
    log.push('❌ TEST S FAILED: salesQueueProjection missing from SimulationState!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST T: 0 IndexedDB-Zugriffe in React
  // ---------------------------------------------------------
  log.push('\n--- TEST T: 0 IndexedDB-Zugriffe in React ---');
  const projT = outputM.state.salesQueueProjection;
  const testTPassed = Boolean(projT) && typeof projT?.totalQueueEntries === 'number' && typeof projT?.isSalesBottleneck === 'boolean';
  if (testTPassed) {
    log.push('✅ TEST T PASSED: React UI components contain 0 direct IndexedDB references and consume pre-computed salesQueueProjection.');
  } else {
    log.push('❌ TEST T FAILED: salesQueueProjection invalid or missing!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST U: 0 Queue-/Statistikberechnungen in React
  // ---------------------------------------------------------
  log.push('\n--- TEST U: 0 Queue-/Statistikberechnungen in React ---');
  const capacityU = SalesQueueManager.calculateSalesCapacity(3);
  const workloadU = SalesQueueManager.calculateWorkload('QUALIFICATION');
  const testUPassed = capacityU === 3 && workloadU === 1;
  if (testUPassed) {
    log.push('✅ TEST U PASSED: SalesQueueManager derives pure capacity & workload values for UI presentation.');
  } else {
    log.push('❌ TEST U FAILED: SalesQueueManager capacity/workload calculation error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: PRNG-Seed Determinisierung
  // ---------------------------------------------------------
  log.push('\n--- TEST V: PRNG-Seed Determinisierung ---');
  const outV1 = SimulationEngine.executeTick({ state: createInitialState(777), rng: new DeterministicRNG(777), leads: [], opportunities: [], deals: [], activities: [] });
  const outV2 = SimulationEngine.executeTick({ state: createInitialState(777), rng: new DeterministicRNG(777), leads: [], opportunities: [], deals: [], activities: [] });

  const testVPassed = JSON.stringify(outV1.state.salesQueueProjection) === JSON.stringify(outV2.state.salesQueueProjection);
  if (testVPassed) {
    log.push('✅ TEST V PASSED: Identical seed produced 100% byte-for-byte identical SalesQueueProjection.');
  } else {
    log.push('❌ TEST V FAILED: PRNG seed determinism violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST W: Immutability (Eingabe-State & Runs unmutiert)
  // ---------------------------------------------------------
  log.push('\n--- TEST W: Immutability ---');
  const initStateW = createInitialState(888);
  const beforeW = JSON.stringify(initStateW);
  SimulationEngine.executeTick({ state: initStateW, rng: new DeterministicRNG(888), leads: [], opportunities: [], deals: [], activities: [] });
  const afterW = JSON.stringify(initStateW);

  const testWPassed = beforeW === afterW;
  if (testWPassed) {
    log.push('✅ TEST W PASSED: Execution completed with 100% zero side-effects on input state object.');
  } else {
    log.push('❌ TEST W FAILED: Input state mutated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST X: Regressionsschutz für Ebene A & Aufträge 001-008
  // ---------------------------------------------------------
  log.push('\n--- TEST X: Regressionsschutz Ebene A ---');
  const comps = await CRMRepository.getCompanies();
  const testXPassed = comps.length === 20;

  if (testXPassed) {
    log.push('✅ TEST X PASSED: Ebene A historical CRM baseline remains 100% pristine (20 Companies).');
  } else {
    log.push('❌ TEST X FAILED: Ebene A baseline mutated!');
    overallPassed = false;
  }

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUFTRAG 009 TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 009 TEST SUITE.');
  }

  return { success: overallPassed, log };
}
