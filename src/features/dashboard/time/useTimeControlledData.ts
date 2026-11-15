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

function attachStand(data: TileData, stand: TileStand): TileData {
  STANDS.set(data, stand);
  return data;
}

/** Liest den Datenstand einer Kachel; V1-Daten haben keinen und bleiben unverändert. */
export function readTileStand(data: TileData): TileStand | null {
  return STANDS.get(data) ?? null;
}

function isSettled(data: TileData): boolean {
  return data.state !== 'laden';
}

function signatureOf(data: TileData): string {
  if (data.state === 'nicht_verfuegbar') return `nv:${data.reason}`;
  const series = data.series?.map((point) => `${point.label}:${point.value}`).join(',') ?? '';
  return `${data.state}|${data.value ?? ''}|${data.asOf ?? ''}|${series}|${data.message ?? ''}`;
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

  const lastLive = useRef<{ data: TileData; observedAt: number } | null>(null);
  const frozen = useRef<{ data: TileData; observedAt: number; loadedAfterPause: boolean } | null>(
    null,
  );
  const pausedAt = useRef<string | null>(null);
  const signature = useRef<string>('');
  const previousState = useRef<TileData['state'] | null>(null);
  const observedAt = useRef<number>(Date.now());
  const now = Date.now();

  const nextSignature = signatureOf(source);
  if (
    nextSignature !== signature.current ||
    (previousState.current === 'laden' && source.state === 'bereit')
  ) {
    signature.current = nextSignature;
    observedAt.current = now;
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
    frozen.current = { data: source, observedAt: now, loadedAfterPause: true };
  }

  const shown = frozen.current?.data ?? source;
  return attachStand(shown, {
    mode: 'pausiert',
    analysisAt: control.analysisAt,
    observedAt: frozen.current ? new Date(frozen.current.observedAt).toISOString() : null,
    loadedAfterPause: frozen.current?.loadedAfterPause ?? false,
  });
}
