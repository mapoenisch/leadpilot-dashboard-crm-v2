// Auftrag 159 (P10a): ehrlicher Live-Status der V2-Statusleiste.
// Drei getrennte Angaben — Verbindung, letzte neue Daten, Datenstand — ausschließlich aus echten
// Quellen: Live-Store, Live-Feed-Zustand, React-Query-Cache. Keine Ping-, Latenz- oder
// Durchsatzwerte, weil es dafür keine Messung gibt.
import { useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import {
  isLiveKpiReadConfigured,
  type LiveKpiFeedConnectionState,
} from '@/services/liveKpi/liveKpiReadAdapter';
import { LIVE_KPI_DEFINITIONS } from '@/services/liveKpi/liveKpiDefinitions';
import { liveKpiStreamStore, type LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import { dashboardQueryKeys } from '../data/dashboardQueryKeys';
import { getCatalogEntry, isActiveEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import { normalizeTileQuery } from '../model/tileQuery';
import { useTimeControl } from './TimeControlProvider';

export type EditorLiveConnection =
  | 'nicht_konfiguriert'
  | 'kein_live_inhalt'
  | 'verbindet'
  | 'verbunden'
  | 'wiederverbinden'
  | 'offline';

export interface EditorLiveStatus {
  connection: EditorLiveConnection;
  /** Jüngstes tatsächlich empfangenes Live-Ereignis (occurredAt), sonst null. */
  lastEventAt: string | null;
  /** Ältester aktueller Stand der sichtbaren Kacheln (Live asOf oder CRM-Abruf), sonst null. */
  dataAsOf: string | null;
  /** Beginn der Pause; null im Live-Modus. */
  pausedSince: string | null;
}

const ALL_LIVE_IDS = LIVE_KPI_DEFINITIONS.map((definition) => definition.id);

function pipelineFor(tile: DashboardTileConfigV2, defaultPipeline?: string): string | null {
  const query = normalizeTileQuery(tile);
  if (query.pipelineId === null) return null;
  if (typeof query.pipelineId === 'string') return query.pipelineId;
  return tile.pipelineOverride ?? defaultPipeline ?? null;
}

/** Live-KPI-IDs, die diese Kachel für ihren Wert liest. */
function liveIdsFor(tile: DashboardTileConfigV2): readonly string[] {
  const entry = getCatalogEntry(tile.catalogId);
  if (!entry || !isActiveEntry(entry) || entry.source.layer !== 'live') return [];
  if (entry.id === 'uebersicht.live_aktivitaet') return ALL_LIVE_IDS;
  return entry.source.liveKpiId ? [entry.source.liveKpiId] : [];
}

function liveTileStandTime(tile: DashboardTileConfigV2, store: LiveKpiStreamStore): number | null {
  const entry = getCatalogEntry(tile.catalogId);
  if (!entry || !isActiveEntry(entry) || entry.source.layer !== 'live') return null;

  if (entry.id === 'uebersicht.live_aktivitaet') {
    const times: number[] = [];
    for (const id of ALL_LIVE_IDS) {
      const snap = store.getState(id).snapshot;
      if (snap) {
        const parsed = Date.parse(snap.occurredAt);
        if (!Number.isNaN(parsed)) times.push(parsed);
      }
    }
    return newest(times);
  }

  const liveKpiId = entry.source.liveKpiId;
  if (!liveKpiId) return null;
  const snap = store.getState(liveKpiId).snapshot;
  if (!snap) return null;
  const parsed = Date.parse(snap.occurredAt);
  return Number.isNaN(parsed) ? null : parsed;
}

function newest(timestamps: readonly number[]): number | null {
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function oldest(timestamps: readonly number[]): number | null {
  return timestamps.length > 0 ? Math.min(...timestamps) : null;
}

function mapConnection(
  configured: boolean,
  liveTileCount: number,
  feedState: LiveKpiFeedConnectionState,
  hasLiveData: boolean,
): EditorLiveConnection {
  if (!configured) return 'nicht_konfiguriert';
  if (liveTileCount === 0) return 'kein_live_inhalt';
  switch (feedState) {
    case 'live':
      return 'verbunden';
    case 'connecting':
      return 'verbindet';
    case 'reconnecting':
      return 'wiederverbinden';
    case 'offline':
      // Vor dem ersten Kanalstart ist „offline“ nur der Startwert; ohne je empfangene Daten
      // wäre „Getrennt“ eine erfundene Aussage.
      return hasLiveData ? 'offline' : 'verbindet';
  }
}

function sameStatus(a: EditorLiveStatus, b: EditorLiveStatus): boolean {
  return (
    a.connection === b.connection &&
    a.lastEventAt === b.lastEventAt &&
    a.dataAsOf === b.dataAsOf &&
    a.pausedSince === b.pausedSince
  );
}

export interface UseEditorLiveStatusInput {
  /** Sichtbare Kacheln (eingeklappte Sektionen zählen nicht). */
  tiles: readonly DashboardTileConfigV2[];
  defaultPipeline?: string;
  store?: LiveKpiStreamStore;
  /** Nur Vorschau/Harness: simuliert Konfiguration und Store-Zustand. */
  configured?: boolean;
  overrides?: Partial<EditorLiveStatus>;
}

/**
 * Leitet den Live-Status ab. Aktualisiert höchstens einmal pro Sekunde; ein Wechsel des
 * Feed-Zustands wirkt sofort.
 */
export function useEditorLiveStatus({
  tiles,
  defaultPipeline,
  store = liveKpiStreamStore,
  configured = isLiveKpiReadConfigured(),
  overrides,
}: UseEditorLiveStatusInput): EditorLiveStatus {
  const { state: control } = useTimeControl();
  const queryClient = useContext(QueryClientContext);
  const { session } = useOrganization();
  const organizationId = session?.organizationId;
  const userId = session?.userId ?? (organizationId ? 'anonymous' : undefined);

  const feedState = useSyncExternalStore(
    store.subscribeFeedConnection,
    store.getFeedConnectionState,
    () => 'offline' as const,
  );

  const compute = (): EditorLiveStatus => {
    const liveIds = new Set<string>();
    const liveTileCount = tiles.reduce((count, tile) => {
      const ids = liveIdsFor(tile);
      for (const id of ids) liveIds.add(id);
      return count + (ids.length > 0 ? 1 : 0);
    }, 0);

    const eventTimes: number[] = [];
    let hasLiveData = false;
    // Ohne konfigurierten Feed wurde nichts empfangen — auch dann nicht, wenn ein Harness-Store
    // Testdaten hält. Sonst widerspräche „nicht konfiguriert“ dem angezeigten Ereigniszeitpunkt.
    if (configured) {
      for (const id of liveIds) {
        const snapshot = store.getState(id).snapshot;
        if (!snapshot) continue;
        hasLiveData = true;
        const parsed = Date.parse(snapshot.occurredAt);
        if (!Number.isNaN(parsed)) eventTimes.push(parsed);
      }
    }

    const standTimes: number[] = [];
    if (control.mode !== 'pausiert') {
      for (const tile of tiles) {
        const entry = getCatalogEntry(tile.catalogId);
        if (!entry || !isActiveEntry(entry)) continue;

        if (entry.source.layer === 'live' && configured) {
          const time = liveTileStandTime(tile, store);
          if (time !== null) standTimes.push(time);
        } else if (entry.source.layer === 'crm' && queryClient && organizationId && userId) {
          const key = dashboardQueryKeys.crmOverview(
            organizationId,
            userId,
            pipelineFor(tile, defaultPipeline),
          );
          const state = queryClient.getQueryState(key);
          if (state?.dataUpdatedAt) standTimes.push(state.dataUpdatedAt);
        }
      }
    }

    const connection = mapConnection(configured, liveTileCount, feedState, hasLiveData);
    const latestEvent = newest(eventTimes);
    const oldestStand = oldest(standTimes);

    return {
      connection,
      lastEventAt: latestEvent === null ? null : new Date(latestEvent).toISOString(),
      dataAsOf:
        control.mode === 'pausiert' || oldestStand === null
          ? null
          : new Date(oldestStand).toISOString(),
      pausedSince: control.mode === 'pausiert' ? control.analysisAt : null,
      ...overrides,
    };
  };

  const [status, setStatus] = useState<EditorLiveStatus>(compute);
  const computeRef = useRef(compute);
  computeRef.current = compute;

  useEffect(() => {
    const update = () => {
      const next = computeRef.current();
      setStatus((previous) => (sameStatus(previous, next) ? previous : next));
    };
    update();
    // Live-Ereignisse und CRM-Abrufe höchstens einmal pro Sekunde übernehmen (auch bei Pause für lastEventAt).
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [
    tiles,
    defaultPipeline,
    store,
    configured,
    organizationId,
    userId,
    feedState,
    control.mode,
    control.analysisAt,
    queryClient,
  ]);

  return status;
}
