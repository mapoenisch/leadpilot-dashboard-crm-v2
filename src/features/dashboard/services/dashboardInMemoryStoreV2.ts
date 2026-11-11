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
