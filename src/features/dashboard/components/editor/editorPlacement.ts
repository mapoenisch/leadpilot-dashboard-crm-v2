// Executive Dashboard V2 (Auftrag 148 & 149 / P05 & P06):
// Hilfsfunktionen zur Rasterplatzierung, Auto-Placement und mobilen Sortierung.

import type {
  BreakpointKey,
  DashboardTileConfigV2,
  GridPosition,
} from '../../model/dashboardConfigV2';
import type { TileMovement } from '../../core/layoutCommands';
import type { DashboardView, ActiveCatalogEntry } from '../../model/dashboardCatalog';
import { getCatalogEntry } from '../../model/dashboardCatalog';
import {
  clamp,
  compactLayout,
  getTileGridPosition,
  GRID_CONFIGS,
  resolveCollisions,
  sortTilesDeterministically,
} from './grid/gridEngine';

/** Berechnet die nächste freie Rasterposition für eine neue Kachel */
export function computeNextAvailablePosition(
  tiles: readonly DashboardTileConfigV2[],
  width = 6,
  height = 4,
): {
  desktop: { x: number; y: number; w: number; h: number };
  tablet: { x: number; y: number; w: number; h: number };
  mobile: { x: number; y: number; w: number; h: number };
} {
  let maxY = 0;
  for (const t of tiles) {
    const bottom = t.layouts.desktop.y + t.layouts.desktop.h;
    if (bottom > maxY) maxY = bottom;
  }

  let currentX = 0;
  const lastRowTiles = tiles.filter((t) => t.layouts.desktop.y + t.layouts.desktop.h > maxY - 1);
  for (const t of lastRowTiles) {
    const right = t.layouts.desktop.x + t.layouts.desktop.w;
    if (right > currentX && right <= 12) {
      currentX = right;
    }
  }

  let finalX = currentX;
  let finalY = maxY > 0 && currentX + width <= 12 ? Math.max(0, maxY - height) : maxY;

  if (finalX + width > 12) {
    finalX = 0;
    finalY = maxY;
  }

  return {
    desktop: { x: finalX, y: finalY, w: width, h: height },
    tablet: { x: 0, y: finalY, w: Math.min(6, width), h: height },
    mobile: { x: 0, y: finalY, w: 1, h: height },
  };
}

/** Erstellt eine neue Kachel an einer gezielten Rasterposition inklusive Kollisions-Reflow */
export function createTileAtGridPosition(
  catalogId: string,
  targetPosition: GridPosition,
  existingTiles: readonly DashboardTileConfigV2[],
  breakpoint: BreakpointKey,
  globalTimeframe: string,
  globalPipeline?: string,
): {
  newTile: DashboardTileConfigV2;
  reflowMoves: TileMovement[];
} {
  const entry = getCatalogEntry(catalogId) as ActiveCatalogEntry | undefined;
  const initialView: DashboardView = (entry?.views?.[0] as DashboardView) ?? 'zahl';
  const initialW =
    initialView === 'zahl' ? 3 : Math.min(GRID_CONFIGS[breakpoint].cols, targetPosition.w || 6);
  const initialH = initialView === 'zahl' ? 3 : targetPosition.h || 4;

  const targetPos: GridPosition = {
    x: clamp(targetPosition.x, 0, GRID_CONFIGS[breakpoint].cols - initialW),
    y: Math.max(0, targetPosition.y),
    w: initialW,
    h: initialH,
  };

  const resolved = resolveCollisions(existingTiles, '__temp_new_tile__', targetPos, breakpoint);
  const compacted = compactLayout(resolved);

  const reflowMoves: TileMovement[] = [];
  for (const t of existingTiles) {
    const orig = getTileGridPosition(t, breakpoint);
    const tgt = compacted.get(t.id);
    if (tgt && (tgt.x !== orig.x || tgt.y !== orig.y || tgt.w !== orig.w || tgt.h !== orig.h)) {
      reflowMoves.push({ tileId: t.id, from: orig, to: tgt });
    }
  }

  const newId = `tile_${catalogId.replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now().toString(36)}`;
  const defaultNext = computeNextAvailablePosition(existingTiles, initialW, initialH);

  const layouts = {
    desktop: breakpoint === 'desktop' ? targetPos : defaultNext.desktop,
    tablet: breakpoint === 'tablet' ? targetPos : defaultNext.tablet,
    mobile: { x: 0, y: targetPos.y, w: 1, h: initialH },
  };

  const newTile: DashboardTileConfigV2 = {
    id: newId,
    catalogId,
    title: entry?.name ?? catalogId,
    presentation: initialView,
    layouts,
    query: {
      metricId: catalogId,
      pipelineId: globalPipeline,
      timeframe: globalTimeframe,
    },
  };

  return { newTile, reflowMoves };
}

/** Tauscht auf Mobile zwei benachbarte Kacheln vertikal */
export function reorderMobileTiles(
  tiles: readonly DashboardTileConfigV2[],
  tileId: string,
  direction: 'up' | 'down',
): TileMovement[] | null {
  const sorted = sortTilesDeterministically(tiles, 'mobile');
  const index = sorted.findIndex((t) => t.id === tileId);
  if (index === -1) return null;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return null;

  const current = sorted[index]!;
  const target = sorted[targetIndex]!;

  const posCurrent = getTileGridPosition(current, 'mobile');
  const posTarget = getTileGridPosition(target, 'mobile');

  return [
    { tileId: current.id, from: posCurrent, to: { ...posCurrent, y: posTarget.y } },
    { tileId: target.id, from: posTarget, to: { ...posTarget, y: posCurrent.y } },
  ];
}
