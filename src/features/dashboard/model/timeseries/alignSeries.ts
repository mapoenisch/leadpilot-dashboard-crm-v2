// Auftrag 170 (P14b): Zeitbezogene Verknüpfung zweier Zeitreihen. Schlüssel ist immer der
// Zeitstempel des Abschnitts; erlaubt nur bei gleicher Auflösung; höchstens 500 Abschnitte.
import type { TimeSeriesPoint, TimeSeriesResolution } from '../../data/dashboardData';
import type { AlignedRow, AlignedSeriesResult, TimeSeriesJoinType } from './types';

export type { AlignedRow, AlignedSeriesResult } from './types';

export const MAX_JOIN_BUCKETS = 500;

export interface AlignSeriesOptions {
  resolutionA: TimeSeriesResolution;
  resolutionB: TimeSeriesResolution;
  typ: TimeSeriesJoinType;
  /** Optional: Beschriftung je Zeile; ohne Angabe bleibt der Zeitstempel (schnell, < 5 ms je 500). */
  formatLabel?: (at: string, resolution: TimeSeriesResolution) => string;
}

/** Zeitpunkt als Schlüssel: gleiche Instants mit unterschiedlicher Schreibweise treffen sich. */
function bucketKey(at: string): string {
  const ms = Date.parse(at);
  return Number.isNaN(ms) ? at : String(ms);
}

export function alignSeries(
  seriesA: readonly TimeSeriesPoint[],
  seriesB: readonly TimeSeriesPoint[],
  options: AlignSeriesOptions,
): AlignedSeriesResult {
  const { resolutionA, resolutionB, typ, formatLabel } = options;

  if (resolutionA !== resolutionB) {
    throw new Error(
      `Ungleiche Auflösung: Join nur bei gleicher Auflösung erlaubt (Reihe A: ${resolutionA}, Reihe B: ${resolutionB})`,
    );
  }

  const mapB = new Map<string, TimeSeriesPoint>();
  for (const point of seriesB) mapB.set(bucketKey(point.at), point);

  const rows: AlignedRow[] = [];
  for (const pointA of seriesA) {
    const pointB = mapB.get(bucketKey(pointA.at));
    if (typ === 'inner' && pointB === undefined) continue;
    rows.push({
      at: pointA.at,
      label: formatLabel ? formatLabel(pointA.at, resolutionA) : pointA.at,
      valueA: pointA.value,
      statusA: pointA.status,
      valueB: pointB ? pointB.value : null,
      statusB: pointB ? pointB.status : 'luecke',
    });
  }

  if (rows.length > MAX_JOIN_BUCKETS) {
    throw new RangeError(
      `Ergebnis überschreitet Grenze von maximal ${MAX_JOIN_BUCKETS} Buckets (${rows.length} Buckets)`,
    );
  }

  return { resolution: resolutionA, typ, rows };
}
