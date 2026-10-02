// Executive Dashboard, Teilauftrag 1 (Auftrag 070): erste aktive Auswahl laut Plan §8.
// Bisherige Executive-Zahlen, ARR-Verlauf, MRR-Paketmix, CRM-Pipelinewerte, 12 Live-IDs und
// die bisherigen Übersichtskacheln. Rohwerte und Nachweise: docs/dashboard/KPI_CATALOG.md.
import type { ActiveCatalogEntry, CatalogSource, DashboardCategory } from '../dashboardCatalog';

const BASELINE_ACCESS =
  'Statische Stammdaten (Faktenblatt v1.1) im App-Bundle; sichtbar für jedes angemeldete aktive Organisationsmitglied hinter ProtectedRoute, organisationsunabhängig.';
const CRM_ACCESS =
  'Tabelle imported_funnel_deals, RLS tenant_select_deals: nur aktive Mitglieder der aktuellen Organisation, alle Rollen einschließlich Viewer.';
const LIVE_ACCESS =
  'Projektion live_kpi_public_feed: SELECT für anon und authenticated ohne Organisationsbezug (nicht mandantengetrennt, wie die bestehende Executive-Ansicht). Prüfung vor Übernahme in Teilauftrag 2 (Plan §6).';

const EXEC = 'src/domain/execData.ts';
const COCKPIT = 'src/domain/executiveCockpitData.ts';
const LIVE_SOURCE = {
  layer: 'live',
  module: 'src/services/liveKpi/liveKpiStreamStore.ts',
  exportName: 'liveKpiStreamStore',
} as const;
const LIVE_METADATA = {
  module: 'src/services/liveKpi/liveKpiDefinitions.ts',
  exportName: 'LIVE_KPI_DEFINITIONS',
};

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
      'Annual Recurring Revenue aus Software-Subskriptionen: MRR × 12. Einzelwert ohne Zeitreihe; den Verlauf liefert baseline.arr_verlauf.',
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
  aggregation: 'bestand',
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
  ),
  crmValue(
    'crm.pipeline_offen',
    'Offenes Volumen',
    'Summe der Deals, die weder gewonnen noch verloren sind.',
    'EUR',
    'openVolume',
  ),
  {
    ...crmValue(
      'crm.pipeline_stufen',
      'Pipeline nach Stufe',
      'Anzahl und Volumen je Funnel-Stufe.',
      'EUR',
      'stages',
    ),
    shape: 'kategorien',
    views: ['balken', 'saeulen', 'tabelle'],
    defaultView: 'balken',
    minSize: 'mittel',
    groupings: ['stufe'],
    funnelStages: true,
  },
];

const LIVE_TIME_BASIS =
  'Letzter Wert aus dem Live-Feed mit eigenem Zeitstempel; beim Öffnen lädt der Store bis zu 30 Feed-Punkte der letzten 30 Minuten, danach wird der Verlauf als Sitzungshistorie fortgeschrieben (höchstens 30 Punkte), keine Jahreszeitreihe.';

const liveValue = (
  liveKpiId: string,
  name: string,
  definition: string,
  unit: string,
  ratio = false,
): ActiveCatalogEntry => ({
  id: `live.${liveKpiId}`,
  name,
  category: 'live',
  kind: 'kpi',
  status: 'aktiv',
  definition,
  unit,
  source: { ...LIVE_SOURCE, liveKpiId, metadata: LIVE_METADATA }, // Store liefert Werte
  shape: ratio ? 'verhaeltnis' : 'einzelwert',
  aggregation: ratio ? 'verhaeltnis' : 'bestand',
  timeMode: 'live',
  timeBasis: LIVE_TIME_BASIS,
  views: ['zahl', 'tabelle'],
  defaultView: 'zahl',
  minSize: 'klein',
  groupings: [],
  filters: [],
  detailRouteId: 's-exec',
  access: LIVE_ACCESS,
});

const LIVE_ENTRIES: ActiveCatalogEntry[] = [
  liveValue('arr', 'Live ARR', 'Annual Recurring Revenue aus dem Live-Feed.', 'EUR'),
  liveValue('mrr', 'Live MRR', 'Monthly Recurring Revenue aus dem Live-Feed.', 'EUR'),
  liveValue(
    'pipeline_coverage',
    'Pipeline Coverage',
    'Pipeline-Deckung als Vielfaches laut Live-Feed.',
    'x',
    true,
  ),
  liveValue('arr_direct', 'ARR Direct', 'ARR aus dem Direktvertrieb laut Live-Feed.', 'EUR'),
  liveValue('arr_partner', 'ARR Partner', 'ARR über Partner laut Live-Feed.', 'EUR'),
  liveValue('arr_outbound', 'ARR Outbound', 'ARR aus Outbound laut Live-Feed.', 'EUR'),
  liveValue('arr_other', 'ARR Sonstige', 'ARR aus sonstigen Kanälen laut Live-Feed.', 'EUR'),
  liveValue('pipeline_leads', 'Pipeline Leads', 'Bestand an Leads laut Live-Feed.', 'Anzahl'),
  liveValue(
    'pipeline_mql',
    'Pipeline MQL',
    'Bestand an Marketing Qualified Leads laut Live-Feed.',
    'Anzahl',
  ),
  liveValue(
    'pipeline_sql',
    'Pipeline SQL',
    'Bestand an Sales Qualified Leads laut Live-Feed.',
    'Anzahl',
  ),
  liveValue(
    'pipeline_offers',
    'Pipeline Angebote',
    'Bestand an Angeboten laut Live-Feed.',
    'Anzahl',
  ),
  liveValue('pipeline_won', 'Pipeline Won', 'Gewonnene Deals laut Live-Feed.', 'Anzahl'),
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

export const ACTIVE_CATALOG_ENTRIES: readonly ActiveCatalogEntry[] = [
  ...BASELINE_ENTRIES,
  ...CRM_ENTRIES,
  ...LIVE_ENTRIES,
  ...OVERVIEW_ENTRIES,
];
