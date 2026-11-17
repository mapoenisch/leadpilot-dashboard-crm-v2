// Auftrag 161 (P10b-2): gemeinsamer Fadenkreuz-Store für Verlaufskacheln.
// Verwendet useSyncExternalStore ohne externe Bibliotheken.

export interface CrosshairState {
  at: string | null;
  sourceTileId: string | null;
}

export interface CrosshairStore {
  getSnapshot: () => CrosshairState;
  subscribe: (listener: () => void) => () => void;
  setCrosshair: (at: string | null, sourceTileId?: string | null) => void;
  clearCrosshair: () => void;
}

const INITIAL_CROSSHAIR: CrosshairState = Object.freeze({
  at: null,
  sourceTileId: null,
}) as CrosshairState;

export function createCrosshairStore(): CrosshairStore {
  let state: CrosshairState = INITIAL_CROSSHAIR;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setCrosshair: (at: string | null, sourceTileId: string | null = null) => {
      if (state.at === at && state.sourceTileId === sourceTileId) return;
      state = { at, sourceTileId };
      listeners.forEach((listener) => {
        listener();
      });
    },
    clearCrosshair: () => {
      if (state.at === null && state.sourceTileId === null) return;
      state = INITIAL_CROSSHAIR;
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}
