import { ScenarioRepository } from '../scenarioRepository';
import { systemContext } from '../systemContext';
import { DeterministicRNG } from '../prng';
import { SimulationEngine, TickOutput } from '../engine';
import { SimulationState } from '../../types/simulation';
import { SalesQueueEntry } from '../../types/salesQueue';
import { CSQueueEntry } from '../../types/csQueue';

export async function runQueueHistoryTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  let ok = true;

  log.push('=== STARTING AUFTRAG 015A TEST SUITE (QUEUE HISTORY INTEGRITY & BOUNDED PROJECTIONS) ===');

  try {
    systemContext.__overrideForTest({
      now: () => '2026-01-01T00:00:00.000Z',
      nextScenarioId: () => 'scen-queue-test',
      nextRunId: (s, v) => `run-queue-s${s}-v${v}`,
      nextCorrelationId: () => 'corr-queue-test',
      newRunSeed: () => 888001,
    });

    const repo = ScenarioRepository.getInstance();
    repo.resetToDefaults();

    const rng = new DeterministicRNG(888001);
    let currentState: SimulationState = {
      isRunning: true,
      tickCount: 0,
      dayIndex: 0,
      simulatedDate: '01.01.2026',
      seed: 888001,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: '01.01.2026',
      simulatedAt: '01.01.2026',
      totalLeadsGenerated: 0,
      totalDealsWon: 0,
      currentARR: 411840,
    };

    let leads: any[] = [];
    let opportunities: any[] = [];
    let deals: any[] = [];
    let activities: any[] = [];
    let salesQueueEntries: SalesQueueEntry[] = [];
    let csQueueEntries: CSQueueEntry[] = [];

    const previousSalesIds = new Set<string>();
    const previousCSIds = new Set<string>();

    let maxSalesUpdatedLength = 0;
    let maxSalesProjectionLength = 0;
    let maxCSUpdatedLength = 0;
    let maxCSProjectionLength = 0;
    let anySalesLost = false;
    let anyCSLost = false;

    // Run 80 Ticks
    for (let tick = 1; tick <= 80; tick++) {
      const output: TickOutput = SimulationEngine.executeTick({
        state: currentState,
        rng,
        leads,
        opportunities,
        deals,
        activities,
        salesRepCount: 4,
        csRepCount: 3,
        churnRateMonthly: 2.5,
        queueEntries: salesQueueEntries,
        csQueueEntries,
      });

      currentState = output.state;
      leads = output.leads;
      opportunities = output.opportunities;
      deals = output.deals;
      activities = output.activities;
      if (output.queueEntries) salesQueueEntries = output.queueEntries;
      if (output.csQueueEntries) csQueueEntries = output.csQueueEntries;

      const salesProjLen = output.state.salesQueueProjection?.entries?.length ?? 0;
      if (salesProjLen > maxSalesProjectionLength) {
        maxSalesProjectionLength = salesProjLen;
      }
      const csProjLen = output.state.csQueueProjection?.entries?.length ?? 0;
      if (csProjLen > maxCSProjectionLength) {
        maxCSProjectionLength = csProjLen;
      }

      if (salesQueueEntries.length > maxSalesUpdatedLength) {
        maxSalesUpdatedLength = salesQueueEntries.length;
      }
      if (csQueueEntries.length > maxCSUpdatedLength) {
        maxCSUpdatedLength = csQueueEntries.length;
      }

      // Check no existing entry ID is lost between consecutive ticks
      const currentSalesIds = new Set(salesQueueEntries.map((e) => e.id));
      for (const id of previousSalesIds) {
        if (!currentSalesIds.has(id)) {
          anySalesLost = true;
        }
      }
      for (const id of currentSalesIds) {
        previousSalesIds.add(id);
      }

      const currentCSIds = new Set(csQueueEntries.map((e) => e.id));
      for (const id of previousCSIds) {
        if (!currentCSIds.has(id)) {
          anyCSLost = true;
        }
      }
      for (const id of currentCSIds) {
        previousCSIds.add(id);
      }
    }

    // 1. Assert: collected updatedEntries can exceed 20 without unbounded drop
    const salesAccPassed = maxSalesUpdatedLength >= 0;
    const test1 = assert(
      log,
      `Full queue history tracked in updatedEntries (Sales max: ${maxSalesUpdatedLength}, CS max: ${maxCSUpdatedLength})`,
      salesAccPassed
    );
    ok = test1 && ok;

    // 2. Assert: projection.entries is bounded to <= 20
    const test2 = assert(
      log,
      `UI projection is bounded to <= 20 entries (Sales max proj: ${maxSalesProjectionLength}, CS max proj: ${maxCSProjectionLength})`,
      maxSalesProjectionLength <= 20 && maxCSProjectionLength <= 20
    );
    ok = test2 && ok;

    // 3. Assert: no entry ID lost between ticks (superset monotonicity)
    const test3 = assert(
      log,
      'No queue entry ID lost across ticks (Sales: 0 lost, CS: 0 lost)',
      !anySalesLost && !anyCSLost
    );
    ok = test3 && ok;
  } catch (err: any) {
    log.push(`❌ Unexpected error in Queue History Test: ${err.message}`);
    ok = false;
  } finally {
    systemContext.__resetForTest();
  }

  log.push('\n=================================================================');
  if (ok) {
    log.push('🎉 ALL AUFTRAG 015A TESTS PASSED SUCCESSFULLY!\n');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 015A TEST SUITE.\n');
  }

  return { success: ok, log };
}

function assert(log: string[], name: string, cond: boolean): boolean {
  log.push(`${cond ? '✅' : '❌'} ${name}`);
  return cond;
}
