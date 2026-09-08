export const FUNKTION = {
  title: 'Produkt & Funktionsweise',
  modules: [
    { name: 'Smart Lead Capture', desc: 'Erfasst Inbound-Leads automatisch aus Webformularen, Messen, E-Mails und LinkedIn Ads.' },
    { name: 'KI Lead Scoring v1.5', desc: 'Bewertet Leads anhand von Firmografie, ICP-Fit und Verhalten automatisch von 0 bis 100.' },
    { name: 'Nurturing Sequenzen', desc: 'Führt automatisierte Outreach- und Follow-up-Reihen per E-Mail aus.' },
    { name: 'Pipeline Cockpit', desc: 'Echtzeit-Kanban & Tabellenansicht aller Leads nach Status (New, MQL, SQL, Hot, Won, Lost).' },
  ],
};

export const PRICING = {
  title: 'Preismodell (Verbindliche Nutzerbasierte Abrechnung)',
  tiers: [
    {
      name: 'Starter',
      price: '49 €',
      period: 'pro Nutzer / Monat',
      desc: 'Für kleine Vertriebsteams von 1 bis 10 Nutzern.',
      features: [
        'Lead-Erfassung & Kontaktverwaltung',
        'Pipeline Cockpit & Kanban-Ansicht',
        'Automatische Aufgaben-Zuweisung',
        'Basis-Dashboard & DSGVO Hosting DE',
      ],
    },
    {
      name: 'Growth',
      price: '89 €',
      period: 'pro Nutzer / Monat',
      featured: true,
      desc: 'Für wachsende Vertriebsteams von 10 bis 50 Nutzern (Bestseller).',
      features: [
        'Inklusive aller Starter-Funktionen',
        'Natives KI-Lead-Scoring v1.5',
        'Automatisierte Nurturing-Sequenzen',
        'Erweitertes Reporting & Integrationen',
      ],
    },
    {
      name: 'Pro',
      price: 'Individuelles Angebot',
      period: 'Referenz 80 € / Nutzer / Monat (50+ Nutzer)',
      desc: 'Für größere Teams & Volumenkunden mit individuellen Rollen und SLA.',
      features: [
        'Inklusive aller Growth-Funktionen',
        'Erweiterte Integrationen (M365 / Workspace)',
        'Dedizierter Support & individuelle Rollen',
        'Verbindliche SLAs & Customer Success Management',
      ],
    },
  ],
};

export const PERF = {
  title: 'Produkt-Performance & Qualitätsmetriken GJ 2025',
  metrics: [
    { label: 'Plattform Uptime / Verfügbarkeit', val: '99,7 % (Ziel: 99,5 % · erreicht)' },
    { label: 'Aktivierungsrate', val: '58 % (Ziel: 70 % · verfehlt)' },
    { label: 'WAU / MAU Verhältnis', val: '59 % (Ziel: 60 % · verfehlt)' },
    { label: 'Nutzung KI-Scoring (Kernfeature)', val: '47 % (Ziel: 65 % · verfehlt)' },
    { label: 'Time-to-First-Action (Onboarding)', val: '18 Minuten (Ziel: < 30 Min · erreicht)' },
    { label: 'Support-Tickets / Monat', val: '14 Tickets (Ziel: < 20 · erreicht)' },
  ],
};

export const CHART_PRODUKT = {
  type: 'line' as const,
  labels: ['Q1 25', 'Q2 25', 'Q3 25', 'Q4 25'],
  datasets: [
    { label: 'Aktivierungsrate (%)', data: [49, 53, 56, 58], color: '#00D9C6', fill: true },
    { label: 'KI-Scoring-Nutzung (%)', data: [38, 41, 44, 47], color: '#FF7A3D', fill: false },
  ],
};

export const CHART_CHURN = {
  type: 'doughnut' as const,
  labels: ['Zu klein / kein Vertrieb', 'Onboarding nie abgeschlossen', 'Preis', 'Wechsel zum Wettbewerber'],
  datasets: [{
    data: [8, 5, 2, 2],
    colors: ['#FF7A3D', '#FF9A66', '#00D9C6', '#A7B0BA'],
  }],
};

export interface RoadmapRelease {
  quarter: string;
  title: string;
  status: 'Released' | 'In Entwicklung' | 'Geplant' | string;
  desc: string;
}

export const ROADMAP: {
  title: string;
  releases: RoadmapRelease[];
} = {
  title: 'Release-Historie & Roadmap 2026',
  releases: [
    { quarter: 'v1.2 (Feb 2025)', title: 'Import-Assistent', status: 'Released', desc: 'Import-Assistent für Excel- und Google-Listen.' },
    { quarter: 'v1.3 (Mai 2025)', title: 'KI-Scoring v1.5', status: 'Released', desc: 'Verbessertes KI-Scoring mit 71 % Trefferquote.' },
    { quarter: 'v1.4 (Aug 2025)', title: 'M365 & Workspace Integration', status: 'Released', desc: 'Direkte Anbindung an Microsoft 365 und Google Workspace.' },
    { quarter: 'v1.5 (Nov 2025)', title: 'Überfälligkeits-Dashboard', status: 'Released', desc: 'Übersichts-Cockpit für die Vertriebsleitung.' },
    { quarter: 'v2.0 (geplant Q1 2026)', title: 'Geführter Trial-Flow', status: 'In Entwicklung', desc: 'Guided Trial-Flow zur Erhöhung der Trial-to-Paid Rate auf 25 %.' },
    { quarter: 'v2.1 (geplant Q2 2026)', title: 'Zapier / Make Anbindung', status: 'Geplant', desc: 'Standard-Konnektoren für iPaas-Plattformen Zapier und Make.' },
  ],
};

export const INTEGR = {
  title: 'Architektur & DSGVO-Positionierung',
  stack: [
    { category: 'Hosting & Server', tech: 'Ausschließlich europäische Rechenzentren (Standort Frankfurt am Main)' },
    { category: 'KI-Infrastruktur', tech: 'EU-gehosteter KI-Anbieter — kein Direktzugriff auf US-Hyperscaler' },
    { category: 'Compliance', tech: 'AV-Vertrag (AVV) und Verfahrensverzeichnis als Standardbestandteil des Onboardings' },
    { category: 'Tech-Stack', tech: 'Vite + React + TypeScript Frontend, PostgreSQL Data Engine' },
  ],
};
