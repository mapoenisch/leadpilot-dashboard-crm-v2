// Executive Dashboard (Auftrag 154 & 161): Normalisierung der Kachelabfrage.
import type {
  DashboardConfigV2,
  DashboardMetadataV2,
  DashboardTileConfigV2,
  TileQueryConfig,
} from './dashboardConfigV2';
import { normalizeTimeSeriesQueryParts } from './timeseries/timeSeriesQuery';

export interface NormalizeTileQueryOptions {
  globalPipeline?: string;
  globalTimeframe?: string;
  metadata?: DashboardMetadataV2;
}

export const CANONICAL_TIMEFRAMES = new Set(['fest', 'aktuell', 'live']);

/**
 * Normalisiert die Abfrage einer V2-Kachel deterministisch und idempotent (Auftrag 154 §2.1 & Auftrag 161 §2.3).
 * Vorrang:
 * 1. query-Feld vorhanden -> gilt (außer P07-Migrationsartefakte)
 * 2. Overrides (Legacy)
 * 3. erben
 */
export function normalizeTileQuery(
  tile: DashboardTileConfigV2,
  dashboardOrOptions?: DashboardConfigV2 | NormalizeTileQueryOptions,
): TileQueryConfig {
  const metadata = dashboardOrOptions?.metadata;
  const rawQuery = tile.query;

  // metricId
  const metricId =
    typeof rawQuery?.metricId === 'string' && rawQuery.metricId.trim().length > 0
      ? rawQuery.metricId.trim()
      : tile.catalogId;

  // pipelineId:
  // Sonderfall P07-Migration: Wurde query.pipelineId rein aus der globalen Pipeline übernommen
  // (erkennbar am fehlenden pipelineOverride und metadata.migrated_from_v1),
  // wird es wieder als "erben" (undefined) normalisiert (§2.1 Nr. 4).
  let pipelineId: string | null | undefined;
  const isMigratedFromV1 = metadata?.migrated_from_v1 === true;

  if (
    isMigratedFromV1 &&
    tile.pipelineOverride === undefined &&
    rawQuery?.pipelineId !== undefined
  ) {
    pipelineId = undefined;
  } else if (rawQuery && Object.prototype.hasOwnProperty.call(rawQuery, 'pipelineId')) {
    if (rawQuery.pipelineId === null) {
      pipelineId = null;
    } else if (typeof rawQuery.pipelineId === 'string' && rawQuery.pipelineId.trim().length > 0) {
      pipelineId = rawQuery.pipelineId.trim();
    } else {
      pipelineId = undefined;
    }
  } else if (typeof tile.pipelineOverride === 'string' && tile.pipelineOverride.trim().length > 0) {
    pipelineId = tile.pipelineOverride.trim();
  }

  // aggregation:
  let aggregation: string | undefined;
  if (typeof rawQuery?.aggregation === 'string' && rawQuery.aggregation.trim().length > 0) {
    aggregation = rawQuery.aggregation.trim();
  } else if (
    typeof tile.aggregationOverride === 'string' &&
    tile.aggregationOverride.trim().length > 0
  ) {
    aggregation = tile.aggregationOverride.trim();
  }

  // timeframe:
  let timeframe: string | undefined;
  const rawTf = rawQuery?.timeframe?.trim();
  if (rawTf && CANONICAL_TIMEFRAMES.has(rawTf)) {
    timeframe = rawTf;
  }

  // groupBy:
  let groupBy: string[] | undefined;
  if (Array.isArray(rawQuery?.groupBy)) {
    const validGroupings = rawQuery.groupBy.filter(
      (g): g is string => typeof g === 'string' && g.trim().length > 0,
    );
    if (validGroupings.length > 0) {
      groupBy = validGroupings.map((g) => g.trim());
    }
  }

  // filters:
  let filters: Record<string, unknown> | undefined;
  if (
    rawQuery?.filters &&
    typeof rawQuery.filters === 'object' &&
    !Array.isArray(rawQuery.filters)
  ) {
    filters = {};
  }

  // window (Auftrag 161 §2.3 Nr. 12):
  let windowConfig: { count: number; resolution: 'stunde' | 'tag' | 'woche' | 'monat' } | undefined;
  if (rawQuery?.window && typeof rawQuery.window === 'object' && !Array.isArray(rawQuery.window)) {
    const rawWin = rawQuery.window as Record<string, unknown>;
    const res = String(rawWin.resolution ?? '');
    const cnt = Number(rawWin.count);
    if (Number.isInteger(cnt) && cnt >= 1 && ['stunde', 'tag', 'woche', 'monat'].includes(res)) {
      windowConfig = { count: cnt, resolution: res as 'stunde' | 'tag' | 'woche' | 'monat' };
    }
  }

  const normalized: TileQueryConfig = {
    metricId,
  };

  if (pipelineId !== undefined) {
    normalized.pipelineId = pipelineId;
  }
  if (aggregation !== undefined) {
    normalized.aggregation = aggregation;
  }
  if (timeframe !== undefined) {
    normalized.timeframe = timeframe;
  }
  if (groupBy !== undefined) {
    normalized.groupBy = groupBy;
  }
  if (filters !== undefined) {
    normalized.filters = filters;
  }
  if (windowConfig !== undefined) {
    normalized.window = windowConfig;
  }
  // Auftrag 169/170: Transformationen, Vergleich, Verknüpfung und Band beim Speichern erhalten.
  if (Array.isArray(rawQuery?.transformations) && rawQuery.transformations.length > 0) {
    normalized.transformations = rawQuery.transformations.map((step) => ({ ...step }));
  }
  Object.assign(normalized, normalizeTimeSeriesQueryParts(rawQuery));

  return normalized;
}
