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
  listeners: Set<() => void>;
  subscription: LiveKpiSubscription | null;
  historyPromise: Promise<void> | null;
}

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

  return {
    acquire(kpiId: string): () => void {
      if (!isSupportedLiveKpiId(kpiId)) {
        return () => {};
      }

      let entry = entries.get(kpiId);
      if (!entry) {
        entry = {
          kpiId,
          refCount: 0,
          state: {
            snapshot: null,
            history: Object.freeze([]),
            status: adapter.isLiveKpiReadConfigured() ? 'loading' : 'unconfigured',
            error: null,
          },
          listeners: new Set(),
          subscription: null,
          historyPromise: null,
        };
        entries.set(kpiId, entry);
      }

      entry.refCount++;

      if (entry.refCount === 1) {
        if (!adapter.isLiveKpiReadConfigured()) {
          entry.state = {
            ...entry.state,
            status: 'unconfigured',
          };
          notify(entry);
        } else {
          entry.state = {
            ...entry.state,
            status: 'loading',
            error: null,
          };
          notify(entry);

          // 1. Initialer Historienabruf der letzten 30 Minuten
          const sinceIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          entry.historyPromise = adapter
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
              entry.state = {
                ...entry.state,
                history: Object.freeze(merged),
                snapshot: newSnapshot,
              };
              notify(entry);
            })
            .catch((err) => {
              if (entries.get(kpiId) !== entry) return;
              entry.state = {
                ...entry.state,
                status: 'error',
                error: err instanceof Error ? err : new Error(String(err)),
              };
              notify(entry);
            });

          // 2. Realtime-Subscription einrichten
          entry.subscription = adapter.subscribeToLiveKpi(
            kpiId,
            (incomingSnapshot) => {
              if (entries.get(kpiId) !== entry) return;
              const currentSnap = entry.state.snapshot;

              // Tie-Breaking: nur übernehmen, wenn neuer
              const isNewer = currentSnap === null || compareSnapshots(incomingSnapshot, currentSnap) > 0;
              const updatedHistory = mergeIntoHistory(entry.state.history, incomingSnapshot);

              if (isNewer) {
                entry.state = {
                  ...entry.state,
                  snapshot: incomingSnapshot,
                  history: Object.freeze(updatedHistory),
                  status: 'live',
                  error: null,
                };
                notify(entry);
              } else if (updatedHistory !== entry.state.history) {
                entry.state = {
                  ...entry.state,
                  history: Object.freeze(updatedHistory),
                };
                notify(entry);
              }
            },
            (connStatus) => {
              if (entries.get(kpiId) !== entry) return;

              if (connStatus === 'subscribed') {
                entry.state = {
                  ...entry.state,
                  status: 'live',
                  error: null,
                };
                notify(entry);

                adapter
                  .fetchLatestLiveKpi(kpiId)
                  .then((latest) => {
                    if (entries.get(kpiId) !== entry) return;
                    if (latest) {
                      const currentSnap = entry.state.snapshot;
                      const isNewer = currentSnap === null || compareSnapshots(latest, currentSnap) > 0;
                      const updatedHistory = mergeIntoHistory(entry.state.history, latest);
                      entry.state = {
                        ...entry.state,
                        snapshot: isNewer ? latest : currentSnap,
                        history: Object.freeze(updatedHistory),
                        status: 'live',
                        error: null,
                      };
                    } else {
                      entry.state = {
                        ...entry.state,
                        status: 'live',
                        error: null,
                      };
                    }
                    notify(entry);
                  })
                  .catch((err) => {
                    if (entries.get(kpiId) !== entry) return;
                    entry.state = {
                      ...entry.state,
                      status: 'error',
                      error: err instanceof Error ? err : new Error(String(err)),
                    };
                    notify(entry);
                  });
              } else if (connStatus === 'offline') {
                entry.state = {
                  ...entry.state,
                  status: 'offline',
                };
                notify(entry);
              } else if (connStatus === 'error') {
                entry.state = {
                  ...entry.state,
                  status: 'error',
                  error: new Error(`Realtime-Kanal für KPI "${kpiId}" meldet Verbindungsfehler`),
                };
                notify(entry);
              }
            }
          );
        }
      }

      let released = false;
      return () => {
        if (released) return;
        released = true;

        if (entries.get(kpiId) !== entry) return;

        entry.refCount--;
        if (entry.refCount <= 0) {
          if (entry.subscription) {
            entry.subscription.unsubscribe();
            entry.subscription = null;
          }
          entry.listeners.clear();
          entries.delete(kpiId);
        }
      };
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

    subscribe(kpiId: string, listener: () => void): () => void {
      if (!isSupportedLiveKpiId(kpiId)) {
        return () => {};
      }
      let entry = entries.get(kpiId);
      if (!entry) {
        entry = {
          kpiId,
          refCount: 0,
          state: {
            snapshot: null,
            history: Object.freeze([]),
            status: adapter.isLiveKpiReadConfigured() ? 'loading' : 'unconfigured',
            error: null,
          },
          listeners: new Set(),
          subscription: null,
          historyPromise: null,
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
          entry.state = {
            ...entry.state,
            snapshot: isNewer ? latest : entry.state.snapshot,
            history: Object.freeze(updatedHistory),
            status: 'live',
            error: null,
          };
        } else {
          entry.state = {
            ...entry.state,
            status: 'live',
            error: null,
          };
        }
        notify(entry);
      } catch (err) {
        if (entries.get(kpiId) !== entry) return;
        entry.state = {
          ...entry.state,
          status: 'error',
          error: err instanceof Error ? err : new Error(String(err)),
        };
        notify(entry);
      }
    },
  };
}

export const liveKpiStreamStore: LiveKpiStreamStore = createLiveKpiStreamStore();
