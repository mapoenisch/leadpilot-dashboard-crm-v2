import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useOrganization } from '@/auth/organizationContext';
import { CRMRepository } from '@/services/db/crmRepository';
import { type FunnelDealSource } from '@/domain/executiveCockpitData';
import { fetchCrmPipelineOverview } from '../data/crmAggregateSource';
import { LIVE_KPI_DEFINITIONS } from '@/services/liveKpi/liveKpiDefinitions';
import { liveKpiStreamStore, type LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import { resolveEffectiveFilter, type EffectiveTileFilter } from '../model/dashboardFilters';
import {
  getScopeForLayer,
  resolveUnavailableTile,
  type ResolvedTileData,
  type TileData,
} from '../data/dashboardData';
import { dashboardQueryKeys } from '../data/dashboardQueryKeys';
import { resolveBaseline } from '../data/resolveBaseline';
import { resolveCombination } from '../data/resolveCombination';
import { resolveCrmFromOverview } from '../data/resolveCrm';
import { resolveLive } from '../data/resolveLive';
import {
  fetchTimeSeries,
  resolveTimeSeriesTile,
  subtractBerlin,
  timeSeriesWindow,
  truncateBerlin,
} from '../data/resolveTimeSeries';
import { attachCrmQueryMeta } from '../time/useTimeControlledData';

const LIVE_IDS = LIVE_KPI_DEFINITIONS.map((def) => def.id);

export interface UseDashboardDataOptions {
  enabled?: boolean;
  store?: LiveKpiStreamStore;
  dealSource?: FunnelDealSource;
  /**
   * Auftrag 159: Anzeige eingefroren (gemeinsame Pause). Unterdrückt automatische CRM-Neuladungen
   * bei Fensterfokus und Reconnect; der Erstaufruf und Filterwechsel laden weiterhin einmal.
   * Fehlt die Option, ist das Verhalten unverändert.
   */
  frozen?: boolean;
}

function loadingTileData(
  entry: ActiveCatalogEntry,
  effectiveFilter: EffectiveTileFilter,
): ResolvedTileData {
  return {
    catalogId: entry.id,
    state: 'laden',
    value: null,
    series: null,
    overview: null,
    unit: entry.unit,
    timeBasis: entry.timeBasis,
    asOf: null,
    origin: {
      layer: entry.source.layer,
      module: entry.source.module,
      exportName: entry.source.exportName,
      liveKpiId: entry.source.liveKpiId,
    },
    scope: getScopeForLayer(entry.source.layer),
    effectiveFilter,
  };
}

/**
 * Zentraler Hook zur Datenauflösung einer Dashboard-Kachel.
 */
export function useDashboardData(
  tile: DashboardTileConfig,
  filters?: DashboardFilters,
  options: UseDashboardDataOptions = { enabled: true },
): TileData {
  const isEnabled = options.enabled !== false;
  const store = options.store ?? liveKpiStreamStore;
  const dealSource = options.dealSource ?? CRMRepository;

  const catalogEntry = getCatalogEntry(tile.catalogId);
  const effectiveFilter = resolveEffectiveFilter(tile, catalogEntry, filters);

  const { session } = useOrganization();
  const organizationId = session?.organizationId;
  const userId = session?.userId ?? (organizationId ? 'anonymous' : undefined);

  const queryClient = useQueryClient();
  const identity = organizationId && userId ? `${organizationId}|${userId}` : null;

  // Cache-Bereinigung bei Abmelden, Nutzerwechsel und Organisationswechsel (Auftrag 154 §2.4 Nr. 16, Auftrag 160)
  useEffect(() => {
    queryClient.removeQueries({
      queryKey: [...dashboardQueryKeys.all],
      predicate: (query) => {
        if (!query.queryKey.includes('crmOverview') && !query.queryKey.includes('timeSeries')) {
          return false;
        }
        return (
          !organizationId ||
          !userId ||
          query.queryKey[1] !== organizationId ||
          query.queryKey[4] !== userId
        );
      },
    });
  }, [queryClient, organizationId, userId, identity]);

  // Zeitreihen (Auftrag 160 P10b-1)
  const activeEntry = catalogEntry && isActiveEntry(catalogEntry) ? catalogEntry : null;
  const isTimeSeries = Boolean(activeEntry && activeEntry.history.kind === 'ereignisse');
  const timeSeriesEnabled = isEnabled && isTimeSeries && Boolean(organizationId && userId);

  // Abschnittswechsel-Timer für Live-Modus und sofortige Neuberechnung beim Fortsetzen (Codex Review)
  const [windowTick, setWindowTick] = useState(0);
  const wasFrozenRef = useRef(options.frozen);

  useEffect(() => {
    if (wasFrozenRef.current && !options.frozen) {
      setWindowTick((t) => t + 1);
    }
    wasFrozenRef.current = options.frozen;
  }, [options.frozen]);

  useEffect(() => {
    if (!isTimeSeries || !activeEntry || options.frozen) return;
    const now = new Date();
    const resolution =
      activeEntry.history.defaultWindow?.resolution ??
      (activeEntry.source.layer === 'crm' ? 'woche' : 'stunde');

    let msUntilNext = 60_000;
    if (resolution === 'stunde') {
      const msIntoCurrentHour =
        (now.getUTCMinutes() * 60 + now.getUTCSeconds()) * 1000 + now.getUTCMilliseconds();
      msUntilNext = Math.max(1000, 3600_000 - msIntoCurrentHour + 500);
    } else {
      const currentStart = truncateBerlin(now, resolution);
      const nextStart = subtractBerlin(currentStart, -1, resolution);
      msUntilNext = Math.max(1000, nextStart.getTime() - now.getTime() + 500);
    }

    const timer = setTimeout(() => {
      setWindowTick((t) => t + 1);
    }, msUntilNext);

    return () => clearTimeout(timer);
  }, [isTimeSeries, activeEntry, options.frozen, windowTick]);

  const tsWindow = useMemo(() => {
    // windowTick sorgt für Neuberechnung beim nächsten Abschnittswechsel
    void windowTick;
    if (!isTimeSeries || !activeEntry) {
      return { from: '', to: '', resolution: 'stunde' as const, count: 24 };
    }
    return timeSeriesWindow(activeEntry);
  }, [isTimeSeries, activeEntry, windowTick]);

  const timeSeriesMetric =
    isTimeSeries && activeEntry
      ? activeEntry.source.layer === 'crm'
        ? activeEntry.id === 'crm.gewonnen_verlauf'
          ? 'Deal gewonnen'
          : '*'
        : (activeEntry.source.liveKpiId ?? '')
      : '';

  const timeSeriesSource =
    activeEntry?.history.source === 'live_kpi_events' ? 'live_kpi' : 'deal_stage_events';

  const timeSeriesQuery = useQuery({
    queryKey:
      organizationId && userId && isTimeSeries
        ? dashboardQueryKeys.timeSeries(
            organizationId,
            userId,
            timeSeriesSource,
            timeSeriesMetric,
            tsWindow.resolution,
            tsWindow.from,
            tsWindow.to,
            effectiveFilter.pipeline,
          )
        : (['dashboard', 'timeSeries', 'disabled'] as const),
    queryFn: () =>
      fetchTimeSeries({
        source: timeSeriesSource,
        metric: timeSeriesMetric,
        resolution: tsWindow.resolution,
        from: tsWindow.from,
        to: tsWindow.to,
        pipeline: catalogEntry?.source.layer === 'crm' ? effectiveFilter.pipeline : undefined,
      }),
    enabled: timeSeriesEnabled,
    staleTime: tsWindow.resolution === 'stunde' ? 60_000 : 300_000,
    ...(options.frozen
      ? { refetchOnWindowFocus: false as const, refetchOnReconnect: false as const }
      : {}),
  });

  // CRM-Bedingungen (nur Nicht-Verlauf)
  const isCrm = Boolean(
    catalogEntry &&
    isActiveEntry(catalogEntry) &&
    catalogEntry.source.layer === 'crm' &&
    catalogEntry.history.kind !== 'ereignisse',
  );
  const crmEnabled = isEnabled && isCrm && Boolean(organizationId && userId);

  const crmQuery = useQuery({
    queryKey:
      organizationId && userId
        ? dashboardQueryKeys.crmOverview(organizationId, userId, effectiveFilter.pipeline)
        : (['dashboard', 'crm', 'disabled'] as const),
    queryFn: () =>
      fetchCrmPipelineOverview({
        pipeline: effectiveFilter.pipeline,
        dealSource,
      }),
    enabled: crmEnabled,
    ...(options.frozen
      ? { refetchOnWindowFocus: false as const, refetchOnReconnect: false as const }
      : {}),
  });

  // Einzelne Live-KPI (nur Nicht-Verlauf)
  const isSingleLive = Boolean(
    catalogEntry &&
    isActiveEntry(catalogEntry) &&
    catalogEntry.source.layer === 'live' &&
    catalogEntry.source.liveKpiId &&
    catalogEntry.history.kind !== 'ereignisse',
  );
  const singleLiveKpiId = isSingleLive && catalogEntry ? catalogEntry.source.liveKpiId : null;
  const singleLiveEnabled = isEnabled && isSingleLive && Boolean(singleLiveKpiId);

  const subscribeSingleLive = useCallback(
    (onStoreChange: () => void) => {
      if (!singleLiveEnabled || !singleLiveKpiId) return () => {};
      const release = store.acquire(singleLiveKpiId);
      const unsubscribe = store.subscribe(singleLiveKpiId, onStoreChange);
      return () => {
        unsubscribe();
        release();
      };
    },
    [singleLiveEnabled, singleLiveKpiId, store],
  );

  const getSnapshotSingleLive = useCallback(() => {
    if (!singleLiveEnabled || !singleLiveKpiId) return null;
    return store.getSnapshot(singleLiveKpiId);
  }, [singleLiveEnabled, singleLiveKpiId, store]);

  // Hook unconditional
  useSyncExternalStore(subscribeSingleLive, getSnapshotSingleLive, () => null);

  // Live-Aktivitäts-Übersicht
  const isLiveActivity = Boolean(
    catalogEntry && isActiveEntry(catalogEntry) && catalogEntry.id === 'uebersicht.live_aktivitaet',
  );
  const liveActivityEnabled = isEnabled && isLiveActivity;

  const subscribeLiveActivity = useCallback(
    (onStoreChange: () => void) => {
      if (!liveActivityEnabled) return () => {};
      const cleanups: (() => void)[] = [];
      for (const id of LIVE_IDS) {
        const release = store.acquire(id);
        const unsubscribe = store.subscribe(id, onStoreChange);
        cleanups.push(() => {
          unsubscribe();
          release();
        });
      }
      return () => {
        for (const cleanup of cleanups) {
          cleanup();
        }
      };
    },
    [liveActivityEnabled, store],
  );

  const getSnapshotLiveActivity = useCallback(() => {
    if (!liveActivityEnabled) return -1;
    let version = 0;
    for (const id of LIVE_IDS) {
      version += store.getEntryVersion(id);
    }
    return version;
  }, [liveActivityEnabled, store]);

  // Hook unconditional
  useSyncExternalStore(subscribeLiveActivity, getSnapshotLiveActivity, () => -1);

  // 1. Nicht verfügbar (unbekannt oder inaktiv)
  if (!catalogEntry || !isActiveEntry(catalogEntry)) {
    return resolveUnavailableTile(tile.catalogId, catalogEntry);
  }

  // 2. Inaktiv (enabled: false)
  if (!isEnabled) {
    return loadingTileData(catalogEntry, effectiveFilter);
  }

  // 3. Stammdaten (synchron)
  if (catalogEntry.source.layer === 'baseline') {
    return resolveBaseline(catalogEntry, effectiveFilter);
  }

  // 3a. Kombinationen aus Stammdaten (synchron, Auftrag 076)
  if (catalogEntry.source.layer === 'kombination') {
    return resolveCombination(catalogEntry, effectiveFilter);
  }

  // 3b. Server-Zeitreihen (Auftrag 160 P10b-1)
  if (isTimeSeries) {
    if (!organizationId) {
      return loadingTileData(catalogEntry, effectiveFilter);
    }
    if (timeSeriesQuery.isError) {
      const err = timeSeriesQuery.error as { message?: string; code?: string } | null;
      const isMissingRpc = err?.message?.includes('does not exist') || err?.code === '42883';
      return {
        ...loadingTileData(catalogEntry, effectiveFilter),
        state: 'fehler',
        message: isMissingRpc
          ? 'Verlauf auf dem Server noch nicht verfügbar'
          : err?.message || 'Zeitreihendaten konnten nicht geladen werden',
      };
    }
    if (timeSeriesQuery.isLoading || !timeSeriesQuery.data) {
      return loadingTileData(catalogEntry, effectiveFilter);
    }
    const resolved = resolveTimeSeriesTile(activeEntry!, timeSeriesQuery.data, effectiveFilter);
    return attachCrmQueryMeta(resolved, {
      fetchedAt: timeSeriesQuery.dataUpdatedAt,
      isFetching: timeSeriesQuery.isFetching,
    });
  }

  // 4. CRM
  if (catalogEntry.source.layer === 'crm') {
    if (!organizationId) {
      return loadingTileData(catalogEntry, effectiveFilter);
    }
    if (crmQuery.isError) {
      return {
        ...loadingTileData(catalogEntry, effectiveFilter),
        state: 'fehler',
        message: 'CRM-Daten konnten nicht geladen werden',
      };
    }
    if (crmQuery.isLoading || !crmQuery.data) {
      return loadingTileData(catalogEntry, effectiveFilter);
    }
    const resolved = resolveCrmFromOverview(catalogEntry, crmQuery.data, effectiveFilter);
    return attachCrmQueryMeta(resolved, {
      fetchedAt: crmQuery.dataUpdatedAt,
      isFetching: crmQuery.isFetching,
    });
  }

  // 5. Live (Einzelwert oder Live-Aktivität)
  return resolveLive(store, catalogEntry, effectiveFilter);
}
