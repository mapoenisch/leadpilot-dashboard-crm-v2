// Executive Dashboard, Teilauftrag 2 (Auftrag 071): effektiven Filter je Kachel auflösen.
// Reine Funktionen: ermittelt aus Kachelkonfiguration, zentralen Filtern und Katalogeintrag
// den tatsächlich wirksamen Filter sowie Begründungen für nicht wirksame Filter.
import { isActiveEntry, type CatalogEntry, type SourceLayer } from './dashboardCatalog';
import type {
  DashboardFilters,
  DashboardPeriod,
  DashboardTileConfig,
  TileFilterMode,
} from './dashboardConfig';

/**
 * Unterstützte Datumsfelder je Quelle (Plan §4, Auftrag 071).
 * Heute unterstützt keine Quelle wirksame Datumsfilter:
 * Stammdaten sind fest, CRM-closeDate fachlich nicht belegt, Live ist ein Stream.
 */
export const SUPPORTED_DATE_FIELDS: Record<SourceLayer, readonly string[]> = {
  baseline: [],
  crm: [],
  live: [],
};

export interface EffectiveTileFilter {
  mode: TileFilterMode;
  period: DashboardPeriod | null;
  pipeline: string | null;
  periodReason?: string;
  pipelineReason?: string;
}

function resolvePeriodFilter(
  tile: DashboardTileConfig,
  catalogEntry: CatalogEntry | undefined,
  dashboardFilters?: DashboardFilters,
): { mode: TileFilterMode; period: DashboardPeriod | null; periodReason?: string } {
  if (tile.filterMode === 'fester_stand') {
    return {
      mode: 'fester_stand',
      period: null,
      periodReason: 'Historischer Stand ist fest',
    };
  }

  const layer = catalogEntry?.source.layer;
  const requestedPeriod =
    tile.filterMode === 'eigener_zeitraum' ? tile.period : dashboardFilters?.period;

  if (tile.filterMode === 'eigener_zeitraum') {
    let reason: string | undefined;
    if (requestedPeriod) {
      if (layer === 'baseline') {
        reason = 'Quelle hat kein belegtes Datumsfeld; historischer Stand ist fest';
      } else if (layer === 'live') {
        reason = 'Quelle ist ein Live-Feed ohne historischen Zeitraum';
      } else {
        reason = 'Quelle hat kein belegtes Datumsfeld';
      }
    }
    return {
      mode: 'eigener_zeitraum',
      period: null,
      periodReason: reason,
    };
  }

  // mode === 'dashboard'
  let reason: string | undefined;
  if (requestedPeriod) {
    if (layer === 'baseline') {
      reason = 'Quelle hat kein belegtes Datumsfeld; historischer Stand ist fest';
    } else if (layer === 'live') {
      reason = 'Quelle ist ein Live-Feed ohne historischen Zeitraum';
    } else {
      reason = 'Quelle hat kein belegtes Datumsfeld';
    }
  }

  return {
    mode: 'dashboard',
    period: null,
    periodReason: reason,
  };
}

function resolvePipelineFilter(
  tile: DashboardTileConfig,
  catalogEntry: CatalogEntry | undefined,
  dashboardFilters?: DashboardFilters,
): { pipeline: string | null; pipelineReason?: string } {
  const supportsPipeline = Boolean(
    catalogEntry && isActiveEntry(catalogEntry) && catalogEntry.filters.includes('pipeline'),
  );

  const requestedPipeline = tile.pipeline ?? dashboardFilters?.pipeline ?? null;

  if (supportsPipeline) {
    return {
      pipeline: requestedPipeline,
      pipelineReason: undefined,
    };
  }

  if (requestedPipeline !== null) {
    return {
      pipeline: null,
      pipelineReason: 'Nur CRM-Quellen unterstützen den Pipeline-Filter',
    };
  }

  return {
    pipeline: null,
    pipelineReason: undefined,
  };
}

/**
 * Löst den effektiven Filter für eine Kachel auf.
 * Beachtet Vorrang der Kachelausnahme und filtert nur nach unterstützten Kriterien.
 */
export function resolveEffectiveFilter(
  tile: DashboardTileConfig,
  catalogEntry: CatalogEntry | undefined,
  dashboardFilters?: DashboardFilters,
): EffectiveTileFilter {
  const periodResult = resolvePeriodFilter(tile, catalogEntry, dashboardFilters);
  const pipelineResult = resolvePipelineFilter(tile, catalogEntry, dashboardFilters);

  return {
    mode: periodResult.mode,
    period: periodResult.period,
    pipeline: pipelineResult.pipeline,
    periodReason: periodResult.periodReason,
    pipelineReason: pipelineResult.pipelineReason,
  };
}
