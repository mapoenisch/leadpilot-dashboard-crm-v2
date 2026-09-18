import { DeterministicRNG } from './prng';
import { SalesQueueProjection } from '../types/salesQueue';
import { SalesQueueManager } from './salesQueueManager';
import { CSQueueManager } from './csQueueManager';
import { CSQueueEntry, CSQueueProjection } from '../types/csQueue';
import { FinancialModelManager } from './financialModelManager';
import { StateMachineEvaluator } from './stateMachineEvaluator';
import { RejectedTransitionEntry } from '../types/stateMachine';
import {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationMetrics,
  SimulationOpportunity,
} from '../types/simulation';
import { SimulationClockContext } from './eventRules';

// 067K / G57 — aus eventRules.ts herausgelöste Churn- und Metrik-Regeln
// (reine Code-Bewegung, keine Verhaltensänderung; Decisions 1386-1398).
// SimulationEventRules delegiert.
export function evaluateCustomerChurnRule(
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
  const activeDeals = deals.filter((d) => !d.isChurned);
  if (activeDeals.length === 0) return null;

  const updatedDeals = [...deals];
  const events: SimulationEvent[] = [];
  const activities: SimulationActivity[] = [];
  const reEngagementOpps: SimulationOpportunity[] = [];
  const rejectedTransitions: RejectedTransitionEntry[] = [];
  const timestampText = `${clock.simulatedDate} (Tick #${clock.tick})`;

  for (let i = 0; i < updatedDeals.length; i++) {
    const deal = updatedDeals[i];
    if (!deal) {
      // Unerreichbar: i läuft über updatedDeals.length.
      throw new Error('Deal-Index außerhalb des gültigen Bereichs.');
    }
    if (deal.isChurned) continue;

    const csEntry = csQueueEntries.find(
      (e) => e.customerId === deal.id || e.companyName === deal.companyName,
    );
    const queueTicks = csEntry ? csEntry.queueTicks : 0;

    // Deterministic health factors
    const onboardingScore = Math.min(100, Math.max(50, 80 + rng.nextInt(-10, 10)));
    const supportScore = Math.min(100, Math.max(40, 75 + rng.nextInt(-15, 15)));
    const engagementScore = Math.min(100, Math.max(40, 80 + rng.nextInt(-15, 15)));
    const openIssuesScore = Math.min(100, Math.max(50, 85 + rng.nextInt(-15, 10)));

    const healthScore = CSQueueManager.calculateHealthScore({
      onboardingScore,
      supportScore,
      engagementScore,
      openIssuesScore,
      csQueueTimePenalty: queueTicks * 2,
    });

    const churnRisk = CSQueueManager.calculateChurnRisk(healthScore, queueTicks, churnRateMonthly);

    // Update healthScore on deal object
    updatedDeals[i] = {
      ...deal,
      healthScore,
    };

    // Roll PRNG for churn check
    const churnRoll = rng.next();
    if (churnRoll < churnRisk) {
      const transitionRes = StateMachineEvaluator.validateAndTransitionDealChurn(deal, clock);
      if (!transitionRes.success) {
        if (transitionRes.rejectedEntry) {
          rejectedTransitions.push(transitionRes.rejectedEntry);
        }
        continue;
      }

      const cause = CSQueueManager.classifyChurnCause(healthScore, queueTicks);

      const churnedDeal: SimulationDeal = {
        ...transitionRes.updatedEntity!,
        healthScore,
        churnCause: cause,
      };
      updatedDeals[i] = churnedDeal;

      // 1. Emit CUSTOMER_CHURNED event
      events.push({
        id: `evt-s${clock.seed}-t${clock.tick}-churn-${deal.id}`,
        tick: clock.tick,
        dayIndex: clock.dayIndex,
        simulatedDate: clock.simulatedDate,
        type: 'CUSTOMER_CHURNED',
        title: `⚠️ KUNDE GEKÜNDIGT: ${deal.companyName}`,
        details: `Kündigung erfasst. Ursache: ${cause} (Health Score: ${healthScore}/100, Warteticks: ${queueTicks}). ARR-Verlust: ${deal.arr.toLocaleString('de-DE')} €.`,
        affectedDeal: churnedDeal,
        churnCause: cause,
        timestamp: timestampText,
      });

      activities.push({
        id: `act-s${clock.seed}-t${clock.tick}-churn-${deal.id}`,
        tick: clock.tick,
        type: 'Customer Churned',
        description: `Kündigung von ${deal.companyName} (${cause}).`,
        entityName: deal.companyName,
        timestamp: timestampText,
      });

      // 2. Trigger Re-Engagement process with parentDealId (Decisions 1393-1395)
      const reOpp: SimulationOpportunity = {
        id: `opp-re-s${clock.seed}-t${clock.tick}-${deal.id}`,
        leadId: `lead-re-${deal.id}`,
        title: `Re-Engagement: ${deal.companyName}`,
        companyName: deal.companyName,
        stage: 'Discovery',
        value: deal.arr,
        probability: 20,
        createdTick: clock.tick,
        parentDealId: deal.id, // Linking back to original churned deal
      };
      reEngagementOpps.push(reOpp);

      events.push({
        id: `evt-s${clock.seed}-t${clock.tick}-reopp-${deal.id}`,
        tick: clock.tick,
        dayIndex: clock.dayIndex,
        simulatedDate: clock.simulatedDate,
        type: 'RE_ENGAGEMENT_STARTED',
        title: `🔄 Re-Engagement gestartet: ${deal.companyName}`,
        details: `Neuer Akquisitionsvorgang mit parentDealId=${deal.id} angelegt. Ursprüngliche Deal-Historie bleibt unverändert.`,
        affectedOpportunity: reOpp,
        affectedDeal: churnedDeal,
        timestamp: timestampText,
      });

      activities.push({
        id: `act-s${clock.seed}-t${clock.tick}-reopp-${deal.id}`,
        tick: clock.tick,
        type: 'Re-Engagement Triggered',
        description: `Re-Engagement Pipeline eröffnet für ${deal.companyName} (parentDealId: ${deal.id}).`,
        entityName: deal.companyName,
        timestamp: timestampText,
      });
    }
  }

  return { updatedDeals, events, activities, reEngagementOpps, rejectedTransitions };
}

/**
 * Recalculates all real-time simulation metrics (Ebene B).
 * Historical base values: ARR 411.840 €, MRR 34.320 €, 66 Customers.
 */
export function recalculateMetrics(
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
  const liveLeads = leads.length;
  const liveMQLs = leads.filter((l) => l.status === 'MQL').length;
  const liveSQLs = leads.filter((l) => l.status === 'SQL').length;
  const liveHotLeads = leads.filter((l) => l.status === 'Hot').length;

  const activeDeals = deals.filter((d) => !d.isChurned);
  const churnedDeals = deals.filter((d) => d.isChurned);

  const liveWonDeals = activeDeals.length;
  const liveLostDeals = leads.filter((l) => l.status === 'Lost').length;
  const liveOpportunities = opportunities.length + liveSQLs + liveHotLeads;

  const pipelineSum = leads
    .filter((l) => l.status !== 'Won' && l.status !== 'Lost' && l.status !== 'Disqualified')
    .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

  const activeWonARR = activeDeals.reduce((sum, d) => sum + d.arr, 0);
  const activeWonMRR = activeDeals.reduce((sum, d) => sum + d.mrr, 0);

  const liveCustomers = Math.max(0, baseCustomers + liveWonDeals - churnedDeals.length);
  const liveMRR = Math.max(0, baseMRR + activeWonMRR);
  const liveARR = Math.max(0, baseARR + activeWonARR);

  const totalClosed = liveWonDeals + liveLostDeals;
  const conversionRate = totalClosed > 0 ? Math.round((liveWonDeals / totalClosed) * 100) : 0;

  const salesQueueMetrics = salesQueueProjection
    ? SalesQueueManager.calculateMetrics(salesQueueProjection)
    : undefined;

  const csCalculated = CSQueueManager.calculateMetrics(
    csQueueEntries || csQueueProjection?.entries || [],
    deals,
    csQueueProjection?.availableCapacity || 2,
  );

  const financialMetrics = FinancialModelManager.calculateFinancialMetrics({
    salesRepCount: financialOptions?.salesRepCount ?? salesQueueProjection?.availableCapacity ?? 2,
    csRepCount: financialOptions?.csRepCount ?? csQueueProjection?.availableCapacity ?? 2,
    liveARR,
    deals,
    newWonDealsThisTick: financialOptions?.newWonDealsThisTick ?? 0,
    previousCumulativeCashFlow: financialOptions?.previousCumulativeCashFlow ?? 0,
    marketingBudgetYearly: financialOptions?.marketingBudgetYearly,
  });

  return {
    liveLeads,
    liveMQLs,
    liveSQLs,
    liveHotLeads,
    liveOpportunities,
    livePipelineValue: pipelineSum,
    liveWonDeals,
    liveLostDeals,
    liveCustomers,
    liveMRR,
    liveARR,
    conversionRate,
    salesQueueMetrics,
    csQueueMetrics: csCalculated.csQueueMetrics,
    customerHealthMetrics: csCalculated.customerHealthMetrics,
    financialMetrics,
  };
}
