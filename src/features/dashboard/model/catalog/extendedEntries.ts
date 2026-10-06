// Executive Dashboard, Teilauftrag 8a (Auftrag 078): Katalogausbau.
// Kennzahlen, die in src/domain/ bereits als strukturierte Zahlen vorliegen und fachlich belegt
// sind. Rohwerte, Summenprüfungen und Auslassungen: docs/dashboard/KPI_CATALOG.md.
import type {
  ActiveCatalogEntry,
  Aggregation,
  CatalogSource,
  DashboardCategory,
  DashboardView,
} from '../dashboardCatalog';
import { BASELINE_ACCESS } from './activeEntries';

const D = (file: string) => `src/domain/${file}.ts`;
const STAND_2025 = 'Stand 31.12.2025';
const FY_2025 = 'Geschäftsjahr 2025';
const Q_2025 = 'Quartale 2025';

const VIEWS = {
  anteile: ['ring', 'kreis', 'balken', 'saeulen', 'tabelle'],
  kategorien: ['balken', 'saeulen', 'tabelle'],
  zeitreihe: ['linie', 'flaeche', 'saeulen', 'tabelle'],
} as const satisfies Record<string, readonly DashboardView[]>;

interface SeriesSpec {
  id: string;
  name: string;
  category: DashboardCategory;
  definition: string;
  unit: string;
  source: Omit<CatalogSource, 'layer'>;
  shape: keyof typeof VIEWS;
  aggregation: Exclude<Aggregation, 'keine'>;
  timeBasis: string;
  defaultView: DashboardView;
  grouping: string;
  detailRouteId: string;
}

/** Reihe aus den Stammdaten: Anteile, Kategorien oder Zeitreihe, fester historischer Stand. */
const series = (spec: SeriesSpec): ActiveCatalogEntry => ({
  id: spec.id,
  name: spec.name,
  category: spec.category,
  kind: 'kpi',
  status: 'aktiv',
  definition: spec.definition,
  unit: spec.unit,
  source: { layer: 'baseline', ...spec.source },
  shape: spec.shape,
  aggregation: spec.aggregation,
  timeMode: 'fest',
  timeBasis: spec.timeBasis,
  views: VIEWS[spec.shape],
  defaultView: spec.defaultView,
  minSize: 'mittel',
  groupings: [spec.grouping],
  filters: [],
  detailRouteId: spec.detailRouteId,
  access: BASELINE_ACCESS,
});

const dataset = (file: string, exportName: string, prefix: string[], index = 0) => ({
  module: D(file),
  exportName,
  path: [...prefix, 'datasets', index, 'data'],
});

export const EXTENDED_ENTRIES: readonly ActiveCatalogEntry[] = [
  series({
    id: 'baseline.erloesmix',
    name: 'Erlösmix 2025',
    category: 'finanzen',
    definition:
      'Umsatzerlöse nach Erlösart (Abo-Umsatz, Onboarding und Setup, sonstige Erlöse); die Summe ergibt die Umsatzerlöse.',
    unit: 'EUR',
    source: dataset('finanzenData', 'CHART_ERLOESE', []),
    shape: 'anteile',
    aggregation: 'fluss',
    timeBasis: FY_2025,
    defaultView: 'ring',
    grouping: 'erloesart',
    detailRouteId: 's-guv',
  }),
  series({
    id: 'baseline.arr_nach_segment',
    name: 'ARR nach Segment',
    category: 'kunden',
    definition: 'ARR je Kundensegment (Branche); die Summe ergibt den ARR zum Stichtag.',
    unit: 'EUR',
    source: dataset('kundenData', 'CHART_SEGMENT', []),
    shape: 'anteile',
    aggregation: 'bestand',
    timeBasis: STAND_2025,
    defaultView: 'balken',
    grouping: 'segment',
    detailRouteId: 's-segmente',
  }),
  series({
    id: 'baseline.kunden_nach_region',
    name: 'Kunden nach Region',
    category: 'kunden',
    definition: 'Aktive Kunden je Land; die Summe ergibt die aktiven Kunden.',
    unit: 'Kunden',
    source: {
      module: D('kundenData'),
      exportName: 'REGIONEN',
      path: ['rows'],
      table: { label: 'region', value: 'kunden' },
    },
    shape: 'anteile',
    aggregation: 'bestand',
    timeBasis: STAND_2025,
    defaultView: 'ring',
    grouping: 'region',
    detailRouteId: 's-segmente',
  }),
  series({
    id: 'baseline.kanal_mix',
    name: 'Neukunden nach Kanal',
    category: 'marketing',
    definition:
      'Anteil der Neukunden des Geschäftsjahres je Akquisekanal (gerundet aus 47 Neukunden); die Anteile ergeben 100 %.',
    unit: '%',
    source: dataset('vertriebData', 'KANAELE', ['chartKanal']),
    shape: 'anteile',
    aggregation: 'verhaeltnis',
    timeBasis: FY_2025,
    defaultView: 'ring',
    grouping: 'kanal',
    detailRouteId: 's-kanaele',
  }),
  series({
    id: 'baseline.kanal_cac',
    name: 'Marketing-CAC nach Kanal',
    category: 'marketing',
    definition:
      'Media-Spend je Kanal ÷ Neukunden aus diesem Kanal. Verhältnis je Kanal, nicht aufsummierbar.',
    unit: 'EUR je Neukunde',
    source: dataset('vertriebData', 'KANAELE', ['chartRoi']),
    shape: 'kategorien',
    aggregation: 'verhaeltnis',
    timeBasis: FY_2025,
    defaultView: 'balken',
    grouping: 'kanal',
    detailRouteId: 's-kanaele',
  }),
  series({
    id: 'baseline.leads_quartal',
    name: 'Leads je Quartal',
    category: 'vertrieb_crm',
    definition: 'Neue Leads je Quartal; die vier Quartale ergeben die Leads des Geschäftsjahres.',
    unit: 'Leads',
    source: dataset('vertriebData', 'FUNNEL', ['chart'], 0),
    shape: 'zeitreihe',
    aggregation: 'fluss',
    timeBasis: Q_2025,
    defaultView: 'saeulen',
    grouping: 'quartal',
    detailRouteId: 's-funnel',
  }),
  series({
    id: 'baseline.neukunden_quartal',
    name: 'Neukunden je Quartal',
    category: 'vertrieb_crm',
    definition:
      'Gewonnene Neukunden je Quartal; die vier Quartale ergeben die Neukunden des Geschäftsjahres.',
    unit: 'Neukunden',
    source: dataset('vertriebData', 'FUNNEL', ['chart'], 3),
    shape: 'zeitreihe',
    aggregation: 'fluss',
    timeBasis: Q_2025,
    defaultView: 'saeulen',
    grouping: 'quartal',
    detailRouteId: 's-funnel',
  }),
  series({
    id: 'baseline.headcount_verlauf',
    name: 'Headcount-Verlauf',
    category: 'organisation',
    definition:
      'Personalbestand in Vollzeitäquivalenten jeweils zum Quartalsende. Bestandswerte, nicht aufsummierbar.',
    unit: 'FTE',
    source: dataset('organisationData', 'HEADCOUNT', ['chart']),
    shape: 'zeitreihe',
    aggregation: 'bestand',
    timeBasis: 'Quartalsende Q1 2024 bis Q4 2025',
    defaultView: 'linie',
    grouping: 'quartal',
    detailRouteId: 's-headcount',
  }),
  series({
    id: 'baseline.aktivierungsrate',
    name: 'Aktivierungsrate',
    category: 'produkt',
    definition:
      'Aktivierungsrate je Quartal laut Produktkennzahlen. Quoten je Quartal, nicht aufsummierbar.',
    unit: '%',
    source: dataset('produktData', 'CHART_PRODUKT', [], 0),
    shape: 'zeitreihe',
    aggregation: 'verhaeltnis',
    timeBasis: Q_2025,
    defaultView: 'linie',
    grouping: 'quartal',
    detailRouteId: 's-perf',
  }),
  series({
    id: 'baseline.ki_scoring_nutzung',
    name: 'Nutzung KI-Scoring',
    category: 'produkt',
    definition:
      'Nutzung des Kernfeatures KI-Scoring je Quartal laut Produktkennzahlen. Quoten je Quartal, nicht aufsummierbar.',
    unit: '%',
    source: dataset('produktData', 'CHART_PRODUKT', [], 1),
    shape: 'zeitreihe',
    aggregation: 'verhaeltnis',
    timeBasis: Q_2025,
    defaultView: 'linie',
    grouping: 'quartal',
    detailRouteId: 's-perf',
  }),
  series({
    id: 'baseline.gesellschafter',
    name: 'Gesellschafter',
    category: 'recht',
    definition:
      'Stimmrechtsanteile je Gesellschafter laut Gesellschafterliste, ohne Summenzeile; die Anteile ergeben 100 %.',
    unit: '%',
    source: {
      module: D('rechtData'),
      exportName: 'GESELLSCHAFTER',
      path: ['rows'],
      table: { label: 0, value: 2, excludeLabels: ['Gesamt'] },
    },
    shape: 'anteile',
    aggregation: 'bestand',
    timeBasis: 'Stand nach Kapitalerhöhung Q1 2024',
    defaultView: 'ring',
    grouping: 'gesellschafter',
    detailRouteId: 's-gesellschafter',
  }),
  {
    id: 'uebersicht.meilensteine',
    name: 'Meilensteine',
    category: 'unternehmen',
    kind: 'uebersicht',
    status: 'aktiv',
    definition:
      'Gründung, Finanzierungsrunden, Marktstart und Jahresabschlüsse in zeitlicher Folge.',
    unit: 'Ereignisse',
    source: {
      layer: 'baseline',
      module: D('unternehmenData'),
      exportName: 'HISTORIE',
      path: ['events'],
    },
    shape: 'uebersicht',
    aggregation: 'keine',
    timeMode: 'fest',
    timeBasis: '21.07.2022 bis Dez 2025',
    views: ['uebersicht'],
    defaultView: 'uebersicht',
    minSize: 'mittel',
    groupings: [],
    filters: [],
    detailRouteId: 's-historie',
    access: BASELINE_ACCESS,
  },
];
