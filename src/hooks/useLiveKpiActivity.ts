/**
 * Hook: useLiveKpiActivity (Gate G25 / Auftrag 041, G33 useSyncExternalStore)
 *
 * Selektiert und aggregiert aktuelle Live-Aktivitäten über mehrere KPI-IDs.
 * Begrenzt strikt auf höchstens 10 Items und exportiert ausschließlich die 5 sicheren Felder:
 * kpiId, value, unit, occurredAt, qualityStatus.
 *
 * Niemals enthalten: id, sourceSystem, ingestedAt, context, eventId, correlationId oder Fehlertexte.
 *
 * G33: Tearing-sicher via useSyncExternalStore. Aggregations-Mechanismus (Auftrag 048,
 * Muster 1, store-seitig): getSnapshot liefert die Summe der store-seitigen
 * Entry-Versionen (billig, stabil, nur eigene IDs — kein Fremd-Rauschen);
 * items/status werden per useMemo daraus berechnet. Die IDs werden aus dem
 * dependencyKey rekonstruiert (statt validKpiIds-Closure), damit die
 * subscribe-Identität stabil bleibt und exhaustive-deps erfüllt ist.
 * Rückgabe bytegleich zu vorher: { items, status }.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { isSupportedLiveKpiId } from '@/services/liveKpi/liveKpiDefinitions';
import { liveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import type { LiveKpiReadStatus, LiveKpiSnapshot } from '@/services/liveKpi/liveKpiReadAdapter';

export interface LiveKpiActivityItem {
  kpiId: string;
  value: number;
  unit: string;
  occurredAt: string;
  qualityStatus: 'valid' | 'degraded';
}

export interface UseLiveKpiActivityResult {
  items: readonly LiveKpiActivityItem[];
  status: LiveKpiReadStatus;
}

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

function computeResult(validKpiIds: string[], limit: number): UseLiveKpiActivityResult {
  // Snapshots & Status aller gültigen KPI-Streams einsammeln
  const states = validKpiIds.map((id) => liveKpiStreamStore.getState(id));

  // Gesamtstatus ermitteln:
  // live wenn mind. ein Stream live ist;
  // sonst loading, error, offline oder unconfigured
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

  // Aktive Snapshots sammeln
  const activeSnapshots: LiveKpiSnapshot[] = [];
  for (const s of states) {
    if (s.snapshot) {
      activeSnapshots.push(s.snapshot);
    }
  }

  // Absteigend sortieren nach (occurredAt, ingestedAt)
  activeSnapshots.sort((a, b) => {
    if (a.occurredAt < b.occurredAt) return 1;
    if (a.occurredAt > b.occurredAt) return -1;
    if (a.ingestedAt < b.ingestedAt) return 1;
    if (a.ingestedAt > b.ingestedAt) return -1;
    return 0;
  });

  const effectiveLimit = Math.min(10, Math.max(1, Math.floor(limit)));
  const limitedSnapshots = activeSnapshots.slice(0, effectiveLimit);

  // Mappen in exakt die 5 sicheren Felder von LiveKpiActivityItem
  const items: readonly LiveKpiActivityItem[] = Object.freeze(
    limitedSnapshots.map((snap) => ({
      kpiId: snap.kpiId,
      value: snap.value,
      unit: snap.unit,
      occurredAt: snap.occurredAt,
      qualityStatus: snap.qualityStatus,
    }))
  );

  return {
    items,
    status: aggregatedStatus,
  };
}

export function useLiveKpiActivity(
  kpiIds: readonly string[],
  limit = 10
): UseLiveKpiActivityResult {
  // Filtern nach unterstützten IDs und Deduplizieren in Eingabereihenfolge
  const validKpiIds = useMemo(() => filterValidIds(kpiIds), [kpiIds]);

  const dependencyKey = validKpiIds.join(',');

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const ids = dependencyKey === '' ? [] : dependencyKey.split(',');
      const cleanups: (() => void)[] = [];
      for (const id of ids) {
        const release = liveKpiStreamStore.acquire(id);
        const unsubscribe = liveKpiStreamStore.subscribe(id, onStoreChange);
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
    [dependencyKey]
  );

  const getSnapshot = useCallback(() => {
    if (dependencyKey === '') return -1;
    // Summe (nicht Max): steigt bei JEDEM Commit einer eigenen ID strikt —
    // Max bliebe bei Änderungen verschiedener IDs stehen (kein Re-Render).
    let version = 0;
    for (const id of dependencyKey.split(',')) {
      version += liveKpiStreamStore.getEntryVersion(id);
    }
    return version;
  }, [dependencyKey]);

  const getServerSnapshot = useCallback(() => -1, []);

  const version = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(
    () => computeResult(dependencyKey === '' ? [] : dependencyKey.split(','), limit),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version ist der Re-Render-Trigger aus useSyncExternalStore (ohne ihn blieben items stale); das Pattern erkennt die Regel nicht
    [version, dependencyKey, limit]
  );
}
