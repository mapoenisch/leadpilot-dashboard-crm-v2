import { SimulationState, SimulationDeal, SimulationLead } from '../types/simulation';
import { InvariantViolationReport } from '../types/stateMachine';

/**
 * Tick Invariant Engine (Auftrag 012).
 * Validates core simulation invariants after tick recalculation without crashing the engine.
 */
export class TickInvariantValidator {
  /**
   * Verifies tick invariants against current simulation state, deals, and leads.
   */
  public static verifyTickInvariants(
    state: SimulationState,
    deals: SimulationDeal[],
    leads: SimulationLead[],
    baseCustomers = 66
  ): InvariantViolationReport {
    const violations: string[] = [];
    const metrics = state.metrics;

    if (!metrics) {
      return {
        tick: state.tickCount,
        hasViolation: false,
        violations: [],
        verifiedAtDate: state.simulatedDate,
      };
    }

    // Invariante 1: ARR = MRR * 12 (mit Rundungstoleranz von max. 12 €)
    const expectedARRFromMRR = metrics.liveMRR * 12;
    if (Math.abs(metrics.liveARR - expectedARRFromMRR) > 12) {
      violations.push(
        `Invariante 1 verletzt: liveARR (${metrics.liveARR} €) entspricht nicht liveMRR × 12 (${expectedARRFromMRR} €).`
      );
    }

    // Invariante 2: Kein aktiver ARR nach CUSTOMER_CHURNED
    const churnedDeals = deals.filter((d) => d.isChurned);
    const activeDeals = deals.filter((d) => !d.isChurned);

    const activeWonARR = activeDeals.reduce((sum, d) => sum + (d.arr || 0), 0);
    const expectedARR = Math.max(0, 411840 + activeWonARR);
    if (metrics.liveARR !== expectedARR) {
      violations.push(
        `Invariante 2 verletzt: Gekündigte Verträge beeinflussen fälschlicherweise den aktiven liveARR (liveARR: ${metrics.liveARR} €, Erwartet: ${expectedARR} €).`
      );
    }

    // Invariante 3: liveCustomers Gleichung
    const expectedCustomers = Math.max(0, baseCustomers + activeDeals.length - churnedDeals.length);
    if (metrics.liveCustomers !== expectedCustomers) {
      violations.push(
        `Invariante 3 verletzt: liveCustomers (${metrics.liveCustomers}) entspricht nicht baseCustomers + WonDeals - ChurnedDeals (${expectedCustomers}).`
      );
    }

    // Invariante 4: Valide Funnel-Verteilung
    if (metrics.liveMQLs + metrics.liveSQLs + metrics.liveHotLeads > metrics.liveLeads && metrics.liveLeads > 0) {
      violations.push(
        `Invariante 4 verletzt: Summe qualifizierter Leads (${metrics.liveMQLs + metrics.liveSQLs + metrics.liveHotLeads}) übersteigt Gesamtzahl liveLeads (${metrics.liveLeads}).`
      );
    }

    return {
      tick: state.tickCount,
      hasViolation: violations.length > 0,
      violations,
      verifiedAtDate: state.simulatedDate,
    };
  }
}
