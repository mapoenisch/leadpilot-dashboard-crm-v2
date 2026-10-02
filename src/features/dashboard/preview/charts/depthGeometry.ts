// Designprobe Dashboard-Testkachel (Teilauftrag 0): reine Geometrie für die Tiefen-Diagramme.
// Keine React-Abhängigkeit, damit Winkel, Skalen und Pfade ohne Rendern geprüft werden können.

export interface DatumInput {
  label: string;
  value: number;
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

/** Nur endliche, nicht negative Werte sind darstellbar. */
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

export interface BarRect {
  index: number;
  label: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

/** Säulen auf gleichmäßigen Plätzen; 0-Werte behalten eine Position, aber keine Höhe. */
export function layoutBars(data: readonly DatumInput[], area: Bounds, scaleMax: number): BarRect[] {
  assertDrawable(data.map((entry) => entry.value));
  if (data.length === 0) return [];
  const slot = area.width / data.length;
  const width = Math.min(slot * 0.62, 96);
  return data.map((entry, index) => {
    const height = scaleMax > 0 ? (entry.value / scaleMax) * area.height : 0;
    return {
      index,
      label: entry.label,
      value: entry.value,
      x: area.left + slot * index + (slot - width) / 2,
      y: area.top + area.height - height,
      width,
      height,
      depth: barDepth(width),
    };
  });
}

export interface HBarRect {
  index: number;
  label: string;
  value: number;
  x: number;
  y: number;
  /** Länge der Vorderfläche; 0 für Nullwerte. */
  length: number;
  /** Gesamte Dicke inklusive Tiefe. */
  thickness: number;
  depth: number;
}

/** Horizontale Balken auf gleichmäßigen Plätzen; 0-Werte behalten eine Position, aber keine Länge. */
export function layoutHBars(
  data: readonly DatumInput[],
  area: Bounds,
  scaleMax: number,
): HBarRect[] {
  assertDrawable(data.map((entry) => entry.value));
  if (data.length === 0) return [];
  const slot = area.height / data.length;
  const thickness = Math.min(slot * 0.62, 40);
  return data.map((entry, index) => ({
    index,
    label: entry.label,
    value: entry.value,
    x: area.left,
    y: area.top + slot * index + (slot - thickness) / 2,
    length: scaleMax > 0 ? (entry.value / scaleMax) * area.width : 0,
    thickness,
    depth: barDepth(thickness),
  }));
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
  value: number;
  x: number;
  y: number;
}

/** Punkte liegen exakt auf dem Wert; es gibt keine Tiefenverschiebung der Datenpunkte. */
export function linePoints(
  data: readonly DatumInput[],
  area: Bounds,
  scaleMax: number,
): LinePoint[] {
  assertDrawable(data.map((entry) => entry.value));
  const last = Math.max(1, data.length - 1);
  return data.map((entry, index) => ({
    index,
    label: entry.label,
    value: entry.value,
    x: area.left + (data.length === 1 ? area.width / 2 : (area.width * index) / last),
    y: area.top + area.height - (scaleMax > 0 ? (entry.value / scaleMax) * area.height : 0),
  }));
}

export function linePath(points: readonly LinePoint[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`).join(' ');
}

export function areaPath(points: readonly LinePoint[], baseline: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return '';
  return `${linePath(points)} L ${round(last.x)} ${baseline} L ${round(first.x)} ${baseline} Z`;
}

const numberFormat = new Intl.NumberFormat('de-DE');

export function formatDe(value: number): string {
  return numberFormat.format(value);
}
