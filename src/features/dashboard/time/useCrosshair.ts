// Auftrag 164 (P10b-2 / 161R): Selektor-Hook und Hilfsfunktionen fuer Fadenkreuz-Kopplung.
// Verwendet useSyncExternalStore ohne externe Bibliotheken.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useOptionalTimeControl } from './TimeControlProvider';
import type { CrosshairState, CrosshairStore } from './crosshairStore';
import type { DatumInput, TimeDatumInput } from '../components/charts/depthGeometry';

const INITIAL_CROSSHAIR: CrosshairState = Object.freeze({
  at: null,
  sourceTileId: null,
}) as CrosshairState;

const NOOP_SUBSCRIBE = () => () => {};

/**
 * Findet den Index des Abschnitts, der den Zielzeitpunkt enthält (Auftrag 161 §2.1 Nr. 5).
 * Regel: Abschnittsbeginn <= Zeitpunkt < naechster Abschnittsbeginn.
 * Liegt der Zeitpunkt ausserhalb des Kachelfensters, wird null zurueckgegeben.
 */
export function findMatchingPointIndex(
  data: readonly (DatumInput | TimeDatumInput)[],
  targetAt: string | null,
): number | null {
  if (!targetAt || !data || data.length === 0) return null;
  const targetTime = new Date(targetAt).getTime();
  if (Number.isNaN(targetTime)) return null;

  const times: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    if (!entry || !('at' in entry) || typeof entry.at !== 'string' || !entry.at) {
      return null;
    }
    const t = new Date(entry.at).getTime();
    if (Number.isNaN(t)) return null;
    times.push(t);
  }

  const n = times.length;
  if (n === 0) return null;
  if (targetTime < times[0]!) return null;

  for (let i = 0; i < n - 1; i++) {
    if (targetTime >= times[i]! && targetTime < times[i + 1]!) {
      return i;
    }
  }

  // Letzter Abschnitt: [times[n-1], times[n-1] + lastStep)
  const lastStep = n > 1 ? times[n - 1]! - times[n - 2]! : 0;
  if (n === 1) {
    return targetTime === times[0] ? 0 : null;
  }
  if (targetTime >= times[n - 1]! && targetTime < times[n - 1]! + lastStep) {
    return n - 1;
  }

  return null;
}

/**
 * Drosselung auf hoechstens einmal je Animationsframe (Auftrag 164 §2.1 Nr. 1).
 * Fuehrt das erste Ereignis sofort aus (0ms Latenz) und drosselt schnelle Folgeereignisse.
 */
export function createRafThrottler() {
  let rafId: number | null = null;
  let pendingArgs: [string | null, string | null] | null = null;
  let lastCommitTime = 0;

  return {
    schedule(
      at: string | null,
      sourceTileId: string | null,
      commit: (at: string | null, sourceTileId: string | null) => void,
    ) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      // Fuehre das erste Ereignis sofort aus, wenn das letzte Frame abgelaufen ist
      if (rafId === null && now - lastCommitTime >= 16) {
        lastCommitTime = now;
        commit(at, sourceTileId);
        return;
      }

      pendingArgs = [at, sourceTileId];
      if (rafId === null) {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          rafId = window.requestAnimationFrame(() => {
            rafId = null;
            lastCommitTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (pendingArgs) {
              commit(pendingArgs[0], pendingArgs[1]);
              pendingArgs = null;
            }
          });
        } else {
          commit(at, sourceTileId);
          pendingArgs = null;
        }
      }
    },
    cancel() {
      if (
        rafId !== null &&
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      pendingArgs = null;
    },
  };
}

/**
 * Selektor-Hook fuer den Fadenkreuz-Store (Auftrag 164 §2.1 Nr. 4).
 * Abonniert per useSyncExternalStore nur den fuer die Kachel noetigen Ausschnitt.
 */
export function useCrosshair<T = CrosshairState>(
  selector: (state: CrosshairState) => T = (s) => s as unknown as T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): {
  state: T;
  store: CrosshairStore | null;
  setCrosshair: (at: string | null, sourceTileId?: string | null) => void;
  clearCrosshair: () => void;
} {
  const timeControl = useOptionalTimeControl();
  const store = timeControl?.crosshairStore ?? null;

  const lastSelectedRef = useRef<T | undefined>(undefined);
  const lastRawStateRef = useRef<CrosshairState | undefined>(undefined);

  const getSnapshot = useCallback(() => {
    if (!store) {
      if (lastSelectedRef.current === undefined) {
        lastSelectedRef.current = selector(INITIAL_CROSSHAIR);
      }
      return lastSelectedRef.current;
    }
    const raw = store.getSnapshot();
    if (lastRawStateRef.current === raw && lastSelectedRef.current !== undefined) {
      return lastSelectedRef.current;
    }
    const next = selector(raw);
    if (lastSelectedRef.current !== undefined && isEqual(lastSelectedRef.current, next)) {
      return lastSelectedRef.current;
    }
    lastRawStateRef.current = raw;
    lastSelectedRef.current = next;
    return next;
  }, [store, selector, isEqual]);

  const state = useSyncExternalStore(store ? store.subscribe : NOOP_SUBSCRIBE, getSnapshot);

  const setCrosshair = useCallback(
    (at: string | null, sourceTileId: string | null = null) => {
      store?.setCrosshair(at, sourceTileId);
    },
    [store],
  );

  const clearCrosshair = useCallback(() => {
    store?.clearCrosshair();
  }, [store]);

  return { state, store, setCrosshair, clearCrosshair };
}

export interface CrosshairControllerResult {
  activeIndex: number | null;
  isAnnouncing: boolean;
  handleSelect: (index: number, immediate?: boolean) => void;
  handleClear: () => void;
  hasTimeAxis: boolean;
}

/**
 * Steuert die aktive Position und Kopplung fuer eine Diagrammkachel.
 */
export function useCrosshairController(
  data: readonly (DatumInput | TimeDatumInput)[],
  tileId: string,
): CrosshairControllerResult {
  const hasTimeAxis = useMemo(() => {
    return data.some(
      (entry) => 'at' in entry && typeof entry.at === 'string' && entry.at.length > 0,
    );
  }, [data]);

  const selector = useCallback(
    (s: CrosshairState) => ({
      at: s.at,
      isSource: s.sourceTileId === tileId,
    }),
    [tileId],
  );

  const isEqual = useCallback(
    (a: { at: string | null; isSource: boolean }, b: { at: string | null; isSource: boolean }) =>
      a.at === b.at && a.isSource === b.isSource,
    [],
  );

  const { state: crosshair, setCrosshair, clearCrosshair } = useCrosshair(selector, isEqual);
  const [localActive, setLocalActive] = useState<number | null>(null);
  const throttler = useMemo(() => createRafThrottler(), []);

  // Aufraeumen bei Unmount
  useEffect(() => {
    return () => throttler.cancel();
  }, [throttler]);

  const handleSelect = useCallback(
    (index: number, immediate = false) => {
      setLocalActive(index);
      if (hasTimeAxis) {
        const item = data[index];
        const at = item && 'at' in item && typeof item.at === 'string' ? item.at : null;
        if (immediate) {
          throttler.cancel();
          setCrosshair(at, tileId);
        } else {
          throttler.schedule(at, tileId, setCrosshair);
        }
      }
    },
    [data, hasTimeAxis, throttler, tileId, setCrosshair],
  );

  const handleClear = useCallback(() => {
    setLocalActive(null);
    throttler.cancel();
    if (hasTimeAxis) {
      clearCrosshair();
    }
  }, [hasTimeAxis, throttler, clearCrosshair]);

  const activeIndex = useMemo(() => {
    if (!hasTimeAxis) return localActive;
    if (crosshair.isSource) return localActive;
    if (crosshair.at !== null) return findMatchingPointIndex(data, crosshair.at);
    return null;
  }, [hasTimeAxis, crosshair.isSource, crosshair.at, localActive, data]);

  const isAnnouncing = !hasTimeAxis || crosshair.isSource;

  return {
    activeIndex,
    isAnnouncing,
    handleSelect,
    handleClear,
    hasTimeAxis,
  };
}
