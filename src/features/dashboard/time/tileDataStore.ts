// Auftrag 166 (Codex Review Finding): Geteilter Speicher fuer den angezeigten Datenstand der Canvas-Kacheln.
// Verhindert, dass der Inspector bei Kachelauswahl nach Pausenbeginn einen abweichenden Stand laedt.

import type { TileData } from '../data/dashboardData';

export interface TileDataStore {
  get: (tileId: string) => TileData | undefined;
  getRaw: (tileId: string) => TileData | undefined;
  set: (tileId: string, data: TileData, rawData?: TileData) => void;
  subscribe: (tileId: string, listener: () => void) => () => void;
}

export function createTileDataStore(): TileDataStore {
  const dataMap = new Map<string, TileData>();
  const rawDataMap = new Map<string, TileData>();
  const listenersMap = new Map<string, Set<() => void>>();

  return {
    get: (tileId: string) => dataMap.get(tileId),
    getRaw: (tileId: string) => rawDataMap.get(tileId),
    set: (tileId: string, data: TileData, rawData?: TileData) => {
      const prev = dataMap.get(tileId);
      const prevRaw = rawDataMap.get(tileId);
      if (prev === data && prevRaw === rawData) return;
      dataMap.set(tileId, data);
      if (rawData) {
        rawDataMap.set(tileId, rawData);
      }
      const listeners = listenersMap.get(tileId);
      if (listeners) {
        listeners.forEach((listener) => listener());
      }
    },
    subscribe: (tileId: string, listener: () => void) => {
      let listeners = listenersMap.get(tileId);
      if (!listeners) {
        listeners = new Set();
        listenersMap.set(tileId, listeners);
      }
      listeners.add(listener);
      return () => {
        listeners?.delete(listener);
        if (listeners?.size === 0) {
          listenersMap.delete(tileId);
        }
      };
    },
  };
}
