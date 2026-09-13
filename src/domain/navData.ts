import { NavCategory } from '../types/dashboard';

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'uebersicht',
    label: 'Übersicht',
    status: 'live',
    items: [
      { id: 's-exec', label: 'Executive Dashboard' },
      { id: 's-profil', label: 'Unternehmenssteckbrief' },
      { id: 's-highlights', label: 'Jahres-Highlights 2025' },
      { id: 's-daten', label: 'Datenbasis & Konsistenz' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM & Pipeline',
    status: 'live',
    items: [
      { id: 's-live-simulation', label: '⚡ Live-Simulation (Ebene B)' },
      { id: 's-leads', label: 'Leads & Kontakte' },
      { id: 's-companies', label: 'Unternehmen (Accounts)' },
      { id: 's-deals', label: 'Deal Pipeline' },
      { id: 's-activities', label: 'Aktivitäten-Historie' },
    ],
  },
  {
    id: 'unternehmen',
    label: 'Unternehmen',
    status: 'live',
    items: [
      { id: 's-idee', label: 'Geschäftsidee' },
      { id: 's-value', label: 'Value Proposition' },
      { id: 's-historie', label: 'Gründung & Entwicklung' },
      { id: 's-standort', label: 'Sitz & Räumlichkeiten' },
    ],
  },
  {
    id: 'produkt',
    label: 'Produkt',
    status: 'live',
    items: [
      { id: 's-funktion', label: 'Produkt & Funktionsweise' },
      { id: 's-pricing', label: 'Pakete & Preismodell' },
      { id: 's-perf', label: 'Produkt-Performance 2025' },
      { id: 's-roadmap', label: 'Releases & Roadmap' },
    ],
  },
  {
    id: 'markt',
    label: 'Markt & Wettbewerb',
    status: 'live',
    items: [
      { id: 's-markt', label: 'Marktlage DACH' },
      { id: 's-wettbewerb', label: 'Wettbewerbslandschaft' },
      { id: 's-swot', label: 'SWOT-Analyse' },
    ],
  },
  {
    id: 'kunden',
    label: 'Kunden & ICP',
    status: 'live',
    items: [
      { id: 's-icp', label: 'Ideal Customer Profile (ICP)' },
      { id: 's-persona', label: 'Buyer Persona „Volker"' },
      { id: 's-segmente', label: 'Kundensegmente' },
      { id: 's-top10', label: 'Top-10-Kunden' },
    ],
  },
  {
    id: 'vertrieb',
    label: 'Vertrieb & Marketing',
    status: 'live',
    items: [
      { id: 's-funnel', label: 'Sales Funnel 2025' },
      { id: 's-sla', label: 'SLA Marketing & Sales' },
      { id: 's-kanaele', label: 'Kanalperformance & CAC' },
      { id: 's-planung', label: 'Marketingplanung H2 2026' },
    ],
  },
  {
    id: 'finanzen',
    label: 'Finanzen',
    status: 'live',
    items: [
      { id: 's-guv', label: 'Gewinn- und Verlustrechnung' },
      { id: 's-bilanz', label: 'Bilanz & SaaS KPIs' },
      { id: 's-unit', label: 'Unit Economics 2026' },
    ],
  },
  {
    id: 'organisation',
    label: 'Organisation & Team',
    status: 'live',
    items: [
      { id: 's-headcount', label: 'Headcount-Entwicklung' },
      { id: 's-hr', label: 'HR-Kennzahlen' },
      { id: 's-team', label: 'Teamstruktur & Engpässe' },
    ],
  },
  {
    id: 'strategie',
    label: 'Strategie 2026+',
    status: 'live',
    items: [
      { id: 's-okr', label: 'Ziele & OKRs' },
      { id: 's-bsc', label: 'Balanced Scorecard' },
      { id: 's-treiber', label: 'Wachstumstreiber' },
    ],
  },
  {
    id: 'resources',
    label: 'Internal Resources',
    status: 'live',
    items: [{ id: 's-kampagne-internal', label: '📁 Originalmaterialien & Decks' }],
  },
  {
    id: 'recht',
    label: 'Recht & Gründung',
    status: 'live',
    items: [
      { id: 's-satzung', label: 'Satzung LeadPilot GmbH' },
      { id: 's-gesellschafter', label: 'Gesellschafterliste' },
      { id: 's-handelsregister', label: 'Handelsregister' },
    ],
  },
];
