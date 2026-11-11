// Executive Dashboard V2 (Auftrag 148 & 149 / P05 & P06):
// Handlers für Kachel-Konfigurationsänderungen aus dem Inspector
// (Titel, Darstellungsart, Filter-Overrides, Schwellenwerte, Drilldown).

import { useCallback } from 'react';
import { UpdateTileConfigCommand } from '../../core/editorCommands';
import type { EditorCommand } from '../../core/commandTypes';
import type { DashboardTileConfigV2, TileThresholdRule } from '../../model/dashboardConfigV2';
import type { DashboardView } from '../../model/dashboardCatalog';

export interface UseTileInspectorActionsOptions {
  tiles: readonly DashboardTileConfigV2[];
  dispatch: (command: EditorCommand) => void;
}

export function useTileInspectorActions({ tiles, dispatch }: UseTileInspectorActionsOptions) {
  const handleTileTitleChange = useCallback(
    (tileId: string, newTitle: string) => {
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile || tile.title === newTitle) return;

      const cmd = new UpdateTileConfigCommand(tileId, { title: tile.title }, { title: newTitle });
      dispatch(cmd);
    },
    [tiles, dispatch],
  );

  const handleTileViewChange = useCallback(
    (tileId: string, newView: DashboardView) => {
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile || tile.presentation === newView) return;

      const cmd = new UpdateTileConfigCommand(
        tileId,
        { presentation: tile.presentation },
        { presentation: newView },
      );
      dispatch(cmd);
    },
    [tiles, dispatch],
  );

  const handleTileOverrideChange = useCallback(
    (tileId: string, patch: Partial<DashboardTileConfigV2>) => {
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;

      const fromPatch = (Object.keys(patch) as Array<keyof DashboardTileConfigV2>).reduce<
        Partial<DashboardTileConfigV2>
      >((acc, key) => {
        return Object.assign(acc, { [key]: tile[key] });
      }, {});

      const cmd = new UpdateTileConfigCommand(tileId, fromPatch, patch);
      dispatch(cmd);
    },
    [tiles, dispatch],
  );

  const handleTileThresholdChange = useCallback(
    (tileId: string, rule: TileThresholdRule | undefined) => {
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;

      const cmd = new UpdateTileConfigCommand(
        tileId,
        { threshold: tile.threshold },
        { threshold: rule },
      );
      dispatch(cmd);
    },
    [tiles, dispatch],
  );

  const handleTileDrilldownChange = useCallback(
    (tileId: string, url: string | undefined) => {
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;

      const cmd = new UpdateTileConfigCommand(
        tileId,
        { drilldownUrl: tile.drilldownUrl },
        { drilldownUrl: url },
      );
      dispatch(cmd);
    },
    [tiles, dispatch],
  );

  return {
    handleTileTitleChange,
    handleTileViewChange,
    handleTileOverrideChange,
    handleTileThresholdChange,
    handleTileDrilldownChange,
  };
}
