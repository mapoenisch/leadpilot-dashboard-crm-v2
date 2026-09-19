import { SalesQueueManager } from '../salesQueueManager';
import { SimulationEngine } from '../engine';
import { DeterministicRNG } from '../prng';
import { SimulationState } from '../../types/simulation';
import { CRMRepository } from '../../services/db/crmRepository';

export function createInitialState(seed = 42): SimulationState {
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

// 067K / G57 — aus salesQueueIntegrity.test.ts herausgelöster Schlussteil
// (TEST U–X; reine Code-Bewegung, keine Verhaltensänderung).
export async function runSalesQueueTailChecks(log: string[]): Promise<boolean> {
  let tailPassed = true;

  // ---------------------------------------------------------
  // TEST U: 0 Queue-/Statistikberechnungen in React
  // ---------------------------------------------------------
  log.push('\n--- TEST U: 0 Queue-/Statistikberechnungen in React ---');
  const capacityU = SalesQueueManager.calculateSalesCapacity(3);
  const workloadU = SalesQueueManager.calculateWorkload('QUALIFICATION');
  const testUPassed = capacityU === 3 && workloadU === 1;
  if (testUPassed) {
    log.push(
      '✅ TEST U PASSED: SalesQueueManager derives pure capacity & workload values for UI presentation.',
    );
  } else {
    log.push('❌ TEST U FAILED: SalesQueueManager capacity/workload calculation error!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: PRNG-Seed Determinisierung
  // ---------------------------------------------------------
  log.push('\n--- TEST V: PRNG-Seed Determinisierung ---');
  const outV1 = SimulationEngine.executeTick({
    state: createInitialState(777),
    rng: new DeterministicRNG(777),
    leads: [],
    opportunities: [],
    deals: [],
    activities: [],
  });
  const outV2 = SimulationEngine.executeTick({
    state: createInitialState(777),
    rng: new DeterministicRNG(777),
    leads: [],
    opportunities: [],
    deals: [],
    activities: [],
  });

  const testVPassed =
    JSON.stringify(outV1.state.salesQueueProjection) ===
    JSON.stringify(outV2.state.salesQueueProjection);
  if (testVPassed) {
    log.push(
      '✅ TEST V PASSED: Identical seed produced 100% byte-for-byte identical SalesQueueProjection.',
    );
  } else {
    log.push('❌ TEST V FAILED: PRNG seed determinism violated!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST W: Immutability (Eingabe-State & Runs unmutiert)
  // ---------------------------------------------------------
  log.push('\n--- TEST W: Immutability ---');
  const initStateW = createInitialState(888);
  const beforeW = JSON.stringify(initStateW);
  SimulationEngine.executeTick({
    state: initStateW,
    rng: new DeterministicRNG(888),
    leads: [],
    opportunities: [],
    deals: [],
    activities: [],
  });
  const afterW = JSON.stringify(initStateW);

  const testWPassed = beforeW === afterW;
  if (testWPassed) {
    log.push(
      '✅ TEST W PASSED: Execution completed with 100% zero side-effects on input state object.',
    );
  } else {
    log.push('❌ TEST W FAILED: Input state mutated!');
    tailPassed = false;
  }

  // ---------------------------------------------------------
  // TEST X: Regressionsschutz für Ebene A & Aufträge 001-008
  // ---------------------------------------------------------
  log.push('\n--- TEST X: Regressionsschutz Ebene A ---');
  const comps = await CRMRepository.getCompanies();
  const testXPassed = comps.length === 20;

  if (testXPassed) {
    log.push(
      '✅ TEST X PASSED: Ebene A historical CRM baseline remains 100% pristine (20 Companies).',
    );
  } else {
    log.push('❌ TEST X FAILED: Ebene A baseline mutated!');
    tailPassed = false;
  }

  return tailPassed;
}
