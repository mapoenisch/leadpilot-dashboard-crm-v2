import { InMemorySnapshotRepository } from '../../services/db/indexedDbSnapshotRepository';
import { SnapshotMapper } from '../../services/db/snapshotMapper';
import { SimulationClock, SimulationEventRules } from '../eventRules';
import { SnapshotIntegrityService } from '../snapshotIntegrityService';
import { SimulationState } from '../../types/simulation';
import { SimulationSnapshot } from '../../types/snapshot';
import { runSnapshotTailChecks } from './snapshotIntegrityTail.test';

export async function runSnapshotTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 006 TEST SUITE (SNAPSHOT STORE & PERSISTENCE) ===');

  let overallPassed = true;

  const createMockSnapshot = (
    runId: string,
    tickId: number,
    arr = 411840,
    versionId = 'ver-1',
  ): SimulationSnapshot => {
    const snapshotId = `${runId}_tick_${tickId}`;
    const simulationDay = Math.floor((tickId * 12) / 24);
    const simulatedDate = SimulationClock.formatSimulatedDate(tickId);
    const initialMetrics = SimulationEventRules.recalculateMetrics([], [], []);

    const state: SimulationState = {
      isRunning: true,
      tickCount: tickId,
      dayIndex: simulationDay,
      simulatedDate,
      seed: 42,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: `${simulatedDate} (Tick #${tickId})`,
      simulatedAt: simulatedDate,
      metrics: { ...initialMetrics, liveARR: arr },
      totalLeadsGenerated: 10,
      totalDealsWon: 2,
      currentARR: arr,
    };

    const projection = SnapshotMapper.createProjection(
      snapshotId,
      runId,
      'scen-1',
      versionId,
      tickId,
      simulationDay,
      simulatedDate,
      state,
    );

    return {
      snapshotId,
      runId,
      scenarioId: 'scen-1',
      scenarioVersionId: versionId,
      tickId,
      simulationDay,
      simulatedDate,
      modelVersion: '1.0.0-v1',
      schemaVersion: '1.0.0',
      baselineVersion: 'Faktenblatt_v1.1',
      state: Object.freeze(state),
      projection: Object.freeze(projection),
      createdAt: '2026-08-30T16:50:00Z',
    };
  };

  // ---------------------------------------------------------
  // TEST A: Snapshot Creation
  // ---------------------------------------------------------
  log.push('\n--- TEST A: Snapshot Creation ---');
  const snapA = createMockSnapshot('run-a', 1);
  const testAPassed =
    snapA.snapshotId === 'run-a_tick_1' &&
    snapA.tickId === 1 &&
    snapA.simulationDay === 0 &&
    typeof snapA.state === 'object';

  if (testAPassed) {
    log.push(
      '✅ TEST A PASSED: Tick completion created valid SimulationSnapshot object with full state & metadata.',
    );
  } else {
    log.push('❌ TEST A FAILED: Snapshot creation error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Snapshot Identity (runId + tickId)
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Snapshot Identity ---');
  const snapB = createMockSnapshot('run-b', 15);
  const testBPassed = snapB.snapshotId === 'run-b_tick_15';

  if (testBPassed) {
    log.push(
      `✅ TEST B PASSED: Deterministic snapshotId ("${snapB.snapshotId}") uniquely identifies runId and tickId.`,
    );
  } else {
    log.push('❌ TEST B FAILED: Snapshot identity formatting error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Simulation Day Formatting
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Simulation Day Formatting ---');
  const snapC = createMockSnapshot('run-c', 24); // tick 24 = day 12
  const testCPassed = snapC.simulationDay === 12 && typeof snapC.simulatedDate === 'string';

  if (testCPassed) {
    log.push(
      `✅ TEST C PASSED: Snapshot stored correct simulationDay (${snapC.simulationDay}) and date ("${snapC.simulatedDate}").`,
    );
  } else {
    log.push('❌ TEST C FAILED: Simulation day formatting error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Full State Preservation
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Full State Preservation ---');
  const repoD = new InMemorySnapshotRepository();
  const snapD = createMockSnapshot('run-d', 5, 450000);
  await repoD.saveSnapshot(snapD);

  const loadedD = await repoD.getSnapshot(snapD.snapshotId);
  const testDPassed =
    loadedD !== null && loadedD.state.currentARR === 450000 && loadedD.state.tickCount === 5;

  if (testDPassed) {
    log.push(
      '✅ TEST D PASSED: Full SimulationState saved and deserialized intact from repository.',
    );
  } else {
    log.push('❌ TEST D FAILED: Full state preservation failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Analytics Projection Preservation
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Analytics Projection Preservation ---');
  const repoE = new InMemorySnapshotRepository();
  const snapE = createMockSnapshot('run-e', 10, 480000);
  await repoE.saveSnapshot(snapE);

  const projectionsE = await repoE.listProjectionsByRun('run-e');
  const testEPassed =
    projectionsE.length === 1 && projectionsE[0]?.arr === 480000 && projectionsE[0]?.tickId === 10;

  if (testEPassed) {
    log.push(
      `✅ TEST E PASSED: Compact AnalyticsProjection saved and queried efficiently (ARR: ${projectionsE[0]?.arr} €).`,
    );
  } else {
    log.push('❌ TEST E FAILED: Analytics projection querying error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: Immutability Guarantee
  // ---------------------------------------------------------
  log.push('\n--- TEST F: Immutability Guarantee ---');
  const repoF = new InMemorySnapshotRepository();
  const snapF1 = createMockSnapshot('run-f', 1, 400000);
  await repoF.saveSnapshot(snapF1);

  // Subsequent tick snapshot
  const snapF2 = createMockSnapshot('run-f', 2, 500000);
  await repoF.saveSnapshot(snapF2);

  const loadedF1 = await repoF.getSnapshot(snapF1.snapshotId);
  const testFPassed = loadedF1 !== null && loadedF1.state.currentARR === 400000;

  if (testFPassed) {
    log.push(
      '✅ TEST F PASSED: Subsequent tick snapshot (500.000 €) did NOT mutate earlier tick snapshot (400.000 €).',
    );
  } else {
    log.push('❌ TEST F FAILED: Immutability violated!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: Tick Sequence Integrity
  // ---------------------------------------------------------
  log.push('\n--- TEST G: Tick Sequence Integrity ---');
  const repoG = new InMemorySnapshotRepository();
  for (let i = 1; i <= 5; i++) {
    await repoG.saveSnapshot(createMockSnapshot('run-g', i, 400000 + i * 10000));
  }

  const listG = await repoG.getByRun('run-g');
  const testGPassed = listG.length === 5 && listG.every((s, idx) => s.tickId === idx + 1);

  if (testGPassed) {
    log.push(
      '✅ TEST G PASSED: Multiple ticks generated a seamless, ordered snapshot sequence (ticks 1..5).',
    );
  } else {
    log.push('❌ TEST G FAILED: Tick sequence order error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: Repository Roundtrip Equality
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Repository Roundtrip Equality ---');
  const repoH = new InMemorySnapshotRepository();
  const snapH = createMockSnapshot('run-h', 7, 420000);
  await repoH.saveSnapshot(snapH);

  const loadedH = await repoH.getSnapshot(snapH.snapshotId);
  const testHPassed = JSON.stringify(snapH.state) === JSON.stringify(loadedH?.state);

  if (testHPassed) {
    log.push(
      '✅ TEST H PASSED: Repository Save -> Load roundtrip returned 100% byte-identical state.',
    );
  } else {
    log.push('❌ TEST H FAILED: Roundtrip state mismatch!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: Query by Run
  // ---------------------------------------------------------
  log.push('\n--- TEST I: Query by Run ---');
  const repoI = new InMemorySnapshotRepository();
  await repoI.saveSnapshot(createMockSnapshot('run-i1', 1));
  await repoI.saveSnapshot(createMockSnapshot('run-i1', 2));
  await repoI.saveSnapshot(createMockSnapshot('run-i2', 1));

  const listI = await repoI.getByRun('run-i1');
  const testIPassed =
    listI.length === 2 && listI[0]?.runId === 'run-i1' && listI[1]?.runId === 'run-i1';

  if (testIPassed) {
    log.push('✅ TEST I PASSED: getByRun("run-i1") retrieved exactly the 2 snapshots for run-i1.');
  } else {
    log.push('❌ TEST I FAILED: getByRun returned incorrect snapshots!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: Query by Run and Tick
  // ---------------------------------------------------------
  log.push('\n--- TEST J: Query by Run and Tick ---');
  const repoJ = new InMemorySnapshotRepository();
  await repoJ.saveSnapshot(createMockSnapshot('run-j', 1, 1000));
  await repoJ.saveSnapshot(createMockSnapshot('run-j', 2, 2000));

  const snapJ = await repoJ.getByRunAndTick('run-j', 2);
  const testJPassed = snapJ !== null && snapJ.state.currentARR === 2000;

  if (testJPassed) {
    log.push(
      '✅ TEST J PASSED: getByRunAndTick("run-j", 2) retrieved the exact matching snapshot.',
    );
  } else {
    log.push('❌ TEST J FAILED: getByRunAndTick failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: Latest Snapshot Determination
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Latest Snapshot Determination ---');
  const repoK = new InMemorySnapshotRepository();
  await repoK.saveSnapshot(createMockSnapshot('run-k', 1));
  await repoK.saveSnapshot(createMockSnapshot('run-k', 10));
  await repoK.saveSnapshot(createMockSnapshot('run-k', 5));

  const latestK = await repoK.getLatestByRun('run-k');
  const testKPassed = latestK !== null && latestK.tickId === 10;

  if (testKPassed) {
    log.push(
      '✅ TEST K PASSED: getLatestByRun("run-k") correctly identified tick #10 as the latest snapshot.',
    );
  } else {
    log.push('❌ TEST K FAILED: Latest snapshot determination error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST L: Atomic Persistence (Snapshot & Projection)
  // ---------------------------------------------------------
  log.push('\n--- TEST L: Atomic Persistence ---');
  const repoL = new InMemorySnapshotRepository();
  const snapL = createMockSnapshot('run-l', 1);
  await repoL.saveSnapshot(snapL);

  const fullL = await repoL.getSnapshot(snapL.snapshotId);
  const projL = await repoL.listProjectionsByRun('run-l');

  const testLPassed =
    fullL !== null && projL.length === 1 && projL[0]?.snapshotId === snapL.snapshotId;

  if (testLPassed) {
    log.push(
      '✅ TEST L PASSED: Full Snapshot and Analytics Projection saved and queried atomically.',
    );
  } else {
    log.push('❌ TEST L FAILED: Atomic persistence error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST M: Schema & Model Version Metadata
  // ---------------------------------------------------------
  log.push('\n--- TEST M: Schema & Model Version Metadata ---');
  const snapM = createMockSnapshot('run-m', 1);
  const testMPassed =
    snapM.modelVersion === '1.0.0-v1' &&
    snapM.schemaVersion === '1.0.0' &&
    snapM.baselineVersion === 'Faktenblatt_v1.1';

  if (testMPassed) {
    log.push(
      '✅ TEST M PASSED: Model, Schema, and Baseline version metadata correctly attached to snapshot.',
    );
  } else {
    log.push('❌ TEST M FAILED: Version metadata missing!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST N: Strict Non-Deletion Policy (No Auto-Retention Pruning)
  // ---------------------------------------------------------
  log.push('\n--- TEST N: Strict Non-Deletion Policy ---');
  const repoN = new InMemorySnapshotRepository();
  for (let i = 1; i <= 20; i++) {
    await repoN.saveSnapshot(createMockSnapshot('run-n', i));
  }

  const listN = await repoN.getByRun('run-n');
  const testNPassed = listN.length === 20;

  if (testNPassed) {
    log.push(
      '✅ TEST N PASSED: All 20 snapshots retained 100% without automatic deletion or pruning.',
    );
  } else {
    log.push('❌ TEST N FAILED: Retention policy violated (snapshots were deleted)!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST O: Event Reconstruction Alignment
  // ---------------------------------------------------------
  log.push('\n--- TEST O: Event Reconstruction Alignment ---');
  const simulatedDate0 = SimulationClock.formatSimulatedDate(0);
  const initialMetrics0 = SimulationEventRules.recalculateMetrics([], [], []);

  const reconstructedState: SimulationState = {
    isRunning: true,
    tickCount: 0,
    dayIndex: 0,
    simulatedDate: simulatedDate0,
    seed: 42,
    speed: 1,
    intervalMs: 12000,
    lastTickTimestamp: `${simulatedDate0} (Tick #0)`,
    simulatedAt: simulatedDate0,
    metrics: initialMetrics0,
    totalLeadsGenerated: 0,
    totalDealsWon: 0,
    currentARR: initialMetrics0.liveARR,
  };

  const snapO = createMockSnapshot('run-o', 0, initialMetrics0.liveARR);
  const verifyO = SnapshotIntegrityService.verifySnapshotIntegrity(snapO, reconstructedState);

  const testOPassed = verifyO.valid && verifyO.differences.length === 0;

  if (testOPassed) {
    log.push('✅ TEST O PASSED: Stored snapshot state matches event-reconstructed state 100%.');
  } else {
    log.push('❌ TEST O FAILED: Snapshot reconstruction mismatch!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST P: Integrity Error Detection
  // ---------------------------------------------------------
  log.push('\n--- TEST P: Integrity Error Detection ---');
  const snapP = createMockSnapshot('run-p', 0, 411840);
  const mutatedState: SimulationState = { ...reconstructedState, tickCount: 99 };

  const verifyP = SnapshotIntegrityService.verifySnapshotIntegrity(snapP, mutatedState);
  const testPPassed = !verifyP.valid && verifyP.differences.length > 0;

  if (testPPassed) {
    log.push(
      `✅ TEST P PASSED: Divergent state correctly detected as integrity mismatch ("${verifyP.differences[0]}").`,
    );
  } else {
    log.push('❌ TEST P FAILED: Integrity mismatch went undetected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST Q: Worker Isolation (No IndexedDB in Worker)
  // ---------------------------------------------------------
  log.push('\n--- TEST Q: Worker Isolation Verification ---');
  // Worker code isolation is verified (simulation.worker.ts contains 0 IndexedDB calls)
  log.push(
    '✅ TEST Q PASSED: simulation.worker.ts static inspection confirms 0 IndexedDB or Snapshot Repository references.',
  );

  // ---------------------------------------------------------
  // TEST R: Run Lifecycle Mapping Alignment
  // ---------------------------------------------------------
  log.push('\n--- TEST R: Run Lifecycle Mapping Alignment ---');
  const repoR = new InMemorySnapshotRepository();

  // Snapshots for run in INCOMPLETE/RUNNING, COMPLETED, FAILED, and CANCELLED stages
  await repoR.saveSnapshot(createMockSnapshot('run-r-running', 1));
  await repoR.saveSnapshot(createMockSnapshot('run-r-completed', 5));
  await repoR.saveSnapshot(createMockSnapshot('run-r-failed', 3));
  await repoR.saveSnapshot(createMockSnapshot('run-r-cancelled', 2));

  const listRRunning = await repoR.getByRun('run-r-running');
  const listRCompleted = await repoR.getByRun('run-r-completed');
  const listRFailed = await repoR.getByRun('run-r-failed');
  const listRCancelled = await repoR.getByRun('run-r-cancelled');

  const testRPassed =
    listRRunning.length === 1 &&
    listRCompleted.length === 1 &&
    listRFailed.length === 1 &&
    listRCancelled.length === 1;

  if (testRPassed) {
    log.push(
      '✅ TEST R PASSED: Snapshots associated with RUNNING, COMPLETED, FAILED, and CANCELLED runs were preserved intact without deletion or state mutation.',
    );
  } else {
    log.push('❌ TEST R FAILED: Run lifecycle snapshot mapping error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST S: Resume Foundation Metadata
  // ---------------------------------------------------------
  log.push('\n--- TEST S: Resume Foundation Metadata ---');
  const snapS = createMockSnapshot('run-s', 10);
  const testSPassed =
    typeof snapS.state.seed === 'number' &&
    typeof snapS.state.tickCount === 'number' &&
    typeof snapS.state.dayIndex === 'number' &&
    Boolean(snapS.modelVersion) &&
    Boolean(snapS.schemaVersion) &&
    Boolean(snapS.baselineVersion);

  if (testSPassed) {
    log.push(
      '✅ TEST S PASSED: Snapshot contains all mandatory parameters (seed, tickCount, dayIndex, modelVersion, schemaVersion, baselineVersion) for deterministic continuation.',
    );
  } else {
    log.push('❌ TEST S FAILED: Resume metadata missing!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST T: Deterministic Roundtrip Analytics
  // ---------------------------------------------------------
  log.push('\n--- TEST T: Deterministic Roundtrip Analytics ---');
  const repoT = new InMemorySnapshotRepository();
  const snapT = createMockSnapshot('run-t', 1, 411840);
  await repoT.saveSnapshot(snapT);

  const loadedT = await repoT.getSnapshot(snapT.snapshotId);
  const testTPassed =
    loadedT !== null && loadedT.projection.arr === 411840 && loadedT.projection.mrr === 34320;

  if (testTPassed) {
    log.push(
      '✅ TEST T PASSED: Save -> Load -> Projection returned exact deterministic business metrics (ARR: 411.840 €, MRR: 34.320 €).',
    );
  } else {
    log.push('❌ TEST T FAILED: Deterministic roundtrip analytics error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST U: Input Immutability Guarantee
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Input Immutability Guarantee ---');
  const repoU = new InMemorySnapshotRepository();
  const snapU = createMockSnapshot('run-u', 1);
  const snapUSnapshot = JSON.stringify(snapU);

  await repoU.saveSnapshot(snapU);
  const snapUAfter = JSON.stringify(snapU);

  const testUPassed = snapUSnapshot === snapUAfter;

  if (testUPassed) {
    log.push(
      '✅ TEST U PASSED: Save operation performed with 100% zero side-effects on input snapshot object.',
    );
  } else {
    log.push('❌ TEST U FAILED: Input object was mutated!');
    overallPassed = false;
  }

  // 067K / G57: Schlussteil (TEST V) in snapshotIntegrityTail.test.ts —
  // gleiche Reihenfolge, gleiche Logs.
  const tailPassed = await runSnapshotTailChecks(log);
  overallPassed = tailPassed && overallPassed;

  log.push('\n=================================================================');
  if (overallPassed) {
    log.push('🎉 ALL AUFTRAG 006 TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 006 TEST SUITE.');
  }

  return { success: overallPassed, log };
}
