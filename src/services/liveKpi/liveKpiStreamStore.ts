/**
 * Live KPI Stream Store (Gate G25 / Auftrag 041)
 *
 * Zentraler, referenzgezählter Stream-Store für Ebene-C Live-KPIs.
 * Hält pro KPI-ID genau einen geteilten Stream, einen aktuellen Snapshot
 * und maximal 30 geordnete Historienpunkte.
 *
 * Verhindert redundante Subscriptions und Memory-Leaks durch Ref-Counting.
 */

import { isSupportedLiveKpiId } from './liveKpiDefinitions';
import {
  isLiveKpiReadConfigured,
  fetchLatestLiveKpi,
  fetchLiveKpiHistory,
  subscribeToLiveKpi,
  type LiveKpiSnapshot,
  type LiveKpiReadStatus,
  type LiveKpiSubscription,
} from './liveKpiReadAdapter';

export interface LiveKpiStreamState {
  snapshot: LiveKpiSnapshot | null;
  history: readonly LiveKpiSnapshot[];
  status: LiveKpiReadStatus;
  error: Error | null;
}

export interface LiveKpiStreamStore {
  acquire(kpiId: string): () => void;
  getState(kpiId: string): LiveKpiStreamState;
  /**
   * G33: referenzstabiler Snapshot für useSyncExternalStore. Dieselbe Referenz,
   * solange sich snapshot/history/status/error nicht ändern; neue Referenz bei
   * echter Änderung. Für unbekannte/nicht-acquired IDs ein stabiler Default.
   */
  getSnapshot(kpiId: string): LiveKpiStreamState;
  /** G33: Server-Snapshot für useSyncExternalStore (SPA ohne SSR — stabiler Default). */
  getServerSnapshot(): LiveKpiStreamState;
  /**
   * G33: monotone Entry-Version für aggregierte Hooks (useLiveKpiActivity).
   * Steigt bei jeder echten State-Änderung des Entrys; 0 ohne Entry.
   */
  getEntryVersion(kpiId: string): number;
  subscribe(kpiId: string, listener: () => void): () => void;
  refresh(kpiId: string): Promise<void>;
}

export interface LiveKpiStreamAdapter {
  isLiveKpiReadConfigured(): boolean;
  fetchLatestLiveKpi(kpiId: string): Promise<LiveKpiSnapshot | null>;
  fetchLiveKpiHistory(kpiId: string, sinceIso: string, limit: number): Promise<LiveKpiSnapshot[]>;
  subscribeToLiveKpi(
    kpiId: string,
    onEvent: (snapshot: LiveKpiSnapshot) => void,
    onConnectionStatus: (status: 'subscribed' | 'offline' | 'error') => void,
  ): LiveKpiSubscription;
}

interface StreamEntry {
  kpiId: string;
  refCount: number;
  state: LiveKpiStreamState;
  /** G33: letzter committeter State — getSnapshot gibt exakt diese Referenz zurück. */
  cachedSnapshot: LiveKpiStreamState;
  /** G33: monotone Version, steigt bei jedem commit (für aggregierte Hooks). */
  version: number;
  listeners: Set<() => void>;
  subscription: LiveKpiSubscription | null;
  /** G33 Fix B: Lösch-Timer für das 60-s-Aufbewahrungsfenster (null wenn aktiv). */
  retentionTimer: ReturnType<typeof setTimeout> | null;
}

/** G33 Fix B: Aufbewahrungsfenster nach letztem release. */
export const RETENTION_MS = 60_000;

/** G33: stabiler Default für getSnapshot/getServerSnapshot ohne Entry. */
const DEFAULT_SNAPSHOT_STATE: LiveKpiStreamState = Object.freeze({
  snapshot: null,
  history: Object.freeze([]),
  status: 'unconfigured',
  error: null,
}) as LiveKpiStreamState;

/**
 * Vergleicht zwei Snapshots lexikografisch nach (occurredAt, ingestedAt).
 * > 0 wenn a neuer als b ist; < 0 wenn a älter ist; 0 bei Identität.
 */
function compareSnapshots(a: LiveKpiSnapshot, b: LiveKpiSnapshot): number {
  if (a.occurredAt < b.occurredAt) return -1;
  if (a.occurredAt > b.occurredAt) return 1;
  if (a.ingestedAt < b.ingestedAt) return -1;
  if (a.ingestedAt > b.ingestedAt) return 1;
  return 0;
}

function mergeIntoHistory(existing: readonly LiveKpiSnapshot[], newItem: LiveKpiSnapshot): LiveKpiSnapshot[] {
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

function normalizeHistory(rawItems: LiveKpiSnapshot[]): LiveKpiSnapshot[] {
  const sorted = [...rawItems].sort(compareSnapshots);
  const deduped: LiveKpiSnapshot[] = [];
  for (const item of sorted) {
    if (deduped.length === 0 || compareSnapshots(deduped[deduped.length - 1], item) !== 0) {
      deduped.push(item);
    }
  }
  if (deduped.length > 30) {
    return deduped.slice(deduped.length - 30);
  }
  return deduped;
}

export function createLiveKpiStreamStore(customAdapter?: LiveKpiStreamAdapter): LiveKpiStreamStore {
  const adapter: LiveKpiStreamAdapter = customAdapter || {
    isLiveKpiReadConfigured,
    fetchLatestLiveKpi,
    fetchLiveKpiHistory,
    subscribeToLiveKpi,
  };

  const entries = new Map<string, StreamEntry>();

  function notify(entry: StreamEntry) {
    for (const listener of entry.listeners) {
      try {
        listener();
      } catch (err) {
        console.warn(`[LiveKpiStreamStore] Error in listener for "${entry.kpiId}":`, err);
      }
    }
  }

  /**
   * G33: einziger Weg, Entry-State zu ändern. Hält state, cachedSnapshot
   * (Referenzstabilität für getSnapshot) und version synchron.
   */
  function commit(entry: StreamEntry, next: LiveKpiStreamState): void {
    entry.state = next;
    entry.cachedSnapshot = next;
    entry.version += 1;
    notify(entry);
  }

  function makeFreshState(configured: boolean): LiveKpiStreamState {
    return {
      snapshot: null,
      history: Object.freeze([]),
      status: configured ? 'loading' : 'unconfigured',
      error: null,
    };
  }

  /**
   * G33: Realtime-Subscription an einen Entry hängen (Erst-acquire und
   * Re-acquire im Aufbewahrungsfenster teilen sich diesen Pfad).
   */
  function attachSubscription(entry: StreamEntry, kpiId: string): void {
    entry.subscription = adapter.subscribeToLiveKpi(
      kpiId,
      (incomingSnapshot) => {
        if (entries.get(kpiId) !== entry) return;
        const currentSnap = entry.state.snapshot;

        // Tie-Breaking: nur übernehmen, wenn neuer
        const isNewer = currentSnap === null || compareSnapshots(incomingSnapshot, currentSnap) > 0;
        const updatedHistory = mergeIntoHistory(entry.state.history, incomingSnapshot);

        if (isNewer) {
          commit(entry, {
            ...entry.state,
            snapshot: incomingSnapshot,
            history: Object.freeze(updatedHistory),
            status: 'live',
            error: null,
          });
        } else if (updatedHistory !== entry.state.history) {
          commit(entry, {
            ...entry.state,
            history: Object.freeze(updatedHistory),
          });
        }
      },
      (connStatus) => {
        if (entries.get(kpiId) !== entry) return;

        if (connStatus === 'subscribed') {
          commit(entry, {
            ...entry.state,
            status: 'live',
            error: null,
          });

          adapter
            .fetchLatestLiveKpi(kpiId)
            .then((latest) => {
              if (entries.get(kpiId) !== entry) return;
              if (latest) {
                const currentSnap = entry.state.snapshot;
                const isNewer = currentSnap === null || compareSnapshots(latest, currentSnap) > 0;
                const updatedHistory = mergeIntoHistory(entry.state.history, latest);
                commit(entry, {
                  ...entry.state,
                  snapshot: isNewer ? latest : currentSnap,
                  history: Object.freeze(updatedHistory),
                  status: 'live',
                  error: null,
                });
              } else {
                commit(entry, {
                  ...entry.state,
                  status: 'live',
                  error: null,
                });
              }
            })
            .catch((err) => {
              if (entries.get(kpiId) !== entry) return;
              commit(entry, {
                ...entry.state,
                status: 'error',
                error: err instanceof Error ? err : new Error(String(err)),
              });
            });
        } else if (connStatus === 'offline') {
          commit(entry, {
            ...entry.state,
            status: 'offline',
          });
        } else if (connStatus === 'error') {
          commit(entry, {
            ...entry.state,
            status: 'error',
            error: new Error(`Realtime-Kanal für KPI "${kpiId}" meldet Verbindungsfehler`),
          });
        }
      }
    );
  }

  function detachSubscription(entry: StreamEntry): void {
    if (entry.subscription) {
      entry.subscription.unsubscribe();
      entry.subscription = null;
    }
  }

  /**
   * G33 Fix B: Release mit 60-s-Aufbewahrungsfenster. Kanal sofort abbestellen
   * (kein WebSocket für unmontierte Komponenten), State behalten, Lösch-Timer
   * starten. Re-acquire bricht den Timer ab (siehe acquire).
   */
  function makeRelease(kpiId: string, entry: StreamEntry): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;

      if (entries.get(kpiId) !== entry) return;

      entry.refCount--;
      if (entry.refCount <= 0) {
        detachSubscription(entry);
        entry.listeners.clear();
        if (entry.retentionTimer !== null) {
          clearTimeout(entry.retentionTimer);
        }
        entry.retentionTimer = setTimeout(() => {
          if (entries.get(kpiId) !== entry) return;
          detachSubscription(entry);
          entry.listeners.clear();
          entries.delete(kpiId);
        }, RETENTION_MS);
      }
    };
  }

  return {
    acquire(kpiId: string): () => void {
      if (!isSupportedLiveKpiId(kpiId)) {
        return () => {};
      }

      let entry = entries.get(kpiId);
      if (!entry) {
        const freshState = makeFreshState(adapter.isLiveKpiReadConfigured());
        entry = {
          kpiId,
          refCount: 0,
          state: freshState,
          cachedSnapshot: freshState,
          version: 0,
          listeners: new Set(),
          subscription: null,
          retentionTimer: null,
        };
        entries.set(kpiId, entry);
      }

      entry.refCount++;

      // G33 Fix B: Re-acquire im Aufbewahrungsfenster — Timer abbrechen, State
      // behalten (kein Refetch, history bleibt), Kanal neu abonnieren.
      if (entry.retentionTimer !== null) {
        clearTimeout(entry.retentionTimer);
        entry.retentionTimer = null;
        attachSubscription(entry, kpiId);
        return makeRelease(kpiId, entry);
      }

      if (entry.refCount === 1) {
        if (!adapter.isLiveKpiReadConfigured()) {
          commit(entry, {
            ...entry.state,
            status: 'unconfigured',
          });
        } else {
          commit(entry, {
            ...entry.state,
            status: 'loading',
            error: null,
          });

          // 1. Initialer Historienabruf der letzten 30 Minuten
          const sinceIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          adapter
            .fetchLiveKpiHistory(kpiId, sinceIso, 30)
            .then((items) => {
              if (entries.get(kpiId) !== entry) return;
              // Event-Race Schutz: Vor Eintreffen des History-Reads bereits empfangene
              // Realtime-Events in entry.state.history bleiben vollständig erhalten
              const merged = normalizeHistory([...items, ...entry.state.history]);
              let newSnapshot = entry.state.snapshot;
              if (merged.length > 0) {
                const latestInMerged = merged[merged.length - 1];
                if (newSnapshot === null || compareSnapshots(latestInMerged, newSnapshot) > 0) {
                  newSnapshot = latestInMerged;
                }
              }
              // G33 Fix A: Status live — aber nur bei nichtleerer History.
              // Leere History → Status bleibt (loading bis Kanal).
              const nextStatus = merged.length > 0 ? 'live' : entry.state.status;
              commit(entry, {
                ...entry.state,
                history: Object.freeze(merged),
                snapshot: newSnapshot,
                status: nextStatus,
              });
            })
            .catch((err) => {
              if (entries.get(kpiId) !== entry) return;
              commit(entry, {
                ...entry.state,
                status: 'error',
                error: err instanceof Error ? err : new Error(String(err)),
              });
            });

          // 2. Realtime-Subscription einrichten
          attachSubscription(entry, kpiId);
        }
      }

      return makeRelease(kpiId, entry);
    },

    getState(kpiId: string): LiveKpiStreamState {
      if (!isSupportedLiveKpiId(kpiId)) {
        return {
          snapshot: null,
          history: Object.freeze([]),
          status: 'unconfigured',
          error: null,
        };
      }
      const entry = entries.get(kpiId);
      if (!entry) {
        return {
          snapshot: null,
          history: Object.freeze([]),
          status: adapter.isLiveKpiReadConfigured() ? 'loading' : 'unconfigured',
          error: null,
        };
      }
      return entry.state;
    },

    getSnapshot(kpiId: string): LiveKpiStreamState {
      if (!isSupportedLiveKpiId(kpiId)) {
        return DEFAULT_SNAPSHOT_STATE;
      }
      const entry = entries.get(kpiId);
      return entry ? entry.cachedSnapshot : DEFAULT_SNAPSHOT_STATE;
    },

    getServerSnapshot(): LiveKpiStreamState {
      return DEFAULT_SNAPSHOT_STATE;
    },

    getEntryVersion(kpiId: string): number {
      const entry = entries.get(kpiId);
      return entry ? entry.version : 0;
    },

    subscribe(kpiId: string, listener: () => void): () => void {
      if (!isSupportedLiveKpiId(kpiId)) {
        return () => {};
      }
      let entry = entries.get(kpiId);
      if (!entry) {
        const freshState = makeFreshState(adapter.isLiveKpiReadConfigured());
        entry = {
          kpiId,
          refCount: 0,
          state: freshState,
          cachedSnapshot: freshState,
          version: 0,
          listeners: new Set(),
          subscription: null,
          retentionTimer: null,
        };
        entries.set(kpiId, entry);
      }
      entry.listeners.add(listener);
      return () => {
        entry.listeners.delete(listener);
      };
    },

    async refresh(kpiId: string): Promise<void> {
      if (!isSupportedLiveKpiId(kpiId) || !adapter.isLiveKpiReadConfigured()) {
        return;
      }
      const entry = entries.get(kpiId);
      if (!entry) return;

      try {
        const latest = await adapter.fetchLatestLiveKpi(kpiId);
        if (entries.get(kpiId) !== entry) return;
        if (latest) {
          const isNewer = entry.state.snapshot === null || compareSnapshots(latest, entry.state.snapshot) > 0;
          const updatedHistory = mergeIntoHistory(entry.state.history, latest);
          commit(entry, {
            ...entry.state,
            snapshot: isNewer ? latest : entry.state.snapshot,
            history: Object.freeze(updatedHistory),
            status: 'live',
            error: null,
          });
        } else {
          commit(entry, {
            ...entry.state,
            status: 'live',
            error: null,
          });
        }
      } catch (err) {
        if (entries.get(kpiId) !== entry) return;
        commit(entry, {
          ...entry.state,
          status: 'error',
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    },
  };
}

export const liveKpiStreamStore: LiveKpiStreamStore = createLiveKpiStreamStore();
