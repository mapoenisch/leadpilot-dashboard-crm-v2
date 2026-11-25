// Auftrag 174b (K2): Mindestgröße je Kachel aus der Messung ihres Inhalts.
// Jede Kachel meldet, wie viel Platz (px) sie bei Mindestfaktor braucht. Ziehen und Tastatur
// rechnen das in Rasterzellen um und lassen die Kachel nicht kleiner werden.

import { useMemo, useRef } from 'react';
import type { BreakpointKey } from '../../../model/dashboardConfigV2';
import type { TileFitMinimum } from '../../tileFit';
import { GRID_CONFIGS, MAX_TILE_HEIGHT, MIN_TILE_HEIGHT, MIN_TILE_WIDTH } from './gridEngine';

export interface TileMinSizeStore {
  get: (tileId: string) => TileFitMinimum | undefined;
  set: (tileId: string, minimum: TileFitMinimum) => void;
}

/** Stabiler Speicher für die gemeldeten Mindestgrößen einer Rasterfläche. */
export function useTileMinSizes(): TileMinSizeStore {
  const sizes = useRef(new Map<string, TileFitMinimum>());
  return useMemo(
    () => ({
      get: (tileId) => sizes.current.get(tileId),
      set: (tileId, minimum) => {
        sizes.current.set(tileId, minimum);
      },
    }),
    [],
  );
}

/**
 * Kleinste Breite und Höhe in Rasterzellen für eine Kachel. Ohne Messung gelten die festen
 * Untergrenzen. `availableCols` begrenzt die Breite (Kachel ab Spalte x).
 */
export function minGridSize(
  minimum: TileFitMinimum | undefined,
  containerWidth: number,
  breakpoint: BreakpointKey,
  availableCols: number,
): { w: number; h: number } {
  const { cols, rowHeight, gap } = GRID_CONFIGS[breakpoint];
  const floorW = Math.min(breakpoint === 'mobile' ? 1 : MIN_TILE_WIDTH, availableCols);
  if (!minimum || containerWidth <= 0) return { w: floorW, h: MIN_TILE_HEIGHT };
  const colWidth = (containerWidth - gap * (cols - 1)) / cols;
  const w = Math.ceil((minimum.width + gap) / (colWidth + gap));
  const h = Math.ceil((minimum.height + gap) / (rowHeight + gap));
  return {
    w: Math.min(Math.max(floorW, w), availableCols),
    h: Math.min(Math.max(MIN_TILE_HEIGHT, h), MAX_TILE_HEIGHT),
  };
}
