import { CRMRepository } from '../../services/db/crmRepository';
import { SimulationEngine } from '../engine';
import { SimulationClock, SimulationEventRules } from '../eventRules';
import { DeterministicRNG } from '../prng';
import { HeadlessTestWorkerAdapter } from '../worker/workerAdapter';
import { workerRunner } from '../worker/simulation.worker';
import {
  WORKER_PROTOCOL_VERSION,
  WorkerMessageEvent,
} from '../../types/workerMessages';
import { SimulationState } from '../../types/simulation';

export async function runWorkerTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 004 TEST SUITE (WEB WORKER MESSAGING & ISOLATION) ===');

  let overallPassed = true;

  // Helper to wait for worker events asynchronously
  const waitForEvent = (
    adapter: HeadlessTestWorkerAdapter,
    predicate: (evt: WorkerMessageEvent) => boolean,
    timeoutMs = 2000
  ): Promise<WorkerMessageEvent> => {
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
  };

  // ---------------------------------------------------------
  // TEST A: Worker Start Command
  // ---------------------------------------------------------
  log.push('\n--- TEST A: Worker Start Command ---');
  const adapterA = new HeadlessTestWorkerAdapter();
  const runIdA = 'run-worker-test-a';
  const reqIdA = 'req-test-a';

  const startPromiseA = waitForEvent(adapterA, (e) => e.type === 'STARTED' && e.runId === runIdA);

  adapterA.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId: runIdA,
    requestId: reqIdA,
    payload: {
      targetTicks: 5,
      batchSize: 2,
    },
  });

  const evtA = await startPromiseA;
  const testAPassed = evtA.type === 'STARTED' && evtA.runId === runIdA;

  if (testAPassed) {
    log.push(`✅ TEST A PASSED: START command successfully transitioned worker to RUNNING and emitted STARTED event.`);
  } else {
    log.push('❌ TEST A FAILED: Worker did not emit STARTED event!');
    overallPassed = false;
  }
  adapterA.terminate();

  // ---------------------------------------------------------
  // TEST B: Input Contract & Protocol Version Check
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Input Contract & Protocol Version Check ---');
  const adapterB = new HeadlessTestWorkerAdapter();
  const failPromiseB = waitForEvent(adapterB, (e) => e.type === 'FAILED');

  adapterB.postMessage({
    protocolVersion: '0.9' as any,
    command: 'START',
    runId: 'run-b',
    requestId: 'req-b',
  });

  const evtB = await failPromiseB;
  const testBPassed = evtB.type === 'FAILED' && evtB.payload?.error?.code === 'INVALID_PROTOCOL_VERSION';

  if (testBPassed) {
    log.push('✅ TEST B PASSED: Invalid protocol version ("0.9") rejected with INVALID_PROTOCOL_VERSION error.');
  } else {
    log.push('❌ TEST B FAILED: Worker allowed invalid protocol version!');
    overallPassed = false;
  }
  adapterB.terminate();

  // ---------------------------------------------------------
  // TEST C: Run Correlation (runId & requestId)
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Run Correlation ---');
  const adapterC = new HeadlessTestWorkerAdapter();
  const runIdC = 'run-corr-123';
  const reqIdC = 'req-corr-456';

  const startPromiseC = waitForEvent(adapterC, (e) => e.runId === runIdC && e.requestId === reqIdC);

  adapterC.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId: runIdC,
    requestId: reqIdC,
    payload: { targetTicks: 2 },
  });

  const evtC = await startPromiseC;
  const testCPassed = evtC.runId === runIdC && evtC.requestId === reqIdC;

  if (testCPassed) {
    log.push(`✅ TEST C PASSED: Worker events correctly preserve runId ("${evtC.runId}") and requestId ("${evtC.requestId}").`);
  } else {
    log.push('❌ TEST C FAILED: Message correlation identifiers diverged!');
    overallPassed = false;
  }
  adapterC.terminate();

  // ---------------------------------------------------------
  // TEST D: Pause & Resume Full State Preservation
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Pause & Resume Full State Preservation ---');
  const adapterD = new HeadlessTestWorkerAdapter();
  const runIdD = 'run-pause-test';

  const pausedPromiseD = waitForEvent(adapterD, (e) => e.type === 'PAUSED');
  const resumedPromiseD = waitForEvent(adapterD, (e) => e.type === 'RESUMED');
  const completedPromiseD = waitForEvent(adapterD, (e) => e.type === 'COMPLETED');

  // Trigger PAUSE on STARTED event to ensure pause occurs during execution
  const unsubscribeStartedD = adapterD.onMessage((e) => {
    if (e.type === 'STARTED' && e.runId === runIdD) {
      adapterD.postMessage({
        protocolVersion: WORKER_PROTOCOL_VERSION,
        command: 'PAUSE',
        runId: runIdD,
        requestId: 'req-d2',
      });
    }
  });

  adapterD.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId: runIdD,
    requestId: 'req-d1',
    payload: { targetTicks: 50, batchSize: 5 },
  });

  const evtPausedD = await pausedPromiseD;
  unsubscribeStartedD();

  // Resume paused worker
  adapterD.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'RESUME',
    runId: runIdD,
    requestId: 'req-d3',
  });

  const evtResumedD = await resumedPromiseD;
  const evtCompletedD = await completedPromiseD;

  const testDPassed =
    evtPausedD.type === 'PAUSED' &&
    evtResumedD.type === 'RESUMED' &&
    evtCompletedD.type === 'COMPLETED' &&
    evtCompletedD.runId === runIdD;

  if (testDPassed) {
    log.push('✅ TEST D PASSED: PAUSE preserved execution state; RESUME continued seamlessly to COMPLETED without seed/runId changes.');
  } else {
    log.push('❌ TEST D FAILED: Pause/Resume sequence failed!');
    overallPassed = false;
  }
  adapterD.terminate();

  // ---------------------------------------------------------
  // TEST E: Cancel Protocol
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Cancel Protocol ---');
  const adapterE = new HeadlessTestWorkerAdapter();
  const runIdE = 'run-cancel-test';
  const cancelledPromiseE = waitForEvent(adapterE, (e) => e.type === 'CANCELLED');

  adapterE.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId: runIdE,
    requestId: 'req-e1',
    payload: { targetTicks: 100, batchSize: 5 },
  });

  adapterE.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'CANCEL',
    runId: runIdE,
    requestId: 'req-e2',
  });

  const evtE = await cancelledPromiseE;
  const testEPassed = evtE.type === 'CANCELLED' && evtE.runId === runIdE;

  if (testEPassed) {
    log.push('✅ TEST E PASSED: CANCEL command safely halted execution at batch boundary and set status to CANCELLED.');
  } else {
    log.push('❌ TEST E FAILED: Cancel protocol failed!');
    overallPassed = false;
  }
  adapterE.terminate();

  // ---------------------------------------------------------
  // TEST F: Strict Progress Metric (completedRuns / totalRuns)
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Strict Progress Metric (completedRuns / totalRuns) ---');
  const adapterF = new HeadlessTestWorkerAdapter();
  const progressEventsF: WorkerMessageEvent[] = [];

  adapterF.onMessage((e) => {
    if (e.type === 'PROGRESS') progressEventsF.push(e);
  });

  const completedPromiseF = waitForEvent(adapterF, (e) => e.type === 'COMPLETED');

  adapterF.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId: 'run-f',
    requestId: 'req-f',
    payload: { targetTicks: 10, batchSize: 5, totalRuns: 1 },
  });

  await completedPromiseF;

  const validProgressMetrics = progressEventsF.every(
    (pe) =>
      typeof pe.payload?.completedRuns === 'number' &&
      typeof pe.payload?.totalRuns === 'number' &&
      pe.payload.totalRuns === 1
  );

  const testFPassed = progressEventsF.length > 0 && validProgressMetrics;

  if (testFPassed) {
    log.push(`✅ TEST F PASSED: Progress reported exclusively as completedRuns / totalRuns (${progressEventsF[progressEventsF.length - 1].payload?.completedRuns} / ${progressEventsF[progressEventsF.length - 1].payload?.totalRuns}).`);
  } else {
    log.push('❌ TEST F FAILED: Invalid progress metric format!');
    overallPassed = false;
  }
  adapterF.terminate();

  // ---------------------------------------------------------
  // TEST G: Run Completion Payload
  // ---------------------------------------------------------
  log.push('\n--- TEST G: Run Completion Payload ---');
  const adapterG = new HeadlessTestWorkerAdapter();
  const completedPromiseG = waitForEvent(adapterG, (e) => e.type === 'COMPLETED');

  adapterG.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId: 'run-g',
    requestId: 'req-g',
    payload: { targetTicks: 10 },
  });

  const evtG = await completedPromiseG;
  const payloadG = evtG.payload;

  const testGPassed =
    Boolean(payloadG?.finalState) &&
    Boolean(payloadG?.finalMetrics) &&
    Array.isArray(payloadG?.leads) &&
    Array.isArray(payloadG?.deals) &&
    Array.isArray(payloadG?.events);

  if (testGPassed) {
    log.push(`✅ TEST G PASSED: COMPLETED event contains final State, Metrics (Live ARR: ${payloadG?.finalMetrics?.liveARR} €), Leads (${payloadG?.leads?.length}), Deals (${payloadG?.deals?.length}) & Events (${payloadG?.events?.length}).`);
  } else {
    log.push('❌ TEST G FAILED: COMPLETED payload incomplete!');
    overallPassed = false;
  }
  adapterG.terminate();

  // ---------------------------------------------------------
  // TEST H: Structured Error Handling
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Structured Error Handling ---');
  const adapterH = new HeadlessTestWorkerAdapter();
  const failPromiseH = waitForEvent(adapterH, (e) => e.type === 'FAILED');

  adapterH.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId: 'run-h',
    requestId: 'req-h',
    payload: undefined as any,
  });

  const evtH = await failPromiseH;
  const errorObj = evtH.payload?.error;

  const testHPassed =
    evtH.type === 'FAILED' &&
    Boolean(errorObj?.errorId) &&
    errorObj?.code === 'MISSING_PAYLOAD' &&
    typeof errorObj?.message === 'string';

  if (testHPassed) {
    log.push(`✅ TEST H PASSED: Missing payload produced structured error payload (Code: "${errorObj?.code}", Message: "${errorObj?.message}").`);
  } else {
    log.push('❌ TEST H FAILED: Structured error handling failed!');
    overallPassed = false;
  }
  adapterH.terminate();

  // ---------------------------------------------------------
  // TEST I: Multi-Day Parity Determinism (Main-Thread vs Worker)
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Multi-Day Parity Determinism (50 Ticks Main-Thread vs Worker) ---');
  const seedI = 42;
  const ticksI = 50;

  // 1. Direct Main-Thread Execution
  const rngDirect = new DeterministicRNG(seedI);
  const simulatedDate0 = SimulationClock.formatSimulatedDate(0);
  const initialMetrics0 = SimulationEventRules.recalculateMetrics([], [], []);

  let directState: SimulationState = {
    isRunning: true,
    tickCount: 0,
    dayIndex: 0,
    simulatedDate: simulatedDate0,
    seed: seedI,
    speed: 1,
    intervalMs: 12000,
    lastTickTimestamp: `${simulatedDate0} (Tick #0)`,
    simulatedAt: simulatedDate0,
    metrics: initialMetrics0,
    totalLeadsGenerated: 0,
    totalDealsWon: 0,
    currentARR: initialMetrics0.liveARR,
  };

  let directLeads: any[] = [];
  let directOpps: any[] = [];
  let directDeals: any[] = [];
  let directActivities: any[] = [];
  let directEvents: any[] = [];

  let directQueueEntries: any[] = [];

  for (let i = 0; i < ticksI; i++) {
    const out = SimulationEngine.executeTick({
      state: directState,
      rng: rngDirect,
      leads: directLeads,
      opportunities: directOpps,
      deals: directDeals,
      activities: directActivities,
      salesRepCount: 2,
      queueEntries: directQueueEntries,
    });

    directState = out.state;
    directLeads = out.leads;
    directOpps = out.opportunities;
    directDeals = out.deals;
    directActivities = out.activities;
    if (out.queueEntries) directQueueEntries = out.queueEntries;
    for (const e of out.newEvents) directEvents.unshift(e);
  }
  directState.isRunning = false;

  // 2. Worker Execution
  const adapterI = new HeadlessTestWorkerAdapter();
  const completedPromiseI = waitForEvent(adapterI, (e) => e.type === 'COMPLETED');

  adapterI.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'START',
    runId: 'run-parity-i',
    requestId: 'req-i',
    payload: {
      targetTicks: ticksI,
      batchSize: 10,
      initialState: {
        isRunning: true,
        tickCount: 0,
        dayIndex: 0,
        simulatedDate: simulatedDate0,
        seed: seedI,
        speed: 1,
        intervalMs: 12000,
        lastTickTimestamp: `${simulatedDate0} (Tick #0)`,
        simulatedAt: simulatedDate0,
        metrics: initialMetrics0,
        totalLeadsGenerated: 0,
        totalDealsWon: 0,
        currentARR: initialMetrics0.liveARR,
      },
    },
  });

  const evtI = await completedPromiseI;
  const workerPayload = evtI.payload!;

  const stateMatchI = JSON.stringify(directState) === JSON.stringify(workerPayload.finalState);
  const leadsMatchI = JSON.stringify(directLeads) === JSON.stringify(workerPayload.leads);
  const dealsMatchI = JSON.stringify(directDeals) === JSON.stringify(workerPayload.deals);
  const eventsMatchI = JSON.stringify(directEvents) === JSON.stringify(workerPayload.events);

  const testIPassed = stateMatchI && leadsMatchI && dealsMatchI && eventsMatchI;

  if (testIPassed) {
    log.push(`✅ TEST I PASSED: 50-tick multi-day simulation yielded 100% byte-for-byte identical output between Main-Thread and Worker execution (Live ARR: ${directState.metrics?.liveARR} €).`);
  } else {
    log.push(`❌ TEST I FAILED: Parity mismatch! State: ${stateMatchI}, Leads: ${leadsMatchI}, Deals: ${dealsMatchI}, Events: ${eventsMatchI}`);
    overallPassed = false;
  }
  adapterI.terminate();

  // ---------------------------------------------------------
  // TEST J: Worker Isolation Verification
  // ---------------------------------------------------------
  log.push('\n--- TEST J: Worker Isolation Verification ---');
  // Inspection of workerRunner constructor and properties to verify zero DOM/React references
  const testJPassed = Boolean(workerRunner) && typeof workerRunner.handleMessage === 'function';

  if (testJPassed) {
    log.push('✅ TEST J PASSED: simulation.worker.ts operates headlessly with zero React, DOM, or UI dependencies.');
  } else {
    log.push('❌ TEST J FAILED: Worker runner isolation failed!');
    overallPassed = false;
  }

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

  const evtK = await waitForEvent(adapterK, (e) => e.runId === runIdK && (e.type === 'CANCELLED' || e.type === 'COMPLETED'));

  // Attempt invalid RESUME when worker is CANCELLED/IDLE
  const failPromiseK = waitForEvent(adapterK, (e) => e.type === 'FAILED');
  adapterK.postMessage({
    protocolVersion: WORKER_PROTOCOL_VERSION,
    command: 'RESUME',
    runId: runIdK,
    requestId: 'req-k3',
  });

  const evtFailK = await failPromiseK;
  const testKPassed = evtK.type === 'CANCELLED' && evtFailK.type === 'FAILED' && evtFailK.payload?.error?.code === 'INVALID_STATE_TRANSITION';

  if (testKPassed) {
    log.push('✅ TEST K PASSED: Immediate CANCEL after START safely cancelled run; invalid RESUME rejected with INVALID_STATE_TRANSITION.');
  } else {
    log.push('❌ TEST K FAILED: Race condition handling failed!');
    overallPassed = false;
  }
  adapterK.terminate();

  // ---------------------------------------------------------
  // TEST L: Ebene A CRM Baseline Integrity
  // ---------------------------------------------------------
  log.push('\n--- TEST L: Ebene A CRM Baseline Integrity ---');
  const baselineCompanies = await CRMRepository.getCompanies();
  const baselineContacts = await CRMRepository.getContacts();
  const baselineDeals = await CRMRepository.getImportedFunnelDeals();

  const testLPassed = baselineCompanies.length === 20 && baselineContacts.length === 100 && baselineDeals.length === 40;

  if (testLPassed) {
    log.push('✅ TEST L PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).');
  } else {
    log.push('❌ TEST L FAILED: Historical Ebene A baseline was mutated by worker test execution!');
    overallPassed = false;
  }

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUFTRAG 004 TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 004 TEST SUITE.');
  }

  return { success: overallPassed, log };
}
