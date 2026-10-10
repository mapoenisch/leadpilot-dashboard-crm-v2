// Executive Dashboard, Teilauftrag 1 (Auftrag 070): erste aktive Auswahl laut Plan §8.
// Bisherige Executive-Zahlen, ARR-Verlauf, MRR-Paketmix, CRM-Pipelinewerte, 12 Live-IDs und
// die bisherigen Übersichtskacheln. Rohwerte und Nachweise: docs/dashboard/KPI_CATALOG.md.
import type { ActiveCatalogEntry, CatalogSource, DashboardCategory } from '../dashboardCatalog';
import { LIVE_ACCESS, LIVE_ENTRIES, LIVE_SOURCE } from './liveEntries';

export const BASELINE_ACCESS =
  'Statische Stammdaten (Faktenblatt v1.1) im App-Bundle; sichtbar für jedes angemeldete aktive Organisationsmitglied hinter ProtectedRoute, organisationsunabhängig.';
const CRM_ACCESS =
  'Tabelle imported_funnel_deals, RLS tenant_select_deals: nur aktive Mitglieder der aktuellen Organisation, alle Rollen einschließlich Viewer.';
const EXEC = 'src/domain/execData.ts';
const COCKPIT = 'src/domain/executiveCockpitData.ts';
const STAND_2025 = 'Stand 31.12.2025';
const FY_2025 = 'Geschäftsjahr 2025';

interface BaselineValue {
  id: string;
  name: string;
  category: DashboardCategory;
  definition: string;
  unit: string;
  source: Omit<CatalogSource, 'layer'>;
  aggregation: 'bestand' | 'fluss' | 'verhaeltnis';
  timeBasis: string;
  detailRouteId: string;
  mayBeNegative?: true;
}

/** Einzelwert oder geprüftes Verhältnis aus den Stammdaten: Zahl oder kompakte Tabelle. */
const baselineValue = (spec: BaselineValue): ActiveCatalogEntry => ({
  ...spec,
  kind: 'kpi',
  status: 'aktiv',
  source: { layer: 'baseline', ...spec.source },
  shape: spec.aggregation === 'verhaeltnis' ? 'verhaeltnis' : 'einzelwert',
  timeMode: 'fest',
  views: ['zahl', 'tabelle'],
  defaultView: 'zahl',
  minSize: 'klein',
  groupings: [],
  filters: [],
  access: BASELINE_ACCESS,
});

const BASELINE_ENTRIES: ActiveCatalogEntry[] = [
  baselineValue({
    id: 'baseline.arr',
    name: 'ARR',
    category: 'finanzen',
    definition:
      'Annual Recurring Revenue aus Software-Subskriptionen: MRR × 12. Einzelwert ohne Zeitreihe; den Verlauf zeigt die Kennzahl „ARR-Verlauf“.',
    unit: 'EUR',
    source: { module: EXEC, exportName: 'EXEC_KPIS_1', path: [0, 'value'] },
    aggregation: 'bestand',
    timeBasis: STAND_2025,
    detailRouteId: 's-highlights',
  }),
  baselineValue({
    id: 'baseline.umsatz',
    name: 'Umsatzerlöse',
    category: 'finanzen',
    definition: 'Umsatzerlöse gesamt: Abo-Umsatz, Onboarding und Setup, sonstige Erlöse.',
    unit: 'EUR',
    source: { module: EXEC, exportName: 'EXEC_KPIS_1', path: [1, 'value'] },
    aggregation: 'fluss',
    timeBasis: FY_2025,
    detailRouteId: 's-guv',
  }),
  baselineValue({
    id: 'baseline.ebitda',
    name: 'EBITDA',
    category: 'finanzen',
    definition: 'Ergebnis vor Zinsen, Steuern und Abschreibungen laut GuV.',
    unit: 'EUR',
    source: { module: EXEC, exportName: 'EXEC_KPIS_1', path: [2, 'value'] },
    aggregation: 'fluss',
    timeBasis: FY_2025,
    detailRouteId: 's-guv',
    mayBeNegative: true,
  }),
  baselineValue({
    id: 'baseline.kunden_aktiv',
    name: 'Aktive Kunden',
    category: 'kunden',
    definition: 'Zahlende B2B-Accounts.',
    unit: 'Kunden',
    source: { module: EXEC, exportName: 'EXEC_KPIS_1', path: [3, 'value'] },
    aggregation: 'bestand',
    timeBasis: STAND_2025,
    detailRouteId: 's-segmente',
  }),
  baselineValue({
    id: 'baseline.arpa',
    name: 'ARPA',
    category: 'kunden',
    definition: 'Durchschnittlicher MRR je Kunde: MRR ÷ aktive Kunden, über alle Pakete.',
    unit: 'EUR je Kunde und Monat',
    source: { module: EXEC, exportName: 'EXEC_KPIS_2', path: [0, 'value'] },
    aggregation: 'verhaeltnis',
    timeBasis: STAND_2025,
    detailRouteId: 's-highlights',
  }),
  baselineValue({
    id: 'baseline.marketing_cac',
    name: 'Marketing-CAC',
    category: 'marketing',
    definition: 'Media-Spend ÷ Neukunden im Geschäftsjahr.',
    unit: 'EUR je Neukunde',
    source: { module: EXEC, exportName: 'EXEC_KPIS_2', path: [1, 'value'] },
    aggregation: 'verhaeltnis',
    timeBasis: FY_2025,
    detailRouteId: 's-unit',
  }),
  baselineValue({
    id: 'baseline.fully_loaded_cac',
    name: 'Fully-Loaded CAC',
    category: 'vertrieb_crm',
    definition: 'Gesamtkosten Vertrieb und Marketing ÷ Neukunden im Geschäftsjahr.',
    unit: 'EUR je Neukunde',
    source: { module: EXEC, exportName: 'EXEC_KPIS_2', path: [2, 'value'] },
    aggregation: 'verhaeltnis',
    timeBasis: FY_2025,
    detailRouteId: 's-unit',
  }),
  baselineValue({
    id: 'baseline.headcount',
    name: 'Headcount',
    category: 'organisation',
    definition: 'Personalbestand in Vollzeitäquivalenten.',
    unit: 'FTE',
    source: { module: EXEC, exportName: 'EXEC_KPIS_2', path: [3, 'value'] },
    aggregation: 'bestand',
    timeBasis: STAND_2025,
    detailRouteId: 's-headcount',
  }),
  {
    id: 'baseline.arr_verlauf',
    name: 'ARR-Verlauf',
    category: 'finanzen',
    kind: 'kpi',
    status: 'aktiv',
    definition: 'ARR jeweils zum Quartalsende. Bestandswerte, nicht aufsummierbar.',
    unit: 'EUR',
    source: {
      layer: 'baseline',
      module: EXEC,
      exportName: 'CHART_ARR',
      path: ['datasets', 0, 'data'],
    },
    shape: 'zeitreihe',
    aggregation: 'bestand',
    timeMode: 'fest',
    timeBasis: 'Quartalsende Q1 2024 bis Q4 2025',
    views: ['linie', 'flaeche', 'saeulen', 'tabelle'],
    defaultView: 'linie',
    minSize: 'mittel',
    groupings: ['quartal'],
    filters: [],
    detailRouteId: 's-highlights',
    access: BASELINE_ACCESS,
  },
  {
    id: 'baseline.mrr_paketmix',
    name: 'MRR nach Paket',
    category: 'finanzen',
    kind: 'kpi',
    status: 'aktiv',
    definition: 'MRR je Paket (Starter, Growth, Pro); die Summe ergibt den Gesamt-MRR.',
    unit: 'EUR',
    source: {
      layer: 'baseline',
      module: EXEC,
      exportName: 'CHART_MRR',
      path: ['datasets', 0, 'data'],
    },
    shape: 'anteile',
    aggregation: 'bestand',
    timeMode: 'fest',
    timeBasis: STAND_2025,
    views: ['ring', 'kreis', 'balken', 'saeulen', 'tabelle'],
    defaultView: 'ring',
    minSize: 'mittel',
    groupings: ['paket'],
    filters: [],
    detailRouteId: 's-pricing',
    access: BASELINE_ACCESS,
  },
];

const CRM_TIME_BASIS =
  'Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt.';

const crmValue = (
  id: string,
  name: string,
  definition: string,
  unit: string,
  field: string,
  aggregation: ActiveCatalogEntry['aggregation'] = 'bestand',
): ActiveCatalogEntry => ({
  id,
  name,
  category: 'vertrieb_crm',
  kind: 'kpi',
  status: 'aktiv',
  definition,
  unit,
  source: { layer: 'crm', module: COCKPIT, exportName: 'getPipelineOverview', path: [field] },
  shape: 'einzelwert',
  aggregation,
  timeMode: 'aktuell',
  timeBasis: CRM_TIME_BASIS,
  views: ['zahl', 'tabelle'],
  defaultView: 'zahl',
  minSize: 'klein',
  groupings: [],
  filters: ['pipeline'],
  detailRouteId: 's-deals',
  access: CRM_ACCESS,
});

const CRM_ENTRIES: ActiveCatalogEntry[] = [
  crmValue(
    'crm.pipeline_deals',
    'Deals in der Pipeline',
    'Anzahl aller importierten Deals.',
    'Deals',
    'totalDeals',
  ),
  crmValue(
    'crm.pipeline_volumen',
    'Pipeline-Volumen',
    'Summe der Deal-Beträge über alle Stufen.',
    'EUR',
    'totalVolume',
  ),
  crmValue(
    'crm.pipeline_gewonnen',
    'Gewonnenes Volumen',
    'Summe der Deals in einer Stufe „gewonnen“.',
    'EUR',
    'wonVolume',
    'fluss', // Summe abgeschlossener Deals, kein Pipeline-Bestand
  ),
  crmValue(
    'crm.pipeline_offen',
    'Offenes Volumen',
    'Summe der Deals, die weder gewonnen noch verloren sind.',
    'EUR',
    'openVolume',
  ),
  // Je Stufe liegen Anzahl und Volumen vor; jeder Eintrag stellt genau eine Messreihe mit eigener
  // Einheit dar, damit Kachel und Konfiguration eindeutig bleiben.
  ...(
    [
      [
        'volume',
        'crm.pipeline_stufen_volumen',
        'Pipeline-Volumen nach Stufe',
        'Summe der Deal-Beträge je Funnel-Stufe.',
        'EUR',
      ],
      [
        'count',
        'crm.pipeline_stufen_anzahl',
        'Deals nach Stufe',
        'Anzahl der Deals je Funnel-Stufe.',
        'Deals',
      ],
    ] as const
  ).map(([measure, id, name, definition, unit]): ActiveCatalogEntry => {
    const base = crmValue(id, name, definition, unit, 'stages');
    return {
      ...base,
      source: { ...base.source, measure },
      shape: 'kategorien',
      views: ['balken', 'saeulen', 'tabelle'],
      defaultView: 'balken',
      minSize: 'mittel',
      groupings: ['stufe'],
      funnelStages: true,
    };
  }),
];

const overview = (
  spec: Pick<
    ActiveCatalogEntry,
    | 'id'
    | 'name'
    | 'category'
    | 'definition'
    | 'unit'
    | 'source'
    | 'timeMode'
    | 'timeBasis'
    | 'detailRouteId'
    | 'access'
  >,
): ActiveCatalogEntry => ({
  ...spec,
  kind: 'uebersicht',
  status: 'aktiv',
  shape: 'uebersicht',
  aggregation: 'keine',
  views: ['uebersicht'],
  defaultView: 'uebersicht',
  minSize: 'mittel',
  groupings: [],
  filters: [],
});

const OVERVIEW_ENTRIES: ActiveCatalogEntry[] = [
  overview({
    id: 'uebersicht.team_hr',
    name: 'Team und HR',
    category: 'organisation',
    definition: 'Teamstruktur nach Bereichen, HR-Kennzahlen und benannte Engpässe.',
    unit: 'FTE',
    source: { layer: 'baseline', module: COCKPIT, exportName: 'getTeamHrSnapshot' },
    timeMode: 'fest',
    timeBasis: STAND_2025,
    detailRouteId: 's-team',
    access: BASELINE_ACCESS,
  }),
  overview({
    id: 'uebersicht.roadmap',
    name: 'Produkt-Roadmap',
    category: 'produkt',
    definition: 'Release-Historie und geplante Versionen mit Status.',
    unit: 'Releases',
    source: { layer: 'baseline', module: COCKPIT, exportName: 'getRoadmapSnapshot' },
    timeMode: 'fest',
    timeBasis: 'Releases v1.2 (Feb 2025) bis v2.1 (geplant Q2 2026)',
    detailRouteId: 's-roadmap',
    access: BASELINE_ACCESS,
  }),
  overview({
    id: 'uebersicht.live_aktivitaet',
    name: 'Live-Aktivität',
    category: 'live',
    definition: 'Die neuesten Live-Ereignisse über alle Live-KPIs, höchstens zehn.',
    unit: 'Ereignisse',
    source: LIVE_SOURCE,
    timeMode: 'live',
    timeBasis:
      'Neueste Ereignisse aus dem zentralen Live-Stream: Feed-Punkte der letzten 30 Minuten beim Öffnen, danach fortgeschrieben',
    detailRouteId: 's-exec',
    access: LIVE_ACCESS,
  }),
];

// Auftrag 091 (Entscheidung Marc 10.10.2026): Kürzel bleibt Titel, der Klartext steht darunter.
const PLAIN_NAMES: Readonly<Record<string, string>> = {
  'baseline.arr': 'Jährlich wiederkehrender Umsatz',
  'baseline.ebitda': 'Ergebnis vor Zinsen, Steuern, Abschreibungen',
  'baseline.arpa': 'Ø monatlicher Umsatz je Kunde',
  'baseline.marketing_cac': 'Werbekosten je Neukunde',
  'baseline.fully_loaded_cac': 'Vertriebs- und Marketingkosten je Neukunde',
  'baseline.headcount': 'Mitarbeitende in Vollzeitstellen',
  'baseline.arr_verlauf': 'Jährlich wiederkehrender Umsatz je Quartal',
  'baseline.mrr_paketmix': 'Monatlich wiederkehrender Umsatz je Paket',
};

// Auftrag 091: Vorjahr nur, wo belegt und vergleichbar (GuV FY 2024, Organisation 31.12.2024).
// `catalogComparison.vitest.ts` gleicht die Werte mit src/domain ab.
const COMPARISONS: Readonly<Record<string, NonNullable<ActiveCatalogEntry['comparison']>>> = {
  'baseline.umsatz': { label: 'FY 2024', value: 164_000 },
  'baseline.ebitda': { label: 'FY 2024', value: -288_000 },
  'baseline.headcount': { label: '31.12.2024', value: 8 },
};

const withPlainText = (entry: ActiveCatalogEntry): ActiveCatalogEntry => ({
  ...entry,
  ...(PLAIN_NAMES[entry.id] ? { plainName: PLAIN_NAMES[entry.id] } : {}),
  ...(COMPARISONS[entry.id] ? { comparison: COMPARISONS[entry.id] } : {}),
});

export const ACTIVE_CATALOG_ENTRIES: readonly ActiveCatalogEntry[] = [
  ...BASELINE_ENTRIES.map(withPlainText),
  ...CRM_ENTRIES,
  ...LIVE_ENTRIES,
  ...OVERVIEW_ENTRIES,
];
