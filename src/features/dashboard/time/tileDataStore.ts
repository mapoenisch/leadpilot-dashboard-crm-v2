// Auftrag 166 (Codex Review Finding): Geteilter Speicher fuer den angezeigten Datenstand der Canvas-Kacheln.
// Verhindert, dass der Inspector bei Kachelauswahl nach Pausenbeginn einen abweichenden Stand laedt.

import type { TileData } from '../data/dashboardData';

export interface TileDataStore {
  get: (tileId: string) => TileData | undefined;
  set: (tileId: string, data: TileData) => void;
  subscribe: (tileId: string, listener: () => void) => () => void;
}

export function createTileDataStore(): TileDataStore {
  const dataMap = new Map<string, TileData>();
  const listenersMap = new Map<string, Set<() => void>>();

  return {
    get: (tileId: string) => dataMap.get(tileId),
    set: (tileId: string, data: TileData) => {
      const prev = dataMap.get(tileId);
      if (prev === data) return;
      dataMap.set(tileId, data);
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
