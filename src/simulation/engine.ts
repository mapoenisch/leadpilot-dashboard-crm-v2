import { DeterministicRNG } from './prng';
import { SimulationEventRules, SimulationClock, SimulationClockContext } from './eventRules';
import { SalesQueueManager } from './salesQueueManager';
import { CSQueueManager } from './csQueueManager';
import { SalesQueueEntry } from '../types/salesQueue';
import { CSQueueEntry } from '../types/csQueue';
import { TickInvariantValidator } from './tickInvariantValidator';
import { RejectedTransitionEntry } from '../types/stateMachine';
import { ChannelMix } from '../types/parameter';
import {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationState,
} from '../types/simulation';

export interface TickInput {
  state: SimulationState;
  rng: DeterministicRNG;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  salesRepCount?: number;
  csRepCount?: number;
  churnRateMonthly?: number;
  marketingBudgetYearly?: number;
  channelMix?: ChannelMix;
  trialToPaidConversion?: number;
  salesCycleDays?: number;
  discountPercent?: number;
  queueEntries?: SalesQueueEntry[];
  csQueueEntries?: CSQueueEntry[];
}

export interface TickOutput {
  state: SimulationState;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  newEvents: SimulationEvent[];
  queueEntries?: SalesQueueEntry[];
  csQueueEntries?: CSQueueEntry[];
}

/**
 * Pure, headless, synchronous Domain Simulation Engine.
 * ZERO dependencies on React, window, timers, CRMRepository, or Wall-Clock APIs.
 */
export class SimulationEngine {
  public static executeTick(input: TickInput): TickOutput {
    const nextTick = input.state.tickCount + 1;
    const dayIndex = SimulationClock.getDayIndex(nextTick);
    const simulatedDate = SimulationClock.formatSimulatedDate(dayIndex);
    const salesRepCount = input.salesRepCount ?? 2;
    const csRepCount = input.csRepCount ?? 2;
    const churnRateMonthly = input.churnRateMonthly ?? 2.8;

    const clock: SimulationClockContext = {
      tick: nextTick,
      dayIndex,
      simulatedDate,
      seed: input.state.seed,
    };

    const newEvents: SimulationEvent[] = [];
    let updatedLeads = [...input.leads];
    let updatedOpps = [...input.opportunities];
    let updatedDeals = [...input.deals];
    let updatedActivities = [...input.activities];

    // 1. Evaluate Inbound Lead Generation Rule
    const newLeadResult = SimulationEventRules.evaluateNewLeadRule(
      clock,
      input.rng,
      updatedLeads,
      input.marketingBudgetYearly,
      input.channelMix
    );
    let totalLeadsGenerated = input.state.totalLeadsGenerated;
    if (newLeadResult) {
      updatedLeads = [newLeadResult.lead, ...updatedLeads];
      updatedActivities = [newLeadResult.activity, ...updatedActivities];
      newEvents.push(newLeadResult.event);
      totalLeadsGenerated += 1;
    }

    // 2. Process Sales Queue & Capacity (Decisions 1349-1373)
    const existingQueueEntries = input.queueEntries ?? input.state.salesQueueProjection?.entries ?? [];
    const queueResult = SalesQueueManager.processTick(
      existingQueueEntries,
      salesRepCount,
      nextTick,
      updatedLeads
    );

    // 3. Process CS Queue & Capacity (Decisions 1374-1385)
    const existingCSQueueEntries = input.csQueueEntries ?? input.state.csQueueProjection?.entries ?? [];
    const csQueueResult = CSQueueManager.processTick(
      existingCSQueueEntries,
      csRepCount,
      nextTick,
      updatedDeals
    );

    // 4. Evaluate Qualification & Progression Rule
    const progressionResult = SimulationEventRules.evaluateLeadProgressionRule(
      clock,
      input.rng,
      updatedLeads,
      updatedOpps,
      input.trialToPaidConversion,
      input.salesCycleDays,
      input.discountPercent
    );

    const rejectedTransitions: RejectedTransitionEntry[] = [...(input.state.rejectedTransitions || [])];

    let totalDealsWon = input.state.totalDealsWon;
    if (progressionResult) {
      if (progressionResult.rejectedTransition) {
        rejectedTransitions.push(progressionResult.rejectedTransition);
      }
      if (progressionResult.updatedLead) {
        const idx = updatedLeads.findIndex((l) => l.id === progressionResult.updatedLead!.id);
        if (idx !== -1) {
          updatedLeads = [...updatedLeads];
          updatedLeads[idx] = progressionResult.updatedLead;
        }
      }
      if (progressionResult.newDeal) {
        updatedDeals = [progressionResult.newDeal, ...updatedDeals];
        totalDealsWon += 1;
      }
      if (progressionResult.activity) {
        updatedActivities = [progressionResult.activity, ...updatedActivities];
      }
      if (progressionResult.event) {
        newEvents.push(progressionResult.event);
      }
    }

    // 5. Evaluate Customer Health & Churn Rules (Decisions 1386-1398)
    const churnResult = SimulationEventRules.evaluateCustomerChurnRule(
      clock,
      input.rng,
      updatedDeals,
      csQueueResult.updatedEntries,
      churnRateMonthly
    );

    if (churnResult) {
      if (churnResult.rejectedTransitions?.length > 0) {
        rejectedTransitions.push(...churnResult.rejectedTransitions);
      }
      updatedDeals = churnResult.updatedDeals;
      for (const act of churnResult.activities) {
        updatedActivities = [act, ...updatedActivities];
      }
      for (const evt of churnResult.events) {
        newEvents.push(evt);
      }
      if (churnResult.reEngagementOpps.length > 0) {
        for (const opp of churnResult.reEngagementOpps) {
          updatedOpps = [opp, ...updatedOpps];
        }
      }
    }

    // 6. Recalculate Ebene B live & financial metrics
    const newWonDealsThisTick = progressionResult?.newDeal ? 1 : 0;
    const prevCumulativeCashFlow = input.state.cumulativeCashFlow ?? input.state.metrics?.financialMetrics?.cumulativeCashFlow ?? 0;

    const metrics = SimulationEventRules.recalculateMetrics(
      updatedLeads,
      updatedOpps,
      updatedDeals,
      queueResult.projection,
      csQueueResult.projection,
      csQueueResult.updatedEntries,
      66,
      34320,
      411840,
      {
        salesRepCount,
        csRepCount,
        newWonDealsThisTick,
        previousCumulativeCashFlow: prevCumulativeCashFlow,
        marketingBudgetYearly: input.marketingBudgetYearly,
      }
    );

    let updatedState: SimulationState = {
      ...input.state,
      tickCount: nextTick,
      dayIndex,
      simulatedDate,
      lastTickTimestamp: `${simulatedDate} (Tick #${nextTick})`,
      simulatedAt: simulatedDate,
      metrics,
      salesQueueProjection: queueResult.projection,
      csQueueProjection: csQueueResult.projection,
      cumulativeCashFlow: metrics.financialMetrics?.cumulativeCashFlow ?? prevCumulativeCashFlow,
      rejectedTransitions,
      totalLeadsGenerated,
      totalDealsWon,
      currentARR: metrics.liveARR,
    };

    // 7. Verify Tick Invariants (Decisions 1471-1473)
    const invariantReport = TickInvariantValidator.verifyTickInvariants(updatedState, updatedDeals, updatedLeads, 66);
    updatedState = {
      ...updatedState,
      hasInvariantViolation: invariantReport.hasViolation,
      invariantReport,
    };

    return {
      state: updatedState,
      leads: updatedLeads,
      opportunities: updatedOpps,
      deals: updatedDeals,
      activities: updatedActivities,
      newEvents,
      queueEntries: queueResult.updatedEntries,
      csQueueEntries: csQueueResult.updatedEntries,
    };
  }
}
