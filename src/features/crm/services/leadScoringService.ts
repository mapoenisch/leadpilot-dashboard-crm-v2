// Auftrag 130: Regelbasierte ICP-Lead-Scoring Engine für LeadPilot CRM Leads
export type LeadQualityTier = 'hot' | 'warm' | 'cold';

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  reason: string;
}

export interface LeadScoringResult {
  totalScore: number;
  tier: LeadQualityTier;
  tierLabel: string;
  badgeColor: 'emerald' | 'amber' | 'slate';
  icon: string;
  breakdown: ScoreBreakdownItem[];
}

export interface LeadScoringInput {
  jobTitle?: string | null;
  companyName?: string | null;
  countryOrCity?: string | null;
  employeeCount?: number | string | null;
  industry?: string | null;
  source?: string | null;
}

export interface BantQualification {
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
  notes?: string;
}

const DACH_LOCATIONS = [
  'deutschland',
  'germany',
  'de',
  'österreich',
  'austria',
  'at',
  'schweiz',
  'switzerland',
  'ch',
  'berlin',
  'münchen',
  'munich',
  'hamburg',
  'köln',
  'frankfurt',
  'stuttgart',
  'düsseldorf',
  'wien',
  'vienna',
  'zürich',
  'zurich',
  'bern',
  'salzburg',
  'graz',
  'basel',
];

const ICP_INDUSTRIES = [
  'maschinenbau',
  'it',
  'software',
  'großhandel',
  'grosshandel',
  'agentur',
  'automotive',
  'finanzen',
];

const DECISION_MAKER_TITLES = [
  'ceo',
  'chief executive officer',
  'geschäftsführer',
  'geschaeftsfuehrer',
  'inhaber',
  'founder',
  'gründer',
  'gruender',
  'head of sales',
  'vertriebsleiter',
  'vp sales',
  'chief revenue officer',
  'cro',
  'cto',
  'chief technology officer',
  'leiter vertrieb',
];

const MANAGEMENT_TITLES = [
  'head of',
  'leiter',
  'vp',
  'vice president',
  'director',
  'manager',
  'vertrieb',
  'sales manager',
  'team lead',
];

function matchesKeyword(text: string, keyword: string): boolean {
  if (keyword.length <= 3) {
    const regex = new RegExp(`(^|[^a-z0-9äöüß])${keyword}([^a-z0-9äöüß]|$)`, 'i');
    return regex.test(text);
  }
  return text.toLowerCase().includes(keyword.toLowerCase());
}

export function calculateLeadScore(lead: LeadScoringInput): LeadScoringResult {
  const breakdown: ScoreBreakdownItem[] = [];

  // 1. Region / Standort (Max 30 Pkt)
  const loc = (lead.countryOrCity || '').trim().toLowerCase();
  let regionPts = 10;
  let regionReason = 'Region außerhalb DACH oder nicht angegeben (+10)';
  if (loc && DACH_LOCATIONS.some((d) => matchesKeyword(loc, d))) {
    regionPts = 30;
    regionReason = 'DACH-Kernregion (Deutschland, Österreich, Schweiz) (+30)';
  } else if (loc.includes('eu') || loc.includes('europe') || loc.includes('europa')) {
    regionPts = 20;
    regionReason = 'Europäischer Wirtschaftsraum (+20)';
  }
  breakdown.push({
    key: 'region',
    label: 'Region / Standort',
    points: regionPts,
    maxPoints: 30,
    reason: regionReason,
  });

  // 2. Unternehmensgröße (Headcount) (Max 30 Pkt)
  const rawCount = lead.employeeCount;
  const count =
    typeof rawCount === 'number'
      ? rawCount
      : typeof rawCount === 'string'
        ? parseInt(rawCount.replace(/\D/g, ''), 10) || 0
        : 0;

  let sizePts = 10;
  let sizeReason = 'Mitarbeiterzahl unklar oder Kleinstunternehmen (+10)';
  if (count >= 20 && count <= 100) {
    sizePts = 30;
    sizeReason = 'Kern-ICP Sweet Spot: 20–100 Mitarbeitende (+30)';
  } else if (count > 100 && count <= 250) {
    sizePts = 25;
    sizeReason = 'Gehobener Mittelstand: 101–250 Mitarbeitende (+25)';
  } else if (count >= 10 && count < 20) {
    sizePts = 15;
    sizeReason = 'Wachsender B2B-Betrieb: 10–19 Mitarbeitende (+15)';
  } else if (count > 250) {
    sizePts = 15;
    sizeReason = 'Großunternehmen > 250 Mitarbeitende (+15)';
  }
  breakdown.push({
    key: 'size',
    label: 'Unternehmensgröße',
    points: sizePts,
    maxPoints: 30,
    reason: sizeReason,
  });

  // 3. Branche / Vertikale (Max 20 Pkt)
  const ind = (lead.industry || '').trim().toLowerCase();
  let indPts = 10;
  let indReason = 'Allgemeine B2B-Branche (+10)';
  if (ind && ICP_INDUSTRIES.some((i) => matchesKeyword(ind, i))) {
    indPts = 20;
    indReason = 'Kernzielbranche laut ICP (Maschinenbau, IT/Software, Großhandel, Agentur) (+20)';
  }
  breakdown.push({
    key: 'industry',
    label: 'Branche / Vertikale',
    points: indPts,
    maxPoints: 20,
    reason: indReason,
  });

  // 4. Rolle & Persona (Max 20 Pkt)
  const title = (lead.jobTitle || '').trim().toLowerCase();
  let personaPts = 5;
  let personaReason = 'Fachposition / Kontakt (+5)';
  if (title && DECISION_MAKER_TITLES.some((t) => matchesKeyword(title, t))) {
    personaPts = 20;
    personaReason = 'Haupt-Entscheider: C-Level, GF oder Vertriebsleitung (+20)';
  } else if (title && MANAGEMENT_TITLES.some((t) => matchesKeyword(title, t))) {
    personaPts = 12;
    personaReason = 'Führungsebene: Teamleitung oder Sales Management (+12)';
  }
  breakdown.push({
    key: 'persona',
    label: 'Rolle & Entscheiderstatus',
    points: personaPts,
    maxPoints: 20,
    reason: personaReason,
  });

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      breakdown.reduce((acc, b) => acc + b.points, 0),
    ),
  );
  const tier: LeadQualityTier = totalScore >= 80 ? 'hot' : totalScore >= 50 ? 'warm' : 'cold';
  const tierLabel = tier === 'hot' ? 'Hot Lead' : tier === 'warm' ? 'Warm Lead' : 'Cold Lead';
  const badgeColor = tier === 'hot' ? 'emerald' : tier === 'warm' ? 'amber' : 'slate';
  const icon = tier === 'hot' ? '🔥' : tier === 'warm' ? '🟡' : '❄️';

  return {
    totalScore,
    tier,
    tierLabel,
    badgeColor,
    icon,
    breakdown,
  };
}

export function estimateDealAmountForLead(employeeCount?: number | string | null): number {
  const count =
    typeof employeeCount === 'number'
      ? employeeCount
      : typeof employeeCount === 'string'
        ? parseInt(employeeCount.replace(/\D/g, ''), 10) || 0
        : 0;

  if (count <= 0) return 25000;
  if (count < 20) return 15000;
  if (count <= 50) return 30000;
  if (count <= 100) return 48000;
  if (count <= 250) return 75000;
  return 120000;
}
