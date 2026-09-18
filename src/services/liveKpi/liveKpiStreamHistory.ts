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
