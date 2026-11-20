// Auftrag 170 (P14b): Hilfsfunktionen für Vergleich, Join und Erwartungsband in Tiefen-Diagrammen.
import type { TimeDatumInput, DatumInput } from './depthGeometry';
import type { ExpectationBandPoint, TileTimeSeriesExtras } from '../../model/timeseries/types';
import type { TimeSeriesPoint } from '../../data/dashboardData';
import { computeComparison } from '../../model/timeseries/computeComparison';
import { formatDe } from './depthGeometry';

export interface AreaRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Zeitpunkte als Diagrammdaten (Beschriftung bleibt der Zeitstempel; die Achse kommt von der Basis). */
export function toChartRows(points: readonly TimeSeriesPoint[]): TimeDatumInput[] {
  return points.map((p) => ({
    label: p.at,
    value: p.value,
    status: p.status,
    at: p.at,
    measuredAt: p.measuredAt,
  }));
}

/** SVG-Pfad des Erwartungsbands (10.–90. Perzentil) hinter der Linie. */
export function buildBandPath(
  points: readonly { x: number; index: number }[],
  bands: readonly ExpectationBandPoint[],
  area: AreaRect,
  scaleMax: number,
): string {
  if (points.length === 0 || bands.length === 0 || scaleMax <= 0) return '';
  const baseline = area.top + area.height;
  const bandByIndex = new Map(bands.map((b) => [b.index, b]));
  const upper: string[] = [];
  const lower: string[] = [];
  for (const pt of points) {
    const band = bandByIndex.get(pt.index);
    if (!band) continue;
    const yUpper = Math.max(area.top, baseline - (band.upper / scaleMax) * area.height);
    const yLower = Math.min(baseline, baseline - (band.lower / scaleMax) * area.height);
    upper.push(`${pt.x} ${yUpper}`);
    lower.unshift(`${pt.x} ${yLower}`);
  }
  if (upper.length < 2) return '';
  return `M ${upper.join(' L ')} L ${lower.join(' L ')} Z`;
}

/** Vergleichszeile im Fadenkreuz: Wert der Vorperiode/des Vorjahrs plus Abweichung. */
export function formatCompareReadout(
  current: DatumInput | TimeDatumInput | null,
  compare: TimeSeriesPoint | null,
  unit: string,
  compareType: 'vorperiode' | 'vorjahr',
): string {
  if (!current || !compare) return '';
  const label = compareType === 'vorjahr' ? 'Vorjahr' : 'Vorperiode';
  if (compare.value === null) return `${label}: keine Messung`;
  const comp = computeComparison({
    baseValue: current.value,
    compareValue: compare.value,
    unit,
    compareBucketStart: compare.at,
  });
  const delta =
    comp.deltaAbsolute === null
      ? comp.labelPercent
      : `${comp.deltaAbsolute > 0 ? '+' : ''}${formatDe(comp.deltaAbsolute)} ${comp.unitLabel}, ${comp.labelPercent}`;
  return `${label}: ${formatDe(compare.value)} ${unit} (${delta})`;
}

/** Breite des schraffierten Bereichs vor Historienbeginn. */
export function computeHistoryZoneWidth(
  points: readonly { x: number; status?: string }[],
  area: AreaRect,
): number {
  let count = 0;
  for (const p of points) {
    if (p.status === 'vor_historienbeginn') count++;
    else break;
  }
  if (count === 0 || points.length === 0) return 0;
  if (count === points.length) return area.width;
  return Math.max(0, (points[count - 1]!.x + points[count]!.x) / 2 - area.left);
}

/** Zusatz im Fadenkreuz: beide Werte am selben Zeitpunkt (§2.2 Nr. 10). */
export function buildExtraReadout(
  active: number | null,
  data: readonly (DatumInput | TimeDatumInput)[],
  unit: string,
  extras: TileTimeSeriesExtras | undefined,
): string {
  if (active === null || !extras) return '';
  const parts: string[] = [];
  const compare = extras.compare?.points[active];
  if (extras.compare && compare) {
    parts.push(formatCompareReadout(data[active] ?? null, compare, unit, extras.compare.type));
  }
  const second = extras.second?.points[active];
  if (extras.second && second) {
    const value =
      second.value === null ? 'keine Messung' : `${formatDe(second.value)} ${extras.second.unit}`;
    parts.push(`${extras.second.title}: ${value}`);
  }
  return parts.filter(Boolean).join(' · ');
}
