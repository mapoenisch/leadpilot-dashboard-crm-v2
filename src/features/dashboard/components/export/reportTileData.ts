// Auftrag 172 (Codex-Befund PR #213): Der V2-Report übernimmt für bereits angezeigte Kacheln den
// Rohdatenstand der Ansicht (geteilter tileDataStore, wie der Inspector seit Auftrag 166). Eine neu
// gemountete Reportkachel hätte eigene Einfrier-Refs und läse nach Pausenbeginn den aktuellen
// Quellwert – Bildschirm und Report zeigten dann unterschiedliche Werte und Schwellenwert-Status.

import { useSyncExternalStore } from 'react';
import type { TileDataHook } from '../LazyDashboardTile';
import { useOptionalTimeControl } from '../../time/TimeControlProvider';

const noopSubscribe = () => () => {};

export function createReportTileDataHook(useSource: TileDataHook): TileDataHook {
  return function useReportTileData(tile, filters, options) {
    // Quelle immer abfragen (Kacheln, die die Ansicht noch nicht geladen hat)
    const fresh = useSource(tile, filters, options);
    const store = useOptionalTimeControl()?.tileDataStore;
    const shown = useSyncExternalStore(
      store ? (cb) => store.subscribe(tile.tileId, cb) : noopSubscribe,
      () => store?.getRaw(tile.tileId),
    );
    return shown && shown.state !== 'laden' ? shown : fresh;
  };
}
