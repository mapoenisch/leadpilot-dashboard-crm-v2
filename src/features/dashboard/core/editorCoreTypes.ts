// Executive Dashboard V2 (Auftrag 147 / P04):
// Typen und Konstanten für den Dashboard-Editor-Kern.

import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

export const MAX_HISTORY_BYTES = 15 * 1024 * 1024; // 15 MiB Soft-Limit
export const CHECKPOINT_INTERVAL = 50; // Checkpoint alle 50 Aktionen
export const TEXT_DEBOUNCE_MS = 600; // 600 ms Pause schließt Eingabebefehl ab

export interface HistoryCheckpoint {
  readonly stepIndex: number;
  readonly config: DashboardConfigV2;
  readonly timestamp: number;
}

export interface HistoryStats {
  readonly undoCount: number;
  readonly redoCount: number;
  readonly estimatedBytes: number;
  readonly checkpointsCount: number;
  readonly warning: string | null;
}

export interface PendingTextEntry {
  tileId: string;
  field: string;
  initialValue: string;
  latestValue: string;
  timerId: ReturnType<typeof setTimeout> | null;
}
