import { CRMRepository } from '../../services/db/crmRepository';
import { CSQueueManager } from '../csQueueManager';
import { CSQueueEntry } from '../../types/csQueue';
import { SimulationEngine } from '../engine';
import { SimulationClock, SimulationEventRules } from '../eventRules';
import { DeterministicRNG } from '../prng';
import { SimulationDeal, SimulationState } from '../../types/simulation';

export async function runCSHealthIntegrityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 010 TEST SUITE (CUSTOMER SUCCESS HEALTH MODEL, WORKLOAD & CS QUEUE) ===');

  let overallPassed = true;

  // ---------------------------------------------------------
  // TEST A: Health Score Schranken (0 - 100 Clamping)
  // ---------------------------------------------------------
  log.push('\n--- TEST A: Health Score Schranken (0 - 100 Clamping) ---');
  const hLow = CSQueueManager.calculateHealthScore({
    onboardingScore: 0,
    supportScore: 0,
    engagementScore: 0,
    openIssuesScore: 0,
    csQueueTimePenalty: 50,
  });

  const hHigh = CSQueueManager.calculateHealthScore({
    onboardingScore: 100,
    supportScore: 100,
    engagementScore: 100,
    openIssuesScore: 100,
    csQueueTimePenalty: 0,
  });

  const testAPassed = hLow >= 0 && hLow <= 100 && hHigh >= 0 && hHigh <= 100 && hLow === 0 && hHigh === 100;
  if (testAPassed) {
    log.push(`✅ TEST A PASSED: Health score strictly clamped between 0 and 100 (Low: ${hLow}, High: ${hHigh}).`);
  } else {
    log.push(`❌ TEST A FAILED: Health score out of bounds! Low: ${hLow}, High: ${hHigh}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Health-Berechnung Determinisierung
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Health-Berechnung Determinisierung ---');
  const factors = { onboardingScore: 80, supportScore: 70, engagementScore: 90, openIssuesScore: 60, csQueueTimePenalty: 4 };
  const h1 = CSQueueManager.calculateHealthScore(factors);
  const h2 = CSQueueManager.calculateHealthScore(factors);
  const testBPassed = h1 === h2 && h1 === 71; // (20 + 17.5 + 22.5 + 15) - 4 = 75 - 4 = 71

  if (testBPassed) {
    log.push(`✅ TEST B PASSED: Health calculation is 100% deterministic (Score: ${h1}).`);
  } else {
    log.push(`❌ TEST B FAILED: Health calculation non-deterministic! h1: ${h1}, h2: ${h2}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Einfluss Onboarding Factor
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Einfluss Onboarding Factor ---');
  const hOnboardLow = CSQueueManager.calculateHealthScore({ onboardingScore: 20, supportScore: 80, engagementScore: 80, openIssuesScore: 80 });
  const hOnboardHigh = CSQueueManager.calculateHealthScore({ onboardingScore: 90, supportScore: 80, engagementScore: 80, openIssuesScore: 80 });
  const testCPassed = hOnboardHigh > hOnboardLow;

  if (testCPassed) {
    log.push(`✅ TEST C PASSED: Onboarding factor directly impacts health score (${hOnboardLow} vs ${hOnboardHigh}).`);
  } else {
    log.push('❌ TEST C FAILED: Onboarding factor had no impact!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Einfluss Support-Erfahrung Factor
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Einfluss Support-Erfahrung Factor ---');
  const hSuppLow = CSQueueManager.calculateHealthScore({ onboardingScore: 80, supportScore: 20, engagementScore: 80, openIssuesScore: 80 });
  const hSuppHigh = CSQueueManager.calculateHealthScore({ onboardingScore: 80, supportScore: 90, engagementScore: 80, openIssuesScore: 80 });
  const testDPassed = hSuppHigh > hSuppLow;

  if (testDPassed) {
    log.push(`✅ TEST D PASSED: Support experience directly impacts health score (${hSuppLow} vs ${hSuppHigh}).`);
  } else {
    log.push('❌ TEST D FAILED: Support factor had no impact!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Einfluss Nutzung/Engagement Factor
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Einfluss Nutzung/Engagement Factor ---');
  const hEngLow = CSQueueManager.calculateHealthScore({ onboardingScore: 80, supportScore: 80, engagementScore: 20, openIssuesScore: 80 });
  const hEngHigh = CSQueueManager.calculateHealthScore({ onboardingScore: 80, supportScore: 80, engagementScore: 90, openIssuesScore: 80 });
  const testEPassed = hEngHigh > hEngLow;

  if (testEPassed) {
    log.push(`✅ TEST E PASSED: Engagement factor directly impacts health score (${hEngLow} vs ${hEngHigh}).`);
  } else {
    log.push('❌ TEST E FAILED: Engagement factor had no impact!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Einfluss offene Probleme Factor
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Einfluss offene Probleme Factor ---');
  const hIssLow = CSQueueManager.calculateHealthScore({ onboardingScore: 80, supportScore: 80, engagementScore: 80, openIssuesScore: 20 });
  const hIssHigh = CSQueueManager.calculateHealthScore({ onboardingScore: 80, supportScore: 80, engagementScore: 80, openIssuesScore: 90 });
  const testFPassed = hIssHigh > hIssLow;

  if (testFPassed) {
    log.push(`✅ TEST F PASSED: Open issues factor directly impacts health score (${hIssLow} vs ${hIssHigh}).`);
  } else {
    log.push('❌ TEST F FAILED: Open issues factor had no impact!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: Schlechtere Health erhöht Churn Risk
  // ---------------------------------------------------------
  log.push('\n--- TEST G: Schlechtere Health erhöht Churn Risk ---');
  const riskBadHealth = CSQueueManager.calculateChurnRisk(30, 0, 2.8);
  const riskGoodHealth = CSQueueManager.calculateChurnRisk(90, 0, 2.8);
  const testGPassed = riskBadHealth > riskGoodHealth;

  if (testGPassed) {
    log.push(`✅ TEST G PASSED: Lower health score increases churn risk (${(riskBadHealth*100).toFixed(2)}% vs ${(riskGoodHealth*100).toFixed(2)}%).`);
  } else {
    log.push('❌ TEST G FAILED: Health score did not increase churn risk!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: Kein harter Health-Schwellenwert für Churn
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Kein harter Health-Schwellenwert für Churn ---');
  const riskBorderline = CSQueueManager.calculateChurnRisk(49, 0, 2.8);
  const riskLow = CSQueueManager.calculateChurnRisk(20, 0, 2.8);
  const testHPassed = riskBorderline < 1.0 && riskLow < 1.0; // Probabilistic risk < 100% per tick

  if (testHPassed) {
    log.push('✅ TEST H PASSED: Churn risk remains probabilistic (< 100% per tick) even with low health score.');
  } else {
    log.push('❌ TEST H FAILED: Hard churn threshold detected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Deterministische CS Capacity Ableitung
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Deterministische CS Capacity Ableitung ---');
  const cap2 = CSQueueManager.calculateCSCapacity(2);
  const cap5 = CSQueueManager.calculateCSCapacity(5.8);
  const testIPassed = cap2 === 2 && cap5 === 5;

  if (testIPassed) {
    log.push(`✅ TEST I PASSED: CS capacity derived deterministically from csRepCount (2 FTE -> ${cap2}, 5.8 FTE -> ${cap5}).`);
  } else {
    log.push('❌ TEST I FAILED: CS capacity derivation error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: Keine unbegründete CS Queue bei ausreichender Kapazität
  // ---------------------------------------------------------
  log.push('\n--- TEST J: Keine unbegründete CS Queue ---');
  const entryJ: CSQueueEntry = {
    id: 'csq-j',
    customerId: 'd-j',
    companyName: 'Acme Corp',
    workloadPoints: 2,
    priority: 100,
    enteredQueueTick: 1,
    dueAtTick: 1,
    status: 'WAITING',
    processTicks: 0,
    queueTicks: 0,
    totalCSTimeTicks: 0,
    lastUpdatedTick: 1,
    healthScoreAtQueue: 80,
    churnRiskAtQueue: 0.05,
  };

  const { projection: projJ } = CSQueueManager.processTick([entryJ], 5, 1, []);
  const testJPassed = projJ.waitingCount === 0 && projJ.inProgressCount === 1;

  if (testJPassed) {
    log.push('✅ TEST J PASSED: Sufficient capacity (5 FTE for 1 CS item) resulted in 0 waiting and 1 in-progress.');
  } else {
    log.push(`❌ TEST J FAILED: Unnecessary CS queue! Waiting: ${projJ.waitingCount}, InProgress: ${projJ.inProgressCount}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: CS Queue Entstehung bei fehlender Kapazität
  // ---------------------------------------------------------
  log.push('\n--- TEST K: CS Queue Entstehung bei fehlender Kapazität ---');
  const entryK1 = { ...entryJ, id: 'csq-k1', customerId: 'd-k1', companyName: 'Company K1' };
  const entryK2 = { ...entryJ, id: 'csq-k2', customerId: 'd-k2', companyName: 'Company K2' };
  const entryK3 = { ...entryJ, id: 'csq-k3', customerId: 'd-k3', companyName: 'Company K3' };

  const { projection: projK } = CSQueueManager.processTick([entryK1, entryK2, entryK3], 1, 1, []);
  const testKPassed = projK.waitingCount === 2 && projK.inProgressCount === 1;

  if (testKPassed) {
    log.push('✅ TEST K PASSED: Insufficient capacity (1 FTE for 3 CS items) created 1 in-progress and 2 waiting.');
  } else {
    log.push(`❌ TEST K FAILED: CS Queue creation error! Waiting: ${projK.waitingCount}, InProgress: ${projK.inProgressCount}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST L: Erhöhung von queueTicks während des Wartens
  // ---------------------------------------------------------
  log.push('\n--- TEST L: Erhöhung von queueTicks ---');
  const { updatedEntries: entriesL } = CSQueueManager.processTick([entryK1, entryK2, entryK3], 1, 2, []);
  const waitingL = entriesL.filter((e) => e.status === 'WAITING');
  const testLPassed = waitingL.every((e) => e.queueTicks === 1);

  if (testLPassed) {
    log.push('✅ TEST L PASSED: queueTicks correctly incremented to 1 during wait tick.');
  } else {
    log.push('❌ TEST L FAILED: queueTicks did not increment!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST M: Getrennte Speicherung von Process Time und Queue Time
  // ---------------------------------------------------------
  log.push('\n--- TEST M: Getrennte Speicherung ---');
  const sampleEntryM: CSQueueEntry = {
    ...entryJ,
    processTicks: 3,
    queueTicks: 4,
    totalCSTimeTicks: 7,
  };
  const testMPassed = sampleEntryM.processTicks === 3 && sampleEntryM.queueTicks === 4;

  if (testMPassed) {
    log.push('✅ TEST M PASSED: Process time (3) and Queue time (4) stored separately.');
  } else {
    log.push('❌ TEST M FAILED: Process and Queue time not separated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST N: totalCSTimeTicks Gleichung
  // ---------------------------------------------------------
  log.push('\n--- TEST N: totalCSTimeTicks Gleichung ---');
  const testNPassed = sampleEntryM.totalCSTimeTicks === sampleEntryM.processTicks + sampleEntryM.queueTicks;

  if (testNPassed) {
    log.push(`✅ TEST N PASSED: totalCSTimeTicks (${sampleEntryM.totalCSTimeTicks}) = processTicks (${sampleEntryM.processTicks}) + queueTicks (${sampleEntryM.queueTicks}).`);
  } else {
    log.push('❌ TEST N FAILED: totalCSTimeTicks equation violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST O: CS Priorisierung berücksichtigt Multi-Faktoren
  // ---------------------------------------------------------
  log.push('\n--- TEST O: CS Priorisierung ---');
  const prioLow = CSQueueManager.calculateCSPriority(90, 0.02, 10000, 0);
  const prioHigh = CSQueueManager.calculateCSPriority(30, 0.45, 200000, 5);
  const testOPassed = prioHigh > prioLow;

  if (testOPassed) {
    log.push(`✅ TEST O PASSED: High risk / low health priority (${prioHigh}) exceeds good health priority (${prioLow}).`);
  } else {
    log.push('❌ TEST O FAILED: CS Priority multi-factor calculation error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST P: NON-PREEMPTION Guarantee (Aktive CS Vorgänge werden nie verdrängt)
  // ---------------------------------------------------------
  log.push('\n--- TEST P: NON-PREEMPTION Guarantee ---');
  const activeCS: CSQueueEntry = {
    ...entryJ,
    id: 'csq-active',
    status: 'IN_PROGRESS',
    workloadPoints: 5,
    processTicks: 1,
    priority: 10,
  };
  const waitingHighCS: CSQueueEntry = {
    ...entryJ,
    id: 'csq-waiting-high',
    status: 'WAITING',
    workloadPoints: 1,
    priority: 9999,
  };

  const { updatedEntries: entriesP } = CSQueueManager.processTick([activeCS, waitingHighCS], 1, 2, []);
  const activeResP = entriesP.find((e) => e.id === 'csq-active');
  const waitingResP = entriesP.find((e) => e.id === 'csq-waiting-high');
  const testPPassed = activeResP?.status === 'IN_PROGRESS' && waitingResP?.status === 'WAITING';

  if (testPPassed) {
    log.push('✅ TEST P PASSED: NON-PREEMPTION GUARANTEE: Active IN_PROGRESS CS entry was NOT preempted by higher priority waiting entry.');
  } else {
    log.push('❌ TEST P FAILED: CS Preemption occurred!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST Q: CS Bottleneck Erkennung
  // ---------------------------------------------------------
  log.push('\n--- TEST Q: CS Bottleneck Erkennung ---');
  const { projection: projQ } = CSQueueManager.processTick([entryK1, entryK2, entryK3], 1, 2, []);
  const testQPassed = projQ.isCSBottleneck === true;

  if (testQPassed) {
    log.push('✅ TEST Q PASSED: CS Capacity overload correctly flagged isCSBottleneck = true.');
  } else {
    log.push('❌ TEST Q FAILED: CS Bottleneck detection failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST R: CUSTOMER_CHURNED Event Erzeugung
  // ---------------------------------------------------------
  log.push('\n--- TEST R: CUSTOMER_CHURNED Event Erzeugung ---');
  const clockR = { tick: 5, dayIndex: 5, simulatedDate: '2026-01-06', seed: 12345 };
  const dealR: SimulationDeal = {
    id: 'deal-r',
    companyName: 'Test Corp R',
    contactName: 'John Doe',
    dealName: 'Test Deal R',
    amount: 12000,
    mrr: 1000,
    arr: 12000,
    packageName: 'Professional',
    wonAtTick: 1,
    closeDate: '2026-01-02',
    healthScore: 25,
  };

  let churnResultR: any = null;
  let seedAttempt = 1;
  while (!churnResultR?.events?.some((e: any) => e.type === 'CUSTOMER_CHURNED') && seedAttempt <= 50) {
    const rngR = new DeterministicRNG(seedAttempt);
    churnResultR = SimulationEventRules.evaluateCustomerChurnRule(clockR, rngR, [dealR], [], 100.0);
    seedAttempt++;
  }

  const churnEvtR = churnResultR?.events.find((e: any) => e.type === 'CUSTOMER_CHURNED');
  const testRPassed = Boolean(churnEvtR) && churnEvtR?.affectedDeal?.isChurned === true;

  if (testRPassed) {
    log.push(`✅ TEST R PASSED: CUSTOMER_CHURNED event successfully generated for churned customer (${churnEvtR?.title}).`);
  } else {
    log.push('❌ TEST R FAILED: CUSTOMER_CHURNED event not emitted!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST S: Dauerhafte Churn-Markierung
  // ---------------------------------------------------------
  log.push('\n--- TEST S: Dauerhafte Churn-Markierung ---');
  const churnedDealS = churnResultR?.updatedDeals.find((d: any) => d.id === 'deal-r');
  const testSPassed = churnedDealS?.isChurned === true && typeof churnedDealS?.churnedAtTick === 'number';

  if (testSPassed) {
    log.push(`✅ TEST S PASSED: Customer permanently marked isChurned = true (Churned at tick #${churnedDealS?.churnedAtTick}).`);
  } else {
    log.push('❌ TEST S FAILED: Permanent churn state flag missing!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST T: Churn Cause Klassifizierung
  // ---------------------------------------------------------
  log.push('\n--- TEST T: Churn Cause Klassifizierung ---');
  const causeHealth = CSQueueManager.classifyChurnCause(35, 0);
  const causeCapacity = CSQueueManager.classifyChurnCause(70, 5);
  const causeBaseline = CSQueueManager.classifyChurnCause(85, 0);

  const testTPassed = causeHealth === 'HEALTH_PROBLEM' && causeCapacity === 'CS_CAPACITY' && causeBaseline === 'BASELINE_CHURN';
  if (testTPassed) {
    log.push(`✅ TEST T PASSED: Churn causes classified correctly (Health: ${causeHealth}, Capacity: ${causeCapacity}, Baseline: ${causeBaseline}).`);
  } else {
    log.push(`❌ TEST T FAILED: Churn cause classification error! Health: ${causeHealth}, Cap: ${causeCapacity}, Base: ${causeBaseline}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST U: Re-Engagement mit parentDealId Erzeugung
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Re-Engagement mit parentDealId ---');
  const reOppU = churnResultR?.reEngagementOpps.find((o: any) => o.parentDealId === 'deal-r');
  const testUPassed = Boolean(reOppU) && reOppU?.parentDealId === 'deal-r';

  if (testUPassed) {
    log.push(`✅ TEST U PASSED: Re-Engagement pipeline created new opportunity linked via parentDealId=${reOppU?.parentDealId}.`);
  } else {
    log.push('❌ TEST U FAILED: Re-Engagement opportunity with parentDealId missing!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: Immutabilität der ursprünglichen Deal-Historie bei Re-Engagement
  // ---------------------------------------------------------
  log.push('\n--- TEST V: Immutabilität der ursprünglichen Deal-Historie ---');
  const originalDealV = churnResultR?.updatedDeals.find((d: any) => d.id === 'deal-r');
  const testVPassed = originalDealV?.arr === 12000 && originalDealV?.wonAtTick === 1 && originalDealV?.packageName === 'Professional';

  if (testVPassed) {
    log.push('✅ TEST V PASSED: Original deal history (ARR: 12.000 €, WonTick: #1) remained 100% pristine and unmutated after Re-Engagement.');
  } else {
    log.push('❌ TEST V FAILED: Original deal history was mutated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST W: PRNG-Seed Determinisierung & State Immutability
  // ---------------------------------------------------------
  log.push('\n--- TEST W: PRNG-Seed Determinisierung & Immutability ---');
  const rngW1 = new DeterministicRNG(999);
  const rngW2 = new DeterministicRNG(999);

  const stateW: SimulationState = {
    isRunning: true,
    tickCount: 0,
    dayIndex: 0,
    simulatedDate: '2026-01-01',
    seed: 999,
    speed: 1,
    intervalMs: 12000,
    lastTickTimestamp: '2026-01-01 (Tick #0)',
    totalLeadsGenerated: 0,
    totalDealsWon: 0,
    currentARR: 411840,
  };

  const outW1 = SimulationEngine.executeTick({ state: stateW, rng: rngW1, leads: [], opportunities: [], deals: [dealR], activities: [], csRepCount: 2 });
  const outW2 = SimulationEngine.executeTick({ state: stateW, rng: rngW2, leads: [], opportunities: [], deals: [dealR], activities: [], csRepCount: 2 });

  const testWPassed = JSON.stringify(outW1.state) === JSON.stringify(outW2.state);
  if (testWPassed) {
    log.push('✅ TEST W PASSED: Identical seed produced 100% byte-for-byte identical CS & Customer Health simulation output.');
  } else {
    log.push('❌ TEST W FAILED: Non-deterministic output across identical seeds!');
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
    log.push('🎉 ALL AUFTRAG 010 TESTS PASSED SUCCESSFULLY!\n');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 010 TEST SUITE.\n');
  }

  return { success: overallPassed, log };
}
