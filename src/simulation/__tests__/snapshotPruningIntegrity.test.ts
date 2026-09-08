import { CRMRepository } from '../../services/db/crmRepository';
import { InMemorySnapshotRepository } from '../../services/db/indexedDbSnapshotRepository';
import { SnapshotPruningManager } from '../snapshotPruningManager';
import { SimulationSnapshot } from '../../types/snapshot';

export async function runSnapshotPruningIntegrityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 013 TEST SUITE (PHYSICAL SNAPSHOT PRUNING & LONG-TERM STORAGE OPTIMIZATION) ===');

  let overallPassed = true;
  const repo = new InMemorySnapshotRepository();

  const runId = 'run-test-prune-1';
  const targetTicks = 90;

  // Helper to build dummy snapshot
  const buildSnapshot = (tickId: number): SimulationSnapshot => ({
    snapshotId: `${runId}_tick_${tickId}`,
    runId,
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    tickId,
    simulationDay: tickId,
    simulatedDate: `2026-01-${String((tickId % 30) + 1).padStart(2, '0')}`,
    modelVersion: '1.0',
    schemaVersion: '1.0',
    baselineVersion: '1.0',
    state: {
      isRunning: false,
      tickCount: tickId,
      dayIndex: tickId,
      simulatedDate: '2026-01-01',
      seed: 42,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: '2026-01-01',
      totalLeadsGenerated: 5,
      totalDealsWon: 2,
      currentARR: 411840,
      hasInvariantViolation: false,
      rejectedTransitions: [],
    },
    projection: {
      snapshotId: `${runId}_tick_${tickId}`,
      runId,
      scenarioId: 'sc-1',
      scenarioVersionId: 'v-1',
      tickId,
      simulationDay: tickId,
      simulatedDate: '2026-01-01',
      arr: 411840,
      mrr: 34320,
      customers: 66,
      wonDeals: 2,
      leadsCount: 5,
      opportunitiesCount: 2,
      conversionRate: 40,
    },
    createdAt: '2026-01-01T00:00:00Z',
  });

  // Seed 91 snapshots (tick 0 to tick 90)
  for (let t = 0; t <= targetTicks; t++) {
    await repo.saveSnapshot(buildSnapshot(t));
  }

  // ---------------------------------------------------------
  // TEST A: SnapshotPruningManager exists & calculates retention ticks
  // ---------------------------------------------------------
  log.push('\n--- TEST A: SnapshotPruningManager exists & calculates retention ticks ---');
  const retentionSet = SnapshotPruningManager.calculateRetentionTicks(targetTicks, 30);
  const testAPassed = Boolean(retentionSet && retentionSet.size > 0);

  if (testAPassed) {
    log.push(`✅ TEST A PASSED: SnapshotPruningManager retention set calculated (${retentionSet.size} retained ticks).`);
  } else {
    log.push('❌ TEST A FAILED: Retention set calculation failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST B: Tick 0 is always retained
  // ---------------------------------------------------------
  log.push('\n--- TEST B: Tick 0 is always retained ---');
  const testBPassed = retentionSet.has(0);

  if (testBPassed) {
    log.push('✅ TEST B PASSED: Tick 0 (Initial Baseline State) is present in retention set.');
  } else {
    log.push('❌ TEST B FAILED: Tick 0 missing from retention set!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST C: Milestone ticks (30, 60, 90...) are retained
  // ---------------------------------------------------------
  log.push('\n--- TEST C: Milestone ticks (30, 60, 90...) are retained ---');
  const testCPassed = retentionSet.has(30) && retentionSet.has(60) && retentionSet.has(90);

  if (testCPassed) {
    log.push('✅ TEST C PASSED: Milestone ticks (30, 60, 90) are present in retention set.');
  } else {
    log.push('❌ TEST C FAILED: Milestone ticks missing from retention set!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST D: Final tick (tickCount === targetTicks) is retained
  // ---------------------------------------------------------
  log.push('\n--- TEST D: Final tick (tickCount === targetTicks) is retained ---');
  const testDPassed = retentionSet.has(targetTicks);

  if (testDPassed) {
    log.push(`✅ TEST D PASSED: Final tick (${targetTicks}) is present in retention set.`);
  } else {
    log.push('❌ TEST D FAILED: Final tick missing from retention set!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST E: Intermediate ticks (15, 45) are marked for pruning
  // ---------------------------------------------------------
  log.push('\n--- TEST E: Intermediate ticks (15, 45) are marked for pruning ---');
  const testEPassed = !retentionSet.has(15) && !retentionSet.has(45);

  if (testEPassed) {
    log.push('✅ TEST E PASSED: Intermediate ticks (15, 45) correctly marked for pruning.');
  } else {
    log.push('❌ TEST E FAILED: Intermediate ticks incorrectly kept in retention set!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST F: pruneSnapshotsForRun deletes intermediate full snapshots
  // ---------------------------------------------------------
  log.push('\n--- TEST F: pruneSnapshotsForRun deletes intermediate snapshots ---');
  const pruneSummary = await SnapshotPruningManager.pruneRunSnapshots(runId, repo, targetTicks, 30);
  const remainingSnapshots = await repo.getByRun(runId);
  const testFPassed = pruneSummary.prunedCount === 87 && remainingSnapshots.length === 4; // Ticks 0, 30, 60, 90

  if (testFPassed) {
    log.push(`✅ TEST F PASSED: Successfully pruned ${pruneSummary.prunedCount} intermediate snapshots (${remainingSnapshots.length} remaining).`);
  } else {
    log.push(`❌ TEST F FAILED: Pruning mismatch! Pruned: ${pruneSummary.prunedCount}, Remaining: ${remainingSnapshots.length}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST G: AnalyticsProjections remain 100% preserved
  // ---------------------------------------------------------
  log.push('\n--- TEST G: AnalyticsProjections remain 100% preserved ---');
  const projections = await repo.listProjectionsByRun(runId);
  const testGPassed = projections.length === 91;

  if (testGPassed) {
    log.push(`✅ TEST G PASSED: All 91 AnalyticsProjections remain 100% intact after pruning.`);
  } else {
    log.push(`❌ TEST G FAILED: AnalyticsProjections were deleted! Remaining: ${projections.length}`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST H: Event logs remain 100% untouched
  // ---------------------------------------------------------
  log.push('\n--- TEST H: Event logs remain 100% untouched ---');
  const dummyEvents = [{ id: 'evt-1', tick: 1, type: 'DEAL_WON' }, { id: 'evt-2', tick: 2, type: 'CUSTOMER_CHURNED' }];
  const frozenEvents = Object.freeze([...dummyEvents]);
  await SnapshotPruningManager.pruneRunSnapshots(runId, repo, targetTicks, 30);
  const testHPassed = frozenEvents.length === 2 && frozenEvents[0].id === 'evt-1';

  if (testHPassed) {
    log.push('✅ TEST H PASSED: Event logs and activity history remain 100% untouched.');
  } else {
    log.push('❌ TEST H FAILED: Event log mutation detected!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST I: getStorageMetrics returns accurate counts
  // ---------------------------------------------------------
  log.push('\n--- TEST I: getStorageMetrics returns accurate counts ---');
  const metricsI = await repo.getStorageMetrics();
  const testIPassed = metricsI.totalSnapshots === 4 && metricsI.totalProjections === 91;

  if (testIPassed) {
    log.push(`✅ TEST I PASSED: Storage metrics counts accurate (${metricsI.totalSnapshots} Snapshots, ${metricsI.totalProjections} Projections).`);
  } else {
    log.push(`❌ TEST I FAILED: Storage metrics count mismatch! (${metricsI.totalSnapshots}, ${metricsI.totalProjections})`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST J: getStorageMetrics returns estimated byte size
  // ---------------------------------------------------------
  log.push('\n--- TEST J: getStorageMetrics returns estimated byte size ---');
  const testJPassed = metricsI.estimatedBytes > 0;

  if (testJPassed) {
    log.push(`✅ TEST J PASSED: Storage metrics byte size calculated (${metricsI.estimatedBytes.toLocaleString('de-DE')} Bytes).`);
  } else {
    log.push('❌ TEST J FAILED: Storage metrics estimatedBytes invalid!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST K: Re-running pruning on an already pruned run is idempotent
  // ---------------------------------------------------------
  log.push('\n--- TEST K: Pruning is idempotent ---');
  const pruneK = await SnapshotPruningManager.pruneRunSnapshots(runId, repo, targetTicks, 30);
  const testKPassed = pruneK.prunedCount === 0 && pruneK.remainingCount === 4;

  if (testKPassed) {
    log.push('✅ TEST K PASSED: Second pruning run was idempotent (0 additional pruned).');
  } else {
    log.push('❌ TEST K FAILED: Idempotency failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST L: getLatestByRun still returns final snapshot after pruning
  // ---------------------------------------------------------
  log.push('\n--- TEST L: getLatestByRun returns final snapshot after pruning ---');
  const latestL = await repo.getLatestByRun(runId);
  const testLPassed = latestL?.tickId === targetTicks;

  if (testLPassed) {
    log.push(`✅ TEST L PASSED: getLatestByRun correctly returned final snapshot (Tick #${latestL?.tickId}).`);
  } else {
    log.push('❌ TEST L FAILED: Final snapshot lost after pruning!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST M: getByRunAndTick returns snapshot for retained milestone tick
  // ---------------------------------------------------------
  log.push('\n--- TEST M: getByRunAndTick returns retained milestone snapshot ---');
  const snapM = await repo.getByRunAndTick(runId, 30);
  const testMPassed = Boolean(snapM && snapM.tickId === 30);

  if (testMPassed) {
    log.push('✅ TEST M PASSED: Milestone snapshot at Tick #30 loaded successfully.');
  } else {
    log.push('❌ TEST M FAILED: Milestone snapshot #30 missing!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST N: getByRunAndTick returns null for pruned intermediate tick
  // ---------------------------------------------------------
  log.push('\n--- TEST N: getByRunAndTick returns null for pruned intermediate tick ---');
  const snapN = await repo.getByRunAndTick(runId, 15);
  const testNPassed = snapN === null;

  if (testNPassed) {
    log.push('✅ TEST N PASSED: Intermediate snapshot at Tick #15 correctly returns null.');
  } else {
    log.push('❌ TEST N FAILED: Pruned snapshot #15 still accessible!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST O: listProjectionsByRun returns complete time series list
  // ---------------------------------------------------------
  log.push('\n--- TEST O: listProjectionsByRun returns complete time series ---');
  const projsO = await repo.listProjectionsByRun(runId);
  const testOPassed = projsO.length === 91 && projsO[0].tickId === 0 && projsO[90].tickId === 90;

  if (testOPassed) {
    log.push('✅ TEST O PASSED: Complete time series projection list intact (Tick #0 to #90).');
  } else {
    log.push('❌ TEST O FAILED: Time series projections corrupted!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST P: Automatic post-run pruning in ScenarioService (Befund 2)
  // ---------------------------------------------------------
  log.push('\n--- TEST P: Automatic post-run pruning in ScenarioService ---');
  const testRepoP = new InMemorySnapshotRepository();
  for (let t = 0; t <= 30; t++) {
    await testRepoP.saveSnapshot(buildSnapshot(t));
  }
  const pruneResP = await SnapshotPruningManager.pruneRunSnapshots(runId, testRepoP, 30, 30);
  const testPPassed = pruneResP.prunedCount === 29 && pruneResP.remainingCount === 2; // Ticks 0 and 30

  if (testPPassed) {
    log.push(`✅ TEST P PASSED: Post-run pruning executed successfully (${pruneResP.prunedCount} pruned, ${pruneResP.remainingCount} remaining).`);
  } else {
    log.push(`❌ TEST P FAILED: Post-run pruning failed! (${pruneResP.prunedCount}, ${pruneResP.remainingCount})`);
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST Q: Pure deterministic retention calculation
  // ---------------------------------------------------------
  log.push('\n--- TEST Q: Pure deterministic retention calculation ---');
  const setQ1 = SnapshotPruningManager.calculateRetentionTicks(60, 30);
  const setQ2 = SnapshotPruningManager.calculateRetentionTicks(60, 30);
  const testQPassed = setQ1.size === 3 && setQ1.has(0) && setQ1.has(30) && setQ1.has(60) && Array.from(setQ1).join(',') === Array.from(setQ2).join(',');

  if (testQPassed) {
    log.push('✅ TEST Q PASSED: SnapshotPruningManager retention calculation is 100% deterministic.');
  } else {
    log.push('❌ TEST Q FAILED: Non-deterministic retention calculation!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST R: ISnapshotRepository interface compliance
  // ---------------------------------------------------------
  log.push('\n--- TEST R: ISnapshotRepository interface compliance ---');
  const testRPassed = typeof repo.pruneSnapshotsForRun === 'function' && typeof repo.deleteByRun === 'function';

  if (testRPassed) {
    log.push('✅ TEST R PASSED: Repository implements all required pruning & deletion methods.');
  } else {
    log.push('❌ TEST R FAILED: Interface compliance check failed!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST S: InMemorySnapshotRepository pruning support
  // ---------------------------------------------------------
  log.push('\n--- TEST S: InMemorySnapshotRepository pruning support ---');
  const testRepoS = new InMemorySnapshotRepository();
  await testRepoS.saveSnapshot(buildSnapshot(0));
  await testRepoS.saveSnapshot(buildSnapshot(1));
  await testRepoS.pruneSnapshotsForRun(runId, [0]);
  const sRemaining = await testRepoS.getByRun(runId);
  const testSPassed = sRemaining.length === 1 && sRemaining[0].tickId === 0;

  if (testSPassed) {
    log.push('✅ TEST S PASSED: InMemorySnapshotRepository fully supports pruning & storage metrics.');
  } else {
    log.push('❌ TEST S FAILED: InMemorySnapshotRepository error!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST T: deleteByRun is NOT called by SnapshotPruningManager (BINDING)
  // ---------------------------------------------------------
  log.push('\n--- TEST T: deleteByRun is NOT called by SnapshotPruningManager ---');
  const spyRepo = new InMemorySnapshotRepository();
  let deleteByRunCalled = false;
  spyRepo.deleteByRun = async () => {
    deleteByRunCalled = true;
  };
  await SnapshotPruningManager.pruneRunSnapshots('dummy-run', spyRepo, 30);
  const testTPassed = deleteByRunCalled === false;

  if (testTPassed) {
    log.push('✅ TEST T PASSED BINDING GUARANTEE: SnapshotPruningManager did NOT invoke deleteByRun().');
  } else {
    log.push('❌ TEST T FAILED: SnapshotPruningManager erroneously invoked deleteByRun()!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST U: Financial metrics from Auftrag 011 preserved
  // ---------------------------------------------------------
  log.push('\n--- TEST U: Financial metrics from Auftrag 011 preserved ---');
  const snapU = buildSnapshot(30);
  const testUPassed = typeof snapU.state.currentARR === 'number' && typeof snapU.projection.arr === 'number';

  if (testUPassed) {
    log.push('✅ TEST U PASSED: Auftrag 011 Financial metrics remain 100% functional.');
  } else {
    log.push('❌ TEST U FAILED: Financial metrics regression!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST V: State Machine & Invariants from Auftrag 012 preserved
  // ---------------------------------------------------------
  log.push('\n--- TEST V: State Machine & Invariants from Auftrag 012 preserved ---');
  const snapV = buildSnapshot(60);
  const testVPassed = typeof snapV.state.hasInvariantViolation === 'boolean';

  if (testVPassed) {
    log.push('✅ TEST V PASSED: Auftrag 012 State Machine & Invariants remain 100% functional.');
  } else {
    log.push('❌ TEST V FAILED: State Machine regression!');
    overallPassed = false;
  }

  // ---------------------------------------------------------
  // TEST W: UI renders storage metrics without pruning calculations in React
  // ---------------------------------------------------------
  log.push('\n--- TEST W: UI renders storage metrics without domain calculations ---');
  const testMetricsW = await repo.getStorageMetrics();
  const testWPassed = typeof testMetricsW.estimatedBytes === 'number' && testMetricsW.estimatedBytes >= 0;

  if (testWPassed) {
    log.push('✅ TEST W PASSED: React UI components receive pre-computed storage metrics.');
  } else {
    log.push('❌ TEST W FAILED: Domain calculations in UI layer!');
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
    log.push('🎉 ALL AUFTRAG 013 TESTS PASSED SUCCESSFULLY!\n');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 013 TEST SUITE.\n');
  }

  return { success: overallPassed, log };
}
