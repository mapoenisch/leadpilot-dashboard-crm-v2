// Auftrag 069 / G67: Zuordnung Seite → Original-WebP, identisch zu v2.2.0
// (Datei, alt-Text und data-testid aus `git show v2.2.0:src/features/**/pages`).
// Die Dateien selbst sind unverändert, SHA-256 siehe `ASSET_SOURCE.md`.
export interface ImagePageEntry {
  src: string;
  alt: string;
  testId: string;
}

export const IMAGE_PAGES = {
  'market-dach': {
    src: '/assets/auftrag-037d/01-marktlage-dach.webp',
    alt: 'Marktlage DACH B2B Lead- und CRM-Markt',
    testId: 'market-dach-webp',
  },
  'market-competition': {
    src: '/assets/auftrag-037d/02-wettbewerbslandschaft.webp',
    alt: 'Wettbewerbslandschaft und Marktanteile B2B CRM DACH',
    testId: 'market-competition-webp',
  },
  'market-swot': {
    src: '/assets/auftrag-037d/03-swot-analyse.webp',
    alt: 'SWOT-Analyse LeadPilot GmbH',
    testId: 'market-swot-webp',
  },
  'customers-icp': {
    src: '/assets/auftrag-037d/04-ideal-customer-profile.webp',
    alt: 'Ideal Customer Profile (ICP)',
    testId: 'customers-icp-webp',
  },
  'customers-persona': {
    src: '/assets/auftrag-037d/05-buyer-persona-volker.webp',
    alt: 'Buyer Persona Volker',
    testId: 'customers-persona-webp',
  },
  'customers-segments': {
    src: '/assets/auftrag-037d/06-kundensegmente.webp',
    alt: 'Kundensegmente und Branchenverteilung',
    testId: 'customers-segments-webp',
  },
  'customers-top10': {
    src: '/assets/auftrag-037d/07-top-10-kunden.webp',
    alt: 'Top-10 B2B Referenzkunden',
    testId: 'customers-top10-webp',
  },
  'sales-funnel': {
    src: '/assets/auftrag-037e/01-sales-funnel-2025.webp',
    alt: 'Sales Funnel 2025 Conversion-Raten und Trichterstufen',
    testId: 'sales-funnel-webp',
  },
  'sales-sla': {
    src: '/assets/auftrag-037e/02-sla-marketing-sales.webp',
    alt: 'SLA Marketing und Sales Übergabepunkt und Pflichten',
    testId: 'sales-sla-webp',
  },
  'sales-channels': {
    src: '/assets/auftrag-037e/03-kanalperformance-cac.webp',
    alt: 'Kanalperformance und CAC-Index Akquisitionskanäle',
    testId: 'sales-channels-webp',
  },
  'sales-planning': {
    src: '/assets/auftrag-037e/04-marketingplanung-h2-2026.webp',
    alt: 'Marketingplanung H2 2026 Budgetallokation und Ziel-KPIs',
    testId: 'sales-planning-webp',
  },
  'finance-pnl': {
    src: '/assets/auftrag-037e/05-gewinn-verlustrechnung.webp',
    alt: 'Gewinn- und Verlustrechnung GuV Finanzergebnisse',
    testId: 'finance-pnl-webp',
  },
  'finance-balance-sheet': {
    src: '/assets/auftrag-037e/06-bilanz-saas.webp',
    alt: 'Bilanz 2025 Aktiva und Passiva',
    testId: 'finance-balance-sheet-webp',
  },
  'finance-unit-economics': {
    src: '/assets/auftrag-037e/07-unit-economics-2026.webp',
    alt: 'Unit Economics und SaaS-Kernmetriken 2025 und 2026',
    testId: 'finance-unit-economics-webp',
  },
  'organisation-headcount': {
    src: '/assets/auftrag-037f/01-headcount-entwicklung.webp',
    alt: 'Headcount-Entwicklung und Mitarbeiterkapazität',
    testId: 'organisation-headcount-webp',
  },
  'organisation-hr': {
    src: '/assets/auftrag-037f/02-hr-kennzahlen.webp',
    alt: 'HR-Kennzahlen und Personalökonomie',
    testId: 'organisation-hr-webp',
  },
  'organisation-team': {
    src: '/assets/auftrag-037f/03-teamstruktur-engpaesse.webp',
    alt: 'Teamstruktur und operative Engpässe',
    testId: 'organisation-team-webp',
  },
  'strategy-okrs': {
    src: '/assets/auftrag-037f/04-ziele-okrs.webp',
    alt: 'Ziele und strategische OKRs 2026',
    testId: 'strategy-okrs-webp',
  },
  'strategy-bsc': {
    src: '/assets/auftrag-037f/05-balanced-scorecard.webp',
    alt: 'Balanced Scorecard Steuerungskennzahlen',
    testId: 'strategy-bsc-webp',
  },
  'strategy-growth': {
    src: '/assets/auftrag-037f/06-wachstumstreiber.webp',
    alt: 'Wachstumstreiber und Sensitivitäts-Effektbaum',
    testId: 'strategy-growth-webp',
  },
  'legal-articles': {
    src: '/assets/auftrag-037f/07-satzung-leadpilot.webp',
    alt: 'Satzung der LeadPilot GmbH Auszug',
    testId: 'legal-articles-webp',
  },
  'legal-shareholders': {
    src: '/assets/auftrag-037f/08-gesellschafterliste.webp',
    alt: 'Gesellschafterliste und Beteiligungsverhältnisse',
    testId: 'legal-shareholders-webp',
  },
  'legal-register': {
    src: '/assets/auftrag-037f/09-handelsregister.webp',
    alt: 'Handelsregisterdaten und Vertretungsbefugnis',
    testId: 'legal-register-webp',
  },
  'overview-profile': {
    src: '/assets/auftrag-037g/01-unternehmenssteckbrief.webp',
    alt: 'Unternehmenssteckbrief LeadPilot GmbH – Stammdaten und rechtliche Eckdaten',
    testId: 'overview-profile-webp',
  },
  'overview-highlights': {
    src: '/assets/auftrag-037g/02-jahres-highlights-2025.webp',
    alt: 'Jahres-Highlights 2025 – Top-Erfolge und operative Herausforderungen',
    testId: 'overview-highlights-webp',
  },
  'company-idea': {
    src: '/assets/auftrag-037g/04-geschaeftsidee.webp',
    alt: 'LeadPilot Geschäftsidee – B2B-Lead-Management-Software für den Mittelstand',
    testId: 'company-idea-webp',
  },
  'company-value-proposition': {
    src: '/assets/auftrag-037g/05-value-proposition.webp',
    alt: 'Value Proposition und Positionierung – Kernvorteile und Markenversprechen',
    testId: 'company-value-proposition-webp',
  },
  'company-history': {
    src: '/assets/auftrag-037g/06-gruendung-entwicklung.webp',
    alt: 'Gründung und Finanzierungshistorie – Meilensteine der LeadPilot GmbH',
    testId: 'company-history-webp',
  },
  'product-features': {
    src: '/assets/auftrag-037g/07-produkt-funktionsweise.webp',
    alt: 'Produkt und Funktionsweise – Kernmodule der LeadPilot-Plattform',
    testId: 'product-features-webp',
  },
  'product-pricing': {
    src: '/assets/auftrag-037g/08-preismodell.webp',
    alt: 'Preismodell – Verbindliche nutzerbasierte Abrechnung und SaaS-Tarife',
    testId: 'product-pricing-webp',
  },
  'product-performance': {
    src: '/assets/auftrag-037g/09-produkt-performance-2025.webp',
    alt: 'Produkt-Performance und Qualitätsmetriken GJ 2025 – System- und Nutzungsdaten',
    testId: 'product-performance-webp',
  },
  'product-roadmap': {
    src: '/assets/auftrag-037g/10-releases-roadmap.webp',
    alt: 'Release-Historie und Roadmap 2026 – Meilensteine und geplante Features',
    testId: 'product-roadmap-webp',
  },
} as const satisfies Record<string, ImagePageEntry>;

export type ImagePageKey = keyof typeof IMAGE_PAGES;
