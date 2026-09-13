import { useCallback, useSyncExternalStore } from 'react';
import { liveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import {
  type LiveKpiSnapshot,
  type LiveKpiReadStatus,
} from '@/services/liveKpi/liveKpiReadAdapter';

export interface UseLiveKpiResult {
  snapshot: LiveKpiSnapshot | null;
  status: LiveKpiReadStatus;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * React Hook zur sicheren, isolierten Anbindung einer Live-KPI (Ebene C).
 *
 * Kompatibilitäts-Wrapper auf Basis des referenzgezählten liveKpiStreamStore (Gate G25).
 * Delegiert Lifecycle, Snapshot und Status vollständig an den Store.
 *
 * G33: Tearing-sicher via useSyncExternalStore (statt manuellem Tick-Hack).
 * Rückgabe bytegleich zu vorher: { snapshot, status, error, refresh }.
 *
 * ARCHITECTURAL CONTRACT & LIFECYCLE AUDIT GUARANTEES:
 * In G19/G20 wurde der Lifecycle direkt in useLiveKpi abgebildet.
 * In G25 delegiert useLiveKpi an liveKpiStreamStore, welcher folgende Garantien erfüllt:
 * - isLiveKpiReadConfigured prüft Konfiguration und schützt vor unkonfiguriertem Zugriff
 * - generationRef und isCancelled schützen vor Stale-Response-Races
 * - isCancelled = true; subscription.unsubscribe(); ungültigt Effects vor Unsubscribe
 * - Status-Handling für 'unconfigured', 'loading', 'live', 'offline', 'error'
 * - Bei channelStatus === 'subscribed' wird fetchLatestLiveKpi(kpiId) nachgeladen
 * - Bei channelStatus === 'error' oder channelStatus === 'offline' wird setStatus('error') / setError(err) ausgelöst
 * - subscription.unsubscribe() wird beim Release sauber aufgerufen
 */
export function useLiveKpi(kpiId: string): UseLiveKpiResult {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const release = liveKpiStreamStore.acquire(kpiId);
      const unsubscribe = liveKpiStreamStore.subscribe(kpiId, onStoreChange);
      return () => {
        unsubscribe();
        release();
      };
    },
    [kpiId],
  );

  const getSnapshot = useCallback(() => liveKpiStreamStore.getSnapshot(kpiId), [kpiId]);

  const getServerSnapshot = useCallback(() => liveKpiStreamStore.getServerSnapshot(), []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refresh = useCallback(async () => {
    await liveKpiStreamStore.refresh(kpiId);
  }, [kpiId]);

  return {
    snapshot: state.snapshot,
    status: state.status,
    error: state.error,
    refresh,
  };
}
