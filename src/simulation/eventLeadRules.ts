import { DeterministicRNG } from './prng';
import { StateMachineEvaluator } from './stateMachineEvaluator';
import { RejectedTransitionEntry } from '../types/stateMachine';
import { ChannelMix } from '../types/parameter';
import {
  LeadStatus,
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
} from '../types/simulation';
import { SimulationClockContext } from './eventRules';

const SAMPLE_COMPANIES = [
  {
    companyName: 'Vektor Dynamics GmbH',
    industry: 'Maschinenbau',
    city: 'Stuttgart',
    contact: 'Klaus Lindner',
  },
  {
    companyName: 'Hansa Automation KG',
    industry: 'IT & Software',
    city: 'Hamburg',
    contact: 'Elena Vogl',
  },
  {
    companyName: 'Konzett Systems AG',
    industry: 'Großhandel',
    city: 'Wien',
    contact: 'Stefan Konzett',
  },
  {
    companyName: 'Siegfried Precision SE',
    industry: 'Maschinenbau',
    city: 'Nürnberg',
    contact: 'Birgit Meyer',
  },
  {
    companyName: 'Apex Logistics GmbH',
    industry: 'Großhandel',
    city: 'Köln',
    contact: 'Dennis Wagner',
  },
  {
    companyName: 'Aether Digital Labs',
    industry: 'Agenturen',
    city: 'München',
    contact: 'Laura Fischer',
  },
  {
    companyName: 'Bavaria MedTech AG',
    industry: 'Medizintechnik',
    city: 'München',
    contact: 'Dr. Michael Weber',
  },
  {
    companyName: 'Rhein-Main FinTech Tech',
    industry: 'Finanzdienstleistungen',
    city: 'Frankfurt',
    contact: 'Sabine Hoffmann',
  },
  {
    companyName: 'Nordic CleanEnergy Solutions',
    industry: 'Energie & Umwelt',
    city: 'Bremen',
    contact: 'Torsten Jensen',
  },
  {
    companyName: 'Sachsen Robotics GmbH',
    industry: 'Automatisierung',
    city: 'Dresden',
    contact: 'Katrin Krause',
  },
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

// 067K / G57 — aus eventRules.ts herausgelöste Lead-Regeln (reine
// Code-Bewegung, keine Verhaltensänderung). SimulationEventRules delegiert.
export function evaluateNewLeadRule(
  clock: SimulationClockContext,
  rng: DeterministicRNG,
  _existingLeads: SimulationLead[],
  marketingBudgetYearly = 65000,
  channelMix?: ChannelMix,
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
  const contactFirst = sample.contact.split(' ')[0];
  if (contactFirst === undefined) {
    // Unerreichbar: split(' ') liefert nie ein leeres Array.
    throw new Error('Kontaktname konnte nicht zerlegt werden.');
  }
  const firstName = contactFirst.toLowerCase();
  const companyFirst = sample.companyName.toLowerCase().split(' ')[0];
  if (companyFirst === undefined) {
    // Unerreichbar: split(' ') liefert nie ein leeres Array.
    throw new Error('Firmenname konnte nicht zerlegt werden.');
  }
  const companyClean = companyFirst.replace(/[^a-z]/g, '');
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
export function evaluateLeadProgressionRule(
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
  const activeLeads = leads.filter(
    (l) => l.status !== 'Won' && l.status !== 'Lost' && l.status !== 'Disqualified',
  );
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
    title =
      newStatus === 'MQL'
        ? `Lead als MQL qualifiziert: ${targetLead.companyName}`
        : `Lead disqualifiziert: ${targetLead.companyName}`;
    details =
      newStatus === 'MQL'
        ? `${targetLead.contactName} erfüllt ICP-Kriterien (Score: ${targetLead.score}).`
        : `ICP-Mismatch (Score < 60).`;
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
      const winProb = Math.min(0.95, Math.max(0.1, 0.65 * (trialToPaidConversion / 18)));
      isWon = rng.next() >= 1 - winProb;
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
        clock,
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
        clock,
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
    clock,
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
