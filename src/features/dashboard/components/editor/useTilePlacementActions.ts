// Executive Dashboard V2 (Auftrag 148, 149 & 157 / P05, P06 & P09a):
// Hook für Kachel-Platzierungsaktionen in der Editor-Shell
// (Hinzufügen, Entfernen, Duplizieren, Layout-Commit, Drop-Platzierung, Mobile-Reorder).

import { useCallback } from 'react';
import type { EditorCommand } from '../../core/commandTypes';
import { AddTileCommand, RemoveTileCommand } from '../../core/editorCommands';
import {
  BatchMoveTilesCommand,
  MoveTileCommand,
  ResizeTileCommand,
  type TileMovement,
} from '../../core/layoutCommands';
import type { BreakpointKey, DashboardConfigV2, GridPosition } from '../../model/dashboardConfigV2';
import {
  buildDuplicateTile,
  buildNewTile,
  createTileAtGridPosition,
  reorderMobileTiles,
} from './editorPlacement';

export interface UseTilePlacementActionsOptions {
  config: DashboardConfigV2;
  activeBreakpoint: BreakpointKey;
  selectedTileId: string | null;
  dispatch: (command: EditorCommand) => void;
  setSelectedTileId: (tileId: string | null) => void;
  getTargetSectionForNewTile?: () => string | null;
}

export function useTilePlacementActions({
  config,
  activeBreakpoint,
  selectedTileId,
  dispatch,
  setSelectedTileId,
  getTargetSectionForNewTile,
}: UseTilePlacementActionsOptions) {
  // Kachel hinzufügen
  const handleAddTile = useCallback(
    (catalogId: string) => {
      if (config.tiles.length >= 24) return;
      const targetSectionId = getTargetSectionForNewTile ? getTargetSectionForNewTile() : null;

      // Bereichsbezogene Kacheln für überlappungsfreie Platzierung
      const targetTiles = targetSectionId
        ? config.tiles.filter((t) =>
            config.sections?.find((s) => s.id === targetSectionId)?.tileIds.includes(t.id),
          )
        : config.tiles.filter((t) => !config.sections?.some((s) => s.tileIds.includes(t.id)));

      const newTile = buildNewTile(catalogId, targetTiles, {
        timeframe: config.globalTimeframe,
        pipeline: config.globalPipeline,
      });
      if (!newTile) return;

      const cmd = new AddTileCommand(newTile, undefined, undefined, targetSectionId);
      dispatch(cmd);
      setSelectedTileId(newTile.id);
    },
    [
      config.tiles,
      config.sections,
      config.globalPipeline,
      config.globalTimeframe,
      dispatch,
      getTargetSectionForNewTile,
      setSelectedTileId,
    ],
  );

  // Kachel entfernen
  const handleRemoveTile = useCallback(
    (tileId: string) => {
      const index = config.tiles.findIndex((t) => t.id === tileId);
      if (index === -1) return;
      const tile = config.tiles[index]!;

      const cmd = new RemoveTileCommand(tile, index);
      dispatch(cmd);
      if (selectedTileId === tileId) {
        setSelectedTileId(null);
      }
    },
    [config.tiles, selectedTileId, dispatch, setSelectedTileId],
  );

  // Kachel duplizieren
  const handleDuplicateTile = useCallback(
    (tileId: string) => {
      if (config.tiles.length >= 24) return;
      const tile = config.tiles.find((t) => t.id === tileId);
      if (!tile) return;

      const clonedTile = buildDuplicateTile(tile, config.tiles);
      const targetSectionId = config.sections?.find((s) => s.tileIds.includes(tileId))?.id ?? null;

      const cmd = new AddTileCommand(clonedTile, undefined, undefined, targetSectionId);
      dispatch(cmd);
      setSelectedTileId(clonedTile.id);
    },
    [config.tiles, config.sections, dispatch, setSelectedTileId],
  );

  // Raster-Layout Bewegungen / Reflow committen
  const handleCommitLayout = useCallback(
    (moves: TileMovement[]) => {
      if (moves.length === 0) return;
      if (moves.length === 1) {
        const m = moves[0]!;
        if (m.from.w !== m.to.w || m.from.h !== m.to.h) {
          dispatch(
            new ResizeTileCommand(
              m.tileId,
              activeBreakpoint,
              m.from,
              m.to,
              undefined,
              m.wasDerived,
            ),
          );
        } else {
          dispatch(
            new MoveTileCommand(m.tileId, activeBreakpoint, m.from, m.to, undefined, m.wasDerived),
          );
        }
      } else {
        dispatch(new BatchMoveTilesCommand(activeBreakpoint, moves));
      }
    },
    [activeBreakpoint, dispatch],
  );

  // Kachel an gezielter Rasterposition hinzufügen (Drop von WidgetLibrary)
  const handleAddTileAtPosition = useCallback(
    (catalogId: string, position: GridPosition, targetSectionId?: string | null) => {
      if (config.tiles.length >= 24) return;
      const targetSec =
        targetSectionId !== undefined
          ? targetSectionId
          : getTargetSectionForNewTile
            ? getTargetSectionForNewTile()
            : null;

      const targetTiles = targetSec
        ? config.tiles.filter((t) =>
            config.sections?.find((s) => s.id === targetSec)?.tileIds.includes(t.id),
          )
        : config.tiles.filter((t) => !config.sections?.some((s) => s.tileIds.includes(t.id)));

      const placement = createTileAtGridPosition(
        catalogId,
        position,
        targetTiles,
        activeBreakpoint,
        config.globalTimeframe,
        config.globalPipeline,
      );
      if (!placement) return;
      const { newTile, reflowMoves } = placement;
      if (reflowMoves.length > 0) {
        dispatch(new BatchMoveTilesCommand(activeBreakpoint, reflowMoves));
      }
      dispatch(new AddTileCommand(newTile, undefined, undefined, targetSec));
      setSelectedTileId(newTile.id);
    },
    [
      activeBreakpoint,
      config.globalPipeline,
      config.globalTimeframe,
      config.sections,
      config.tiles,
      dispatch,
      getTargetSectionForNewTile,
      setSelectedTileId,
    ],
  );

  // Kacheln auf Mobile vertikal sortieren
  const handleMoveMobile = useCallback(
    (tileId: string, direction: 'up' | 'down') => {
      const moves = reorderMobileTiles(config.tiles, tileId, direction);
      if (moves && moves.length > 0) {
        dispatch(new BatchMoveTilesCommand('mobile', moves));
      }
    },
    [config.tiles, dispatch],
  );

  return {
    handleAddTile,
    handleRemoveTile,
    handleDuplicateTile,
    handleCommitLayout,
    handleAddTileAtPosition,
    handleMoveMobile,
  };
}
