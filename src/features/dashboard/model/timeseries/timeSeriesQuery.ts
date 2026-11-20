// Auftrag 170 (P14b): Normalisierung und Prüfung von query.compare, query.join und query.bands.
import { DASHBOARD_CATALOG, isActiveEntry, type ActiveCatalogEntry } from '../dashboardCatalog';
import type { TileQueryConfig } from '../dashboardConfigV2';
import type { TimeSeriesCompareType, TimeSeriesJoinConfig, TimeSeriesBandsConfig } from './types';

export interface TimeSeriesQueryParts {
  compare?: TimeSeriesCompareType;
  join?: TimeSeriesJoinConfig;
  bands?: TimeSeriesBandsConfig;
}

export interface TimeSeriesQueryIssue {
  field: 'compare' | 'join' | 'bands';
  message: string;
}

const COMPARE_TYPES: readonly string[] = ['vorperiode', 'vorjahr'];
const JOIN_TYPES: readonly string[] = ['inner', 'links'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Übernimmt nur gültig geformte Angaben (idempotent). */
export function normalizeTimeSeriesQueryParts(
  raw: Partial<TileQueryConfig> | undefined,
): TimeSeriesQueryParts {
  const parts: TimeSeriesQueryParts = {};
  if (typeof raw?.compare === 'string' && COMPARE_TYPES.includes(raw.compare)) {
    parts.compare = raw.compare;
  }
  const join: unknown = raw?.join;
  if (
    isRecord(join) &&
    typeof join.metricId === 'string' &&
    join.metricId.trim().length > 0 &&
    typeof join.typ === 'string' &&
    JOIN_TYPES.includes(join.typ)
  ) {
    parts.join = { metricId: join.metricId.trim(), typ: join.typ as TimeSeriesJoinConfig['typ'] };
  }
  const bands: unknown = raw?.bands;
  if (isRecord(bands) && bands.type === 'percentile_10_90') {
    parts.bands = { type: 'percentile_10_90', periodCount: 8 };
  }
  return parts;
}

export function isTimeSeriesEntry(entry: ActiveCatalogEntry | undefined): boolean {
  return entry?.shape === 'zeitreihe' && entry.history.kind === 'ereignisse';
}

/** Auflösung des Fensters einer Kachel (eigenes Fenster oder Standard des Katalogs). */
export function effectiveResolution(
  entry: ActiveCatalogEntry,
  window?: TileQueryConfig['window'],
): string | undefined {
  return window?.resolution ?? entry.history.defaultWindow?.resolution;
}

/** Zulässige zweite Reihen: aktive Zeitreihen mit gleicher Auflösung (§2.1 Nr. 3). */
export function joinCandidates(
  entry: ActiveCatalogEntry,
  window?: TileQueryConfig['window'],
): ActiveCatalogEntry[] {
  if (!isTimeSeriesEntry(entry)) return [];
  const resolution = effectiveResolution(entry, window);
  return DASHBOARD_CATALOG.filter(
    (candidate): candidate is ActiveCatalogEntry =>
      isActiveEntry(candidate) &&
      candidate.id !== entry.id &&
      isTimeSeriesEntry(candidate) &&
      candidate.history.defaultWindow?.resolution === resolution,
  );
}

/** Transformationen, die Werte verändern: Vergleich und Band würden sonst Einheiten mischen. */
export function hasValueTransformation(query: Partial<TileQueryConfig> | undefined): boolean {
  return (query?.transformations ?? []).some((step) => step.art !== 'umbenennen');
}

const VALUE_TRANSFORMATION_REASON =
  'Vergleich, zweite Reihe und Erwartungsband sind nicht mit Einheiten-Umrechnung oder gleitendem Durchschnitt kombinierbar.';

/** Sperrgrund für den Abschnitt „Vergleichen“ oder null, wenn alles zulässig ist. */
export function compareBlockReason(
  entry: ActiveCatalogEntry | undefined,
  query: Partial<TileQueryConfig>,
  presentation: string,
): string | null {
  if (!entry || !isTimeSeriesEntry(entry)) return 'Nur für Zeitreihen-Kennzahlen verfügbar.';
  if (presentation === 'heatmap') return 'Bei der Darstellung „Heatmap“ nicht verfügbar.';
  if (hasValueTransformation(query)) return VALUE_TRANSFORMATION_REASON;
  return null;
}

/** Fachliche Prüfung gegen den Katalogeintrag. */
export function validateTimeSeriesQueryParts(
  record: Record<string, unknown>,
  entry: ActiveCatalogEntry,
): TimeSeriesQueryIssue[] {
  const issues: TimeSeriesQueryIssue[] = [];
  const isSeries = isTimeSeriesEntry(entry);
  const normalized = normalizeTimeSeriesQueryParts(record as Partial<TileQueryConfig>);

  if (record.compare !== undefined) {
    if (!normalized.compare) {
      issues.push({ field: 'compare', message: 'compare muss "vorperiode" oder "vorjahr" sein.' });
    } else if (!isSeries) {
      issues.push({ field: 'compare', message: 'Vergleich ist nur für Zeitreihen zulässig.' });
    }
  }
  if (record.join !== undefined) {
    const window = record.window as TileQueryConfig['window'];
    if (!normalized.join) {
      issues.push({
        field: 'join',
        message: 'join braucht metricId und typ "inner" oder "links".',
      });
    } else if (!joinCandidates(entry, window).some((c) => c.id === normalized.join!.metricId)) {
      issues.push({
        field: 'join',
        message: `Verknüpfung mit "${normalized.join.metricId}" ist nur zwischen Zeitreihen gleicher Auflösung zulässig.`,
      });
    }
  }
  const usesCompare =
    record.compare !== undefined || record.join !== undefined || record.bands !== undefined;
  if (usesCompare && hasValueTransformation(record as Partial<TileQueryConfig>)) {
    issues.push({ field: 'compare', message: VALUE_TRANSFORMATION_REASON });
  }
  if (record.bands !== undefined) {
    if (!normalized.bands) {
      issues.push({ field: 'bands', message: 'bands.type muss "percentile_10_90" sein.' });
    } else if (!isSeries) {
      issues.push({ field: 'bands', message: 'Erwartungsband ist nur für Zeitreihen zulässig.' });
    }
  }
  return issues;
}
