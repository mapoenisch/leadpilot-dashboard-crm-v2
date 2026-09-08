/**
 * Facelift Visual Data & Semantics
 *
 * Verbindliche Typen und Metadaten-Konfiguration für die Facelift-Visualisierungen
 * gemäß Designspezifikation (docs/superpowers/specs/2026-09-03-facelift-design.md)
 * und Umsetzungsplan (docs/superpowers/plans/2026-09-03-facelift-implementation-plan.md).
 *
 * Alle operativen Zahlen kommen weiterhin aus den bestehenden Domain-Dateien
 * (unternehmenData, produktData, marktData, kundenData, vertriebData, finanzenData,
 * organisationData, strategieData).
 */

export type VisualTone = 'positive' | 'attention' | 'neutral' | 'accent';

export type FaceliftGlyphName =
  | 'contactToCustomer'
  | 'focus'
  | 'ready'
  | 'success'
  | 'challenge'
  | 'fit'
  | 'risk'
  | 'opportunity';

export const REQUIRED_FACELIFT_GLYPHS: readonly FaceliftGlyphName[] = [
  'contactToCustomer',
  'focus',
  'ready',
  'success',
  'challenge',
  'fit',
  'risk',
  'opportunity',
] as const;

export type FaceliftVisualId =
  // Überblick (Auftrag 2)
  | 'company-register'
  | 'performance-pulse'
  | 'source-decision'
  // Unternehmen (Auftrag 3 & 4)
  | 'business-idea-signals'
  | 'benefit-stage'
  | 'funding-timeline'
  | 'location-atlas'
  // Produkt (Auftrag 5)
  | 'operations-hub'
  | 'product-health'
  | 'roadmap-horizons'
  // Markt (Auftrag 6)
  | 'market-opportunity-stack'
  | 'decision-topology'
  | 'swot-compass'
  // Kunden (Auftrag 7)
  | 'icp-fit-map'
  | 'persona-dossier'
  | 'volker-day-timeline'
  | 'segment-fields'
  | 'revenue-staircase'
  | 'customer-portfolio'
  // Vertrieb (Auftrag 8)
  | 'funnel-leakage-waterfall'
  | 'sla-swimlane'
  | 'channel-investment-route'
  | 'budget-target-ladder'
  // Finanzen (Auftrag 9)
  | 'revenue-cost-shoreline'
  | 'capital-cut'
  | 'saas-motor'
  // Organisation (Auftrag 10)
  | 'organisation-scaffold'
  | 'people-health-rail'
  | 'capacity-network'
  | 'role-legend'
  // Strategie (Auftrag 11)
  | 'goal-runway'
  | 'bsc-path';

export const FACELIFT_VISUAL_IDS: readonly FaceliftVisualId[] = [
  'company-register',
  'performance-pulse',
  'source-decision',
  'business-idea-signals',
  'benefit-stage',
  'funding-timeline',
  'location-atlas',
  'operations-hub',
  'product-health',
  'roadmap-horizons',
  'market-opportunity-stack',
  'decision-topology',
  'swot-compass',
  'icp-fit-map',
  'persona-dossier',
  'volker-day-timeline',
  'segment-fields',
  'revenue-staircase',
  'customer-portfolio',
  'funnel-leakage-waterfall',
  'sla-swimlane',
  'channel-investment-route',
  'budget-target-ladder',
  'revenue-cost-shoreline',
  'capital-cut',
  'saas-motor',
  'organisation-scaffold',
  'people-health-rail',
  'capacity-network',
  'role-legend',
  'goal-runway',
  'bsc-path',
] as const;

export interface FaceliftVisualMeta {
  id: FaceliftVisualId;
  feature: string;
  title: string;
  description: string;
  fallbackType: 'table' | 'text' | 'cards';
}

export const FACELIFT_VISUAL_REGISTRY: Record<FaceliftVisualId, FaceliftVisualMeta> = {
  'company-register': {
    id: 'company-register',
    feature: 'overview',
    title: 'Firmenregister & Stammdaten',
    description: 'Hochwertige Firmenakte mit Identität, Stammdaten und Beurkundungsbezug',
    fallbackType: 'table',
  },
  'performance-pulse': {
    id: 'performance-pulse',
    feature: 'overview',
    title: 'Performance-Puls 2025/2026',
    description: 'Vertikale Jahresachse mit Erfolgen (rechts) und Herausforderungen (links)',
    fallbackType: 'cards',
  },
  'source-decision': {
    id: 'source-decision',
    feature: 'overview',
    title: 'Datenfluss: Source → Decision',
    description: 'Ablauf von Quellsystemen über Validierung zur Vertriebsentscheidung',
    fallbackType: 'table',
  },
  'business-idea-signals': {
    id: 'business-idea-signals',
    feature: 'unternehmen',
    title: 'Geschäftsidee Signal Map',
    description: 'DACH-KMU-Situation → Vertriebsreibung → LeadPilot-Mechanik → Nutzen mit KfW- und Destatis-Quellen',
    fallbackType: 'text',
  },
  'benefit-stage': {
    id: 'benefit-stage',
    feature: 'unternehmen',
    title: 'Value Proposition & Benefit Stage',
    description: 'Horizontale Hauptaussage, drei vertriebsnahe Nutzen und visuelle Symbolmarke',
    fallbackType: 'cards',
  },
  'funding-timeline': {
    id: 'funding-timeline',
    feature: 'unternehmen',
    title: 'Gründungs- & Finanzierungs-Doppelspur',
    description: 'Zwei synchronisierte Zeitspuren: Kapital & Recht (oben) und Produkt & Markt (unten)',
    fallbackType: 'table',
  },
  'location-atlas': {
    id: 'location-atlas',
    feature: 'unternehmen',
    title: 'Company Atlas & Standort Leipzig',
    description: 'Leitbild, drei Innenansichten mit UI-Logo und Mietobjekt-Faktenleiste',
    fallbackType: 'cards',
  },
  'operations-hub': {
    id: 'operations-hub',
    feature: 'produkt',
    title: 'Produkt-Betriebszentrale',
    description: 'Pipeline-Cockpit im Zentrum und vier Produktmodule mit Vertriebsbezug',
    fallbackType: 'cards',
  },
  'product-health': {
    id: 'product-health',
    feature: 'produkt',
    title: 'Produktgesundheit',
    description: 'Sechs Leistungskennzahlen gegliedert in Stabilität, Nutzung und Onboarding',
    fallbackType: 'cards',
  },
  'roadmap-horizons': {
    id: 'roadmap-horizons',
    feature: 'produkt',
    title: 'Release-Horizonte: Now / Next / Later',
    description: 'Gelieferte, laufende und geplante Funktionsschritte ohne Statusvertauschung',
    fallbackType: 'cards',
  },
  'market-opportunity-stack': {
    id: 'market-opportunity-stack',
    feature: 'markt',
    title: 'Chancenstapel Marktpotenzial',
    description: 'Marktvolumen → adressierbarer Fokusmarkt → erreichte Aufmerksamkeit',
    fallbackType: 'table',
  },
  'decision-topology': {
    id: 'decision-topology',
    feature: 'markt',
    title: 'Isometrische Entscheidungs-Topografie',
    description: 'Topografie mit Zonen Enterprise, Marketing/Service, Pipeline Tools und Einführungsaufwand',
    fallbackType: 'table',
  },
  'swot-compass': {
    id: 'swot-compass',
    feature: 'markt',
    title: 'Strategischer SWOT-Kompass',
    description: 'Vier Fachzeichen um ein Entscheidungszentrum auf den Achsen intern/extern und stärken/schützen',
    fallbackType: 'cards',
  },
  'icp-fit-map': {
    id: 'icp-fit-map',
    feature: 'kunden',
    title: 'ICP-Fit-Karte & Ausschlusskriterien',
    description: 'Idealprofil, Firmografie, Trigger-Priorität und beschriftete Ausschlusszone',
    fallbackType: 'table',
  },
  'persona-dossier': {
    id: 'persona-dossier',
    feature: 'kunden',
    title: 'Entscheider-Dossier Volker',
    description: 'Rolle, Schmerzpunkte, Ziele und Fit des typischen Vertriebsleiters',
    fallbackType: 'cards',
  },
  'volker-day-timeline': {
    id: 'volker-day-timeline',
    feature: 'kunden',
    title: 'Ein Tag in Volkers Vertrieb',
    description: 'Konkrete Tagesreise und Reibungspunkte von Morgenmeeting bis Abschluss',
    fallbackType: 'cards',
  },
  'segment-fields': {
    id: 'segment-fields',
    feature: 'kunden',
    title: 'Segment-Felder ARR-Verteilung',
    description: 'Große visuelle Segment-Flächen nach ARR-Beitrag der Zielbranchen',
    fallbackType: 'table',
  },
  'revenue-staircase': {
    id: 'revenue-staircase',
    feature: 'kunden',
    title: 'Umsatz-Staffel Branchensegmente',
    description: 'Präzise tabellarisch-visuelle Staffel der Segmentumsätze',
    fallbackType: 'table',
  },
  'customer-portfolio': {
    id: 'customer-portfolio',
    feature: 'kunden',
    title: 'Kundenportfolio Raumkarte',
    description: 'Portfolio nach ARR und aktiven Nutzern als Raumkarte statt Rangliste',
    fallbackType: 'table',
  },
  'funnel-leakage-waterfall': {
    id: 'funnel-leakage-waterfall',
    feature: 'vertrieb',
    title: 'Funnel-Leckage-Wasserfall',
    description: 'Stufenweiser Verlust und verbleibendes Potenzial von Lead bis Won',
    fallbackType: 'table',
  },
  'sla-swimlane': {
    id: 'sla-swimlane',
    feature: 'vertrieb',
    title: 'SLA-Swimlanes Marketing & Vertrieb',
    description: 'Parallele Verantwortungsbahnen, Fristen, Rückgaben und Eskalationen',
    fallbackType: 'table',
  },
  'channel-investment-route': {
    id: 'channel-investment-route',
    feature: 'vertrieb',
    title: 'Investitionsroute Kanal → CAC → Neukunden',
    description: 'Kanalbudget, CAC-Effizienz und Handlungssignale (erhöhen, halten, stoppen)',
    fallbackType: 'table',
  },
  'budget-target-ladder': {
    id: 'budget-target-ladder',
    feature: 'vertrieb',
    title: 'Budget-zu-Ziel-Leiter',
    description: 'Rückverfolgbare Kette: Budget → MQL → SQL → Umsatz',
    fallbackType: 'table',
  },
  'revenue-cost-shoreline': {
    id: 'revenue-cost-shoreline',
    feature: 'finanzen',
    title: 'Ertragsufer GuV-Verlauf',
    description: 'Umsatz- und Kostenverlauf über Zeit inklusive sichtbarer Ergebnislücke',
    fallbackType: 'table',
  },
  'capital-cut': {
    id: 'capital-cut',
    feature: 'finanzen',
    title: 'Kapital-Schnitt: Mittelherkunft & Verwendung',
    description: 'Kompakte Gegenüberstellung von Finanzierungsquellen und Investitionen',
    fallbackType: 'table',
  },
  'saas-motor': {
    id: 'saas-motor',
    feature: 'finanzen',
    title: 'SaaS-Motor Kausalitätskreis',
    description: 'Gerichteter Ursache-Wirkungs-Kreis: ARPA, Payback, Retention und MRR',
    fallbackType: 'cards',
  },
  'organisation-scaffold': {
    id: 'organisation-scaffold',
    feature: 'organisation',
    title: 'Organisationsgerüst FTE nach Funktion',
    description: 'Wachsende Funktionsbausteine für Kapazität und Teamstruktur',
    fallbackType: 'table',
  },
  'people-health-rail': {
    id: 'people-health-rail',
    feature: 'organisation',
    title: 'People-Health-Leiste',
    description: 'Zusammenhang von Personalaufwand, Teambindung und Zufriedenheit',
    fallbackType: 'cards',
  },
  'capacity-network': {
    id: 'capacity-network',
    feature: 'organisation',
    title: 'Kapazitätsnetz & Übergaben',
    description: 'Netzwerk aus Rollen und Schnittstellen mit orange markierten Engpässen',
    fallbackType: 'cards',
  },
  'role-legend': {
    id: 'role-legend',
    feature: 'organisation',
    title: 'Rollen-Landkarte & Engpasserklärung',
    description: 'Erklärung zu Engineering, Sales-Demo-Kapazität und CTO-Single-Point-of-Failure',
    fallbackType: 'text',
  },
  'goal-runway': {
    id: 'goal-runway',
    feature: 'strategie',
    title: 'Ziel-Startbahn OKR',
    description: 'Ausgangspunkt, Zwischenetappen, Zielwert und verbleibende Lücke je Objective',
    fallbackType: 'table',
  },
  'bsc-path': {
    id: 'bsc-path',
    feature: 'strategie',
    title: 'Balanced Scorecard Wirkungsbahn',
    description: 'Kausale Kette: Lernen → Prozesse → Kunde → Finanzen mit kurzen Erklärungen',
    fallbackType: 'cards',
  },
};

/**
 * Verbindliche externe Quellenangaben für KMU- und Digitalisierungsdaten
 * exakt gebunden an die Facelift-Spezifikation.
 */
export const FACELIFT_SOURCES = {
  kfw: {
    id: 'kfw',
    name: 'KfW Research',
    title: 'KfW-Digitalisierungsbericht Mittelstand',
    url: 'https://www.kfw.de/%C3%9Cber-die-KfW/Newsroom/Aktuelles/News-Details_875136.html',
    metric: '868.000 digital umsatzaktive KMU in Deutschland',
  },
  destatis: {
    id: 'destatis',
    name: 'Statistisches Bundesamt (Destatis)',
    title: 'IKT-Nutzung in Unternehmen (Cloud Computing)',
    url: 'https://www.destatis.de/EN/Themes/Economic-Sectors-Enterprises/Enterprises/ICT-Enterprises-ICT-Sector/Tables/icte-06-enterprises-cloud-computing.html',
    metric: '21 % Cloud-CRM-Nutzung bei Unternehmen mit 10–49 Beschäftigten',
  },
} as const;

/**
 * Verbindliche Bild- und Logo-Assets für den Company Atlas
 */
export const FACELIFT_ASSETS = {
  logo: 'assets/logo/leadpilot-logo-full.png',
  standortImages: [
    'assets/facelift/unternehmen/unternehmen-aussen-augustusplatz.png',
    'assets/facelift/unternehmen/unternehmen-innen-besprechung.png',
    'assets/facelift/unternehmen/unternehmen-innen-workspace.png',
    'assets/facelift/unternehmen/unternehmen-innen-empfang.png',
  ] as const,
} as const;
