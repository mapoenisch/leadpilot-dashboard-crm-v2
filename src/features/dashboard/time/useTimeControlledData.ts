// Auftrag 159 (P10a): Einfrieren des Datenpfads bei gemeinsamer Pause.
// Die Signatur bleibt die von useDashboardData; zusätzlich wird je geliefertem TileData ein
// unsichtbarer Datenstand (WeakMap) hinterlegt, den die Kachel für ihre Standzeile liest.
import { useRef } from 'react';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { useDashboardData, type UseDashboardDataOptions } from '../hooks/useDashboardData';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import type { TileData } from '../data/dashboardData';
import { useTimeControl } from './TimeControlProvider';

export interface TileStand {
  mode: 'live' | 'pausiert';
  /** Beginn der gemeinsamen Pause (ISO) oder null im Live-Modus. */
  analysisAt: string | null;
  /** Zeitpunkt, zu dem die angezeigten Daten in dieser Kachel ankamen (ISO). */
  observedAt: string | null;
  /** true, wenn die Kachel erst nach Pausenbeginn Daten erhalten hat. */
  loadedAfterPause: boolean;
}

const STANDS = new WeakMap<TileData, TileStand>();

export function attachTileStand(data: TileData, stand: TileStand): TileData {
  STANDS.set(data, stand);
  return data;
}

export const attachStand = attachTileStand;

/** Liest den Datenstand einer Kachel; V1-Daten haben keinen und bleiben unverändert. */
export function readTileStand(data: TileData): TileStand | null {
  return STANDS.get(data) ?? null;
}

const CRM_FETCHED_AT = new WeakMap<TileData, number>();

/** Reicht den tatsächlichen Query-Zeitstempel (dataUpdatedAt) von React Query durch. */
export function attachCrmFetchedAt(data: TileData, fetchedAt: number): TileData {
  CRM_FETCHED_AT.set(data, fetchedAt);
  return data;
}

export function readCrmFetchedAt(data: TileData): number | null {
  return CRM_FETCHED_AT.get(data) ?? null;
}

function isSettled(data: TileData): boolean {
  if (data.state === 'laden') return false;
  // Live-Kacheln ohne Snapshot warten auf den ersten echten Abruf
  if (
    data.state !== 'nicht_verfuegbar' &&
    data.origin.layer === 'live' &&
    data.state === 'keine_daten' &&
    !data.asOf
  ) {
    return false;
  }
  return true;
}

function signatureOf(data: TileData): string {
  if (data.state === 'nicht_verfuegbar') return `nv:${data.reason}`;
  const series = data.series?.map((point) => `${point.label}:${point.value}`).join(',') ?? '';
  return `${data.state}|${data.value ?? ''}|${data.asOf ?? ''}|${series}|${data.message ?? ''}`;
}

function queryKeyOf(tile: DashboardTileConfig, filters?: DashboardFilters): string {
  const pipeline =
    tile.filterMode === 'eigener_zeitraum'
      ? (tile.pipeline ?? '')
      : (tile.pipeline ?? filters?.pipeline ?? '');
  const period =
    tile.filterMode === 'eigener_zeitraum'
      ? `${tile.period?.from ?? ''}_${tile.period?.to ?? ''}`
      : `${filters?.period?.from ?? ''}_${filters?.period?.to ?? ''}`;
  return `${tile.catalogId}|${tile.filterMode ?? 'dashboard'}|${pipeline}|${period}`;
}

/**
 * Wie useDashboardData, friert im Modus „pausiert“ aber den zuletzt angezeigten Stand ein.
 * Kacheln, die erst nach Pausenbeginn Daten erhalten, werden als abweichender Stand markiert.
 */
export function useTimeControlledData(
  tile: DashboardTileConfig,
  filters?: DashboardFilters,
  options: UseDashboardDataOptions = {},
): TileData {
  return useTimeControlledSource(useDashboardData, tile, filters, options);
}

/** Für Vorschau/Testdaten: derselbe Einfriermechanismus über eine injizierte Datenquelle. */
export function useTimeControlledSource(
  useSource: TileDataHook,
  tile: DashboardTileConfig,
  filters: DashboardFilters | undefined,
  options: UseDashboardDataOptions = {},
): TileData {
  const { state: control } = useTimeControl();
  const paused = control.mode === 'pausiert';

  const source = useSource(tile, filters, { ...options, frozen: paused } as { enabled?: boolean });

  const queryKey = queryKeyOf(tile, filters);
  const lastQueryKey = useRef<string>(queryKey);
  const lastLive = useRef<{ data: TileData; observedAt: number } | null>(null);
  const frozen = useRef<{ data: TileData; observedAt: number; loadedAfterPause: boolean } | null>(
    null,
  );
  const pausedAt = useRef<string | null>(null);
  const signature = useRef<string>('');
  const previousState = useRef<TileData['state'] | null>(null);
  const observedAt = useRef<number>(Date.now());
  const now = Date.now();

  // Bei Änderung der effektiven Kachelabfrage (z. B. Pipelinewechsel während Pause) Stand verwerfen
  if (lastQueryKey.current !== queryKey) {
    lastQueryKey.current = queryKey;
    lastLive.current = null;
    frozen.current = null;
  }

  const crmFetchedAt = readCrmFetchedAt(source);
  if (crmFetchedAt) {
    observedAt.current = crmFetchedAt;
  } else if (source.state !== 'nicht_verfuegbar' && source.asOf) {
    const parsed = Date.parse(source.asOf);
    if (!Number.isNaN(parsed)) observedAt.current = parsed;
  } else {
    const nextSignature = signatureOf(source);
    if (
      nextSignature !== signature.current ||
      (previousState.current === 'laden' && source.state === 'bereit')
    ) {
      signature.current = nextSignature;
      observedAt.current = now;
    }
  }
  previousState.current = source.state;

  if (!paused) {
    pausedAt.current = null;
    frozen.current = null;
    if (isSettled(source)) {
      lastLive.current = { data: source, observedAt: observedAt.current };
    }
    return attachStand(source, {
      mode: 'live',
      analysisAt: null,
      observedAt: isSettled(source) ? new Date(observedAt.current).toISOString() : null,
      loadedAfterPause: false,
    });
  }

  // Pausenbeginn erkennen: neuer Analysezeitpunkt verwirft einen alten Einfrierstand.
  if (pausedAt.current !== control.analysisAt) {
    pausedAt.current = control.analysisAt;
    frozen.current = null;
  }

  if (!frozen.current && lastLive.current) {
    frozen.current = {
      data: lastLive.current.data,
      observedAt: lastLive.current.observedAt,
      loadedAfterPause: false,
    };
  }

  // Ohne Vor-Pausen-Stand (Kachel neu hinzugefügt oder noch im Laden): einmal laden, dann einfrieren.
  if (!frozen.current && isSettled(source)) {
    frozen.current = {
      data: source,
      observedAt: crmFetchedAt ?? observedAt.current,
      loadedAfterPause: true,
    };
  }

  // Erstinitialisierung von Live-Kacheln abschließen, sobald ein erster Snapshot eintrifft
  if (
    frozen.current?.loadedAfterPause &&
    frozen.current.data.state !== 'nicht_verfuegbar' &&
    frozen.current.data.origin.layer === 'live' &&
    frozen.current.data.state === 'keine_daten' &&
    source.state === 'bereit'
  ) {
    frozen.current = {
      data: source,
      observedAt: source.asOf ? Date.parse(source.asOf) : now,
      loadedAfterPause: true,
    };
  }

  const shown = frozen.current?.data ?? source;
  return attachStand(shown, {
    mode: 'pausiert',
    analysisAt: control.analysisAt,
    observedAt: frozen.current ? new Date(frozen.current.observedAt).toISOString() : null,
    loadedAfterPause: frozen.current?.loadedAfterPause ?? false,
  });
}
