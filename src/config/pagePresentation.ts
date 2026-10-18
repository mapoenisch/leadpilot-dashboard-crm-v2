// Auftrag 069 / G67: Darstellung der 32 statischen Inhaltsseiten.
//
// 'bild' — Original-WebPs aus v2.2.0 (Standard ab v2.3.2), Seiteninhalt als
//          unsichtbare Textschicht für Screenreader und Suche.
// 'html' — Aussehen von v2.3.1 (Page-Kit-Nachbau aus Auftrag 068).
//
// Rückweg zu v2.3.1: diesen Wert auf 'html' setzen. Alternativ Tag `v2.3.1`
// ausliefern (Commit 1bbe32da01d8b4b1b00b3a85e7d3c8108ce338e2).
export type PagePresentation = 'bild' | 'html';

export const PAGE_PRESENTATION: PagePresentation = 'bild';

// Auftrag 093 (Paket G1): Seitenfreigabe je migrierter Gruppe. Hier genannte
// Seiten (Schlüssel aus imagePages.ts) erscheinen als HTML, alle übrigen
// bleiben beim globalen Schalter. Rückschaltung einer Gruppe: Eintrag entfernen.
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
];
