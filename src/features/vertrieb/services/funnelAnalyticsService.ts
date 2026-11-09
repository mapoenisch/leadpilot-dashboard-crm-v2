/**
 * funnelAnalyticsService.ts
 *
 * Aggregations- und Analyselogik für den Vertriebs-Funnel im LeadPilot CRM (Auftrag 131).
 * Berechnet Stufenmetriken für Plan 2025, operative Live-CRM-Pipeline (Leads & Deals)
 * sowie Gegenüberstellung im Vergleichsmodus mit Delta-Pills und Engpass-Erkennung.
 */
import { FUNNEL_QUARTALE } from '@/domain/vertriebData';
import { berechneQuote } from '@/domain/funnelQuote';
import { ImportedFunnelDeal, Contact } from '@/types/crm';
import { normalizeCanonicalStageLabel, isWonStage } from '@/features/crm/utils/crmStageHelper';

export type FunnelSourceMode = 'plan' | 'live' | 'vergleich';

export interface FunnelStageMetric {
  key: string;
  name: string;
  einheit: string;
  planCount: number;
  liveCount: number;
  liveAmountEuro: number;
  planConversionQuote: number | null; // Prozent (z. B. 29.1)
  liveConversionQuote: number | null; // Prozent (z. B. 40.0)
  deltaCount: number; // liveCount - planCount
  deltaQuote: number | null; // liveConversionQuote - planConversionQuote
  hebel?: string;
}

export interface FunnelBottleneck {
  stageKey: string;
  stageName: string;
  dealCount: number;
  avgDaysInStage: number;
  thresholdDays: number;
  planDays: number;
  recommendation: string;
}

export interface FunnelAnalyticsResult {
  mode: FunnelSourceMode;
  stages: FunnelStageMetric[];
  totalLeadsLive: number;
  totalMqlLive: number;
  totalSqlLive: number;
  totalAngeboteLive: number;
  totalWonLive: number;
  overallQuotePlan: number | null; // Won / Leads Plan %
  overallQuoteLive: number | null; // Won / Leads Live %
  overallDeltaQuote: number | null;
  bottlenecks: FunnelBottleneck[];
  dealsWithoutStageDate: number; // Aktive Deals ohne serverseitiges Phasendatum (vor v3.1 angelegt)
}

export interface FunnelAnalyticsInput {
  contacts?: Contact[];
  deals?: ImportedFunnelDeal[];
  qualifiedLeadIds?: string[] | Set<string>;
  referenceDate?: Date;
  mode?: FunnelSourceMode;
}

const sumQuartale = (values: readonly number[]): number =>
  values.reduce((acc, curr) => acc + curr, 0);

// Plan-Werte für FY 2025 aus vertriebData.ts
export const PLAN_FUNNEL_COUNTS = {
  leads: sumQuartale(FUNNEL_QUARTALE.leads), // 1776
  mql: sumQuartale(FUNNEL_QUARTALE.mql), // 516
  sql: sumQuartale(FUNNEL_QUARTALE.sql), // 192
  angebote: sumQuartale(FUNNEL_QUARTALE.angebote), // 108
  neukunden: sumQuartale(FUNNEL_QUARTALE.neukunden), // 47
};

export const PLAN_STAGE_DAYS: Record<string, number> = {
  'Lead eingegangen': 7,
  'Erstgespräch geführt': 10,
  Bedarfsanalyse: 14,
  'Angebot erstellt': 14,
  Verhandlung: 10,
  'Deal gewonnen': 0,
};

export const BOTTLENECK_THRESHOLD_DAYS = 30;

/**
 * Ermittelt die effektive Phase eines Deals. Auftrag 140: Die Phase kommt
 * ausschließlich aus der serverseitigen Datenbank (`stage`), lokale Overrides
 * oder Client-Schätzungen werden nicht mehr berücksichtigt.
 */
export function getEffectiveDealStage(deal: ImportedFunnelDeal): string {
  return normalizeCanonicalStageLabel(deal.stage);
}

/**
 * Ermittelt die tatsächliche Verweildauer eines Deals in seiner aktuellen Phase (in Tagen).
 * Ausschließliche Quelle ist das serverseitige `stageEnteredAt` (Auftrag 137/140).
 * Gibt `null` zurück, wenn kein Phasendatum bekannt ist, damit das Gesamtalter
 * eines Deals (createdAt) oder andere Schätzungen nicht fälschlicherweise als
 * Stagnation in einer einzelnen Phase interpretiert werden.
 */
export function getDealDaysInStage(
  deal: ImportedFunnelDeal & { stageEnteredAt?: string },
  referenceDate: Date = new Date(),
): number | null {
  if (deal.stageEnteredAt) {
    const entered = new Date(deal.stageEnteredAt).getTime();
    if (!isNaN(entered)) {
      const diffMs = referenceDate.getTime() - entered;
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  }
  return null;
}

/**
 * Berechnet das Gesamtalter eines Deals (seit Erstellung) in Tagen.
 */
export function calculateDealAgeInDays(
  deal: ImportedFunnelDeal & { createdAt?: string },
  referenceDate: Date = new Date(),
): number {
  if (deal.createdAt) {
    const created = new Date(deal.createdAt).getTime();
    if (!isNaN(created)) {
      const diffMs = referenceDate.getTime() - created;
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  }
  return 14;
}

const isTerminalDealStage = (stage: string): boolean =>
  stage === 'Deal gewonnen' || stage === 'Deal verloren';

/**
 * Zählt aktive Deals, für die keine Phasen-Verweildauer bekannt ist
 * (kein serverseitiges `stageEnteredAt`, z. B. vor v3.1 angelegt).
 * Abgeschlossene Deals werden nicht mitgezählt.
 */
export function countDealsWithoutStageDate(
  deals: ImportedFunnelDeal[],
  referenceDate: Date = new Date(),
): number {
  let count = 0;
  for (const deal of deals) {
    if (isTerminalDealStage(getEffectiveDealStage(deal))) continue;
    if (getDealDaysInStage(deal, referenceDate) === null) count += 1;
  }
  return count;
}

/**
 * Erkennt Engpässe in den Vertriebsphasen anhand der Verweildauern.
 * Ein Engpass liegt vor, wenn die durchschnittliche Verweildauer einer Phase
 * den Grenzwert von 30 Tagen überschreitet. Deals ohne Phasendatum fließen
 * nicht in die Berechnung ein.
 */
export function identifyFunnelBottlenecks(
  deals: ImportedFunnelDeal[],
  referenceDate?: Date,
  thresholdDays: number = BOTTLENECK_THRESHOLD_DAYS,
): FunnelBottleneck[] {
  const stageGroups = new Map<string, { totalDays: number; knownCount: number }>();

  for (const deal of deals) {
    const stage = getEffectiveDealStage(deal);
    // Nur aktive Verkaufsphasen vor Abschluss prüfen
    if (isTerminalDealStage(stage)) continue;

    const days = getDealDaysInStage(deal, referenceDate);
    if (days === null) {
      // Verweildauer in dieser Phase unbekannt (kein serverseitiges stageEnteredAt)
      continue;
    }

    const curr = stageGroups.get(stage) ?? { totalDays: 0, knownCount: 0 };
    stageGroups.set(stage, {
      totalDays: curr.totalDays + days,
      knownCount: curr.knownCount + 1,
    });
  }

  const bottlenecks: FunnelBottleneck[] = [];

  for (const [stage, data] of stageGroups.entries()) {
    if (data.knownCount === 0) continue;
    const avgDays = Math.round((data.totalDays / data.knownCount) * 10) / 10;
    if (avgDays > thresholdDays) {
      const planDays = PLAN_STAGE_DAYS[stage] ?? 14;
      let recommendation = `Sales-Follow-up priorisieren: ${data.knownCount} Deals verweilen durchschnittlich ${avgDays.toLocaleString('de-DE')} Tage in Phase „${stage}“ (Plan: ${planDays} Tage).`;
      if (stage === 'Angebot erstellt') {
        recommendation = `Engpass identifiziert: ${data.knownCount} Angebote verweilen seit durchschnittlich ${avgDays.toLocaleString('de-DE')} Tagen in Phase „Angebot erstellt“ (Plan: ${planDays} Tage). Entscheidungsträger direkt kontaktieren.`;
      } else if (stage === 'Bedarfsanalyse') {
        recommendation = `Verzögerung in Bedarfsanalyse: ${data.knownCount} Deals benötigen im Schnitt ${avgDays.toLocaleString('de-DE')} Tage (Plan: ${planDays} Tage). Qualifizierungsschärfe prüfen.`;
      }

      bottlenecks.push({
        stageKey: stage.toLowerCase().replace(/\s+/g, '-'),
        stageName: stage,
        dealCount: data.knownCount,
        avgDaysInStage: avgDays,
        thresholdDays,
        planDays,
        recommendation,
      });
    }
  }

  // Nach Dringlichkeit (Abweichung von Schwellenwert) sortieren
  return bottlenecks.sort(
    (a, b) => b.avgDaysInStage - b.planDays - (a.avgDaysInStage - a.planDays),
  );
}

/**
 * Hauptanalyse-Funktion: Aggregiert CRM-Daten und berechnet Stufen-, Conversion- und Delta-Werte.
 */
export function calculateFunnelAnalytics({
  contacts = [],
  deals = [],
  qualifiedLeadIds,
  referenceDate,
  mode = 'plan',
}: FunnelAnalyticsInput): FunnelAnalyticsResult {
  const qualifiedSet =
    qualifiedLeadIds instanceof Set ? qualifiedLeadIds : new Set(qualifiedLeadIds ?? []);

  // 1. Stufen-Aufteilung der Live-Deals
  let wonCount = 0;
  let wonAmount = 0;
  let angeboteCount = 0;
  let angeboteAmount = 0;
  let sqlCount = 0;
  let sqlAmount = 0;
  let mqlDealsCount = 0;
  let mqlAmount = 0;
  let leadsAmount = 0;

  for (const deal of deals) {
    const stage = getEffectiveDealStage(deal);
    const amount = Number(deal.amount) || 0;

    const isWon = isWonStage(stage);
    const isAngebotsPhase = stage === 'Angebot erstellt' || stage === 'Verhandlung' || isWon;
    const isSqlPhase =
      isAngebotsPhase || stage === 'Erstgespräch geführt' || stage === 'Bedarfsanalyse';

    // Jeder Deal in der Pipeline zählt zum Gesamtvolumen der Leads
    leadsAmount += amount;

    // Alle Deals in der Pipeline haben mindestens MQL-Relevanz
    mqlDealsCount += 1;
    mqlAmount += amount;

    if (isWon) {
      wonCount += 1;
      wonAmount += amount;
    }
    if (isAngebotsPhase) {
      angeboteCount += 1;
      angeboteAmount += amount;
    }
    if (isSqlPhase) {
      sqlCount += 1;
      sqlAmount += amount;
    }
  }

  // Deduplizierung: Leads, die bereits als Deals existieren, nicht doppelt als MQL zählen
  const dealsWithLeadId = new Set<string>();
  for (const deal of deals) {
    const anyDeal = deal as unknown as {
      leadId?: string;
      contactId?: string;
      sourceContactId?: string;
      source_contact_id?: string;
    };
    if (anyDeal.leadId) dealsWithLeadId.add(String(anyDeal.leadId));
    if (anyDeal.contactId) dealsWithLeadId.add(String(anyDeal.contactId));
    // Auftrag 139: konvertierte Deals tragen den Quellkontakt in source_contact_id
    // (camelCase-Mapping des Query-Pfads, snake_case als Fallback).
    if (anyDeal.sourceContactId) dealsWithLeadId.add(String(anyDeal.sourceContactId));
    if (anyDeal.source_contact_id) dealsWithLeadId.add(String(anyDeal.source_contact_id));
    const convMatch = /^d-conv-(.+?)-\d+$/.exec(deal.id);
    if (convMatch && convMatch[1]) dealsWithLeadId.add(convMatch[1]);
    dealsWithLeadId.add(deal.id);
  }

  // Zusätzliche qualifizierte Leads aus den Kontakten berücksichtigen (dedupliziert gegen Deals)
  let additionalQualifiedContacts = 0;
  for (const c of contacts) {
    if (qualifiedSet.has(c.id) && !dealsWithLeadId.has(c.id)) {
      additionalQualifiedContacts += 1;
    }
  }

  const liveLeads = Math.max(contacts.length, deals.length);
  const liveMql = Math.min(liveLeads, mqlDealsCount + additionalQualifiedContacts);
  const liveSql = sqlCount;
  const liveAngebote = angeboteCount;
  const liveWon = wonCount;

  // Stufen-Metriken zusammenstellen
  const stageDefinitions = [
    {
      key: 'leads',
      name: 'Leads gesamt',
      einheit: 'Leads',
      planCount: PLAN_FUNNEL_COUNTS.leads,
      liveCount: liveLeads,
      liveAmountEuro: leadsAmount,
      planPrev: null,
      livePrev: null,
    },
    {
      key: 'mql',
      name: 'Marketing Qualified Leads (MQL)',
      einheit: 'MQL',
      planCount: PLAN_FUNNEL_COUNTS.mql,
      liveCount: liveMql,
      liveAmountEuro: mqlAmount,
      planPrev: PLAN_FUNNEL_COUNTS.leads,
      livePrev: liveLeads,
    },
    {
      key: 'sql',
      name: 'Sales Qualified Leads (SQL)',
      einheit: 'SQL',
      planCount: PLAN_FUNNEL_COUNTS.sql,
      liveCount: liveSql,
      liveAmountEuro: sqlAmount,
      planPrev: PLAN_FUNNEL_COUNTS.mql,
      livePrev: liveMql,
      hebel: 'Trial-Conversion Hebel',
    },
    {
      key: 'angebote',
      name: 'Angebote',
      einheit: 'Angebote',
      planCount: PLAN_FUNNEL_COUNTS.angebote,
      liveCount: liveAngebote,
      liveAmountEuro: angeboteAmount,
      planPrev: PLAN_FUNNEL_COUNTS.sql,
      livePrev: liveSql,
    },
    {
      key: 'neukunden',
      name: 'Neukunden (Won)',
      einheit: 'Neukunden',
      planCount: PLAN_FUNNEL_COUNTS.neukunden,
      liveCount: liveWon,
      liveAmountEuro: wonAmount,
      planPrev: PLAN_FUNNEL_COUNTS.angebote,
      livePrev: liveAngebote,
    },
  ];

  const stages: FunnelStageMetric[] = stageDefinitions.map((s) => {
    const planQuote = s.planPrev !== null ? berechneQuote(s.planCount, s.planPrev) : null;
    const liveQuote = s.livePrev !== null ? berechneQuote(s.liveCount, s.livePrev) : null;

    const deltaCount = s.liveCount - s.planCount;
    const deltaQuote =
      liveQuote !== null && planQuote !== null
        ? Math.round((liveQuote - planQuote) * 10) / 10
        : null;

    return {
      key: s.key,
      name: s.name,
      einheit: s.einheit,
      planCount: s.planCount,
      liveCount: s.liveCount,
      liveAmountEuro: s.liveAmountEuro,
      planConversionQuote: planQuote !== null ? Math.round(planQuote * 10) / 10 : null,
      liveConversionQuote: liveQuote !== null ? Math.round(liveQuote * 10) / 10 : null,
      deltaCount,
      deltaQuote,
      hebel: s.hebel,
    };
  });

  // End-to-End Gesamtkonversion Won / Leads
  const planOverall = berechneQuote(PLAN_FUNNEL_COUNTS.neukunden, PLAN_FUNNEL_COUNTS.leads);
  const liveOverall = berechneQuote(liveWon, liveLeads);
  const overallQuotePlan = planOverall !== null ? Math.round(planOverall * 10) / 10 : null;
  const overallQuoteLive = liveOverall !== null ? Math.round(liveOverall * 10) / 10 : null;
  const overallDeltaQuote =
    overallQuoteLive !== null && overallQuotePlan !== null
      ? Math.round((overallQuoteLive - overallQuotePlan) * 10) / 10
      : null;

  const bottlenecks = identifyFunnelBottlenecks(deals, referenceDate);
  const dealsWithoutStageDate = countDealsWithoutStageDate(deals, referenceDate);

  return {
    mode,
    stages,
    totalLeadsLive: liveLeads,
    totalMqlLive: liveMql,
    totalSqlLive: liveSql,
    totalAngeboteLive: liveAngebote,
    totalWonLive: liveWon,
    overallQuotePlan,
    overallQuoteLive,
    overallDeltaQuote,
    bottlenecks,
    dealsWithoutStageDate,
  };
}
