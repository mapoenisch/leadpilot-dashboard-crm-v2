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
import { logger } from '@/services/logger';
import {
  isLiveKpiReadConfigured,
  fetchLatestLiveKpi,
  fetchLiveKpiHistory,
  subscribeToLiveKpiFeed,
  type LiveKpiSnapshot,
  type LiveKpiFeedConnectionState,
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
  /**
   * G34: feiner Feed-Verbindungszustand (nicht an die UI verdrahtet —
   * `LiveKpiReadStatus` bleibt die einzige Komponenten-Schnittstelle).
   */
  getFeedConnectionState(): LiveKpiFeedConnectionState;
  subscribe(kpiId: string, listener: () => void): () => void;
  refresh(kpiId: string): Promise<void>;
}

export interface LiveKpiStreamAdapter {
  isLiveKpiReadConfigured(): boolean;
  fetchLatestLiveKpi(kpiId: string): Promise<LiveKpiSnapshot | null>;
  fetchLiveKpiHistory(kpiId: string, sinceIso: string, limit: number): Promise<LiveKpiSnapshot[]>;
  /**
   * G34: ein einziger ungefilterter Feed-Kanal (statt einem pro KPI).
   * Events tragen ihre kpiId, der Store routet client-seitig.
   */
  subscribeToLiveKpiFeed(
    onEvent: (snapshot: LiveKpiSnapshot) => void,
    onStatus: (status: LiveKpiFeedConnectionState) => void,
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
  /** G34: true, solange dieser Entry einen Feed-Anteil hält (nur konfiguriert). */
  feedActive: boolean;
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

/**
 * G34: fetchLatest-Nachzug teilen sich propagateStatus (Feed live) und refresh.
 * Guards bleiben an den Aufrufstellen (unterschiedlich); nur der Merge ist gemeinsam.
 */
function mergeFetchedLatest(
  entry: StreamEntry,
  latest: LiveKpiSnapshot | null,
  commitEntry: (target: StreamEntry, next: LiveKpiStreamState) => void,
): void {
  if (latest) {
    const currentSnap = entry.state.snapshot;
    const isNewer = currentSnap === null || compareSnapshots(latest, currentSnap) > 0;
    const updatedHistory = mergeIntoHistory(entry.state.history, latest);
    commitEntry(entry, {
      ...entry.state,
      snapshot: isNewer ? latest : currentSnap,
      history: Object.freeze(updatedHistory),
      status: 'live',
      error: null,
    });
  } else {
    commitEntry(entry, {
      ...entry.state,
      status: 'live',
      error: null,
    });
  }
}

function commitFetchError(
  entry: StreamEntry,
  err: unknown,
  commitEntry: (target: StreamEntry, next: LiveKpiStreamState) => void,
): void {
  commitEntry(entry, {
    ...entry.state,
    status: 'error',
    error: err instanceof Error ? err : new Error(String(err)),
  });
}

export function createLiveKpiStreamStore(customAdapter?: LiveKpiStreamAdapter): LiveKpiStreamStore {
  const adapter: LiveKpiStreamAdapter = customAdapter || {
    isLiveKpiReadConfigured,
    fetchLatestLiveKpi,
    fetchLiveKpiHistory,
    subscribeToLiveKpiFeed,
  };

  const entries = new Map<string, StreamEntry>();

  /**
   * G34: genau ein Feed-Abo für alle Entries. Lebensdauer an „irgendein Entry
   * mit refCount > 0" gekoppelt; Entries im Aufbewahrungsfenster zählen nicht.
   */
  let feedSubscription: LiveKpiSubscription | null = null;
  let feedRefCount = 0;
  let feedConnectionState: LiveKpiFeedConnectionState = 'offline';

  function notify(entry: StreamEntry) {
    for (const listener of entry.listeners) {
      try {
        listener();
      } catch (err) {
        logger.warn(`[LiveKpiStreamStore] Error in listener for "${entry.kpiId}":`, err);
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
   * G34: Feed-Event routen — nur an Entries mit refCount > 0 (retained Entries
   * im Aufbewahrungsfenster sind pausiert; unbekannte kpiIds werden verworfen).
   * Dieselbe Tie-Breaking-/Merge-Logik wie der frühere per-KPI-onEvent.
   */
  function routeEvent(incomingSnapshot: LiveKpiSnapshot): void {
    const entry = entries.get(incomingSnapshot.kpiId);
    if (!entry || entry.refCount <= 0) return;
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
  }

  /**
   * G34: Feed-Status an alle Entries mit refCount > 0 propagieren (Mapping aus
   * Auftrag 049, Entscheidung 2). Bei 'live' zusätzlich je acquired KPI einmal
   * fetchLatestLiveKpi nachladen (keine Bulk-API im Adapter — je KPI ein Call,
   * einmalig pro Connect, nicht pro Tick).
   */
  function propagateStatus(feedState: LiveKpiFeedConnectionState): void {
    feedConnectionState = feedState;
    for (const entry of entries.values()) {
      if (entry.refCount <= 0) continue;
      const kpiId = entry.kpiId;
      if (feedState === 'live') {
        commit(entry, {
          ...entry.state,
          status: 'live',
          error: null,
        });
        adapter
          .fetchLatestLiveKpi(kpiId)
          .then((latest) => {
            const current = entries.get(kpiId);
            if (!current || current.refCount <= 0) return;
            mergeFetchedLatest(current, latest, commit);
          })
          .catch((err) => {
            const current = entries.get(kpiId);
            if (!current || current.refCount <= 0) return;
            commitFetchError(current, err, commit);
          });
      } else if (feedState === 'connecting' || feedState === 'reconnecting') {
        if (entry.state.snapshot === null && entry.state.history.length === 0) {
          commit(entry, {
            ...entry.state,
            status: 'loading',
          });
        }
      } else if (feedState === 'offline') {
        commit(entry, {
          ...entry.state,
          status: 'offline',
        });
      }
    }
  }

  function ensureFeedSubscription(): void {
    if (feedSubscription || feedRefCount <= 0) return;
    feedSubscription = adapter.subscribeToLiveKpiFeed(routeEvent, propagateStatus);
  }

  function maybeReleaseFeedSubscription(): void {
    if (feedRefCount > 0 || !feedSubscription) return;
    feedSubscription.unsubscribe();
    feedSubscription = null;
  }

  function getOrCreateEntry(kpiId: string): StreamEntry {
    const existing = entries.get(kpiId);
    if (existing) return existing;
    const freshState = makeFreshState(adapter.isLiveKpiReadConfigured());
    const created: StreamEntry = {
      kpiId,
      refCount: 0,
      state: freshState,
      cachedSnapshot: freshState,
      version: 0,
      listeners: new Set(),
      feedActive: false,
      retentionTimer: null,
    };
    entries.set(kpiId, created);
    return created;
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
        entry.listeners.clear();
        if (entry.feedActive) {
          entry.feedActive = false;
          feedRefCount--;
          maybeReleaseFeedSubscription();
        }
        if (entry.retentionTimer !== null) {
          clearTimeout(entry.retentionTimer);
        }
        entry.retentionTimer = setTimeout(() => {
          if (entries.get(kpiId) !== entry) return;
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

      const entry = getOrCreateEntry(kpiId);

      entry.refCount++;

      // G33 Fix B: Re-acquire im Aufbewahrungsfenster — Timer abbrechen, State
      // behalten (kein Refetch, history bleibt).
      let reactivated = false;
      if (entry.retentionTimer !== null) {
        clearTimeout(entry.retentionTimer);
        entry.retentionTimer = null;
        reactivated = true;
      }

      if (entry.refCount === 1) {
        // G34: Feed-Anteil nur bei konfiguriertem Adapter (kein Kanal ohne Backend).
        if (!entry.feedActive && adapter.isLiveKpiReadConfigured()) {
          entry.feedActive = true;
          feedRefCount++;
          ensureFeedSubscription();
        }
        if (reactivated) {
          return makeRelease(kpiId, entry);
        }
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
                if (
                  latestInMerged !== undefined &&
                  (newSnapshot === null || compareSnapshots(latestInMerged, newSnapshot) > 0)
                ) {
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

          // 2. Realtime läuft über den zentralen Feed (ensureFeed oben);
          // Events/Status kommen via routeEvent/propagateStatus.
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

    getFeedConnectionState(): LiveKpiFeedConnectionState {
      return feedConnectionState;
    },

    subscribe(kpiId: string, listener: () => void): () => void {
      if (!isSupportedLiveKpiId(kpiId)) {
        return () => {};
      }
      const entry = getOrCreateEntry(kpiId);
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
        mergeFetchedLatest(entry, latest, commit);
      } catch (err) {
        if (entries.get(kpiId) !== entry) return;
        commitFetchError(entry, err, commit);
      }
    },
  };
}

export const liveKpiStreamStore: LiveKpiStreamStore = createLiveKpiStreamStore();
