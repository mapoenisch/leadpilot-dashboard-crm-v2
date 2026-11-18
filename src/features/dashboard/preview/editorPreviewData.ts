// Auftrag 074 (Dashboard Teilauftrag 5): feste Testdaten je Katalogeintrag als `TileData` für die
// Vorschau des Arbeitsbereichs. Alle Werte sind erfunden und stammen aus keiner Datenquelle; sie
// dürfen nicht als Kennzahlen des Unternehmens gelesen werden. Übersichten nutzen die vorhandenen
// statischen Stammdaten (Roadmap, Team/HR, seit Auftrag 078 Meilensteine). Passt als `useData` für `LazyDashboardTile`.
// Auftrag 076: Kombinationen rechnen mit erfundenen Operanden über `computeCombination`, also
// denselben Rechenweg wie die echte Kachel; der CAC-Aufschlag zeigt absichtlich „Nenner 0“.
import { getRoadmapSnapshot, getTeamHrSnapshot } from '@/domain/executiveCockpitData';
import { HISTORIE } from '@/domain/unternehmenData';
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
  type TileTimeSeriesData,
} from '../data/dashboardData';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { SAMPLE_SERIES, SAMPLE_SHARES, SAMPLE_STAGES } from './previewSampleData';

export const EDITOR_PREVIEW_NOTICE = 'Testdaten · Editor-Vorschau';

function overviewFor(entry: ActiveCatalogEntry): TileOverview | null {
  if (entry.id === 'uebersicht.roadmap') return { kind: 'roadmap', data: getRoadmapSnapshot() };
  if (entry.id === 'uebersicht.team_hr') return { kind: 'team_hr', data: getTeamHrSnapshot() };
  if (entry.id === 'uebersicht.live_aktivitaet') return { kind: 'live_aktivitaet', data: [] };
  if (entry.id === 'uebersicht.meilensteine')
    return { kind: 'meilensteine', data: HISTORIE.events };
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

function timeSeriesFor(entry: ActiveCatalogEntry): TileTimeSeriesData {
  if (entry.source.layer === 'crm') {
    const points = [
      {
        at: '2026-08-24T00:00:00+02:00',
        value: null,
        status: 'vor_historienbeginn' as const,
        measuredAt: null,
      },
      {
        at: '2026-08-31T00:00:00+02:00',
        value: null,
        status: 'vor_historienbeginn' as const,
        measuredAt: null,
      },
      {
        at: '2026-09-07T00:00:00+02:00',
        value: null,
        status: 'vor_historienbeginn' as const,
        measuredAt: null,
      },
      {
        at: '2026-09-14T00:00:00+02:00',
        value: null,
        status: 'vor_historienbeginn' as const,
        measuredAt: null,
      },
      { at: '2026-09-21T00:00:00+02:00', value: 8, status: 'belegt' as const, measuredAt: null },
      { at: '2026-09-28T00:00:00+02:00', value: 12, status: 'belegt' as const, measuredAt: null },
      { at: '2026-10-05T00:00:00+02:00', value: 15, status: 'belegt' as const, measuredAt: null },
      { at: '2026-10-12T00:00:00+02:00', value: 11, status: 'belegt' as const, measuredAt: null },
      { at: '2026-10-19T00:00:00+02:00', value: 19, status: 'belegt' as const, measuredAt: null },
      { at: '2026-10-26T00:00:00+01:00', value: 14, status: 'belegt' as const, measuredAt: null },
      { at: '2026-11-02T00:00:00+01:00', value: 22, status: 'belegt' as const, measuredAt: null },
      { at: '2026-11-09T00:00:00+01:00', value: 18, status: 'belegt' as const, measuredAt: null },
    ];
    return {
      source: 'deal_stage_events',
      resolution: 'woche',
      from: '2026-08-24T00:00:00+02:00',
      to: '2026-11-16T00:00:00+01:00',
      historyStartAt: '2026-09-21T00:00:00+02:00',
      points,
      pipelineBasis: 'aktuelle_pipeline_des_deals',
      generatedAt: '2026-11-16T10:00:00+01:00',
    };
  }

  const points = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    const at = `2026-11-15T${hour}:00:00+01:00`;
    if (i === 6 || i === 7) {
      return { at, value: null, status: 'luecke' as const, measuredAt: null };
    }
    const val = 40 + Math.round(Math.sin(i / 3) * 15 + i * 0.8);
    return {
      at,
      value: val,
      status: 'belegt' as const,
      measuredAt: `2026-11-15T${hour}:45:00+01:00`,
    };
  });

  return {
    source: 'live_kpi_events',
    resolution: 'stunde',
    from: '2026-11-15T00:00:00+01:00',
    to: '2026-11-16T00:00:00+01:00',
    historyStartAt: '2026-11-01T00:00:00+01:00',
    points,
    generatedAt: '2026-11-16T10:00:00+01:00',
  };
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
  if (tile.tileId === 'preview_tile_keine_daten') {
    return { ...base, state: 'keine_daten', value: null, series: null };
  }
  if (tile.tileId === 'preview_tile_nicht_bewertet') {
    return {
      ...base,
      state: 'veraltet',
      value: 1234,
      series: [{ label: catalogEntry.name, value: 1234 }],
      asOf: '2026-11-10T12:00:00Z',
    };
  }
  if (catalogEntry.source.layer === 'kombination') {
    return ready
      ? { ...base, ...combinationFor(catalogEntry) }
      : { ...base, state: 'laden', value: null, series: null };
  }
  if (catalogEntry.history.kind === 'ereignisse') {
    const timeSeries = timeSeriesFor(catalogEntry);
    const belegtPoints = timeSeries.points.filter((p) => p.status === 'belegt' && p.value !== null);
    const series = belegtPoints.map((p) => ({
      label: p.at.slice(11, 16) || p.at.slice(0, 10),
      value: p.value as number,
    }));
    const lastPoint = belegtPoints[belegtPoints.length - 1];
    return {
      ...base,
      state: ready ? 'bereit' : 'laden',
      value: lastPoint ? lastPoint.value : null,
      series,
      timeSeries,
      overview: null,
    };
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
