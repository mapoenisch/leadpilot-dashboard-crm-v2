// Auftrag 171 (P15a §2.1 Nr. 5): Datenpfad des Kiosks bei Netzverlust.
// Der letzte Stand bleibt sichtbar, wird aber über die vorhandene Zustandslogik als `veraltet`
// gekennzeichnet. Damit stufen Schwellenwerte ihn als `nicht_bewertet` ein (Regel aus Auftrag 166,
// `evaluateThresholdV2`). Es werden keine Werte erfunden: der Zeitstempel bleibt der echte
// Messzeitpunkt (Live) bzw. der echte Abrufzeitpunkt (CRM).
import { createContext, useContext, useMemo, useRef } from 'react';
import type { TileData } from '../../data/dashboardData';
import type { TileDataHook } from '../LazyDashboardTile';
import {
  attachCrmQueryMeta,
  attachTileStand,
  readCrmQueryMeta,
  readTileStand,
} from '../../time/useTimeControlledData';
import { formatKioskTime } from '../../model/kioskParams';

export interface KioskConnectivity {
  /** Beginn des Netzverlusts (ISO) oder null, solange online. */
  offlineSince: string | null;
}

export const KioskConnectivityContext = createContext<KioskConnectivity>({ offlineSince: null });

export function offlineMessage(offlineSince: string): string {
  const time = formatKioskTime(offlineSince);
  return `Offline seit ${time || 'unbekannt'} – Daten werden nicht aktualisiert`;
}

/** Kennzeichnet abgerufene Werte (Live/CRM) als veraltet; andere Zustände bleiben unverändert. */
export function markTileDataOffline(data: TileData, offlineSince: string): TileData {
  if (data.state === 'nicht_verfuegbar') return data;
  if (data.state !== 'bereit' && data.state !== 'veraltet') return data;
  // Nur abgerufene Werte veralten; feste Stammdaten (baseline) bleiben auch offline gültig.
  if (data.origin.layer !== 'live' && data.origin.layer !== 'crm') return data;
  const crmMeta = readCrmQueryMeta(data);
  const asOf = data.asOf ?? (crmMeta?.fetchedAt ? new Date(crmMeta.fetchedAt).toISOString() : null);
  const marked: TileData = {
    ...data,
    state: 'veraltet',
    asOf,
    message: offlineMessage(offlineSince),
  };
  const stand = readTileStand(data);
  if (stand) attachTileStand(marked, stand);
  if (crmMeta) attachCrmQueryMeta(marked, crmMeta);
  return marked;
}

/**
 * Hüllt einen Datenhook ein. Der Rückgabewert ist referenzstabil (einmal je Basis-Hook erzeugen),
 * damit Kacheln nicht neu montieren; der Offline-Zustand kommt aus dem Kontext.
 */
export function createKioskDataHook(base: TileDataHook): TileDataHook {
  return function useKioskTileData(tile, filters, options) {
    const { offlineSince } = useContext(KioskConnectivityContext);
    const data = base(tile, filters, options);
    // Letzter vorzeigbarer Stand: Wechselt der Basis-Hook offline auf einen neuen Abschnitt ohne
    // Cache (z. B. volle Stunde einer Zeitreihe), bleibt dieser Stand als `veraltet` sichtbar.
    const lastGood = useRef<TileData | null>(null);
    if (data.state === 'bereit' || data.state === 'veraltet') lastGood.current = data;
    const kept = lastGood.current?.catalogId === tile.catalogId ? lastGood.current : null;
    const shown = offlineSince && kept ? kept : data;
    return useMemo(
      () => (offlineSince ? markTileDataOffline(shown, offlineSince) : shown),
      [shown, offlineSince],
    );
  };
}
