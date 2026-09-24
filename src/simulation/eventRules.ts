import { DeterministicRNG } from './prng';
import { SalesQueueProjection } from '../types/salesQueue';
import { CSQueueEntry, CSQueueProjection } from '../types/csQueue';
import { RejectedTransitionEntry } from '../types/stateMachine';
import { ChannelMix } from '../types/parameter';
import {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationMetrics,
  SimulationOpportunity,
} from '../types/simulation';
import {
  evaluateCustomerChurnRule as evaluateCustomerChurnRuleFn,
  recalculateMetrics as recalculateMetricsFn,
} from './eventChurnMetrics';
import {
  evaluateLeadProgressionRule as evaluateLeadProgressionRuleFn,
  evaluateNewLeadRule as evaluateNewLeadRuleFn,
} from './eventLeadRules';

/**
 * Explicit clock encapsulation & rules.
 * 1 tick = 1 day in V1 simulation cadence.
 */
export const TICKS_PER_DAY = 1;

export class SimulationClock {
  public static getDayIndex(tick: number): number {
    return Math.floor(tick / TICKS_PER_DAY);
  }

  public static formatSimulatedDate(dayIndex: number): string {
    const startYear = 2026;
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let d = dayIndex;
    let m = 0;
    let y = startYear;
    while (true) {
      const monthDays = daysInMonths[m];
      if (monthDays === undefined) {
        // Unerreichbar: m bleibt durch Modulo-Arithmetik in [0, 11].
        throw new Error('Monatsindex außerhalb des Kalenders.');
      }
      if (d < monthDays) break;
      d -= monthDays;
      m = (m + 1) % 12;
      if (m === 0) y++;
    }
    const dayStr = String(d + 1).padStart(2, '0');
    const monthStr = String(m + 1).padStart(2, '0');
    return `${dayStr}.${monthStr}.${y}`;
  }
}

export function formatSimulatedDate(dayIndex: number): string {
  return SimulationClock.formatSimulatedDate(dayIndex);
}

export interface SimulationClockContext {
  tick: number;
  dayIndex: number;
  simulatedDate: string;
  seed: number;
}

// 067K / G57 — aufgeteilte Regelfassade (Architekturentscheidung: reine
// Code-Bewegung in eventLeadRules/eventChurnMetrics, keine
// Verhaltensänderung). Alle Aufrufer (Engine, Worker, Tests) unverändert.
export class SimulationEventRules {
  /**
   * Evaluates new inbound lead creation rule using PRNG and ClockContext.
   */
  public static evaluateNewLeadRule(
    clock: SimulationClockContext,
    rng: DeterministicRNG,
    _existingLeads: SimulationLead[],
    marketingBudgetYearly = 65000,
    channelMix?: ChannelMix,
  ): { lead: SimulationLead; event: SimulationEvent; activity: SimulationActivity } | null {
    return evaluateNewLeadRuleFn(clock, rng, _existingLeads, marketingBudgetYearly, channelMix);
  }

  /**
   * Evaluates progression of active leads through qualification stages.
   */
  public static evaluateLeadProgressionRule(
    clock: SimulationClockContext,
    rng: DeterministicRNG,
    leads: SimulationLead[],
    _opportunities: SimulationOpportunity[],
    trialToPaidConversion = 18,
    salesCycleDays = 38,
    discountPercent = 0,
  ): {
    updatedLead?: SimulationLead;
    newOpportunity?: SimulationOpportunity;
    newDeal?: SimulationDeal;
    event?: SimulationEvent;
    activity?: SimulationActivity;
    rejectedTransition?: RejectedTransitionEntry;
  } | null {
    return evaluateLeadProgressionRuleFn(
      clock,
      rng,
      leads,
      _opportunities,
      trialToPaidConversion,
      salesCycleDays,
      discountPercent,
    );
  }

  /**
   * Evaluates Customer Health, Churn Risk, and Re-Engagement rules (Decisions 1386-1398).
   */
  public static evaluateCustomerChurnRule(
    clock: SimulationClockContext,
    rng: DeterministicRNG,
    deals: SimulationDeal[],
    csQueueEntries: CSQueueEntry[],
    churnRateMonthly: number,
  ): {
    updatedDeals: SimulationDeal[];
    events: SimulationEvent[];
    activities: SimulationActivity[];
    reEngagementOpps: SimulationOpportunity[];
    rejectedTransitions: RejectedTransitionEntry[];
  } | null {
    return evaluateCustomerChurnRuleFn(clock, rng, deals, csQueueEntries, churnRateMonthly);
  }

  /**
   * Recalculates all real-time simulation metrics (Ebene B).
   * Historical base values: ARR 411.840 €, MRR 34.320 €, 66 Customers.
   */
  public static recalculateMetrics(
    leads: SimulationLead[],
    opportunities: SimulationOpportunity[],
    deals: SimulationDeal[],
    salesQueueProjection?: SalesQueueProjection,
    csQueueProjection?: CSQueueProjection,
    csQueueEntries?: CSQueueEntry[],
    baseCustomers = 66,
    baseMRR = 34320,
    baseARR = 411840,
    financialOptions?: {
      salesRepCount?: number;
      csRepCount?: number;
      newWonDealsThisTick?: number;
      previousCumulativeCashFlow?: number;
      marketingBudgetYearly?: number;
    },
  ): SimulationMetrics {
    return recalculateMetricsFn(
      leads,
      opportunities,
      deals,
      salesQueueProjection,
      csQueueProjection,
      csQueueEntries,
      baseCustomers,
      baseMRR,
      baseARR,
      financialOptions,
    );
  }
}
