// Auftrag 074 (Dashboard Teilauftrag 5): feste Testdaten je Katalogeintrag als `TileData` für die
// Vorschau des Arbeitsbereichs. Alle Werte sind erfunden und stammen aus keiner Datenquelle; sie
// dürfen nicht als Kennzahlen des Unternehmens gelesen werden. Übersichten nutzen die vorhandenen
// statischen Stammdaten (Roadmap, Team/HR). Passt als `useData` für `LazyDashboardTile`.
// Auftrag 076: Kombinationen rechnen mit erfundenen Operanden über `computeCombination`, also
// denselben Rechenweg wie die echte Kachel; der CAC-Aufschlag zeigt absichtlich „Nenner 0“.
import { getRoadmapSnapshot, getTeamHrSnapshot } from '@/domain/executiveCockpitData';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import {
  computeCombination,
  getCombinationRule,
  type OperandValue,
} from '../model/dashboardCombinations';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import { resolveEffectiveFilter } from '../model/dashboardFilters';
import {
  getScopeForLayer,
  type ResolvedTileData,
  type TileData,
  type TileOverview,
} from '../data/dashboardData';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { SAMPLE_SERIES, SAMPLE_SHARES, SAMPLE_STAGES } from './previewSampleData';

export const EDITOR_PREVIEW_NOTICE = 'Testdaten · Editor-Vorschau';

function overviewFor(entry: ActiveCatalogEntry): TileOverview | null {
  if (entry.id === 'uebersicht.roadmap') return { kind: 'roadmap', data: getRoadmapSnapshot() };
  if (entry.id === 'uebersicht.team_hr') return { kind: 'team_hr', data: getTeamHrSnapshot() };
  if (entry.id === 'uebersicht.live_aktivitaet') return { kind: 'live_aktivitaet', data: [] };
  return null;
}

function seriesFor(entry: ActiveCatalogEntry) {
  switch (entry.shape) {
    case 'kategorien':
      return SAMPLE_STAGES;
    case 'anteile':
      return SAMPLE_SHARES;
    case 'zeitreihe':
      return SAMPLE_SERIES;
    default:
      return [{ label: entry.name, value: entry.shape === 'verhaeltnis' ? 3.2 : 1234 }];
  }
}

/** Erfundene Operanden je Regel: Zähler, Nenner. */
const SAMPLE_OPERANDS: Record<string, readonly [number, number]> = {
  'kombination.ebitda_marge': [-250, 1000],
  'kombination.cac_aufschlag': [3200, 0],
  'kombination.mrr_anteil_starter': [300, 1000],
  'kombination.mrr_anteil_growth': [500, 1000],
  'kombination.mrr_anteil_pro': [200, 1000],
};

function combinationFor(
  entry: ActiveCatalogEntry,
): Pick<ResolvedTileData, 'state' | 'value' | 'series' | 'message' | 'combination'> {
  const rule = getCombinationRule(entry.id);
  const sample = SAMPLE_OPERANDS[entry.id];
  const operand = (value: number | undefined): OperandValue | null =>
    value === undefined ? null : { value, unit: 'EUR', timeBasis: entry.timeBasis };
  if (!rule) return { state: 'fehler', value: null, series: null };
  const result = computeCombination(rule, operand(sample?.[0]), operand(sample?.[1]));
  const combination = { formula: result.formula, operands: result.operands };
  if (result.state === 'nicht_berechenbar') {
    return { state: result.state, value: null, series: null, message: result.reason, combination };
  }
  const series =
    rule.operation === 'anteil'
      ? [
          { label: rule.numerator.label, value: result.value },
          { label: rule.restLabel ?? 'Übrige', value: 100 - result.value },
        ]
      : null;
  return { state: 'bereit', value: result.value, series, combination };
}

export const useEditorPreviewData: TileDataHook = (
  tile: DashboardTileConfig,
  filters?: DashboardFilters,
  options?: { enabled?: boolean },
): TileData => {
  const catalogEntry = getCatalogEntry(tile.catalogId);
  if (!catalogEntry || !isActiveEntry(catalogEntry)) {
    return {
      catalogId: tile.catalogId,
      state: 'nicht_verfuegbar',
      reason: catalogEntry ? 'katalog_inaktiv' : 'katalog_unbekannt',
      message: 'Diese Kennzahl ist nicht verfügbar.',
    };
  }
  const ready = options?.enabled === true;
  const base = {
    catalogId: catalogEntry.id,
    overview: null,
    unit: catalogEntry.unit,
    timeBasis: catalogEntry.timeBasis,
    asOf: null,
    origin: { layer: catalogEntry.source.layer, module: 'Testdaten', exportName: '–' },
    scope: getScopeForLayer(catalogEntry.source.layer),
    effectiveFilter: resolveEffectiveFilter(tile, catalogEntry, filters),
  };
  if (catalogEntry.source.layer === 'kombination') {
    return ready
      ? { ...base, ...combinationFor(catalogEntry) }
      : { ...base, state: 'laden', value: null, series: null };
  }
  const isOverview = catalogEntry.shape === 'uebersicht';
  const series = ready && !isOverview ? seriesFor(catalogEntry) : null;
  return {
    ...base,
    state: ready ? 'bereit' : 'laden',
    value: series && series.length === 1 ? (series[0]?.value ?? null) : null,
    series,
    overview: ready ? overviewFor(catalogEntry) : null,
  };
};
