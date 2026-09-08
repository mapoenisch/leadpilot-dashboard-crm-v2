/**
 * Hook: useLiveKpiHistory (Gate G25 / Auftrag 041)
 *
 * Selektiert ausschließlich die letzten maximal 30 Historienpunkte,
 * den aktuellen Status und evtl. Fehler einer gegebenen KPI-ID.
 *
 * Nutzt den referenzgezählten liveKpiStreamStore zur Vermeidung doppelter Subscriptions.
 */

import { useState, useEffect } from 'react';
import { liveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import type { LiveKpiSnapshot, LiveKpiReadStatus } from '@/services/liveKpi/liveKpiReadAdapter';

export interface UseLiveKpiHistoryResult {
  history: readonly LiveKpiSnapshot[];
  status: LiveKpiReadStatus;
  error: Error | null;
}

export function useLiveKpiHistory(kpiId: string): UseLiveKpiHistoryResult {
  const [, setTick] = useState(0);

  useEffect(() => {
    const release = liveKpiStreamStore.acquire(kpiId);
    const unsubscribe = liveKpiStreamStore.subscribe(kpiId, () => {
      setTick((t) => t + 1);
    });

    return () => {
      unsubscribe();
      release();
    };
  }, [kpiId]);

  const state = liveKpiStreamStore.getState(kpiId);

  return {
    history: state.history,
    status: state.status,
    error: state.error,
  };
}
