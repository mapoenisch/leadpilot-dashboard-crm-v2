import type { LiveKpiSnapshot } from './liveKpiReadAdapter';

/**
 * Vergleicht zwei Snapshots lexikografisch nach (occurredAt, ingestedAt).
 * > 0 wenn a neuer als b ist; < 0 wenn a älter ist; 0 bei Identität.
 */
export function compareSnapshots(a: LiveKpiSnapshot, b: LiveKpiSnapshot): number {
  if (a.occurredAt < b.occurredAt) return -1;
  if (a.occurredAt > b.occurredAt) return 1;
  if (a.ingestedAt < b.ingestedAt) return -1;
  if (a.ingestedAt > b.ingestedAt) return 1;
  return 0;
}

export function mergeIntoHistory(
  existing: readonly LiveKpiSnapshot[],
  newItem: LiveKpiSnapshot,
): LiveKpiSnapshot[] {
  // Duplikatprüfung
  const isDuplicate = existing.some((item) => compareSnapshots(item, newItem) === 0);
  if (isDuplicate) {
    return existing as LiveKpiSnapshot[];
  }

  const updated = [...existing, newItem].sort(compareSnapshots);
  if (updated.length > 30) {
    // Ältesten Punkt entfernen (FIFO)
    return updated.slice(updated.length - 30);
  }
  return updated;
}

export function normalizeHistory(rawItems: LiveKpiSnapshot[]): LiveKpiSnapshot[] {
  const sorted = [...rawItems].sort(compareSnapshots);
  const deduped: LiveKpiSnapshot[] = [];
  for (const item of sorted) {
    const last = deduped[deduped.length - 1];
    if (last === undefined || compareSnapshots(last, item) !== 0) {
      deduped.push(item);
    }
  }
  if (deduped.length > 30) {
    return deduped.slice(deduped.length - 30);
  }
  return deduped;
}

export interface StreamStateLike {
  snapshot: LiveKpiSnapshot | null;
  history: readonly LiveKpiSnapshot[];
  status: any;
  error: Error | null;
}

export function mergeFetchedLatest<E extends { state: S }, S extends StreamStateLike>(
  entry: E,
  latest: LiveKpiSnapshot | null,
  commitEntry: (target: E, next: S) => void,
): void {
  if (latest) {
    const currentSnap = entry.state.snapshot;
    const isNewer = currentSnap === null || compareSnapshots(latest, currentSnap) > 0;
    const updatedHistory = mergeIntoHistory(entry.state.history, latest);
    commitEntry(entry, {
      ...entry.state,
      snapshot: isNewer ? latest : currentSnap,
      history: Object.freeze(updatedHistory),
      status: 'live',
      error: null,
    });
  } else {
    commitEntry(entry, {
      ...entry.state,
      status: 'live',
      error: null,
    });
  }
}

export function commitFetchError<E extends { state: S }, S extends StreamStateLike>(
  entry: E,
  err: unknown,
  commitEntry: (target: E, next: S) => void,
): void {
  commitEntry(entry, {
    ...entry.state,
    status: 'error',
    error: err instanceof Error ? err : new Error(String(err)),
  });
}
