/**
 * Typdefinitionen für Zeitreihen-Vergleich, Joins, Heatmap und Erwartungsbänder (Auftrag 170 / P14b).
 */

import type { TimeSeriesPoint, TimeSeriesResolution } from '../../data/dashboardData';

export type TimeSeriesCompareType = 'vorperiode' | 'vorjahr';
export type TimeSeriesJoinType = 'inner' | 'links';

export interface TimeSeriesJoinConfig {
  metricId: string;
  typ: TimeSeriesJoinType;
}

export interface TimeSeriesBandsConfig {
  type: 'percentile_10_90';
  periodCount: number;
}

export interface ComparisonResult {
  deltaAbsolute: number | null;
  deltaPercent: number | null;
  unitLabel: string;
  isComputable: boolean;
  labelPercent: string;
  isPartial: boolean;
  partialNotice?: string;
}

export interface AlignedRow {
  at: string;
  label: string;
  valueA: number | null;
  statusA: TimeSeriesPoint['status'];
  valueB: number | null;
  statusB: TimeSeriesPoint['status'];
}

export interface AlignedSeriesResult {
  resolution: TimeSeriesResolution;
  typ: TimeSeriesJoinType;
  rows: AlignedRow[];
}

export interface HeatmapCell {
  colIndex: number;
  rowIndex: number;
  dateKey: string;
  colLabel: string;
  rowLabel: string;
  weekdayIndex: number; // 0 = Montag .. 6 = Sonntag
  value: number | null;
  count: number;
  isNull: boolean;
  accessibleName: string;
}

export interface HeatmapGridResult {
  mode: 'woche_wochentag' | 'phase_woche';
  colLabels: string[];
  rowLabels: string[];
  cells: HeatmapCell[];
  minValue: number;
  maxValue: number;
  unit: string;
}

export interface ExpectationBandPoint {
  index: number;
  lower: number;
  upper: number;
}

export interface ExpectationBandsResult {
  hasBand: boolean;
  reason?: string;
  explanation?: string;
  bands?: ExpectationBandPoint[];
}

/** Auftrag 170: Zusatzdaten einer Zeitreihen-Kachel, aufgelöst vom Datenhook. */
export interface TileTimeSeriesExtras {
  compare?: {
    type: TimeSeriesCompareType;
    /** Index-gleich zu den Basispunkten der Kachel. */
    points: readonly TimeSeriesPoint[];
    datenstandAb: string | null;
    partialNotice: string | null;
  };
  second?: {
    title: string;
    unit: string;
    /** Index-gleich zu den (bei Inner-Join gefilterten) Basispunkten. */
    points: readonly TimeSeriesPoint[];
    typ: TimeSeriesJoinType;
  };
  bands?: ExpectationBandsResult;
  heatmap?: {
    mode: 'woche_wochentag' | 'phase_woche';
    aggregation: 'bestand' | 'fluss' | 'verhaeltnis' | 'keine';
    /** Rohe Tageswerte; angezeigt wird die (ggf. umgeformte) Kachelreihe `timeSeries`. */
    points: readonly TimeSeriesPoint[];
    phaseSeries?: readonly { phase: string; points: readonly TimeSeriesPoint[] }[];
  };
  /** Sichtbare Hinweise (Ladefehler, Sperrgründe) unter der Kachel. */
  notices: readonly string[];
}
