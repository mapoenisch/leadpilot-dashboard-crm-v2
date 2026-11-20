// Auftrag 170 (P14b): Heatmap-Raster „Woche × Wochentag“ oder „Phase × Woche“.
// Tageswerte: Flussgrößen als Tagessumme; Bestände und Verhältnisse nie summieren, sondern
// letzter gültiger Messwert des Tages (last_value, wie public.dashboard_time_series).
// Kalender in Europe/Berlin, unabhängig von der Zeitzone des Rechners.
import type { TimeSeriesPoint, TimeSeriesResolution } from '../../data/dashboardData';
import type { HeatmapCell, HeatmapGridResult } from './types';
import { berlinDayKey, dayKeyFromNumber, dayNumber, isoWeek, weekdayIndex } from './berlinDate';

export type { HeatmapCell, HeatmapGridResult } from './types';

export type HeatmapAggregation = 'bestand' | 'fluss' | 'verhaeltnis' | 'keine';

export interface HeatmapPhaseSeries {
  phase: string;
  points: readonly TimeSeriesPoint[];
}

export interface HeatmapGridInput {
  points: readonly TimeSeriesPoint[];
  sourceResolution: TimeSeriesResolution;
  aggregationType: HeatmapAggregation;
  mode?: 'woche_wochentag' | 'phase_woche';
  /** Nur „Phase × Woche“: Reihe je Phase (z. B. aus public.dashboard_time_series_phases). */
  phaseSeries?: readonly HeatmapPhaseSeries[];
  unit?: string;
  formatValue?: (val: number) => string;
}

export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
const WEEKDAY_LONG = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
] as const;
export const NO_DATA_LABEL = 'Keine Daten';

/** Verdichtet Punkte je Schlüssel: Fluss = Summe, sonst letzter gültiger Wert (nach Zeit). */
function aggregate(
  points: readonly TimeSeriesPoint[],
  keyOf: (pt: TimeSeriesPoint) => number,
  aggregation: HeatmapAggregation,
): Map<number, { value: number; count: number; lastAt: number }> {
  const out = new Map<number, { value: number; count: number; lastAt: number }>();
  for (const pt of points) {
    if (pt.value === null || !Number.isFinite(pt.value)) continue;
    const key = keyOf(pt);
    const at = Date.parse(pt.at);
    const prev = out.get(key);
    if (!prev) {
      out.set(key, { value: pt.value, count: 1, lastAt: at });
    } else if (aggregation === 'fluss') {
      prev.value += pt.value;
      prev.count += 1;
    } else {
      prev.count += 1;
      if (!(at < prev.lastAt)) {
        prev.value = pt.value;
        prev.lastAt = at;
      }
    }
  }
  return out;
}

function mondayOf(at: string): number {
  const day = dayNumber(berlinDayKey(at));
  return day - weekdayIndex(day);
}

function emptyResult(mode: HeatmapGridResult['mode'], rowLabels: string[], unit: string) {
  return { mode, colLabels: [], rowLabels, cells: [], minValue: 0, maxValue: 0, unit };
}

export function toHeatmapGrid(input: HeatmapGridInput): HeatmapGridResult {
  const {
    points,
    aggregationType,
    mode = 'woche_wochentag',
    unit = '',
    formatValue = (v: number) => v.toLocaleString('de-DE'),
  } = input;
  const describe = (value: number | null) =>
    value === null ? NO_DATA_LABEL : `${formatValue(value)} ${unit}`.trim();

  if (mode === 'phase_woche') {
    return buildPhaseWeekGrid(input.phaseSeries ?? [], aggregationType, unit, describe);
  }
  if (points.length === 0) return emptyResult('woche_wochentag', [...WEEKDAY_SHORT], unit);

  const byDay = aggregate(points, (pt) => dayNumber(berlinDayKey(pt.at)), aggregationType);
  let firstMonday = Infinity;
  let lastMonday = -Infinity;
  for (const pt of points) {
    const monday = mondayOf(pt.at);
    if (monday < firstMonday) firstMonday = monday;
    if (monday > lastMonday) lastMonday = monday;
  }

  const colLabels: string[] = [];
  const cells: HeatmapCell[] = [];
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (let monday = firstMonday, col = 0; monday <= lastMonday; monday += 7, col++) {
    const colLabel = `KW ${isoWeek(monday)}`;
    colLabels.push(colLabel);
    for (let row = 0; row < 7; row++) {
      const day = monday + row;
      const dateKey = dayKeyFromNumber(day);
      const agg = byDay.get(day);
      const value = agg ? agg.value : null;
      if (value !== null) {
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
      cells.push({
        colIndex: col,
        rowIndex: row,
        dateKey,
        colLabel,
        rowLabel: WEEKDAY_SHORT[row]!,
        weekdayIndex: row,
        value,
        count: agg ? agg.count : 0,
        isNull: value === null,
        accessibleName: `${colLabel}, ${WEEKDAY_LONG[row]} ${dateKey.split('-').reverse().join('.')}: ${describe(value)}`,
      });
    }
  }

  return {
    mode: 'woche_wochentag',
    colLabels,
    rowLabels: [...WEEKDAY_SHORT],
    cells,
    minValue: Number.isFinite(minValue) ? minValue : 0,
    maxValue: Number.isFinite(maxValue) ? maxValue : 0,
    unit,
  };
}

function buildPhaseWeekGrid(
  phaseSeries: readonly HeatmapPhaseSeries[],
  aggregation: HeatmapAggregation,
  unit: string,
  describe: (value: number | null) => string,
): HeatmapGridResult {
  const rowLabels = phaseSeries.map((s) => s.phase);
  const mondays = new Set<number>();
  for (const series of phaseSeries) for (const pt of series.points) mondays.add(mondayOf(pt.at));
  const weekList = [...mondays].sort((a, b) => a - b);
  if (weekList.length === 0 || rowLabels.length === 0) {
    return emptyResult('phase_woche', rowLabels, unit);
  }

  const colLabels = weekList.map((monday) => `KW ${isoWeek(monday)}`);
  const cells: HeatmapCell[] = [];
  let minValue = Infinity;
  let maxValue = -Infinity;

  phaseSeries.forEach((series, row) => {
    const byWeek = aggregate(series.points, (pt) => mondayOf(pt.at), aggregation);
    weekList.forEach((monday, col) => {
      const agg = byWeek.get(monday);
      const value = agg ? agg.value : null;
      if (value !== null) {
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
      const colLabel = colLabels[col]!;
      cells.push({
        colIndex: col,
        rowIndex: row,
        dateKey: dayKeyFromNumber(monday),
        colLabel,
        rowLabel: series.phase,
        weekdayIndex: row,
        value,
        count: agg ? agg.count : 0,
        isNull: value === null,
        accessibleName: `${colLabel}, Phase ${series.phase}: ${describe(value)}`,
      });
    });
  });

  return {
    mode: 'phase_woche',
    colLabels,
    rowLabels,
    cells,
    minValue: Number.isFinite(minValue) ? minValue : 0,
    maxValue: Number.isFinite(maxValue) ? maxValue : 0,
    unit,
  };
}
