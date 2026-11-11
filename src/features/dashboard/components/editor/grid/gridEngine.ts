// Executive Dashboard V2 (Auftrag 149 / P06):
// Mathematische 2D-Rasterengine, Kollisionserkennung, deterministischer Reflow
// und vertikale Kompaktierung für das native 12-Spalten-CSS-Grid.

import type {
  BreakpointKey,
  DashboardTileConfigV2,
  GridPosition,
} from '../../../model/dashboardConfigV2';

export interface GridDimensions {
  cols: number;
  rowHeight: number;
  gap: number;
}

export const GRID_CONFIGS: Record<BreakpointKey, GridDimensions> = {
  desktop: { cols: 12, rowHeight: 80, gap: 16 },
  tablet: { cols: 6, rowHeight: 72, gap: 12 },
  mobile: { cols: 1, rowHeight: 64, gap: 12 },
};

export const MIN_TILE_WIDTH = 2;
export const MIN_TILE_HEIGHT = 2;
export const MAX_TILE_HEIGHT = 12;

/** Prüft ob sich zwei Kachelrechtecke überschneiden */
export function rectsIntersect(a: GridPosition, b: GridPosition): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Begrenzt einen Zahlenwert auf ein Intervall [min, max] */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Ermittelt die gültige Rasterposition einer Kachel für einen Breakpoint mit Fallback */
export function getTileGridPosition(
  tile: DashboardTileConfigV2,
  breakpoint: BreakpointKey,
): GridPosition {
  const custom = tile.layouts[breakpoint];
  if (custom) {
    return { ...custom };
  }

  // Fallback vom Desktop-Layout
  const desk = tile.layouts.desktop;
  const maxCols = GRID_CONFIGS[breakpoint].cols;
  const w = Math.min(maxCols, desk.w);
  const x = Math.min(maxCols - w, desk.x);

  return {
    x: Math.max(0, x),
    y: desk.y,
    w: Math.max(1, w),
    h: desk.h,
  };
}

/**
 * Löst Kollisionen deterministisch durch Verdrängung nach unten (Push-Down) auf.
 * Liefert eine Map von tileId -> neuer GridPosition.
 */
export function resolveCollisions(
  tiles: readonly DashboardTileConfigV2[],
  activeTileId: string,
  proposedPos: GridPosition,
  breakpoint: BreakpointKey,
): Map<string, GridPosition> {
  const cols = GRID_CONFIGS[breakpoint].cols;
  const positions = new Map<string, GridPosition>();

  // 1. Initiale Positionen laden
  for (const t of tiles) {
    positions.set(t.id, getTileGridPosition(t, breakpoint));
  }

  // 2. Zielposition der aktiven Kachel klemmen
  const boundedW = clamp(proposedPos.w, breakpoint === 'mobile' ? 1 : MIN_TILE_WIDTH, cols);
  const boundedX = clamp(proposedPos.x, 0, cols - boundedW);
  const boundedY = Math.max(0, proposedPos.y);
  const boundedH = clamp(proposedPos.h, MIN_TILE_HEIGHT, MAX_TILE_HEIGHT);

  const activePos: GridPosition = {
    x: boundedX,
    y: boundedY,
    w: boundedW,
    h: boundedH,
  };
  positions.set(activeTileId, activePos);

  // 3. Kaskadierender Push-Down für alle kollidierenden Kacheln
  const queue: string[] = [activeTileId];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentPos = positions.get(currentId)!;

    for (const other of tiles) {
      if (other.id === currentId || other.id === activeTileId) continue;
      const otherPos = positions.get(other.id)!;

      if (rectsIntersect(currentPos, otherPos)) {
        // Kollidierende Kachel nach unten verdrängen
        const newY = currentPos.y + currentPos.h;
        positions.set(other.id, {
          ...otherPos,
          y: newY,
        });

        if (!processed.has(other.id)) {
          processed.add(other.id);
          queue.push(other.id);
        }
      }
    }
  }

  return positions;
}

/**
 * Vertikale Kompaktierung: Lässt Kacheln nach oben nachrücken (Gravity),
 * ohne die relative Reihenfolge zu verletzen.
 */
export function compactLayout(
  positions: Map<string, GridPosition>,
  fixedTileId?: string,
): Map<string, GridPosition> {
  const result = new Map<string, GridPosition>();
  for (const [id, pos] of positions.entries()) {
    result.set(id, { ...pos });
  }

  // Sortiere Kacheln nach y, dann nach x
  const sortedIds = Array.from(result.keys()).sort((a, b) => {
    const posA = result.get(a)!;
    const posB = result.get(b)!;
    if (posA.y !== posB.y) return posA.y - posB.y;
    return posA.x - posB.x;
  });

  for (const id of sortedIds) {
    if (id === fixedTileId) continue;
    const current = result.get(id)!;

    // Versuche schrittweise nach oben zu schieben
    let testY = current.y;
    while (testY > 0) {
      const candidate: GridPosition = { ...current, y: testY - 1 };
      let hasCollision = false;

      for (const [otherId, otherPos] of result.entries()) {
        if (otherId === id) continue;
        if (rectsIntersect(candidate, otherPos)) {
          hasCollision = true;
          break;
        }
      }

      if (hasCollision) break;
      testY--;
    }

    result.set(id, { ...current, y: testY });
  }

  return result;
}

/** Berechnet Pixel-in-Rasterkoordinaten für Pointer-Events */
export function calculateGridCoordsFromPixel(
  pixelX: number,
  pixelY: number,
  containerRect: DOMRect,
  scrollLeft: number,
  scrollTop: number,
  breakpoint: BreakpointKey,
): { x: number; y: number } {
  const { cols, rowHeight, gap } = GRID_CONFIGS[breakpoint];
  const relativeX = pixelX - containerRect.left + scrollLeft;
  const relativeY = pixelY - containerRect.top + scrollTop;

  const colWidth = (containerRect.width - (cols - 1) * gap) / cols;
  const rawX = Math.floor(relativeX / (colWidth + gap));
  const rawY = Math.floor(relativeY / (rowHeight + gap));

  return {
    x: clamp(rawX, 0, cols - 1),
    y: Math.max(0, rawY),
  };
}

/** Sortiert Kacheln deterministisch nach Zeile (y) und Spalte (x) */
export function sortTilesDeterministically(
  tiles: readonly DashboardTileConfigV2[],
  breakpoint: BreakpointKey,
): DashboardTileConfigV2[] {
  return [...tiles].sort((a, b) => {
    const posA = getTileGridPosition(a, breakpoint);
    const posB = getTileGridPosition(b, breakpoint);
    if (posA.y !== posB.y) return posA.y - posB.y;
    return posA.x - posB.x;
  });
}
