import type { ActiveCatalogEntry } from './dashboardCatalog';
import type {
  DashboardConfigV2,
  DashboardMetadataV2,
  DashboardTileConfigV2,
  TileQueryConfig,
} from './dashboardConfigV2';
import { getQueryCapabilities } from './queryCapabilities';

export type TileQueryValidationErrorCode =
  | 'metrik_abweichend'
  | 'aggregation_unzulaessig'
  | 'filter_unzulaessig'
  | 'gruppierung_unzulaessig'
  | 'zeitraum_unzulaessig'
  | 'unbekanntes_feld'
  | 'typ_ungueltig';

export interface TileQueryValidationError {
  code: TileQueryValidationErrorCode;
  message: string;
  field?: string;
}

export interface TileQueryValidationResult {
  valid: boolean;
  errors: TileQueryValidationError[];
}

export interface NormalizeTileQueryOptions {
  globalPipeline?: string;
  globalTimeframe?: string;
  metadata?: DashboardMetadataV2;
}

const ALLOWED_QUERY_KEYS = new Set([
  'metricId',
  'pipelineId',
  'timeframe',
  'aggregation',
  'groupBy',
  'filters',
]);

const CANONICAL_TIMEFRAMES = new Set(['fest', 'aktuell', 'live']);

/**
 * Normalisiert die Abfrage einer V2-Kachel deterministisch und idempotent (Auftrag 154 §2.1).
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
    // Wurde bei Migration von globaler Pipeline gesetzt -> soll wieder erben
    pipelineId = undefined;
  } else if (rawQuery && Object.prototype.hasOwnProperty.call(rawQuery, 'pipelineId')) {
    if (rawQuery.pipelineId === null) {
      pipelineId = null; // ausdrücklich alle Pipelines
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
  // Nur 'fest', 'aktuell' oder 'live' sind kanonisch zulässig. Legacy-Ranges (z. B. '2025-01-01/2025-12-31')
  // oder globale V1-Werte werden verworfen (§2.1 Nr. 3).
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

  return normalized;
}

/**
 * Validiert die Abfrage einer Kachel gegen die tatsächlichen Fähigkeiten des aktiven
 * Katalogeintrags (Auftrag 154 §2.3). Liefert typisierte Fehlercodes.
 */
export function validateTileQuery(
  query: unknown,
  entry: ActiveCatalogEntry,
): TileQueryValidationResult {
  const errors: TileQueryValidationError[] = [];

  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    return {
      valid: false,
      errors: [
        {
          code: 'typ_ungueltig',
          message: 'Abfrage muss ein JSON-Objekt sein.',
        },
      ],
    };
  }

  const record = query as Record<string, unknown>;

  // 1. Unbekannte Felder
  for (const key of Object.keys(record)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      errors.push({
        code: 'unbekanntes_feld',
        message: `Unbekanntes Feld "${key}" in der Kachelabfrage.`,
        field: key,
      });
    }
  }

  // 2. metricId
  if (typeof record.metricId !== 'string' || record.metricId.trim().length === 0) {
    errors.push({
      code: 'typ_ungueltig',
      message: 'metricId ist ein erforderlicher String.',
      field: 'metricId',
    });
  } else if (record.metricId.trim() !== entry.id) {
    errors.push({
      code: 'metrik_abweichend',
      message: `metricId "${record.metricId}" weicht vom Kachelkatalog "${entry.id}" ab.`,
      field: 'metricId',
    });
  }

  const caps = getQueryCapabilities(entry);

  // 3. aggregation
  if (record.aggregation !== undefined) {
    if (typeof record.aggregation !== 'string') {
      errors.push({
        code: 'typ_ungueltig',
        message: 'aggregation muss ein String sein.',
        field: 'aggregation',
      });
    } else {
      const agg = record.aggregation.trim();
      if (!caps.allowedAggregations.includes(agg as unknown as never)) {
        errors.push({
          code: 'aggregation_unzulaessig',
          message: `Aggregation "${agg}" ist für Kennzahl "${entry.id}" unzulässig. Erlaubt: [${caps.allowedAggregations.join(', ')}].`,
          field: 'aggregation',
        });
      }
    }
  }

  // 4. pipelineId
  if (record.pipelineId !== undefined && record.pipelineId !== null) {
    if (typeof record.pipelineId !== 'string') {
      errors.push({
        code: 'typ_ungueltig',
        message: 'pipelineId muss ein String oder null sein.',
        field: 'pipelineId',
      });
    } else if (!caps.supportsPipelineFilter) {
      errors.push({
        code: 'filter_unzulaessig',
        message: `Pipeline-Filter ist für Kennzahl "${entry.id}" nicht zulässig (nur CRM-Kennzahlen).`,
        field: 'pipelineId',
      });
    }
  } else if (record.pipelineId === null && !caps.supportsPipelineFilter) {
    errors.push({
      code: 'filter_unzulaessig',
      message: `Pipeline-Filter ist für Kennzahl "${entry.id}" nicht zulässig.`,
      field: 'pipelineId',
    });
  }

  // 5. groupBy
  if (record.groupBy !== undefined) {
    if (!Array.isArray(record.groupBy)) {
      errors.push({
        code: 'typ_ungueltig',
        message: 'groupBy muss ein Array von Strings sein.',
        field: 'groupBy',
      });
    } else {
      if (record.groupBy.length > 1) {
        errors.push({
          code: 'gruppierung_unzulaessig',
          message: 'groupBy darf maximal eine Gruppierung enthalten.',
          field: 'groupBy',
        });
      }
      for (const item of record.groupBy) {
        if (typeof item !== 'string') {
          errors.push({
            code: 'typ_ungueltig',
            message: 'Gruppierungselement muss ein String sein.',
            field: 'groupBy',
          });
        } else if (item !== 'stage' || !caps.supportsStageGrouping) {
          errors.push({
            code: 'gruppierung_unzulaessig',
            message: `Gruppierung "${item}" ist für Kennzahl "${entry.id}" unzulässig.`,
            field: 'groupBy',
          });
        }
      }
    }
  }

  // 6. timeframe
  if (record.timeframe !== undefined) {
    if (typeof record.timeframe !== 'string') {
      errors.push({
        code: 'typ_ungueltig',
        message: 'timeframe muss ein String sein.',
        field: 'timeframe',
      });
    } else {
      const tf = record.timeframe.trim();
      if (!caps.allowedTimeframes.includes(tf as unknown as never)) {
        errors.push({
          code: 'zeitraum_unzulaessig',
          message: `Zeitbezug "${tf}" ist für Kennzahl "${entry.id}" unzulässig. Erlaubt: [${caps.allowedTimeframes.join(', ')}].`,
          field: 'timeframe',
        });
      }
    }
  }

  // 7. filters
  if (record.filters !== undefined) {
    if (
      typeof record.filters !== 'object' ||
      record.filters === null ||
      Array.isArray(record.filters)
    ) {
      errors.push({
        code: 'typ_ungueltig',
        message: 'filters muss ein Objekt sein.',
        field: 'filters',
      });
    } else if (Object.keys(record.filters).length > 0) {
      errors.push({
        code: 'filter_unzulaessig',
        message: 'Zusätzliche Filterobjekte sind in P08a noch nicht unterstützt (muss leer sein).',
        field: 'filters',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
