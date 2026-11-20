// Auftrag 170 (P14b): Vergleich, zweite Reihe und Heatmap als Tabellenzeilen im Druckanhang.
import type { DashboardView } from '../../model/dashboardCatalog';
import type { ResolvedTileData } from '../../data/dashboardData';
import { formatPointLabel } from '../../data/resolveTimeSeries';
import { toHeatmapGrid, NO_DATA_LABEL } from '../../model/timeseries/toHeatmapGrid';
import { computeComparison, formatComparisonDelta } from '../../model/timeseries/computeComparison';
import { formatTileValue, NO_DATA } from '../tileFormat';

export interface PrintExtrasRow {
  label: string;
  value: string;
  notes: string[];
}

export function printExtrasRows(
  view: DashboardView,
  data: ResolvedTileData,
  unit: string = data.unit,
): PrintExtrasRow[] | null {
  const extras = data.timeSeriesExtras;
  const series = data.timeSeries;
  if (!extras || !series) return null;
  const fmt = (value: number | null, u = unit) =>
    value === null ? NO_DATA : formatTileValue(value, u, 'exakt');

  if (view === 'heatmap' && extras.heatmap) {
    const grid = toHeatmapGrid({
      points: extras.heatmap.mode === 'woche_wochentag' ? series.points : extras.heatmap.points,
      phaseSeries: extras.heatmap.phaseSeries,
      sourceResolution: 'tag',
      aggregationType: extras.heatmap.aggregation,
      mode: extras.heatmap.mode,
      unit,
    });
    return grid.cells.map((cell) => ({
      label: `${cell.rowLabel}, ${cell.colLabel} (${cell.dateKey.split('-').reverse().join('.')})`,
      value: cell.value === null ? NO_DATA_LABEL : fmt(cell.value),
      notes: [],
    }));
  }

  if (!extras.compare && !extras.second) return null;
  const compareLabel = extras.compare?.type === 'vorjahr' ? 'Vorjahr' : 'Vorperiode';
  return series.points.map((point, i) => {
    const notes: string[] = [];
    const compare = extras.compare?.points[i];
    if (compare) {
      const delta = computeComparison({
        baseValue: point.value,
        compareValue: compare.value,
        unit,
        compareBucketStart: compare.at,
      });
      notes.push(`${compareLabel}: ${fmt(compare.value)} · ${formatComparisonDelta(delta)}`);
    }
    const second = extras.second?.points[i];
    if (extras.second && second) {
      notes.push(`${extras.second.title}: ${fmt(second.value, extras.second.unit)}`);
    }
    return { label: formatPointLabel(point.at, series.resolution), value: fmt(point.value), notes };
  });
}
