// Auftrag 170 (P14b): Erfundene Zusatzreihen für die Editor-Vorschau (Vergleich, zweite Reihe,
// Erwartungsband, Heatmap). Läuft durch denselben Rechenweg wie echte Kacheln
// (buildTimeSeriesExtras); die Werte stammen aus keiner Datenquelle.
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type {
  ResolvedTileData,
  TileTimeSeriesData,
  TimeSeriesPoint,
  TimeSeriesResolution,
} from '../data/dashboardData';
import { formatBerlinIso, subtractBerlin } from '../data/resolveTimeSeries';
import { buildTimeSeriesExtras, BAND_PERIODS } from '../model/timeseries/buildTimeSeriesExtras';
import { joinCandidates, normalizeTimeSeriesQueryParts } from '../model/timeseries/timeSeriesQuery';
import { partialCompareNotice } from '../model/timeseries/computeComparison';

const PHASES = [
  'Lead eingegangen',
  'Erstgespräch geführt',
  'Bedarfsanalyse',
  'Angebot erstellt',
  'Verhandlung',
  'Deal gewonnen',
  'Deal verloren',
];

/** Deterministische Testwerte je Zeitpunkt und Kennzahl (kein Zufall, keine echte Quelle). */
function sampleValue(seed: number, i: number, base: number): number {
  return Math.max(
    0,
    Math.round(base + Math.sin((i + seed) / 3) * base * 0.25 + ((i * 7 + seed) % 5)),
  );
}

function synthesize(
  end: string,
  count: number,
  resolution: TimeSeriesResolution,
  options: { seed: number; base: number; historyStartAt: string | null; gapEvery?: number },
): TileTimeSeriesData {
  const endDate = new Date(end);
  const points: TimeSeriesPoint[] = [];
  for (let n = count; n >= 1; n--) {
    const at = formatBerlinIso(subtractBerlin(endDate, n, resolution));
    const i = count - n;
    const beforeHistory =
      options.historyStartAt !== null && Date.parse(at) < Date.parse(options.historyStartAt);
    const gap = options.gapEvery !== undefined && i % options.gapEvery === options.gapEvery - 1;
    points.push(
      beforeHistory
        ? { at, value: null, status: 'vor_historienbeginn', measuredAt: null }
        : gap
          ? { at, value: null, status: 'luecke', measuredAt: null }
          : {
              at,
              value: sampleValue(options.seed, i, options.base),
              status: 'belegt',
              measuredAt: null,
            },
    );
  }
  const from = formatBerlinIso(subtractBerlin(endDate, count, resolution));
  return {
    source: 'live_kpi_events',
    resolution,
    from,
    to: end,
    historyStartAt: options.historyStartAt,
    points,
  };
}

function seedOf(id: string): number {
  return [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 17;
}

export function withPreviewTimeSeriesExtras(
  tile: DashboardTileConfig,
  entry: ActiveCatalogEntry,
  data: ResolvedTileData,
): ResolvedTileData {
  const series = data.timeSeries;
  if (data.state !== 'bereit' || !series) return data;
  const parts = normalizeTimeSeriesQueryParts(tile.query);
  const isHeatmap = tile.view === 'heatmap';
  if (!parts.compare && !parts.join && !parts.bands && !isHeatmap) return data;

  const history = series.historyStartAt;
  const base = series.resolution === 'woche' ? 14 : 45;
  const seed = seedOf(entry.id);
  const count = series.points.length;

  const compare =
    parts.compare && !isHeatmap
      ? (() => {
          const end =
            parts.compare === 'vorjahr'
              ? formatBerlinIso(subtractBerlin(new Date(series.to), 12, 'monat'))
              : series.from;
          const other = synthesize(end, count, series.resolution, {
            seed: seed + 3,
            base,
            historyStartAt: history,
          });
          const isPartial = other.points.some((p) => p.status === 'vor_historienbeginn');
          return {
            compare: parts.compare,
            resolution: series.resolution,
            compareFrom: other.from,
            compareTo: other.to,
            datenstandAb: history,
            isPartial,
            partialNotice: isPartial ? partialCompareNotice(history) : null,
            basePoints: series.points,
            comparePoints: other.points,
          };
        })()
      : undefined;

  const joinEntry = parts.join
    ? joinCandidates(entry, tile.query?.window).find((c) => c.id === parts.join!.metricId)
    : undefined;
  const joinSeries = joinEntry
    ? {
        ...series,
        points: series.points.map((p, i) => ({
          ...p,
          value:
            p.value === null
              ? null
              : sampleValue(seedOf(joinEntry.id), i, joinEntry.unit === 'x' ? 3 : base / 2),
        })),
      }
    : undefined;

  const period = BAND_PERIODS[series.resolution];
  const bandPrior =
    parts.bands && !isHeatmap
      ? synthesize(series.from, period.length * 12, series.resolution, {
          seed,
          base,
          historyStartAt: history,
        })
      : undefined;

  const heatmap = !isHeatmap
    ? undefined
    : entry.id === 'crm.phaseneintritte_verlauf'
      ? {
          phases: {
            resolution: 'woche' as const,
            from: series.from,
            to: series.to,
            phases: PHASES.map((phase, p) => ({
              phase,
              points: synthesize(series.to, 12, 'woche', {
                seed: seed + p,
                base: 6 - p * 0.6,
                historyStartAt: history,
              }).points,
            })),
          },
        }
      : {
          daily: synthesize(series.to, 84, 'tag', {
            seed,
            base,
            historyStartAt: null,
            gapEvery: 11,
          }),
        };

  return buildTimeSeriesExtras({
    data,
    entry,
    series,
    compare,
    join:
      joinEntry && joinSeries && parts.join
        ? { entry: joinEntry, typ: parts.join.typ, series: joinSeries }
        : undefined,
    bandPrior,
    heatmap,
    notices:
      parts.join && !joinEntry
        ? ['Zweite Reihe nicht verknüpfbar: Auflösung wird nicht unterstützt.']
        : [],
  });
}
