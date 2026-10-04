// Kachelgalerie (Auftrag 073, Dashboard Teilauftrag 4): feste Testdaten für alle Darstellungen,
// Größen und Zustände. Alle Werte sind erfunden und dienen nur der Prüfung der Darstellung; sie
// stammen aus keiner Datenquelle und dürfen nicht als Kennzahlen des Unternehmens gelesen werden.
// Übersichten nutzen die vorhandenen statischen Stammdaten (Roadmap, Team/HR).
import { getRoadmapSnapshot, getTeamHrSnapshot } from '@/domain/executiveCockpitData';
import {
  getCatalogEntry,
  isActiveEntry,
  type ActiveCatalogEntry,
  type DashboardView,
  type TileSize,
} from '../model/dashboardCatalog';
import type { DashboardTileConfig, TileFilterMode } from '../model/dashboardConfig';
import { getScopeForLayer, type ResolvedTileData, type TileData } from '../data/dashboardData';

export const GALLERY_NOTICE = 'Testdaten · Kachelgalerie';

export interface GalleryTile {
  tile: DashboardTileConfig;
  entry?: ActiveCatalogEntry;
  data: TileData;
}

function entry(id: string): ActiveCatalogEntry {
  const found = getCatalogEntry(id);
  if (!found || !isActiveEntry(found)) throw new Error(`Galerie: kein aktiver Eintrag ${id}`);
  return found;
}

function data(source: ActiveCatalogEntry, overrides: Partial<ResolvedTileData>): ResolvedTileData {
  return {
    catalogId: source.id,
    state: 'bereit',
    value: null,
    series: null,
    overview: null,
    unit: source.unit,
    timeBasis: source.timeBasis,
    asOf: null,
    origin: {
      layer: source.source.layer,
      module: source.source.module,
      exportName: source.source.exportName,
      liveKpiId: source.source.liveKpiId,
    },
    scope: getScopeForLayer(source.source.layer),
    effectiveFilter: {
      mode: source.timeMode === 'fest' ? 'fester_stand' : 'dashboard',
      period: null,
      pipeline: null,
    },
    ...overrides,
  };
}

let counter = 0;
function tile(
  source: ActiveCatalogEntry,
  view: DashboardView,
  size: TileSize,
  overrides: Partial<ResolvedTileData> = {},
  extra: { title?: string; filterMode?: TileFilterMode } = {},
): GalleryTile {
  counter += 1;
  const resolved = data(source, overrides);
  return {
    tile: {
      tileId: `galerie${counter}`,
      catalogId: source.id,
      view,
      size,
      filterMode: extra.filterMode ?? resolved.effectiveFilter.mode,
      title: extra.title,
    },
    entry: source,
    data: resolved,
  };
}

/** Testreihe ohne Katalogeintrag: Säulen/Balken mit negativen und kleinen Werten (Plan §4). */
function testSeries(
  view: DashboardView,
  title: string,
  series: readonly { label: string; value: number }[],
): GalleryTile {
  counter += 1;
  return {
    tile: {
      tileId: `galerie${counter}`,
      catalogId: 'test.reihe',
      view,
      size: 'mittel',
      filterMode: 'fester_stand',
      title,
    },
    data: {
      catalogId: 'test.reihe',
      state: 'bereit',
      value: null,
      series,
      overview: null,
      unit: 'EUR',
      timeBasis: 'Testzeitraum',
      asOf: null,
      origin: { layer: 'baseline', module: 'Testdaten', exportName: '–' },
      scope: 'stammdaten',
      effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
    },
  };
}

const ARR = entry('baseline.arr');
const LIVE_MRR = entry('live.mrr');
const EBITDA = entry('baseline.ebitda');
const VERLAUF = entry('baseline.arr_verlauf');
const PAKETMIX = entry('baseline.mrr_paketmix');
const LIVE_ARR = entry('live.arr');
const LIVE_COVERAGE = entry('live.pipeline_coverage');
const CRM_DEALS = entry('crm.pipeline_deals');
const CRM_STUFEN = entry('crm.pipeline_stufen_volumen');
const ROADMAP = entry('uebersicht.roadmap');
const TEAM = entry('uebersicht.team_hr');

const LIVE_AS_OF = '2026-10-04T12:05:00Z';
const ARR_SERIES = [
  { label: 'Q1 2024', value: 410_000 },
  { label: 'Q2 2024', value: 455_000 },
  { label: 'Q3 2024', value: 502_000 },
  { label: 'Q4 2024', value: 560_000 },
  { label: 'Q1 2025', value: 598_000 },
  { label: 'Q2 2025', value: 641_000 },
  { label: 'Q3 2025', value: 690_000 },
  { label: 'Q4 2025', value: 742_000 },
];
const PAKET_SERIES = [
  { label: 'Starter', value: 18_400 },
  { label: 'Professional', value: 31_200 },
  { label: 'Enterprise', value: 12_300 },
];
const STUFEN_SERIES = [
  { label: 'Lead', value: 420_000 },
  { label: 'Qualifiziert', value: 260_000 },
  { label: 'Angebot', value: 150_000 },
  { label: 'Verhandlung', value: 90_000 },
];

export const GALLERY_TILES: readonly GalleryTile[] = [
  tile(ARR, 'zahl', 'klein', { value: 2_350_000 }),
  tile(LIVE_MRR, 'zahl', 'klein', { value: 196_400, state: 'veraltet', asOf: LIVE_AS_OF }),
  tile(LIVE_ARR, 'zahl', 'klein', { state: 'offline' }),
  tile(LIVE_COVERAGE, 'zahl', 'klein', { value: 3.24, asOf: LIVE_AS_OF, quality: 'degradiert' }),
  tile(VERLAUF, 'linie', 'mittel', { series: ARR_SERIES }),
  tile(VERLAUF, 'flaeche', 'mittel', { series: ARR_SERIES }),
  tile(PAKETMIX, 'ring', 'mittel', { series: PAKET_SERIES }),
  tile(PAKETMIX, 'ring', 'mittel', { series: PAKET_SERIES }),
  tile(PAKETMIX, 'kreis', 'gross', { series: PAKET_SERIES }),
  tile(PAKETMIX, 'tabelle', 'mittel', { series: PAKET_SERIES }),
  tile(
    CRM_STUFEN,
    'balken',
    'mittel',
    {
      series: STUFEN_SERIES,
      effectiveFilter: { mode: 'dashboard', period: null, pipeline: 'Direkt' },
    },
    { filterMode: 'dashboard' },
  ),
  tile(
    CRM_DEALS,
    'zahl',
    'mittel',
    {
      value: 37,
      effectiveFilter: {
        mode: 'eigener_zeitraum',
        period: { from: '2026-07-01', to: '2026-09-30' },
        pipeline: null,
        periodReason:
          'Zeitraum wirkt nicht: Die Bedeutung des CRM-Abschlussdatums ist nicht belegt.',
      },
    },
    { filterMode: 'eigener_zeitraum' },
  ),
  testSeries('saeulen', 'Ergebnis je Quartal (Testreihe mit negativen Werten)', [
    { label: 'Q1', value: 42_000 },
    { label: 'Q2', value: -18_500 },
    { label: 'Q3', value: 0 },
    { label: 'Q4', value: -61_000 },
  ]),
  testSeries('balken', 'Abweichung je Kanal (Testreihe mit negativen Werten)', [
    { label: 'Direkt', value: 24_000 },
    { label: 'Partner', value: -9_000 },
    { label: 'Outbound', value: 3_500 },
  ]),
  testSeries('saeulen', 'Sehr kleine Werte (Testreihe)', [
    { label: 'Groß', value: 1_000_000 },
    { label: 'Klein', value: 120 },
    { label: 'Winzig', value: 1 },
    { label: 'Null', value: 0 },
  ]),
  tile(PAKETMIX, 'ring', 'mittel', {
    series: PAKET_SERIES.map((row) => ({ ...row, value: 0 })),
  }),
  tile(VERLAUF, 'linie', 'mittel', { series: [] }),
  tile(VERLAUF, 'saeulen', 'mittel', { state: 'laden' }),
  tile(EBITDA, 'zahl', 'klein', { state: 'keine_daten' }),
  tile(ARR, 'zahl', 'klein', {
    state: 'fehler',
    message: 'Die Quelle ist gerade nicht erreichbar.',
  }),
  tile(LIVE_ARR, 'zahl', 'klein', { state: 'nicht_konfiguriert' }),
  {
    tile: {
      tileId: 'galerieAlt',
      catalogId: 'baseline.alt',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    },
    data: {
      catalogId: 'baseline.alt',
      state: 'nicht_verfuegbar',
      reason: 'katalog_unbekannt',
      message: 'Katalogeintrag "baseline.alt" ist unbekannt.',
    },
  },
  tile(ROADMAP, 'uebersicht', 'mittel', {
    overview: { kind: 'roadmap', data: getRoadmapSnapshot() },
  }),
  tile(TEAM, 'uebersicht', 'mittel', { overview: { kind: 'team_hr', data: getTeamHrSnapshot() } }),
  tile(VERLAUF, 'saeulen', 'voll', { series: ARR_SERIES }),
];
