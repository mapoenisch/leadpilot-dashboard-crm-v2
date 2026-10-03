// Executive Dashboard, Teilauftrag 1 (Auftrag 070): die zwölf aktiven Live-KPIs.
// Messwerte und Zeitstempel liefert der zentrale Live-Stream (`liveKpiStreamStore`);
// `LIVE_KPI_DEFINITIONS` liefert nur Metadaten (Label, Einheit, Format).
import type { ActiveCatalogEntry } from '../dashboardCatalog';

export const LIVE_ACCESS =
  'Projektion live_kpi_public_feed: SELECT für anon und authenticated ohne Organisationsbezug (nicht mandantengetrennt, wie die bestehende Executive-Ansicht). Prüfung vor Übernahme in Teilauftrag 2 (Plan §6).';

export const LIVE_SOURCE = {
  layer: 'live',
  module: 'src/services/liveKpi/liveKpiStreamStore.ts',
  exportName: 'liveKpiStreamStore',
} as const;
export const LIVE_METADATA = {
  module: 'src/services/liveKpi/liveKpiDefinitions.ts',
  exportName: 'LIVE_KPI_DEFINITIONS',
};

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

export const LIVE_ENTRIES: readonly ActiveCatalogEntry[] = [
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
    'Bestand an Marketing Qualified Leads (MQL) laut Live-Feed.',
    'Anzahl',
  ),
  liveValue(
    'pipeline_sql',
    'Pipeline SQL',
    'Bestand an Sales Qualified Leads (SQL) laut Live-Feed.',
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
