import { DeterministicRNG } from './prng';
import { SalesQueueProjection } from '../types/salesQueue';
import { SalesQueueManager } from './salesQueueManager';
import { CSQueueManager } from './csQueueManager';
import { CSQueueEntry, CSQueueProjection } from '../types/csQueue';
import { FinancialModelManager } from './financialModelManager';
import { StateMachineEvaluator } from './stateMachineEvaluator';
import { RejectedTransitionEntry } from '../types/stateMachine';
import {
  LeadStatus,
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationMetrics,
  SimulationOpportunity,
} from '../types/simulation';

const SAMPLE_COMPANIES = [
  { companyName: 'Vektor Dynamics GmbH', industry: 'Maschinenbau', city: 'Stuttgart', contact: 'Klaus Lindner' },
  { companyName: 'Hansa Automation KG', industry: 'IT & Software', city: 'Hamburg', contact: 'Elena Vogl' },
  { companyName: 'Konzett Systems AG', industry: 'Großhandel', city: 'Wien', contact: 'Stefan Konzett' },
  { companyName: 'Siegfried Precision SE', industry: 'Maschinenbau', city: 'Nürnberg', contact: 'Birgit Meyer' },
  { companyName: 'Apex Logistics GmbH', industry: 'Großhandel', city: 'Köln', contact: 'Dennis Wagner' },
  { companyName: 'Aether Digital Labs', industry: 'Agenturen', city: 'München', contact: 'Laura Fischer' },
  { companyName: 'Bavaria MedTech AG', industry: 'Medizintechnik', city: 'München', contact: 'Dr. Michael Weber' },
  { companyName: 'Rhein-Main FinTech Tech', industry: 'Finanzdienstleistungen', city: 'Frankfurt', contact: 'Sabine Hoffmann' },
  { companyName: 'Nordic CleanEnergy Solutions', industry: 'Energie & Umwelt', city: 'Bremen', contact: 'Torsten Jensen' },
  { companyName: 'Sachsen Robotics GmbH', industry: 'Automatisierung', city: 'Dresden', contact: 'Katrin Krause' },
];

const LEAD_SOURCES = [
  { source: 'LinkedIn Inbound', weight: 38, avgScore: 78 },
  { source: 'SEO / Organic Search', weight: 22, avgScore: 72 },
  { source: 'Partner / Empfehlung', weight: 18, avgScore: 88 },
  { source: 'Webinare', weight: 12, avgScore: 65 },
  { source: 'Outbound E-Mail', weight: 10, avgScore: 58 },
];

// Valid LeadPilot Packages according to Faktenblatt v1.1
// Formula: Annual Value (ARR) = userCount × packagePrice × 12
const PACKAGES = [
  { name: 'Starter', pricePerUser: 49, defaultUsers: 5, arr: 5 * 49 * 12, mrr: 5 * 49 },
  { name: 'Growth', pricePerUser: 89, defaultUsers: 10, arr: 10 * 89 * 12, mrr: 10 * 89 },
  { name: 'Pro', pricePerUser: 80, defaultUsers: 14, arr: 14 * 80 * 12, mrr: 14 * 80 },
];

const OWNERS = ['Marc Pönisch', 'Tobias Heine', 'Sophie Neumann'];

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
    while (d >= daysInMonths[m]) {
      d -= daysInMonths[m];
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

import { ChannelMix } from '../types/parameter';

export class SimulationEventRules {
  /**
   * Evaluates new inbound lead creation rule using PRNG and ClockContext.
   */
  public static evaluateNewLeadRule(
    clock: SimulationClockContext,
    rng: DeterministicRNG,
    existingLeads: SimulationLead[],
    marketingBudgetYearly = 65000,
    channelMix?: ChannelMix
  ): { lead: SimulationLead; event: SimulationEvent; activity: SimulationActivity } | null {
    const budget = marketingBudgetYearly ?? 65000;
    if (budget === 65000) {
      if (clock.tick % 2 !== 1 && rng.next() > 0.4) {
        return null;
      }
    } else {
      const m = (2 * budget) / (budget + 65000);
      const threshold = Math.max(0.05, Math.min(0.95, 0.4 * (2 - m)));
      if (clock.tick % 2 !== 1 && rng.next() > threshold) {
        return null;
      }
    }

    const sample = rng.pick(SAMPLE_COMPANIES);
    let sourceObj = rng.pick(LEAD_SOURCES);
    if (channelMix) {
      const roll = rng.nextInt(1, 100);
      let cumulative = 0;
      const mixEntries = [
        { source: 'LinkedIn Inbound', weight: channelMix.linkedIn, avgScore: 78 },
        { source: 'SEO / Organic Search', weight: channelMix.seo, avgScore: 72 },
        { source: 'Partner / Empfehlung', weight: channelMix.partner, avgScore: 88 },
        { source: 'Webinare', weight: channelMix.webinar, avgScore: 65 },
        { source: 'Outbound E-Mail', weight: channelMix.outbound, avgScore: 58 },
      ];
      for (const entry of mixEntries) {
        cumulative += entry.weight;
        if (roll <= cumulative) {
          sourceObj = entry;
          break;
        }
      }
    }
    const pkg = rng.pick(PACKAGES);
    
    const leadId = `sim-lead-s${clock.seed}-t${clock.tick}`;
    const firstName = sample.contact.split(' ')[0].toLowerCase();
    const companyClean = sample.companyName.toLowerCase().split(' ')[0].replace(/[^a-z]/g, '');
    const email = `${firstName}@${companyClean}.de`;
    
    const scoreDelta = rng.nextInt(-7, 7);
    const score = Math.min(98, Math.max(45, sourceObj.avgScore + scoreDelta));
    const estimatedValue = pkg.arr;
    const owner = rng.pick(OWNERS);

    const lead: SimulationLead = {
      id: leadId,
      contactName: sample.contact,
      companyName: sample.companyName,
      email,
      industry: sample.industry,
      city: sample.city,
      status: 'New',
      score,
      source: sourceObj.source,
      estimatedValue,
      owner,
      createdAtTick: clock.tick,
      lastUpdatedTick: clock.tick,
    };

    const timestampText = `${clock.simulatedDate} (Tick #${clock.tick})`;

    const event: SimulationEvent = {
      id: `evt-s${clock.seed}-t${clock.tick}-lead`,
      tick: clock.tick,
      dayIndex: clock.dayIndex,
      simulatedDate: clock.simulatedDate,
      type: 'NEW_LEAD',
      title: `Neuer Inbound Lead: ${lead.companyName}`,
      details: `${lead.contactName} (${lead.source}) – ICP Score: ${lead.score}/100. Erwarteter Wert: ${lead.estimatedValue.toLocaleString('de-DE')} €/Jahr (${pkg.name}-Paket).`,
      affectedLead: lead,
      timestamp: timestampText,
    };

    const activity: SimulationActivity = {
      id: `act-s${clock.seed}-t${clock.tick}-lead`,
      tick: clock.tick,
      type: 'Inbound Ingestion',
      description: `Lead über ${lead.source} empfangen. ICP Scoring: ${lead.score} Punkte.`,
      entityName: lead.companyName,
      timestamp: timestampText,
    };

    return { lead, event, activity };
  }

  /**
   * Evaluates progression of active leads through qualification stages.
   */
  public static evaluateLeadProgressionRule(
    clock: SimulationClockContext,
    rng: DeterministicRNG,
    leads: SimulationLead[],
    opportunities: SimulationOpportunity[],
    trialToPaidConversion = 18,
    salesCycleDays = 38,
    discountPercent = 0
  ): {
    updatedLead?: SimulationLead;
    newOpportunity?: SimulationOpportunity;
    newDeal?: SimulationDeal;
    event?: SimulationEvent;
    activity?: SimulationActivity;
    rejectedTransition?: RejectedTransitionEntry;
  } | null {
    const activeLeads = leads.filter((l) => l.status !== 'Won' && l.status !== 'Lost' && l.status !== 'Disqualified');
    if (activeLeads.length === 0) return null;

    if (salesCycleDays !== 38) {
      const cycleMultiplier = 38 / salesCycleDays;
      if (cycleMultiplier < 1.0 && rng.next() > cycleMultiplier) {
        return null;
      }
    }

    const targetLead = rng.pick(activeLeads);
    let newStatus: LeadStatus = targetLead.status;
    let eventType: SimulationEvent['type'] = 'ACTIVITY_LOGGED';
    let title = '';
    let details = '';

    const timestampText = `${clock.simulatedDate} (Tick #${clock.tick})`;

    if (targetLead.status === 'New') {
      newStatus = targetLead.score >= 60 ? 'MQL' : 'Disqualified';
      eventType = newStatus === 'MQL' ? 'QUALIFIED_MQL' : 'ACTIVITY_LOGGED';
      title = newStatus === 'MQL' ? `Lead als MQL qualifiziert: ${targetLead.companyName}` : `Lead disqualifiziert: ${targetLead.companyName}`;
      details = newStatus === 'MQL' ? `${targetLead.contactName} erfüllt ICP-Kriterien (Score: ${targetLead.score}).` : `ICP-Mismatch (Score < 60).`;
    } else if (targetLead.status === 'MQL') {
      newStatus = 'SQL';
      eventType = 'QUALIFIED_SQL';
      title = `MQL ➔ SQL Aufstieg: ${targetLead.companyName}`;
      details = `Erstgespräch erfolgreich. Demotermin vereinbart durch ${targetLead.owner}.`;
    } else if (targetLead.status === 'SQL') {
      newStatus = 'Hot';
      eventType = 'QUALIFIED_HOT';
      title = `Opportunity Signal (Hot): ${targetLead.companyName}`;
      details = `Entscheider-Pitch erfolgreich. Angebot wird erstellt.`;
    } else if (targetLead.status === 'Hot') {
      const pkg = rng.pick(PACKAGES);
      
      let isWon: boolean;
      if (trialToPaidConversion === 18) {
        isWon = rng.next() >= 0.35; // 65% win probability for Hot Deals
      } else {
        const winProb = Math.min(0.95, Math.max(0.10, 0.65 * (trialToPaidConversion / 18)));
        isWon = rng.next() >= (1 - winProb);
      }

      if (isWon) {
        newStatus = 'Won';
        eventType = 'DEAL_WON';

        const discount = Math.max(0, Math.min(50, discountPercent ?? 0));
        const arrValue = discount > 0 ? Math.round(pkg.arr * (1 - discount / 100)) : pkg.arr;
        const mrrValue = discount > 0 ? Math.round(pkg.mrr * (1 - discount / 100)) : pkg.mrr;

        title = `🎉 DEAL GEWONNEN: ${targetLead.companyName}`;
        details = `Vertrag unterzeichnet! Paket: ${pkg.name} (${arrValue.toLocaleString('de-DE')} € ARR / ${mrrValue.toLocaleString('de-DE')} € MRR)${discount > 0 ? ` [${discount}% Rabatt]` : ''}.`;

        const transitionRes = StateMachineEvaluator.validateAndTransitionLead(
          targetLead,
          'Won',
          'Lead Status Transition: Hot -> Won',
          clock
        );

        if (!transitionRes.success) {
          return { rejectedTransition: transitionRes.rejectedEntry };
        }

        const newDeal: SimulationDeal = {
          id: `sim-deal-s${clock.seed}-t${clock.tick}`,
          companyName: targetLead.companyName,
          contactName: targetLead.contactName,
          dealName: `${targetLead.companyName} – ${pkg.name}`,
          amount: arrValue,
          mrr: mrrValue,
          arr: arrValue,
          packageName: pkg.name,
          wonAtTick: clock.tick,
          closeDate: clock.simulatedDate,
        };

        const updatedLead: SimulationLead = {
          ...transitionRes.updatedEntity!,
          lastUpdatedTick: clock.tick,
        };

        const event: SimulationEvent = {
          id: `evt-s${clock.seed}-t${clock.tick}-won`,
          tick: clock.tick,
          dayIndex: clock.dayIndex,
          simulatedDate: clock.simulatedDate,
          type: 'DEAL_WON',
          title,
          details,
          affectedLead: updatedLead,
          affectedDeal: newDeal,
          timestamp: timestampText,
        };

        const activity: SimulationActivity = {
          id: `act-s${clock.seed}-t${clock.tick}-won`,
          tick: clock.tick,
          type: 'Deal Closed Won',
          description: `Abschluss von ${targetLead.companyName} (${pkg.name}-Paket: ${pkg.arr.toLocaleString('de-DE')} € ARR).`,
          entityName: targetLead.companyName,
          timestamp: timestampText,
        };

        return { updatedLead, newDeal, event, activity };
      } else {
        newStatus = 'Lost';
        eventType = 'DEAL_LOST';
        title = `Deal verloren: ${targetLead.companyName}`;
        details = `Kunde hat sich gegen Kauf entschieden (Budgetverschiebung auf Q4).`;

        const transitionRes = StateMachineEvaluator.validateAndTransitionLead(
          targetLead,
          'Lost',
          'Lead Status Transition: Hot -> Lost',
          clock
        );

        if (!transitionRes.success) {
          return { rejectedTransition: transitionRes.rejectedEntry };
        }

        const updatedLead: SimulationLead = {
          ...transitionRes.updatedEntity!,
          lastUpdatedTick: clock.tick,
        };

        const event: SimulationEvent = {
          id: `evt-s${clock.seed}-t${clock.tick}-lost`,
          tick: clock.tick,
          dayIndex: clock.dayIndex,
          simulatedDate: clock.simulatedDate,
          type: 'DEAL_LOST',
          title,
          details,
          affectedLead: updatedLead,
          timestamp: timestampText,
        };

        const activity: SimulationActivity = {
          id: `act-s${clock.seed}-t${clock.tick}-lost`,
          tick: clock.tick,
          type: 'Deal Closed Lost',
          description: `Deal verloren für ${targetLead.companyName}.`,
          entityName: targetLead.companyName,
          timestamp: timestampText,
        };

        return { updatedLead, event, activity };
      }
    }

    const transitionRes = StateMachineEvaluator.validateAndTransitionLead(
      targetLead,
      newStatus,
      `Lead Status Transition: ${targetLead.status} -> ${newStatus}`,
      clock
    );

    if (!transitionRes.success) {
      return { rejectedTransition: transitionRes.rejectedEntry };
    }

    const updatedLead: SimulationLead = {
      ...transitionRes.updatedEntity!,
      lastUpdatedTick: clock.tick,
    };

    const event: SimulationEvent = {
      id: `evt-s${clock.seed}-t${clock.tick}-prog`,
      tick: clock.tick,
      dayIndex: clock.dayIndex,
      simulatedDate: clock.simulatedDate,
      type: eventType,
      title,
      details,
      affectedLead: updatedLead,
      timestamp: timestampText,
    };

    const activity: SimulationActivity = {
      id: `act-s${clock.seed}-t${clock.tick}-prog`,
      tick: clock.tick,
      type: 'Qualification',
      description: `${targetLead.companyName} wurde zu ${newStatus} aktualisiert.`,
      entityName: targetLead.companyName,
      timestamp: timestampText,
    };

    return { updatedLead, event, activity };
  }

  /**
   * Evaluates Customer Health, Churn Risk, and Re-Engagement rules (Decisions 1386-1398).
   */
  public static evaluateCustomerChurnRule(
    clock: SimulationClockContext,
    rng: DeterministicRNG,
    deals: SimulationDeal[],
    csQueueEntries: CSQueueEntry[],
    churnRateMonthly: number
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
      if (deal.isChurned) continue;

      const csEntry = csQueueEntries.find((e) => e.customerId === deal.id || e.companyName === deal.companyName);
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
    }
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
      csQueueProjection?.availableCapacity || 2
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
}
