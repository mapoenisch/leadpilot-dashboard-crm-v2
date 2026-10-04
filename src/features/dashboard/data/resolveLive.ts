// Executive Dashboard, Teilauftrag 2 (Auftrag 071): Live-Auflösung über den bestehenden Store.
// Liest Live-Werte und aggregiert Live-Aktivität aus dem übergebenen LiveKpiStreamStore.
import type { LiveKpiActivityItem } from '@/hooks/useLiveKpiActivity';
import type { LiveKpiReadStatus, LiveKpiSnapshot } from '@/services/liveKpi/liveKpiReadAdapter';
import { isSupportedLiveKpiId, LIVE_KPI_DEFINITIONS } from '@/services/liveKpi/liveKpiDefinitions';
import type { LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { EffectiveTileFilter } from '../model/dashboardFilters';
import type { ResolvedTileData } from './dashboardData';

const LIVE_IDS = LIVE_KPI_DEFINITIONS.map((def) => def.id);

/**
 * Filtert nach unterstützten IDs und dedupliziert in Eingabereihenfolge.
 */
function filterValidIds(kpiIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of kpiIds) {
    if (isSupportedLiveKpiId(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

/**
 * Aggregiert Live-Aktivitäten als reine Funktion über den übergebenen Store.
 * Identische Logik wie useLiveKpiActivity (Paritätsgarantie).
 */
export function aggregateLiveActivity(
  store: LiveKpiStreamStore,
  ids: readonly string[],
  limit = 10,
): { items: readonly LiveKpiActivityItem[]; status: LiveKpiReadStatus } {
  const validKpiIds = filterValidIds(ids);
  const states = validKpiIds.map((id) => store.getState(id));

  let aggregatedStatus: LiveKpiReadStatus = 'unconfigured';
  if (states.some((s) => s.status === 'live')) {
    aggregatedStatus = 'live';
  } else if (states.some((s) => s.status === 'loading')) {
    aggregatedStatus = 'loading';
  } else if (states.some((s) => s.status === 'error')) {
    aggregatedStatus = 'error';
  } else if (states.some((s) => s.status === 'offline')) {
    aggregatedStatus = 'offline';
  }

  const activeSnapshots: LiveKpiSnapshot[] = [];
  for (const s of states) {
    if (s.snapshot) {
      activeSnapshots.push(s.snapshot);
    }
  }

  activeSnapshots.sort((a, b) => {
    if (a.occurredAt < b.occurredAt) return 1;
    if (a.occurredAt > b.occurredAt) return -1;
    if (a.ingestedAt < b.ingestedAt) return 1;
    if (a.ingestedAt > b.ingestedAt) return -1;
    return 0;
  });

  const effectiveLimit = Math.min(10, Math.max(1, Math.floor(limit)));
  const limitedSnapshots = activeSnapshots.slice(0, effectiveLimit);

  const items: readonly LiveKpiActivityItem[] = Object.freeze(
    limitedSnapshots.map((snap) => ({
      kpiId: snap.kpiId,
      value: snap.value,
      unit: snap.unit,
      occurredAt: snap.occurredAt,
      qualityStatus: snap.qualityStatus,
    })),
  );

  return {
    items,
    status: aggregatedStatus,
  };
}

/**
 * Löst eine Live-Kachel synchron aus dem aktuellen Snapshot des Stores auf.
 */
export function resolveLive(
  store: LiveKpiStreamStore,
  entry: ActiveCatalogEntry,
  effectiveFilter: EffectiveTileFilter,
): ResolvedTileData {
  const baseResult: Omit<ResolvedTileData, 'state' | 'value' | 'series' | 'overview'> = {
    catalogId: entry.id,
    unit: entry.unit,
    timeBasis: entry.timeBasis,
    asOf: null,
    origin: {
      layer: 'live',
      module: entry.source.module,
      exportName: entry.source.exportName,
      liveKpiId: entry.source.liveKpiId,
    },
    scope: 'organisationsuebergreifend',
    effectiveFilter,
  };

  // 1. Übersicht Live-Aktivität
  if (entry.id === 'uebersicht.live_aktivitaet') {
    const { items, status } = aggregateLiveActivity(store, LIVE_IDS, 10);
    const newestAsOf = items.length > 0 ? (items[0]?.occurredAt ?? null) : null;

    if (!items.every((item) => Number.isFinite(item.value))) {
      return {
        ...baseResult,
        state: 'fehler',
        value: null,
        series: null,
        overview: null,
        asOf: newestAsOf,
        message: 'Aktivitätswerte enthalten keine gültige endliche Zahl',
      };
    }

    if (status === 'live') {
      if (items.length > 0) {
        return {
          ...baseResult,
          state: 'bereit',
          value: null,
          series: null,
          overview: { kind: 'live_aktivitaet', data: items },
          asOf: newestAsOf,
        };
      }
      return {
        ...baseResult,
        state: 'keine_daten',
        value: null,
        series: null,
        overview: null,
        asOf: null,
      };
    }

    if (status === 'loading') {
      if (items.length > 0) {
        return {
          ...baseResult,
          state: 'bereit',
          value: null,
          series: null,
          overview: { kind: 'live_aktivitaet', data: items },
          asOf: newestAsOf,
        };
      }
      return {
        ...baseResult,
        state: 'laden',
        value: null,
        series: null,
        overview: null,
        asOf: null,
      };
    }

    if (status === 'offline') {
      if (items.length > 0) {
        return {
          ...baseResult,
          state: 'veraltet',
          value: null,
          series: null,
          overview: { kind: 'live_aktivitaet', data: items },
          asOf: newestAsOf,
        };
      }
      return {
        ...baseResult,
        state: 'offline',
        value: null,
        series: null,
        overview: null,
        asOf: null,
      };
    }

    if (status === 'error') {
      if (items.length > 0) {
        return {
          ...baseResult,
          state: 'veraltet',
          value: null,
          series: null,
          overview: { kind: 'live_aktivitaet', data: items },
          asOf: newestAsOf,
        };
      }
      return {
        ...baseResult,
        state: 'fehler',
        value: null,
        series: null,
        overview: null,
        asOf: null,
      };
    }

    return {
      ...baseResult,
      state: 'nicht_konfiguriert',
      value: null,
      series: null,
      overview: null,
      asOf: null,
    };
  }

  // 2. Einzelwert-Live-KPI
  const kpiId = entry.source.liveKpiId;
  if (!kpiId) {
    return {
      ...baseResult,
      state: 'fehler',
      value: null,
      series: null,
      overview: null,
      message: 'Fehlende liveKpiId im Katalogeintrag',
    };
  }

  const streamState = store.getState(kpiId);
  const snap = streamState.snapshot;
  if (snap && !Number.isFinite(snap.value)) {
    return {
      ...baseResult,
      state: 'fehler',
      value: null,
      series: null,
      overview: null,
      asOf: snap.occurredAt,
      message: 'Wert ist keine endliche Zahl',
    };
  }
  const quality = snap?.qualityStatus === 'degraded' ? ('degradiert' as const) : undefined;

  if (streamState.status === 'live') {
    if (snap) {
      return {
        ...baseResult,
        state: 'bereit',
        value: snap.value,
        series: null,
        overview: null,
        asOf: snap.occurredAt,
        quality,
      };
    }
    return {
      ...baseResult,
      state: 'keine_daten',
      value: null,
      series: null,
      overview: null,
      asOf: null,
    };
  }

  if (streamState.status === 'loading') {
    if (snap) {
      return {
        ...baseResult,
        state: 'bereit',
        value: snap.value,
        series: null,
        overview: null,
        asOf: snap.occurredAt,
        quality,
      };
    }
    return {
      ...baseResult,
      state: 'laden',
      value: null,
      series: null,
      overview: null,
      asOf: null,
    };
  }

  if (streamState.status === 'offline') {
    if (snap) {
      return {
        ...baseResult,
        state: 'veraltet',
        value: snap.value,
        series: null,
        overview: null,
        asOf: snap.occurredAt,
        quality,
      };
    }
    return {
      ...baseResult,
      state: 'offline',
      value: null,
      series: null,
      overview: null,
      asOf: null,
    };
  }

  if (streamState.status === 'error') {
    if (snap) {
      return {
        ...baseResult,
        state: 'veraltet',
        value: snap.value,
        series: null,
        overview: null,
        asOf: snap.occurredAt,
        quality,
      };
    }
    return {
      ...baseResult,
      state: 'fehler',
      value: null,
      series: null,
      overview: null,
      asOf: null,
      message: 'Live-KPI-Stream ist fehlgeschlagen',
    };
  }

  return {
    ...baseResult,
    state: 'nicht_konfiguriert',
    value: null,
    series: null,
    overview: null,
    asOf: null,
  };
}
