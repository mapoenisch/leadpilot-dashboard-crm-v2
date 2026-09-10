/**
 * Hook: useLiveKpiHistory (Gate G25 / Auftrag 041, G33 useSyncExternalStore)
 *
 * Selektiert ausschließlich die letzten maximal 30 Historienpunkte,
 * den aktuellen Status und evtl. Fehler einer gegebenen KPI-ID.
 *
 * Nutzt den referenzgezählten liveKpiStreamStore zur Vermeidung doppelter Subscriptions.
 * Rückgabe bytegleich zu vorher: { history, status, error }.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { liveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import type { LiveKpiSnapshot, LiveKpiReadStatus } from '@/services/liveKpi/liveKpiReadAdapter';

export interface UseLiveKpiHistoryResult {
  history: readonly LiveKpiSnapshot[];
  status: LiveKpiReadStatus;
  error: Error | null;
}

export function useLiveKpiHistory(kpiId: string): UseLiveKpiHistoryResult {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const release = liveKpiStreamStore.acquire(kpiId);
      const unsubscribe = liveKpiStreamStore.subscribe(kpiId, onStoreChange);
      return () => {
        unsubscribe();
        release();
      };
    },
    [kpiId]
  );

  const getSnapshot = useCallback(
    () => liveKpiStreamStore.getSnapshot(kpiId),
    [kpiId]
  );

  const getServerSnapshot = useCallback(
    () => liveKpiStreamStore.getServerSnapshot(),
    []
  );

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    history: state.history,
    status: state.status,
    error: state.error,
  };
}
