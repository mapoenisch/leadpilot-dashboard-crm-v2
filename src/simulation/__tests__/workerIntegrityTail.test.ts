import { CRMRepository } from '../../services/db/crmRepository';
import { HeadlessTestWorkerAdapter } from '../worker/workerAdapter';
import { WORKER_PROTOCOL_VERSION, WorkerMessageEvent } from '../../types/workerMessages';

// 067K / G57 — aus workerIntegrity.test.ts herausgelöster Schlussteil
// (TEST K–L; reine Code-Bewegung, keine Verhaltensänderung).
export function waitForWorkerEvent(
  adapter: HeadlessTestWorkerAdapter,
  predicate: (evt: WorkerMessageEvent) => boolean,
  timeoutMs = 2000,
): Promise<WorkerMessageEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timeout waiting for worker event after ${timeoutMs}ms`));
    }, timeoutMs);

    const unsubscribe = adapter.onMessage((evt) => {
      if (predicate(evt)) {
        clearTimeout(timer);
        unsubscribe();
        resolve(evt);
      }
    });
  });
}

export async function runWorkerTailChecks(log: string[]): Promise<boolean> {
  let tailPassed = true;

  // ---------------------------------------------------------
  // TEST K: Race Condition Safety
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Race Condition Safety ---');
  const adapterK = new HeadlessTestWorkerAdapter();
  const runIdK = 'run-race-test';

  // Issue CANCEL immediately after START
  adapterK.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId: runIdK,
    requestId: 'req-k1',
    payload: { targetTicks: 50, batchSize: 5 },
  });

  adapterK.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'CANCEL',
    runId: runIdK,
    requestId: 'req-k2',
  });

  const evtK = await waitForWorkerEvent(
    adapterK,
    (e) => e.runId === runIdK && (e.type === 'CANCELLED' || e.type === 'COMPLETED'),
  );

  // Attempt invalid RESUME when worker is CANCELLED/IDLE
  const failPromiseK = waitForWorkerEvent(adapterK, (e) => e.type === 'FAILED');
  adapterK.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'RESUME',
    runId: runIdK,
    requestId: 'req-k3',
  });

  const evtFailK = await failPromiseK;
  const testKPassed =
    evtK.type === 'CANCELLED' &&
    evtFailK.type === 'FAILED' &&
    evtFailK.payload?.error?.code === 'INVALID_STATE_TRANSITION';

  if (testKPassed) {
    log.push(
      '✅ TEST K PASSED: Immediate CANCEL after START safely cancelled run; invalid RESUME rejected with INVALID_STATE_TRANSITION.',
    );
  } else {
    log.push('❌ TEST K FAILED: Race condition handling failed!');
    tailPassed = false;
  }
  adapterK.terminate();

  // ---------------------------------------------------------
  // TEST L: Ebene A CRM Baseline Integrity
  // ---------------------------------------------------------
  log.push('\n--- TEST L: Ebene A CRM Baseline Integrity ---');
  const baselineCompanies = await CRMRepository.getCompanies();
  const baselineContacts = await CRMRepository.getContacts();
  const baselineDeals = await CRMRepository.getImportedFunnelDeals();

  const testLPassed =
    baselineCompanies.length === 20 &&
    baselineContacts.length === 100 &&
    baselineDeals.length === 40;

  if (testLPassed) {
    log.push(
      '✅ TEST L PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).',
    );
  } else {
    log.push('❌ TEST L FAILED: Historical Ebene A baseline was mutated by worker test execution!');
    tailPassed = false;
  }

  return tailPassed;
}
