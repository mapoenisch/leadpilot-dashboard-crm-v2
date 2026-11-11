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

/** Liefert das erste überlappende Kachelpaar oder null (Auftrag 151 / P06b) */
export function findOverlap(
  positions: ReadonlyMap<string, GridPosition>,
): readonly [string, string] | null {
  const entries = Array.from(positions.entries());
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (rectsIntersect(entries[i]![1], entries[j]![1])) {
        return [entries[i]![0], entries[j]![0]];
      }
    }
  }
  return null;
}

/** Begrenzt eine Position auf das Raster eines Breakpoints */
function boundToGrid(pos: GridPosition, breakpoint: BreakpointKey): GridPosition {
  const cols = GRID_CONFIGS[breakpoint].cols;
  if (breakpoint === 'mobile') {
    return { x: 0, y: Math.max(0, pos.y), w: 1, h: Math.max(1, pos.h) };
  }
  const w = clamp(pos.w, 1, cols);
  return { x: clamp(pos.x, 0, cols - w), y: Math.max(0, pos.y), w, h: Math.max(1, pos.h) };
}

/**
 * Erste freie Position (zeilenweise von oben, dann von links) für eine Kachel der Größe w × h.
 * Deterministisch; findet immer eine Lösung, spätestens unterhalb aller Kacheln.
 */
export function findFirstFreePosition(
  occupied: Iterable<GridPosition>,
  w: number,
  h: number,
  breakpoint: BreakpointKey,
): GridPosition {
  const size = boundToGrid({ x: 0, y: 0, w, h }, breakpoint);
  const cols = GRID_CONFIGS[breakpoint].cols;
  const blockers = Array.from(occupied);
  const maxY = blockers.reduce((m, p) => Math.max(m, p.y + p.h), 0);
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x + size.w <= cols; x++) {
      const candidate: GridPosition = { x, y, w: size.w, h: size.h };
      if (!blockers.some((b) => rectsIntersect(b, candidate))) return candidate;
    }
  }
  return { x: 0, y: maxY, w: size.w, h: size.h };
}

/**
 * Abgeleitetes, überlappungsfreies Layout eines Breakpoints (Auftrag 151 / P06b, Befund N-2).
 * Explizit gespeicherte Positionen werden zuerst gesetzt, danach die aus Desktop abgeleiteten
 * Fallback-Positionen; jede Kachel rückt bei Kollision deterministisch nach unten.
 */
export function getBreakpointLayout(
  tiles: readonly DashboardTileConfigV2[],
  breakpoint: BreakpointKey,
): Map<string, GridPosition> {
  const candidates = tiles.map((tile, index) => ({
    id: tile.id,
    index,
    fallback: tile.layouts[breakpoint] === undefined,
    pos: boundToGrid(getTileGridPosition(tile, breakpoint), breakpoint),
  }));
  candidates.sort(
    (a, b) =>
      Number(a.fallback) - Number(b.fallback) ||
      a.pos.y - b.pos.y ||
      a.pos.x - b.pos.x ||
      a.index - b.index,
  );

  const placed: GridPosition[] = [];
  const unordered = new Map<string, GridPosition>();
  for (const c of candidates) {
    let pos = c.pos;
    let blocker = placed.find((p) => rectsIntersect(p, pos));
    while (blocker) {
      pos = { ...pos, y: blocker.y + blocker.h };
      blocker = placed.find((p) => rectsIntersect(p, pos));
    }
    placed.push(pos);
    unordered.set(c.id, pos);
  }

  // Ausgabe in Kachelreihenfolge (stabile Iteration für Aufrufer)
  const result = new Map<string, GridPosition>();
  for (const tile of tiles) result.set(tile.id, unordered.get(tile.id)!);
  return result;
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

  // 1. Initiale Positionen aus dem abgeleiteten, überlappungsfreien Layout laden
  const positions = getBreakpointLayout(tiles, breakpoint);

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

  // 3. Kaskadierender Push-Down. Jede verschobene Kachel wird wieder eingereiht, auch wenn sie
  //    bereits verarbeitet war (Auftrag 151 / P06b, Befund N-3). Verdrängte Kacheln landen stets
  //    unterhalb ihres Verursachers; die y-Werte steigen nur, die Schleife endet daher.
  const queue: string[] = [activeTileId];
  const queued = new Set<string>(queue);
  const ids = Array.from(positions.keys());
  let guard = 0;

  while (queue.length > 0 && guard++ < 10_000) {
    const currentId = queue.shift()!;
    queued.delete(currentId);
    const currentPos = positions.get(currentId)!;

    for (const otherId of ids) {
      if (otherId === currentId || otherId === activeTileId) continue;
      const otherPos = positions.get(otherId)!;

      if (rectsIntersect(currentPos, otherPos)) {
        positions.set(otherId, { ...otherPos, y: currentPos.y + currentPos.h });
        if (!queued.has(otherId)) {
          queued.add(otherId);
          queue.push(otherId);
        }
      }
    }
  }

  // 4. Absicherung: verbleibt wider Erwarten eine Überlappung, deterministisch nachpacken
  if (findOverlap(positions)) {
    const packed: GridPosition[] = [positions.get(activeTileId)!];
    const order = ids
      .filter((id) => id !== activeTileId)
      .sort((a, b) => positions.get(a)!.y - positions.get(b)!.y || a.localeCompare(b));
    for (const id of order) {
      let pos = positions.get(id)!;
      let blocker = packed.find((p) => rectsIntersect(p, pos));
      while (blocker) {
        pos = { ...pos, y: blocker.y + blocker.h };
        blocker = packed.find((p) => rectsIntersect(p, pos));
      }
      packed.push(pos);
      positions.set(id, pos);
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
