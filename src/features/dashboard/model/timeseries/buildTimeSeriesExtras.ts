// Auftrag 170 (P14b): Setzt Vergleich, zweite Reihe, Erwartungsband und Heatmap-Daten einer
// Zeitreihen-Kachel zusammen (reine Funktion, vom Datenhook und der Vorschau genutzt).
import type { ActiveCatalogEntry } from '../dashboardCatalog';
import type {
  ResolvedTileData,
  TileTimeSeriesData,
  TimeSeriesPoint,
  TimeSeriesResolution,
} from '../../data/dashboardData';
import type {
  TileTimeSeriesCompareData,
  TilePhaseSeriesData,
} from '../../data/resolveTimeSeriesCompare';
import { alignSeries } from './alignSeries';
import { bandsForDisplay, calculateExpectationBands } from './expectationBands';
import type { TileTimeSeriesExtras, TimeSeriesJoinType } from './types';

/** Periode des Erwartungsbands je Auflösung: Abschnitte je Periode und Plural im Erklärsatz. */
export const BAND_PERIODS: Record<TimeSeriesResolution, { length: number; label: string }> = {
  stunde: { length: 24, label: 'Tage' },
  tag: { length: 7, label: 'Wochen' },
  woche: { length: 1, label: 'Wochen' },
  monat: { length: 1, label: 'Monate' },
};

export interface BuildTimeSeriesExtrasInput {
  data: ResolvedTileData;
  entry: ActiveCatalogEntry;
  series: TileTimeSeriesData;
  compare?: TileTimeSeriesCompareData;
  join?: { entry: ActiveCatalogEntry; typ: TimeSeriesJoinType; series: TileTimeSeriesData };
  bandPrior?: TileTimeSeriesData;
  heatmap?: { phases?: TilePhaseSeriesData; daily?: TileTimeSeriesData };
  notices?: readonly string[];
}

const GAP = (at: string): TimeSeriesPoint => ({
  at,
  value: null,
  status: 'luecke',
  measuredAt: null,
});

export function buildTimeSeriesExtras(input: BuildTimeSeriesExtrasInput): ResolvedTileData {
  const { data, entry, compare, join, bandPrior, heatmap } = input;
  const allPoints = input.series.points;
  const notices = [...(input.notices ?? [])];
  const extras: TileTimeSeriesExtras = { notices };
  // Indizes der angezeigten Basispunkte (Inner-Join filtert auf gemeinsame Zeitpunkte).
  let kept = allPoints.map((_, i) => i);

  if (join) {
    try {
      const aligned = alignSeries(allPoints, join.series.points, {
        resolutionA: input.series.resolution,
        resolutionB: join.series.resolution,
        typ: join.typ,
      });
      const rowAts = new Set(aligned.rows.map((row) => row.at));
      kept = kept.filter((i) => rowAts.has(allPoints[i]!.at));
      extras.second = {
        title: join.entry.name,
        unit: join.entry.unit,
        typ: join.typ,
        points: aligned.rows.map((row) => ({
          at: row.at,
          value: row.valueB,
          status: row.statusB,
          measuredAt: null,
        })),
      };
    } catch (error) {
      notices.push(`Zweite Reihe: ${(error as Error).message}`);
    }
  }
  const points = kept.map((i) => allPoints[i]!);

  if (compare) {
    const byAt = new Map(compare.basePoints.map((p, i) => [p.at, i]));
    extras.compare = {
      type: compare.compare,
      points: kept.map((i) => {
        const at = allPoints[i]!.at;
        return compare.comparePoints[byAt.get(at) ?? i] ?? GAP(at);
      }),
      datenstandAb: compare.datenstandAb,
      partialNotice: compare.partialNotice,
    };
  }

  if (bandPrior) {
    const period = BAND_PERIODS[input.series.resolution];
    const result = bandsForDisplay(
      calculateExpectationBands({
        priorPoints: bandPrior.points,
        periodLength: period.length,
        resolution: input.series.resolution,
        periodLabel: period.label,
      }),
      allPoints.length,
    );
    extras.bands = result.bands
      ? { ...result, bands: kept.map((i, index) => ({ ...result.bands![i]!, index })) }
      : result;
  }

  if (heatmap?.phases) {
    extras.heatmap = {
      mode: 'phase_woche',
      aggregation: 'fluss',
      points: [],
      phaseSeries: heatmap.phases.phases,
    };
  } else if (heatmap?.daily) {
    extras.heatmap = {
      mode: 'woche_wochentag',
      aggregation: entry.aggregation,
      points: heatmap.daily.points,
    };
  }

  // Wochentag-Heatmap: Kachelkopf und Stand beschreiben das Tagesfenster der Heatmap.
  const timeSeries = heatmap?.daily ?? { ...input.series, points };
  return { ...data, timeSeries, timeSeriesExtras: extras };
}
