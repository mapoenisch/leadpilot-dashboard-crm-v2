// Executive Dashboard, Teilauftrag 2 (Auftrag 071): Hook je Kachel, gesteuert über enabled.
// Teilt CRM-Abfragen je Organisation und Pipeline; verwaltet Live-Abos mit Referenzzählung.
import { useCallback, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import { CRMRepository } from '@/services/db/crmRepository';
import { getPipelineOverview, type FunnelDealSource } from '@/domain/executiveCockpitData';
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
import { FilteredFunnelDealSource, resolveCrmFromOverview } from '../data/resolveCrm';
import { resolveLive } from '../data/resolveLive';

const LIVE_IDS = LIVE_KPI_DEFINITIONS.map((def) => def.id);

export interface UseDashboardDataOptions {
  enabled?: boolean;
  store?: LiveKpiStreamStore;
  dealSource?: FunnelDealSource;
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

  // CRM-Bedingungen
  const isCrm = Boolean(
    catalogEntry && isActiveEntry(catalogEntry) && catalogEntry.source.layer === 'crm',
  );
  const crmEnabled = isEnabled && isCrm && Boolean(organizationId);

  const crmQuery = useQuery({
    queryKey: organizationId
      ? dashboardQueryKeys.pipelineOverview(organizationId, effectiveFilter.pipeline)
      : (['dashboard', 'crm', 'disabled'] as const),
    queryFn: () =>
      getPipelineOverview(new FilteredFunnelDealSource(dealSource, effectiveFilter.pipeline)),
    enabled: crmEnabled,
    refetchOnWindowFocus: false,
  });

  // Einzelne Live-KPI
  const isSingleLive = Boolean(
    catalogEntry &&
    isActiveEntry(catalogEntry) &&
    catalogEntry.source.layer === 'live' &&
    catalogEntry.source.liveKpiId,
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

  // 4. CRM
  if (catalogEntry.source.layer === 'crm') {
    if (!organizationId) {
      return loadingTileData(catalogEntry, effectiveFilter);
    }
    if (crmQuery.isError) {
      return {
        ...loadingTileData(catalogEntry, effectiveFilter),
        state: 'fehler',
        message: crmQuery.error instanceof Error ? crmQuery.error.message : String(crmQuery.error),
      };
    }
    if (crmQuery.isLoading || crmQuery.isFetching || !crmQuery.data) {
      return loadingTileData(catalogEntry, effectiveFilter);
    }
    return resolveCrmFromOverview(catalogEntry, crmQuery.data, effectiveFilter);
  }

  // 5. Live (Einzelwert oder Live-Aktivität)
  return resolveLive(store, catalogEntry, effectiveFilter);
}
