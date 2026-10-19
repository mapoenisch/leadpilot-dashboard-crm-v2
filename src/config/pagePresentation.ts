// Auftrag 069 / G67: Darstellung der 32 statischen Inhaltsseiten.
//
// 'bild' — Original-WebPs aus v2.2.0, Seiteninhalt als unsichtbare Textschicht
//          für Screenreader und Suche. Nur noch Rückweg, keine aktive Darstellung.
// 'html' — echte Seiten (Page-Kit). Standard ab Auftrag 104 (Paket G3): alle 32
//          Seiten sind mit den Wellen G1/G2 (Aufträge 093–103) freigegeben.
//
// Rückweg einzelner Seiten: Wert auf 'bild' setzen und den Schlüssel unten aus
// HTML_PAGES entfernen — nur diese Seiten zeigen dann wieder das WebP.
// Rückweg aller Seiten: 'bild' und HTML_PAGES leeren, oder Tag `v2.4.0` ausliefern.
// Zum Rückweg gehört: Freigabetests der betroffenen Welle (g93…g103) für diese Seiten
// entfernen; g104BildseitenAbschluss und die E2E-Suite folgen dem Schalter.
export type PagePresentation = 'bild' | 'html';

export const PAGE_PRESENTATION: PagePresentation = 'html';

// Auftrag 093 (Paket G1): Seitenfreigabe je migrierter Gruppe. Hier genannte
// Seiten (Schlüssel aus imagePages.ts) erscheinen auch im Modus 'bild' als HTML.
// Auftrag 104: Die Liste ist vollständig (32 von 32) und bleibt als Freigabenachweis
// und Grundlage für den Rückweg einzelner Seiten stehen.
export const HTML_PAGES: readonly string[] = [
  // Welle G1 – Sales Funnel (Auftrag 093)
  'sales-funnel',
  // Welle G2-1 – Unternehmen (Auftrag 094)
  'company-idea',
  'company-value-proposition',
  'company-history',
  // Welle G2-2 – Unternehmensübersicht und Produkt (Auftrag 095)
  'overview-profile',
  'overview-highlights',
  'product-features',
  'product-roadmap',
  // Welle G2-3 – Vertrieb & Marketing (Auftrag 096)
  'sales-sla',
  'sales-channels',
  'sales-planning',
  // Welle G2-4 – Finanzen (Auftrag 097)
  'finance-pnl',
  'finance-balance-sheet',
  'finance-unit-economics',
  // Welle G2-5 – Markt & Wettbewerb (Auftrag 098)
  'market-dach',
  'market-competition',
  'market-swot',
  // Welle G2-6 – Kunden (Auftrag 099)
  'customers-icp',
  'customers-persona',
  'customers-segments',
  'customers-top10',
  // Welle G2-7 – Organisation (Auftrag 100)
  'organisation-headcount',
  'organisation-hr',
  'organisation-team',
  // Welle G2-8 – Strategie (Auftrag 101)
  'strategy-okrs',
  'strategy-bsc',
  'strategy-growth',
  // Welle G2-9 – Recht (Auftrag 102)
  'legal-articles',
  'legal-shareholders',
  'legal-register',
  // Welle G2-10 – Produkt (Auftrag 103)
  'product-pricing',
  'product-performance',
];
