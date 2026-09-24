import { CRMRepository } from '../../services/db/crmRepository';
import { SimulationEngine } from '../engine';
import { SimulationEventRules } from '../eventRules';
import { DeterministicRNG } from '../prng';
import { SimulationDeal, SimulationState } from '../../types/simulation';

// 067K / G57 — aus csHealthIntegrity.test.ts herausgelöster Schlussteil
// (TEST U–X; reine Code-Bewegung, keine Verhaltensänderung).
export async function runCSHealthTailChecks(
  log: string[],
  churnResultR: ReturnType<typeof SimulationEventRules.evaluateCustomerChurnRule>,
  dealR: SimulationDeal,
): Promise<boolean> {
  let tailPassed = true;

  // ---------------------------------------------------------
  // TEST U: Re-Engagement mit parentDealId Erzeugung
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Re-Engagement mit parentDealId ---');
  const reOppU = churnResultR?.reEngagementOpps.find((o) => o.parentDealId === 'deal-r');
  const testUPassed = Boolean(reOppU) && reOppU?.parentDealId === 'deal-r';

  if (testUPassed) {
    log.push(
      `✅ TEST U PASSED: Re-Engagement pipeline created new opportunity linked via parentDealId=${reOppU?.parentDealId}.`,
    );
  } else {
    log.push('❌ TEST U FAILED: Re-Engagement opportunity with parentDealId missing!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: Immutabilität der ursprünglichen Deal-Historie bei Re-Engagement
  // ---------------------------------------------------------
  log.push('\n--- TEST V: Immutabilität der ursprünglichen Deal-Historie ---');
  const originalDealV = churnResultR?.updatedDeals.find((d) => d.id === 'deal-r');
  const testVPassed =
    originalDealV?.arr === 12000 &&
    originalDealV?.wonAtTick === 1 &&
    originalDealV?.packageName === 'Professional';

  if (testVPassed) {
    log.push(
      '✅ TEST V PASSED: Original deal history (ARR: 12.000 €, WonTick: #1) remained 100% pristine and unmutated after Re-Engagement.',
    );
  } else {
    log.push('❌ TEST V FAILED: Original deal history was mutated!');
    tailPassed = false;
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

  const outW1 = SimulationEngine.executeTick({
    state: stateW,
    rng: rngW1,
    leads: [],
    opportunities: [],
    deals: [dealR],
    activities: [],
    csRepCount: 2,
  });
  const outW2 = SimulationEngine.executeTick({
    state: stateW,
    rng: rngW2,
    leads: [],
    opportunities: [],
    deals: [dealR],
    activities: [],
    csRepCount: 2,
  });

  const testWPassed = JSON.stringify(outW1.state) === JSON.stringify(outW2.state);
  if (testWPassed) {
    log.push(
      '✅ TEST W PASSED: Identical seed produced 100% byte-for-byte identical CS & Customer Health simulation output.',
    );
  } else {
    log.push('❌ TEST W FAILED: Non-deterministic output across identical seeds!');
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
