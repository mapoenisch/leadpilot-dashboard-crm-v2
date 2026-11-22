// Executive Dashboard V2 (Auftrag 172 / P15b §2.1 Nr. 1):
// „Bearbeiten per Liste“ für die Smartphone-Ansicht. Kacheln erscheinen in der Reihenfolge des
// Smartphone-Layouts und werden nur über Schaltflächen sortiert, in der Höhe gewählt oder bearbeitet;
// es gibt kein Ziehen auf dem Canvas. Änderungen betreffen ausschließlich das Smartphone-Layout,
// Desktop- und Tablet-Layout bleiben unverändert.

import { createContext, useCallback, useContext, useMemo } from 'react';
import type {
  BreakpointKey,
  DashboardTileConfigV2,
  GridPosition,
} from '../../../model/dashboardConfigV2';
import type { TileMovement } from '../../../core/layoutCommands';
import { planLayoutChange, reorderMobileTiles } from '../editorPlacement';
import { getBreakpointLayout } from '../grid/gridEngine';

export type MobileTileSize = 'klein' | 'mittel' | 'gross';

export const MOBILE_SIZE_HEIGHT: Record<MobileTileSize, number> = {
  klein: 3,
  mittel: 4,
  gross: 6,
};

export const MOBILE_SIZE_LABEL: Record<MobileTileSize, string> = {
  klein: 'Klein',
  mittel: 'Mittel',
  gross: 'Groß',
};

const SIZE_ORDER: MobileTileSize[] = ['klein', 'mittel', 'gross'];

export function mobileSizeFromHeight(h: number): MobileTileSize {
  if (h <= 3) return 'klein';
  if (h >= 6) return 'gross';
  return 'mittel';
}

export function nextMobileSize(size: MobileTileSize): MobileTileSize {
  return SIZE_ORDER[(SIZE_ORDER.indexOf(size) + 1) % SIZE_ORDER.length]!;
}

/** Mindesthöhe einer Listenkachel je Größenstufe (Smartphone-Zeilen sind sonst inhaltshoch). */
export const MOBILE_SIZE_MIN_HEIGHT_CLASS: Record<MobileTileSize, string> = {
  klein: 'min-h-[168px]',
  mittel: 'min-h-[232px]',
  gross: 'min-h-[336px]',
};

/** Vom Editor bereitgestellt: öffnet die Kachel im (Vollbild-)Inspector. */
export interface EditorListModeContextValue {
  onEditTile: (tileId: string) => void;
}

export const EditorListModeContext = createContext<EditorListModeContextValue | null>(null);

export function useEditorListModeContext(): EditorListModeContextValue | null {
  return useContext(EditorListModeContext);
}

export interface ListModeTileInfo {
  index: number;
  total: number;
  size: MobileTileSize;
}

export interface AreaListMode {
  listMode: boolean;
  orderedTiles: DashboardTileConfigV2[];
  infoFor: (tileId: string) => ListModeTileInfo | undefined;
  moveTile: (tileId: string, direction: 'up' | 'down') => void;
  resizeTile: (tileId: string, size: MobileTileSize) => void;
}

/**
 * Listenmodus für einen Rasterbereich (Sektion oder „Ohne Sektion“). Sortiert und plant nur
 * innerhalb des Bereichs, damit Kacheln anderer Sektionen nie mitverschoben werden.
 */
export function useAreaListMode(
  tiles: DashboardTileConfigV2[],
  breakpoint: BreakpointKey,
  isPreviewMode: boolean,
  onCommitLayout: (moves: TileMovement[]) => void,
): AreaListMode {
  const isMobile = breakpoint === 'mobile';
  const listMode = isMobile && !isPreviewMode;

  const { orderedTiles, positions } = useMemo(() => {
    if (!isMobile) return { orderedTiles: tiles, positions: new Map<string, GridPosition>() };
    const layout = getBreakpointLayout(tiles, 'mobile');
    const ordered = tiles
      .map((t, i) => ({ t, i, y: layout.get(t.id)?.y ?? 0 }))
      .sort((a, b) => a.y - b.y || a.i - b.i)
      .map((e) => e.t);
    return { orderedTiles: ordered, positions: layout };
  }, [tiles, isMobile]);

  const infoFor = useCallback(
    (tileId: string): ListModeTileInfo | undefined => {
      const index = orderedTiles.findIndex((t) => t.id === tileId);
      const pos = positions.get(tileId);
      if (index === -1 || !pos) return undefined;
      return { index, total: orderedTiles.length, size: mobileSizeFromHeight(pos.h) };
    },
    [orderedTiles, positions],
  );

  const moveTile = useCallback(
    (tileId: string, direction: 'up' | 'down') => {
      const moves = reorderMobileTiles(tiles, tileId, direction);
      if (moves && moves.length > 0) onCommitLayout(moves);
    },
    [tiles, onCommitLayout],
  );

  const resizeTile = useCallback(
    (tileId: string, size: MobileTileSize) => {
      const pos = positions.get(tileId);
      if (!pos) return;
      const plan = planLayoutChange(tiles, 'mobile', tileId, {
        ...pos,
        h: MOBILE_SIZE_HEIGHT[size],
      });
      if (plan.moves.length > 0) onCommitLayout(plan.moves);
    },
    [tiles, positions, onCommitLayout],
  );

  return { listMode, orderedTiles, infoFor, moveTile, resizeTile };
}
