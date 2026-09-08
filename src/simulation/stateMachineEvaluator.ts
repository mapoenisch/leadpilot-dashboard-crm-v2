import { LeadStatus, SimulationLead, SimulationDeal } from '../types/simulation';
import { RejectedTransitionEntry, StateTransitionResult } from '../types/stateMachine';

export interface ClockContext {
  tick: number;
  simulatedDate: string;
}

/**
 * Functional, deterministic State Machine Evaluator (Auftrag 012).
 * Enforces strict allowed transition graphs for Leads, Deals, and Customers.
 * Guarantees 100% atomic state transitions (zero partial mutation on failure).
 */
export class StateMachineEvaluator {
  /**
   * Defined transition graph for Lead Status transitions.
   */
  private static readonly LEAD_TRANSITION_GRAPH: Record<LeadStatus, LeadStatus[]> = {
    New: ['MQL', 'Disqualified'],
    MQL: ['SQL', 'Disqualified'],
    SQL: ['Hot', 'Lost'],
    Hot: ['Won', 'Lost'],
    Won: [],
    Lost: [],
    Disqualified: [],
  };

  /**
   * Validates and executes a Lead status transition atomically.
   */
  public static validateAndTransitionLead(
    lead: SimulationLead,
    targetStatus: LeadStatus,
    actionName: string,
    clock: ClockContext
  ): StateTransitionResult<SimulationLead> {
    const allowedNextStates = this.LEAD_TRANSITION_GRAPH[lead.status] || [];

    if (!allowedNextStates.includes(targetStatus)) {
      const rejectedEntry: RejectedTransitionEntry = {
        id: `rej-lead-${lead.id}-t${clock.tick}-${targetStatus}`,
        entityId: lead.id,
        entityType: 'LEAD',
        fromState: lead.status,
        toState: targetStatus,
        action: actionName,
        reason: `Verbotene State Transition im Lead-Graph: Von '${lead.status}' direkt zu '${targetStatus}' ist unzulässig.`,
        rejectedAtTick: clock.tick,
        simulatedDate: clock.simulatedDate,
      };

      return {
        success: false,
        rejectedEntry,
      };
    }

    // Atomic new object creation (zero side-effect on input lead)
    const updatedLead: SimulationLead = {
      ...lead,
      status: targetStatus,
    };

    return {
      success: true,
      updatedEntity: updatedLead,
    };
  }

  /**
   * Validates and executes a Customer / Deal Churn transition atomically.
   */
  public static validateAndTransitionDealChurn(
    deal: SimulationDeal,
    clock: ClockContext
  ): StateTransitionResult<SimulationDeal> {
    if (deal.isChurned) {
      const rejectedEntry: RejectedTransitionEntry = {
        id: `rej-deal-${deal.id}-t${clock.tick}-churn`,
        entityId: deal.id,
        entityType: 'DEAL',
        fromState: 'CHURNED',
        toState: 'CHURNED',
        action: 'CHURN_CUSTOMER',
        reason: `CUSTOMER_CHURNED nur für aktuell aktive Kunden zulässig. Deal '${deal.id}' ist bereits gekündigt.`,
        rejectedAtTick: clock.tick,
        simulatedDate: clock.simulatedDate,
      };

      return {
        success: false,
        rejectedEntry,
      };
    }

    const updatedDeal: SimulationDeal = {
      ...deal,
      isChurned: true,
      churnedAtTick: clock.tick,
    };

    return {
      success: true,
      updatedEntity: updatedDeal,
    };
  }
}
