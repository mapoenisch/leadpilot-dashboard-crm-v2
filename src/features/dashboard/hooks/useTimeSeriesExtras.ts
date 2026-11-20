// Auftrag 170 (P14b): Lädt zu einer Zeitreihen-Kachel Vergleich, zweite Reihe (Join),
// Erwartungsband und Heatmap-Daten nach und hängt sie an die aufgelösten Kacheldaten.
// Nur belegte Historie vom Server; nichts wird aus heutigen CRM-Daten zurückgerechnet.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useOrganization } from '@/auth/organizationContext';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { TileData, TileTimeSeriesData, TimeSeriesResolution } from '../data/dashboardData';
import { dashboardQueryKeys } from '../data/dashboardQueryKeys';
import {
  fetchTimeSeries,
  subtractBerlin,
  formatBerlinIso,
  timeSeriesWindow,
} from '../data/resolveTimeSeries';
import { fetchTimeSeriesCompare, fetchTimeSeriesPhases } from '../data/resolveTimeSeriesCompare';
import { timeSeriesMetricOf, timeSeriesSourceOf } from '../data/timeSeriesSource';
import { joinCandidates, normalizeTimeSeriesQueryParts } from '../model/timeseries/timeSeriesQuery';
import { buildTimeSeriesExtras, BAND_PERIODS } from '../model/timeseries/buildTimeSeriesExtras';
import {
  attachCrmQueryMeta,
  attachTileStand,
  readCrmQueryMeta,
  readTileStand,
} from '../time/useTimeControlledData';

export const PHASE_HEATMAP_METRIC = 'crm.phaseneintritte_verlauf';
/** Heatmap „Woche × Wochentag“: zwölf abgeschlossene Wochen in Tagesauflösung. */
const HEATMAP_DAYS = 84;
/** Für das Band werden zwölf Vorperioden geladen, die letzten acht vollständigen zählen. */
const BAND_FETCH_PERIODS = 12;

/** Abrufzeit und Stand hängen am Objekt (WeakMap) und müssen das neue Objekt begleiten. */
function keepMeta(source: TileData, result: TileData, fetching = false): TileData {
  const meta = readCrmQueryMeta(source);
  if (meta) {
    attachCrmQueryMeta(result, { ...meta, isFetching: meta.isFetching || fetching });
  }
  const stand = readTileStand(source);
  if (stand) attachTileStand(result, stand);
  return result;
}

function errorMessage(error: unknown, fallback: string): string {
  return (error as { message?: string } | null)?.message || fallback;
}

export function useTimeSeriesExtras(
  tile: DashboardTileConfig,
  data: TileData,
  options: { enabled?: boolean; frozen?: boolean } = {},
): TileData {
  const { session } = useOrganization();
  const organizationId = session?.organizationId;
  const userId = session?.userId ?? (organizationId ? 'anonymous' : undefined);

  const catalogEntry = getCatalogEntry(tile.catalogId);
  const entry: ActiveCatalogEntry | null =
    catalogEntry && isActiveEntry(catalogEntry) ? catalogEntry : null;
  const series: TileTimeSeriesData | undefined =
    data.state === 'bereit' && 'timeSeries' in data ? data.timeSeries : undefined;
  const parts = normalizeTimeSeriesQueryParts(tile.query);
  const isHeatmap = tile.view === 'heatmap';
  const ready = Boolean(options.enabled !== false && entry && series && organizationId && userId);
  const source = entry ? timeSeriesSourceOf(entry) : 'deal_stage_events';
  const metric = entry ? timeSeriesMetricOf(entry) : '';
  const pipeline =
    entry?.source.layer === 'crm' && 'effectiveFilter' in data
      ? (data.effectiveFilter?.pipeline ?? null)
      : null;
  const keyBase = (kind: string, ...rest: (string | null)[]) =>
    [
      ...dashboardQueryKeys.crm(organizationId ?? ''),
      'timeSeries',
      userId ?? '',
      kind,
      source,
      metric,
      series?.resolution ?? '',
      series?.from ?? '',
      series?.to ?? '',
      pipeline,
      ...rest,
    ] as const;
  const staleTime = series?.resolution === 'stunde' ? 3_600_000 : 7 * 86_400_000;
  const frozenOptions = options.frozen
    ? { refetchOnWindowFocus: false as const, refetchOnReconnect: false as const }
    : {};

  const compareQuery = useQuery({
    queryKey: keyBase('compare', parts.compare ?? null),
    queryFn: () =>
      fetchTimeSeriesCompare({
        source,
        metric,
        resolution: series!.resolution,
        from: series!.from,
        to: series!.to,
        compare: parts.compare!,
        pipeline,
      }),
    enabled: ready && Boolean(parts.compare) && !isHeatmap,
    staleTime,
    ...frozenOptions,
  });

  const joinEntry =
    entry && parts.join
      ? (joinCandidates(entry, tile.query?.window).find((c) => c.id === parts.join!.metricId) ??
        null)
      : null;
  const joinQuery = useQuery({
    queryKey: keyBase('join', joinEntry?.id ?? null),
    queryFn: () =>
      fetchTimeSeries({
        source: timeSeriesSourceOf(joinEntry!),
        metric: timeSeriesMetricOf(joinEntry!),
        resolution: series!.resolution,
        from: series!.from,
        to: series!.to,
        pipeline: joinEntry!.source.layer === 'crm' ? pipeline : undefined,
      }),
    enabled: ready && Boolean(joinEntry) && !isHeatmap,
    staleTime,
    ...frozenOptions,
  });

  const bandPeriod = series ? BAND_PERIODS[series.resolution] : BAND_PERIODS.woche;
  const bandsQuery = useQuery({
    queryKey: keyBase('bands'),
    queryFn: () =>
      fetchTimeSeries({
        source,
        metric,
        resolution: series!.resolution,
        from: formatBerlinIso(
          subtractBerlin(
            new Date(series!.from),
            bandPeriod.length * BAND_FETCH_PERIODS,
            series!.resolution,
          ),
        ),
        to: series!.from,
        pipeline,
      }),
    enabled: ready && Boolean(parts.bands) && !isHeatmap,
    staleTime,
    ...frozenOptions,
  });

  const phaseMode = entry?.id === PHASE_HEATMAP_METRIC;
  const heatmapResolution: TimeSeriesResolution = phaseMode ? 'woche' : 'tag';
  const heatmapWindow = useMemo(() => {
    if (!entry || !series) return null;
    try {
      return timeSeriesWindow(
        entry,
        series.to,
        phaseMode ? { resolution: 'woche', count: 12 } : { resolution: 'tag', count: HEATMAP_DAYS },
      );
    } catch {
      return null;
    }
  }, [entry, series, phaseMode]);
  const heatmapQuery = useQuery({
    queryKey: keyBase('heatmap', heatmapResolution, heatmapWindow?.from ?? null),
    queryFn: async () => {
      const base = {
        resolution: heatmapResolution,
        from: heatmapWindow!.from,
        to: heatmapWindow!.to,
      };
      if (phaseMode) return { phases: await fetchTimeSeriesPhases({ ...base, pipeline }) };
      return { daily: await fetchTimeSeries({ ...base, source, metric, pipeline }) };
    },
    enabled: ready && isHeatmap && Boolean(heatmapWindow),
    staleTime,
    ...frozenOptions,
  });

  return useMemo(() => {
    if (!entry || !series || data.state !== 'bereit') return data;
    const wanted = Boolean(parts.compare || parts.join || parts.bands || isHeatmap);
    if (!wanted) return data;

    // Laufende Zusatzabfragen gehören zum Ladezustand: sonst friert eine Pause die Kachel
    // bereits nach dem Basisabruf ein und die später eintreffenden Reihen blieben unsichtbar.
    const extrasFetching =
      (Boolean(parts.compare) && compareQuery.isFetching) ||
      (Boolean(joinEntry) && joinQuery.isFetching) ||
      (Boolean(parts.bands) && bandsQuery.isFetching);

    if (isHeatmap && !heatmapQuery.data) {
      if (heatmapQuery.isError) {
        return keepMeta(data, {
          ...data,
          state: 'fehler',
          message: errorMessage(heatmapQuery.error, 'Heatmap-Daten konnten nicht geladen werden'),
        });
      }
      return keepMeta(data, { ...data, state: 'laden' });
    }

    const notices: string[] = [];
    if (compareQuery.isError)
      notices.push(`Vergleich: ${errorMessage(compareQuery.error, 'nicht geladen')}`);
    if (joinQuery.isError)
      notices.push(`Zweite Reihe: ${errorMessage(joinQuery.error, 'nicht geladen')}`);
    if (bandsQuery.isError)
      notices.push(`Erwartungsband: ${errorMessage(bandsQuery.error, 'nicht geladen')}`);
    if (parts.join && !joinEntry) {
      notices.push('Zweite Reihe nicht verknüpfbar: nur Zeitreihen gleicher Auflösung.');
    }

    const result = buildTimeSeriesExtras({
      data,
      entry,
      series,
      compare: compareQuery.data,
      join:
        joinEntry && joinQuery.data
          ? { entry: joinEntry, typ: parts.join!.typ, series: joinQuery.data }
          : undefined,
      bandPrior: bandsQuery.data,
      heatmap: isHeatmap ? heatmapQuery.data : undefined,
      notices,
    });
    return keepMeta(data, result, extrasFetching);
  }, [
    data,
    entry,
    series,
    parts.compare,
    parts.join,
    parts.bands,
    isHeatmap,
    joinEntry,
    compareQuery.data,
    compareQuery.isError,
    compareQuery.error,
    compareQuery.isFetching,
    joinQuery.data,
    joinQuery.isError,
    joinQuery.error,
    joinQuery.isFetching,
    bandsQuery.data,
    bandsQuery.isError,
    bandsQuery.error,
    bandsQuery.isFetching,
    heatmapQuery.data,
    heatmapQuery.isError,
    heatmapQuery.error,
  ]);
}
