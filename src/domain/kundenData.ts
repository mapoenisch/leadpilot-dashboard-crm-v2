import { ICP_SPECS } from './icpData';
import { BUYER_PERSONA_VOLKER } from './personaData';

export const ICP = ICP_SPECS;
export const PERSONA = BUYER_PERSONA_VOLKER;

export const EMPATHY = {
  title: 'Empathy Map — Vertriebsleiter Volker',
  heroStatement: '„Ich brauche kein überkomplexes IT-System, sondern sofortige Klarheit, welcher Kunde heute kontaktiert werden muss."',
  quadrants: [
    { title: 'Was er denkt & fühlt', desc: 'Sorge vor verlorenem Umsatz; Frust über aufwendiges Excel-Reporting; Wunsch nach verlässlichen Zahlen für die Geschäftsführung.' },
    { title: 'Was er sieht', desc: 'Unbeantwortete E-Mails, unklare Notizen im Team, Werbeanzeigen von überteuerten Enterprise-CRMs.' },
    { title: 'Was er hört', desc: 'Geschäftsführung verlangt verlässliche Zahlen; Vertriebsteam klagt über komplizierte administrative Software.' },
    { title: 'Was er tut & sagt', desc: 'Arbeitet pragmatisch, entscheidet oft aus Erfahrung, sucht nach Lösungen ohne langes Einführungsprojekt.' },
  ],
};

export const SEGMENTE = {
  title: 'Kundensegmente (66 Kunden zum 31.12.2025)',
  rows: [
    { branche: 'Maschinenbau / Industrie', anteil: '36 %', charakter: '24 Kunden · Hohe Ticketgrößen, 20-100 MA, Sweet Spot' },
    { branche: 'IT / Software', anteil: '27 %', charakter: '18 Kunden · Hohe Digitalaffinität, schnelle Kaufentscheidung' },
    { branche: 'Großhandel', anteil: '21 %', charakter: '14 Kunden · Hohes Lead-Volumen, klare SLA-Anforderungen' },
    { branche: 'Agenturen', anteil: '15 %', charakter: '10 Kunden · Kurze Sales-Cycles, direkte Entscheider-Ebene' },
  ],
};

export const REGIONEN = {
  title: 'Regionale Kundenverteilung (Stand 31.12.2025)',
  headers: ['Region / Land', 'Kunden', 'Anteil', 'Status'],
  rows: [
    { region: 'Deutschland', kunden: 61, share: '92,4 %', status: 'Kernmarkt' },
    { region: 'Österreich', kunden: 3, share: '4,5 %', status: 'Erste B2B-Kunden' },
    { region: 'Schweiz', kunden: 2, share: '3,0 %', status: 'Erste B2B-Kunden' },
  ],
  total: 66,
  distribution: {
    deutschland: 61,
    oesterreich: 3,
    schweiz: 2,
    gesamt: 66,
  },
};

export const CHART_SEGMENT = {
  type: 'bar' as const,
  labels: ['Maschinenbau', 'IT / Software', 'Großhandel', 'Agenturen'],
  datasets: [{
    label: 'ARR nach Segment (€)',
    data: [178560, 112320, 78960, 42000],
    colors: ['#00D9C6', '#7CEFE6', '#FF7A3D', '#FF9A66'],
  }],
};

export const TOP10 = {
  title: 'Top B2B Referenzkunden (ICP-konform, < 200 MA)',
  headers: ['Kunde', 'Branche', 'Mitarbeiter', 'Paket', 'Nutzer', 'ARR (€)'],
  rows: [
    ['Northwind GmbH', 'Maschinenbau', '85', 'Growth', '10', '10.680 €'],
    ['Fenwick Co.', 'IT & Software', '42', 'Growth', '8', '8.544 €'],
    ['Delta Labs', 'Großhandel', '110', 'Pro', '14', '13.440 €'],
    ['Ocular Systems', 'Agenturen', '28', 'Starter', '5', '2.940 €'],
    ['Brightline Solutions', 'IT & Software', '65', 'Growth', '10', '10.680 €'],
    ['Kestrel Components', 'Maschinenbau', '140', 'Pro', '15', '14.400 €'],
    ['Vektor Dynamics', 'Maschinenbau', '95', 'Growth', '12', '12.816 €'],
    ['Hansa Automation', 'IT & Software', '50', 'Growth', '10', '10.680 €'],
    ['Konzett Systems', 'Großhandel', '78', 'Growth', '9', '9.612 €'],
    ['Siegfried Precision', 'Maschinenbau', '115', 'Pro', '16', '15.360 €'],
  ],
};

export const CS = {
  title: 'Customer Success & Retention GJ 2025',
  kpis: [
    { label: 'Net Retention Rate (NRR)', val: '101 %' },
    { label: 'Gross Retention Rate (GRR)', val: '88 %' },
    { label: 'Account-Churn (monatlich)', val: '2,8 %' },
    { label: 'Net Promoter Score (NPS)', val: '34' },
    { label: 'Time-to-Value', val: '11 Tage' },
  ],
};
