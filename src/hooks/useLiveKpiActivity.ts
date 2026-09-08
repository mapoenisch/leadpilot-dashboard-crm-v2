/**
 * Hook: useLiveKpiActivity (Gate G25 / Auftrag 041)
 *
 * Selektiert und aggregiert aktuelle Live-Aktivitäten über mehrere KPI-IDs.
 * Begrenzt strikt auf höchstens 10 Items und exportiert ausschließlich die 5 sicheren Felder:
 * kpiId, value, unit, occurredAt, qualityStatus.
 *
 * Niemals enthalten: id, sourceSystem, ingestedAt, context, eventId, correlationId oder Fehlertexte.
 */

import { useState, useEffect, useMemo } from 'react';
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

export function useLiveKpiActivity(
  kpiIds: readonly string[],
  limit = 10
): UseLiveKpiActivityResult {
  const [, setTick] = useState(0);

  // Filtern nach unterstützten IDs und Deduplizieren in Eingabereihenfolge
  const validKpiIds = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of kpiIds) {
      if (isSupportedLiveKpiId(id) && !seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
    return result;
  }, [kpiIds]);

  const dependencyKey = validKpiIds.join(',');

  useEffect(() => {
    if (validKpiIds.length === 0) {
      return;
    }

    const releases: (() => void)[] = [];
    const unsubscribes: (() => void)[] = [];

    for (const id of validKpiIds) {
      releases.push(liveKpiStreamStore.acquire(id));
      unsubscribes.push(
        liveKpiStreamStore.subscribe(id, () => {
          setTick((t) => t + 1);
        })
      );
    }

    return () => {
      for (const unsub of unsubscribes) {
        unsub();
      }
      for (const rel of releases) {
        rel();
      }
    };
  }, [dependencyKey]);

  if (validKpiIds.length === 0) {
    return {
      items: Object.freeze([]),
      status: 'unconfigured',
    };
  }

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
