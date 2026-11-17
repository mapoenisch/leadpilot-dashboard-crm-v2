import type { ActiveCatalogEntry } from './dashboardCatalog';
import { getQueryCapabilities } from './queryCapabilities';

export type TileQueryValidationErrorCode =
  | 'metrik_abweichend'
  | 'aggregation_unzulaessig'
  | 'filter_unzulaessig'
  | 'gruppierung_unzulaessig'
  | 'zeitraum_unzulaessig'
  | 'unbekanntes_feld'
  | 'fenster_unzulaessig'
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

export {
  normalizeTileQuery,
  CANONICAL_TIMEFRAMES,
  type NormalizeTileQueryOptions,
} from './normalizeTileQuery';

export const ALLOWED_QUERY_KEYS = new Set([
  'metricId',
  'pipelineId',
  'timeframe',
  'aggregation',
  'groupBy',
  'filters',
  'window',
]);

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

  // 8. window (Auftrag 161 §2.3 Nr. 12)
  if (record.window !== undefined) {
    if (
      typeof record.window !== 'object' ||
      record.window === null ||
      Array.isArray(record.window)
    ) {
      errors.push({
        code: 'typ_ungueltig',
        message: 'window muss ein Objekt sein.',
        field: 'window',
      });
    } else {
      const win = record.window as Record<string, unknown>;
      const keys = Object.keys(win);
      if (keys.length !== 2 || !keys.includes('count') || !keys.includes('resolution')) {
        errors.push({
          code: 'typ_ungueltig',
          message: 'window darf genau die Schlüssel "count" und "resolution" enthalten.',
          field: 'window',
        });
      } else {
        const { count, resolution } = win;
        const isCountInt = typeof count === 'number' && Number.isInteger(count) && count >= 1;
        const validRes = ['stunde', 'tag', 'woche', 'monat'];
        const isResValid = typeof resolution === 'string' && validRes.includes(resolution);

        if (!isCountInt || !isResValid) {
          errors.push({
            code: 'typ_ungueltig',
            message:
              'window.count muss eine Ganzzahl >= 1 und resolution eine gültige Auflösung sein.',
            field: 'window',
          });
        } else {
          const maxLimits: Record<string, number> = {
            stunde: 168,
            tag: 366,
            woche: 260,
            monat: 120,
          };
          const limit = maxLimits[resolution as string] ?? 400;
          if (count > limit) {
            errors.push({
              code: 'fenster_unzulaessig',
              message: `window.count (${count}) übersteigt Grenze von ${limit} für "${resolution}".`,
              field: 'window',
            });
          }
          if (entry.history.kind !== 'ereignisse') {
            errors.push({
              code: 'fenster_unzulaessig',
              message: `Ein Zeitfenster ist für Kennzahl "${entry.id}" nicht zulässig.`,
              field: 'window',
            });
          } else if (entry.source.layer === 'crm') {
            if (resolution === 'stunde') {
              errors.push({
                code: 'fenster_unzulaessig',
                message: 'Stundenauflösung ist für CRM-Verläufe unzulässig.',
                field: 'window',
              });
            }
          } else {
            if (resolution === 'woche' || resolution === 'monat') {
              errors.push({
                code: 'fenster_unzulaessig',
                message: `Auflösung "${resolution}" ist für Live-Verläufe unzulässig.`,
                field: 'window',
              });
            } else if (resolution === 'tag' && count > 90) {
              errors.push({
                code: 'fenster_unzulaessig',
                message: `window.count (${count}) übersteigt 90 Tage für Live-Verläufe.`,
                field: 'window',
              });
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
