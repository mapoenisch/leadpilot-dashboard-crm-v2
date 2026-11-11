// Executive Dashboard V2 (Auftrag 150 / P07):
// In-Memory-Mock-Speicher für Offline, Tests und lokale Entwicklung.

import type { DashboardV2RevisionRow, StoredDashboardV2Row } from './dashboardStorageV2Types';

export interface InMemoryEntry {
  row: StoredDashboardV2Row;
  revisions: DashboardV2RevisionRow[];
}

export const inMemoryStore = new Map<string, InMemoryEntry>();

export function resetInMemoryDashboardV2Storage(): void {
  inMemoryStore.clear();
}

export function getInMemoryDashboard(preferredId?: string): StoredDashboardV2Row | null {
  if (preferredId) {
    const entry = inMemoryStore.get(preferredId);
    if (entry) return entry.row;
  }
  const all = Array.from(inMemoryStore.values());
  if (all.length === 0) return null;
  // Neueste Aktualisierung zuerst
  all.sort((a, b) => b.row.updatedAt.localeCompare(a.row.updatedAt));
  return all[0]?.row ?? null;
}
