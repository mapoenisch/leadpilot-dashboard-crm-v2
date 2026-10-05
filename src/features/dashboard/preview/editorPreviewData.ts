// Auftrag 074 (Dashboard Teilauftrag 5): feste Testdaten je Katalogeintrag als `TileData` für die
// Vorschau des Arbeitsbereichs. Alle Werte sind erfunden und stammen aus keiner Datenquelle; sie
// dürfen nicht als Kennzahlen des Unternehmens gelesen werden. Übersichten nutzen die vorhandenen
// statischen Stammdaten (Roadmap, Team/HR). Passt als `useData` für `LazyDashboardTile`.
import { getRoadmapSnapshot, getTeamHrSnapshot } from '@/domain/executiveCockpitData';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import { resolveEffectiveFilter } from '../model/dashboardFilters';
import { getScopeForLayer, type TileData, type TileOverview } from '../data/dashboardData';
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
  const isOverview = catalogEntry.shape === 'uebersicht';
  const series = ready && !isOverview ? seriesFor(catalogEntry) : null;
  return {
    catalogId: catalogEntry.id,
    state: ready ? 'bereit' : 'laden',
    value: series && series.length === 1 ? (series[0]?.value ?? null) : null,
    series,
    overview: ready ? overviewFor(catalogEntry) : null,
    unit: catalogEntry.unit,
    timeBasis: catalogEntry.timeBasis,
    asOf: null,
    origin: { layer: catalogEntry.source.layer, module: 'Testdaten', exportName: '–' },
    scope: getScopeForLayer(catalogEntry.source.layer),
    effectiveFilter: resolveEffectiveFilter(tile, catalogEntry, filters),
  };
};
