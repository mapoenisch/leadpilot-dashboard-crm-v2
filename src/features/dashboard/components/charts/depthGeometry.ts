// Tiefen-Diagramme (Designprobe Teilauftrag 0, übernommen in Auftrag 073): reine Geometrie.
// Keine React-Abhängigkeit, damit Winkel, Skalen und Pfade ohne Rendern geprüft werden können.

export interface DatumInput {
  label: string;
  value: number;
}

export interface TimeDatumInput {
  label: string;
  value: number | null;
  status?: 'belegt' | 'luecke' | 'vor_historienbeginn';
  measuredAt?: string | null;
  at?: string;
}

export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Tiefe aus der Säulenbreite, begrenzt auf 3 bis 8 px (wie im bestehenden Funnel-Stil). */
export function barDepth(width: number): number {
  return Math.min(8, Math.max(3, Math.round(width * 0.16)));
}

/** Nur endliche Werte sind darstellbar (Säulen/Balken, auch negativ; null für Lücken zulässig). */
export function assertFinite(values: readonly (number | null)[]): void {
  for (const value of values) {
    if (value !== null && !Number.isFinite(value)) {
      throw new RangeError(`Wert nicht darstellbar: ${String(value)}`);
    }
  }
}

/** Nur endliche, nicht negative Werte sind als Anteil oder Verlauf darstellbar. */
export function assertDrawable(values: readonly number[]): void {
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Wert nicht darstellbar: ${String(value)}`);
    }
  }
}

/** „Schöne“ Obergrenze und gleichmäßige Hilfslinien, z. B. 1322 → 1400 mit 0/350/700/1050/1400. */
export function niceScale(max: number, tickCount = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, ticks: [0, 1] };
  const rough = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step =
    (normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10) * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step)
    ticks.push(Math.round(value * 1000) / 1000);
  return { max: top, ticks };
}

/** Wertebereich einer Achse; `min` ist 0 bei nur positiven Werten (Auftrag 073). */
export interface ValueDomain {
  min: number;
  max: number;
}

/**
 * Skala über beide Vorzeichen: Nur positive Werte entsprechen `niceScale`, nur negative werden
 * gespiegelt, gemischte Werte teilen sich eine Schrittweite mit der 0 als Hilfslinie.
 */
export function niceSignedScale(
  minValue: number,
  maxValue: number,
  tickCount = 4,
): ValueDomain & { ticks: number[] } {
  const low = Number.isFinite(minValue) ? Math.min(0, minValue) : 0;
  const high = Number.isFinite(maxValue) ? Math.max(0, maxValue) : 0;
  if (low === 0) return { min: 0, ...niceScale(high, tickCount) };
  if (high === 0) {
    const mirrored = niceScale(-low, tickCount);
    return {
      min: -mirrored.max,
      max: 0,
      ticks: mirrored.ticks.map((tick) => (tick === 0 ? 0 : -tick)).reverse(),
    };
  }
  const step = niceScale(high - low, tickCount).ticks[1] ?? 1;
  const bottom = Math.floor(low / step) * step;
  const top = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let value = bottom; value <= top + step / 2; value += step) {
    const rounded = Math.round(value * 1000) / 1000;
    ticks.push(rounded === 0 ? 0 : rounded);
  }
  return { min: bottom, max: top, ticks };
}

/** Kleinste sichtbare Fläche für Werte ungleich 0; Beschriftung und Tabelle bleiben exakt. */
export const MIN_VISIBLE_PX = 2;

function toDomain(scale: number | ValueDomain): ValueDomain {
  return typeof scale === 'number' ? { min: 0, max: scale } : scale;
}

/** Länge eines Werts auf der Achse samt Mindestsichtbarkeit; 0 bleibt 0. */
function extent(value: number, domain: ValueDomain, size: number): number {
  const span = domain.max - domain.min;
  if (span <= 0 || value === 0) return 0;
  return Math.max((Math.abs(value) / span) * size, MIN_VISIBLE_PX);
}

export interface BarRect {
  index: number;
  label: string;
  value: number | null;
  x: number;
  /** Oberkante der Vorderfläche. */
  y: number;
  width: number;
  height: number;
  depth: number;
  /** y-Lage der Nullachse. */
  zero: number;
  negative: boolean;
}

/**
 * Säulen auf gleichmäßigen Plätzen. Positive Werte wachsen von der Nullachse nach oben, negative
 * nach unten; 0- und null-Werte behalten eine Position, aber keine Höhe.
 */
export function layoutBars(
  data: readonly (DatumInput | TimeDatumInput)[],
  area: Bounds,
  scale: number | ValueDomain,
): BarRect[] {
  assertFinite(data.map((entry) => entry.value));
  if (data.length === 0) return [];
  const domain = toDomain(scale);
  const span = domain.max - domain.min;
  const zero = span > 0 ? area.top + (domain.max / span) * area.height : area.top + area.height;
  const slot = area.width / data.length;
  const width = Math.min(slot * 0.62, 96);
  return data.map((entry, index) => {
    const val = entry.value;
    const height = val !== null ? extent(val, domain, area.height) : 0;
    const negative = val !== null && val < 0;
    return {
      index,
      label: entry.label,
      value: val,
      x: area.left + slot * index + (slot - width) / 2,
      y: negative ? zero : zero - height,
      width,
      height,
      depth: barDepth(width),
      zero,
      negative,
    };
  });
}

export interface HBarRect {
  index: number;
  label: string;
  value: number | null;
  /** Linke Kante der Vorderfläche. */
  x: number;
  y: number;
  /** Länge der Vorderfläche; 0 für Null- und Fehlwerte. */
  length: number;
  /** Gesamte Dicke inklusive Tiefe. */
  thickness: number;
  depth: number;
  /** x-Lage der Nullachse. */
  zero: number;
  negative: boolean;
}

/** Horizontale Balken; negative Werte reichen von der Nullachse nach links. */
export function layoutHBars(
  data: readonly (DatumInput | TimeDatumInput)[],
  area: Bounds,
  scale: number | ValueDomain,
): HBarRect[] {
  assertFinite(data.map((entry) => entry.value));
  if (data.length === 0) return [];
  const domain = toDomain(scale);
  const span = domain.max - domain.min;
  const zero = span > 0 ? area.left + (-domain.min / span) * area.width : area.left;
  const slot = area.height / data.length;
  const thickness = Math.min(slot * 0.62, 40);
  return data.map((entry, index) => {
    const val = entry.value;
    const length = val !== null ? extent(val, domain, area.width) : 0;
    const negative = val !== null && val < 0;
    return {
      index,
      label: entry.label,
      value: val,
      x: negative ? zero - length : zero,
      y: area.top + slot * index + (slot - thickness) / 2,
      length,
      thickness,
      depth: barDepth(thickness),
      zero,
      negative,
    };
  });
}

export function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

export interface DonutSegment {
  index: number;
  label: string;
  value: number;
  share: number;
  startAngle: number;
  endAngle: number;
  path: string;
}

const round = (value: number) => Math.round(value * 100) / 100;

function ringPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
) {
  const large = end - start > 180 ? 1 : 0;
  const a = polarToCartesian(cx, cy, outer, start);
  const b = polarToCartesian(cx, cy, outer, end);
  const c = polarToCartesian(cx, cy, inner, end);
  const d = polarToCartesian(cx, cy, inner, start);
  return [
    `M ${round(a.x)} ${round(a.y)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${round(b.x)} ${round(b.y)}`,
    `L ${round(c.x)} ${round(c.y)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${round(d.x)} ${round(d.y)}`,
    'Z',
  ].join(' ');
}

export function gaugeArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const diff = (endAngle - startAngle + 360) % 360;
  if (diff <= 0.001) return '';
  const large = diff > 180 ? 1 : 0;
  const a = polarToCartesian(cx, cy, radius, startAngle);
  const b = polarToCartesian(cx, cy, radius, endAngle);
  return `M ${round(a.x)} ${round(a.y)} A ${radius} ${radius} 0 ${large} 1 ${round(b.x)} ${round(b.y)}`;
}

/**
 * Ringsegmente mit exakten Winkelanteilen: die Winkel summieren sich auf genau 360°.
 * Ein einzelnes Segment mit 100 % wird knapp unter 360° gezeichnet, damit der Pfad nicht zusammenfällt.
 */
export function donutSegments(
  data: readonly DatumInput[],
  geometry: { cx: number; cy: number; outer: number; inner: number },
): DonutSegment[] {
  assertDrawable(data.map((entry) => entry.value));
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  if (total <= 0) return [];
  let cursor = 0;
  return data.map((entry, index) => {
    const share = entry.value / total;
    const start = cursor;
    const end = index === data.length - 1 ? 360 : cursor + share * 360;
    cursor = end;
    const drawEnd = end - start >= 360 ? 359.99 : end;
    return {
      index,
      label: entry.label,
      value: entry.value,
      share,
      startAngle: start,
      endAngle: end,
      path: ringPath(geometry.cx, geometry.cy, geometry.outer, geometry.inner, start, drawEnd),
    };
  });
}

export interface LinePoint {
  index: number;
  label: string;
  value: number | null;
  x: number;
  y: number;
  status?: 'belegt' | 'luecke' | 'vor_historienbeginn';
  measuredAt?: string | null;
  at?: string;
}

/** Punkte liegen exakt auf dem Wert; es gibt keine Tiefenverschiebung der Datenpunkte. */
export function linePoints(
  data: readonly (DatumInput | TimeDatumInput)[],
  area: Bounds,
  scaleMax: number,
): LinePoint[] {
  assertDrawable(data.map((entry) => entry.value).filter((v): v is number => v !== null));
  const last = Math.max(1, data.length - 1);
  return data.map((entry, index) => ({
    index,
    label: entry.label,
    value: entry.value,
    x: area.left + (data.length === 1 ? area.width / 2 : (area.width * index) / last),
    y:
      entry.value === null
        ? area.top + area.height
        : area.top + area.height - (scaleMax > 0 ? (entry.value / scaleMax) * area.height : 0),
    status: 'status' in entry ? entry.status : undefined,
    measuredAt: 'measuredAt' in entry ? entry.measuredAt : undefined,
    at: 'at' in entry ? entry.at : undefined,
  }));
}

export function linePath(points: readonly LinePoint[]): string {
  const segments: string[] = [];
  let current: LinePoint[] = [];
  for (const point of points) {
    if (point.value !== null) {
      current.push(point);
    } else if (current.length > 0) {
      segments.push(
        current.map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`).join(' '),
      );
      current = [];
    }
  }
  if (current.length > 0) {
    segments.push(
      current.map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`).join(' '),
    );
  }
  return segments.join(' ');
}

export function areaPath(points: readonly LinePoint[], baseline: number): string {
  const segments: LinePoint[][] = [];
  let current: LinePoint[] = [];
  for (const point of points) {
    if (point.value !== null) {
      current.push(point);
    } else if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length > 0) segments.push(current);
  if (segments.length === 0) return '';
  return segments
    .map((seg) => {
      const first = seg[0];
      const last = seg[seg.length - 1];
      if (!first || !last) return '';
      const line = seg
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`)
        .join(' ');
      return `${line} L ${round(last.x)} ${baseline} L ${round(first.x)} ${baseline} Z`;
    })
    .join(' ');
}

export {
  formatDe,
  formatAxis,
  formatAxisTickLabel,
  summarizeSeries,
  shortenLabel,
  summarizeGauge,
  summarizeFunnel,
} from './depthFormat';
export type { SummaryKind } from './depthFormat';
