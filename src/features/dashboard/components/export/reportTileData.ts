// Auftrag 172 (Codex-Befunde PR #213): Der V2-Report übernimmt für bereits angezeigte Kacheln den
// Rohdatenstand der Ansicht (geteilter tileDataStore, wie der Inspector seit Auftrag 166). Eine neu
// gemountete Reportkachel hätte eigene Einfrier-Refs und läse nach Pausenbeginn den aktuellen
// Quellwert – Bildschirm und Report zeigten dann unterschiedliche Werte und Schwellenwert-Status.
// Der gespeicherte Stand gilt nur bei passendem Abfrage- und Zeitkontext: Eingeklappte Sektionen
// hängen ihre Kacheln aus, ihr Store-Eintrag kann aus einem früheren Filter oder Zeitpunkt stammen.

import { useSyncExternalStore } from 'react';
import type { TileDataHook } from '../LazyDashboardTile';
import type { TileData } from '../../data/dashboardData';
import { useOptionalTimeControl } from '../../time/TimeControlProvider';
import { readTileStand } from '../../time/useTimeControlledData';
import type { TimeControlState } from '../../time/timeControl';

const noopSubscribe = () => () => {};

function periodKey(d: TileData): string {
  if (d.state === 'nicht_verfuegbar') return '';
  const p = d.effectiveFilter.period;
  return p ? `${p.from}_${p.to}` : '';
}

/** true, wenn der angezeigte Stand zum aktuellen Abfrage- und Zeitkontext der Quelle passt. */
export function matchesReportContext(
  shown: TileData,
  fresh: TileData,
  control: TimeControlState | undefined,
): boolean {
  if (shown.state === 'nicht_verfuegbar' || fresh.state === 'nicht_verfuegbar') return false;
  if (shown.state === 'laden' || shown.catalogId !== fresh.catalogId) return false;
  if ((shown.effectiveFilter.pipeline ?? '') !== (fresh.effectiveFilter.pipeline ?? '')) {
    return false;
  }
  if (periodKey(shown) !== periodKey(fresh)) return false;
  const stand = readTileStand(shown);
  if (control && stand) {
    if (stand.mode !== control.mode) return false;
    if (control.mode !== 'live' && stand.analysisAt !== control.analysisAt) return false;
  }
  return true;
}

export function createReportTileDataHook(useSource: TileDataHook): TileDataHook {
  return function useReportTileData(tile, filters, options) {
    // Quelle immer abfragen (Kacheln, die die Ansicht noch nicht oder anders geladen hat)
    const fresh = useSource(tile, filters, options);
    const timeControl = useOptionalTimeControl();
    const store = timeControl?.tileDataStore;
    const shown = useSyncExternalStore(
      store ? (cb) => store.subscribe(tile.tileId, cb) : noopSubscribe,
      () => store?.getRaw(tile.tileId),
    );
    return shown && matchesReportContext(shown, fresh, timeControl?.state) ? shown : fresh;
  };
}
