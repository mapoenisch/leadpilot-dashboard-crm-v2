// Executive Dashboard V2 (Auftrag 148, 149 & 151 / P05, P06 & P06b):
// Gemeinsamer, kollisionssicherer Platzierungspfad für Hinzufügen, Duplizieren und Drop,
// Layoutänderungen (Drag, Resize, Tastatur) und mobile Sortierung.
// Invariante: Nach jeder Operation überlappt in keinem Breakpoint eine Kachel eine andere.

import type {
  BreakpointGridPositions,
  BreakpointKey,
  DashboardTileConfigV2,
  GridPosition,
} from '../../model/dashboardConfigV2';
import type { TileMovement } from '../../core/layoutCommands';
import type { DashboardView } from '../../model/dashboardCatalog';
import { getCatalogEntry, isActiveEntry } from '../../model/dashboardCatalog';
import {
  clamp,
  compactLayout,
  findFirstFreePosition,
  getBreakpointLayout,
  GRID_CONFIGS,
  resolveCollisions,
} from './grid/gridEngine';

const BREAKPOINTS: readonly BreakpointKey[] = ['desktop', 'tablet', 'mobile'];

/** Kontext für neue Kacheln: globale Filter des Dashboards */
export interface NewTileContext {
  timeframe: string;
  pipeline?: string;
}

/** Prüft, ob eine Katalog-ID eine aktive, hinzufügbare Kennzahl bezeichnet (Befund N-5) */
export function isAddableCatalogId(catalogId: string): boolean {
  const entry = getCatalogEntry(catalogId);
  return entry !== undefined && isActiveEntry(entry);
}

let idSequence = 0;
function createTileId(prefix: string, tiles: readonly DashboardTileConfigV2[]): string {
  const taken = new Set(tiles.map((t) => t.id));
  let id: string;
  do {
    idSequence += 1;
    id = `${prefix}_${Date.now().toString(36)}${idSequence.toString(36)}`;
  } while (taken.has(id));
  return id;
}

/**
 * Nächste freie Rasterposition je Breakpoint (Befund N-1/N-2): erste Lücke im abgeleiteten,
 * überlappungsfreien Layout, zeilenweise von oben.
 */
export function computeNextAvailablePosition(
  tiles: readonly DashboardTileConfigV2[],
  width = 6,
  height = 4,
): Required<BreakpointGridPositions> {
  const widths: Record<BreakpointKey, number> = {
    desktop: Math.min(GRID_CONFIGS.desktop.cols, width),
    tablet: Math.min(GRID_CONFIGS.tablet.cols, width),
    mobile: 1,
  };
  const result = {} as Required<BreakpointGridPositions>;
  for (const bp of BREAKPOINTS) {
    const occupied = getBreakpointLayout(tiles, bp).values();
    result[bp] = findFirstFreePosition(occupied, widths[bp], height, bp);
  }
  return result;
}

/** Startgröße einer neuen Kachel abhängig von der ersten Darstellungsform */
function initialSizeFor(view: DashboardView): { w: number; h: number } {
  return view === 'zahl' ? { w: 3, h: 3 } : { w: 6, h: 4 };
}

/**
 * Baut eine neue Kachel an der nächsten freien Position aller Breakpoints.
 * Einziger Einstieg für Hinzufügen und Drop; liefert null bei unbekannter oder inaktiver ID.
 */
export function buildNewTile(
  catalogId: string,
  tiles: readonly DashboardTileConfigV2[],
  context: NewTileContext,
): DashboardTileConfigV2 | null {
  const entry = getCatalogEntry(catalogId);
  if (!entry || !isActiveEntry(entry)) return null;

  const view: DashboardView = (entry.views[0] as DashboardView | undefined) ?? 'zahl';
  const { w, h } = initialSizeFor(view);

  return {
    id: createTileId(`tile_${catalogId.replace(/[^a-zA-Z0-9_]/g, '_')}`, tiles),
    catalogId,
    title: entry.name,
    presentation: view,
    layouts: computeNextAvailablePosition(tiles, w, h),
    query: { metricId: catalogId, pipelineId: context.pipeline, timeframe: context.timeframe },
  };
}

/** Dupliziert eine Kachel an die nächste freie Position aller Breakpoints */
export function buildDuplicateTile(
  tile: DashboardTileConfigV2,
  tiles: readonly DashboardTileConfigV2[],
): DashboardTileConfigV2 {
  const desktop = getBreakpointLayout(tiles, 'desktop').get(tile.id) ?? tile.layouts.desktop;
  return {
    ...tile,
    id: createTileId('tile_clone', tiles),
    title: `${tile.title} (Kopie)`,
    layouts: computeNextAvailablePosition(tiles, desktop.w, desktop.h),
  };
}

/**
 * Differenz zwischen abgeleitetem Ist-Layout und Ziel-Layout eines Breakpoints.
 * Kacheln ohne explizite Position in diesem Breakpoint werden mit übernommen (materialisiert),
 * damit die abgeleitete Fallback-Position nach dem Speichern nicht springt.
 */
export function collectLayoutMoves(
  tiles: readonly DashboardTileConfigV2[],
  breakpoint: BreakpointKey,
  target: ReadonlyMap<string, GridPosition>,
): TileMovement[] {
  const current = getBreakpointLayout(tiles, breakpoint);
  const moves: TileMovement[] = [];
  for (const tile of tiles) {
    const to = target.get(tile.id);
    const from = current.get(tile.id);
    if (!to || !from) continue;
    const changed = to.x !== from.x || to.y !== from.y || to.w !== from.w || to.h !== from.h;
    if (changed || tile.layouts[breakpoint] === undefined) {
      moves.push({ tileId: tile.id, from: { ...from }, to: { ...to } });
    }
  }
  return moves;
}

/** Plant Verschieben oder Skalieren einer Kachel inklusive Reflow und Kompaktierung */
export function planLayoutChange(
  tiles: readonly DashboardTileConfigV2[],
  breakpoint: BreakpointKey,
  activeTileId: string,
  proposed: GridPosition,
): { positions: Map<string, GridPosition>; moves: TileMovement[] } {
  const resolved = resolveCollisions(tiles, activeTileId, proposed, breakpoint);
  const positions = compactLayout(resolved, activeTileId);
  return { positions, moves: collectLayoutMoves(tiles, breakpoint, positions) };
}

/** Erstellt eine neue Kachel an einer gezielten Rasterposition inklusive Kollisions-Reflow */
export function createTileAtGridPosition(
  catalogId: string,
  targetPosition: GridPosition,
  existingTiles: readonly DashboardTileConfigV2[],
  breakpoint: BreakpointKey,
  globalTimeframe: string,
  globalPipeline?: string,
): { newTile: DashboardTileConfigV2; reflowMoves: TileMovement[] } | null {
  const base = buildNewTile(catalogId, existingTiles, {
    timeframe: globalTimeframe,
    pipeline: globalPipeline,
  });
  if (!base) return null;

  const cols = GRID_CONFIGS[breakpoint].cols;
  const isNumber = base.presentation === 'zahl';
  const w = breakpoint === 'mobile' ? 1 : isNumber ? 3 : Math.min(cols, targetPosition.w || 6);
  const h = isNumber ? 3 : targetPosition.h || 4;
  const targetPos: GridPosition = {
    x: clamp(targetPosition.x, 0, cols - w),
    y: Math.max(0, targetPosition.y),
    w,
    h,
  };

  // Die neue Kachel ist im Ziel-Breakpoint die aktive, feste Kachel; die übrigen weichen aus.
  const resolved = resolveCollisions(existingTiles, base.id, targetPos, breakpoint);
  const positions = compactLayout(resolved, base.id);
  const placed = positions.get(base.id)!;

  return {
    newTile: { ...base, layouts: { ...base.layouts, [breakpoint]: placed } },
    reflowMoves: collectLayoutMoves(existingTiles, breakpoint, positions),
  };
}

/**
 * Tauscht auf Mobile zwei benachbarte Kacheln. Beide werden lückenlos neu gestapelt
 * (nicht nur die y-Werte getauscht), damit ungleiche Höhen keine Überlappung erzeugen.
 */
export function reorderMobileTiles(
  tiles: readonly DashboardTileConfigV2[],
  tileId: string,
  direction: 'up' | 'down',
): TileMovement[] | null {
  const layout = getBreakpointLayout(tiles, 'mobile');
  const sorted = tiles
    .map((t, index) => ({ id: t.id, index, pos: layout.get(t.id)! }))
    .sort((a, b) => a.pos.y - b.pos.y || a.index - b.index);
  const index = sorted.findIndex((t) => t.id === tileId);
  if (index === -1) return null;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return null;

  const upper = sorted[Math.min(index, targetIndex)]!;
  const lower = sorted[Math.max(index, targetIndex)]!;

  const target = new Map(layout);
  target.set(lower.id, { ...lower.pos, y: upper.pos.y });
  target.set(upper.id, { ...upper.pos, y: upper.pos.y + lower.pos.h });
  return collectLayoutMoves(tiles, 'mobile', target);
}
