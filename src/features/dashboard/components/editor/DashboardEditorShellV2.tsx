// Executive Dashboard V2 (Auftrag 148 / P05):
// Vier-Zonen-Shell des neuen visuellen Dashboard-Editors.
// Koordiniert Top-Bar, Widget-Bibliothek, Canvas, Inspector und Statusleiste,
// steuert Undo/Redo über den Editor-Kern und sichert Entwürfe vor Datenverlust.

import { useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AddTileCommand,
  RemoveTileCommand,
  SetGlobalFilterCommand,
  UpdateDashboardMetaCommand,
} from '../../core/editorCommands';
import {
  BatchMoveTilesCommand,
  MoveTileCommand,
  ResizeTileCommand,
} from '../../core/layoutCommands';
import { useDashboardEditorV2 } from '../../hooks/useDashboardEditorV2';
import {
  getCatalogEntry,
  type ActiveCatalogEntry,
  type DashboardView,
} from '../../model/dashboardCatalog';
import type {
  DashboardConfigV2,
  DashboardTileConfigV2,
  GridPosition,
} from '../../model/dashboardConfigV2';
import type { TileDataHook } from '../LazyDashboardTile';
import { UnsavedChangesDialog } from '../UnsavedChangesDialog';
import { EditorCanvasV2 } from './EditorCanvasV2';
import { EditorInspectorV2 } from './EditorInspectorV2';
import { EditorStatusBarV2 } from './EditorStatusBarV2';
import { EditorTopBarV2 } from './EditorTopBarV2';
import { WidgetLibraryV2 } from './WidgetLibraryV2';
import {
  computeNextAvailablePosition,
  createTileAtGridPosition,
  reorderMobileTiles,
} from './editorPlacement';
import { useEditorShortcuts } from './useEditorShortcuts';
import { useTileInspectorActions } from './useTileInspectorActions';

export interface DashboardEditorShellV2Props {
  initialConfig: DashboardConfigV2;
  useData: TileDataHook;
  onSave?: (config: DashboardConfigV2) => Promise<boolean>;
  onCancel?: () => void;
  onShowDetails?: (tileId: string) => void;
  onOpenPanelEditor?: (tileId: string) => void;
  connectionStatus?: 'connected' | 'paused' | 'offline';
  dataTimestamp?: string;
  className?: string;
}

export function DashboardEditorShellV2({
  initialConfig,
  useData,
  onSave,
  onCancel,
  onShowDetails,
  onOpenPanelEditor,
  connectionStatus = 'connected',
  dataTimestamp,
  className,
}: DashboardEditorShellV2Props) {
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isLivePaused, setIsLivePaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const editor = useDashboardEditorV2({
    initialConfig,
    onSave,
  });

  const {
    state,
    historyStats,
    canUndo,
    canRedo,
    dispatch,
    undo,
    redo,
    setSelectedTileId,
    setActiveBreakpoint,
    save: executeSave,
    discard: executeDiscard,
  } = editor;

  const { config, isDirty, activeBreakpoint, selectedTileId } = state;

  useEditorShortcuts({
    isSaving,
    showDiscardConfirm,
    isLeaving: editor.leaveGuard.leaving,
    hasLeaveRequest: editor.leaveGuard.leaveRequest !== null,
    canUndo,
    canRedo,
    undo,
    redo,
  });

  // Ausgewählte Kachel ermitteln
  const selectedTile = useMemo(
    () => config.tiles.find((t) => t.id === selectedTileId) ?? null,
    [config.tiles, selectedTileId],
  );

  // Kachel hinzufügen
  const handleAddTile = useCallback(
    (catalogId: string) => {
      if (config.tiles.length >= 24) return;

      const entry = getCatalogEntry(catalogId) as ActiveCatalogEntry | undefined;
      const initialView: DashboardView = (entry?.views?.[0] as DashboardView) ?? 'zahl';
      const initialW = initialView === 'zahl' ? 3 : 6;
      const initialH = initialView === 'zahl' ? 3 : 4;

      const layouts = computeNextAvailablePosition(config.tiles, initialW, initialH);
      const newId = `tile_${catalogId.replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now().toString(36)}`;

      const newTile: DashboardTileConfigV2 = {
        id: newId,
        catalogId,
        title: entry?.name ?? catalogId,
        presentation: initialView,
        layouts,
        query: {
          metricId: catalogId,
          pipelineId: config.globalPipeline,
          timeframe: config.globalTimeframe,
        },
      };

      const cmd = new AddTileCommand(newTile);
      dispatch(cmd);
      setSelectedTileId(newId);
    },
    [config.tiles, config.globalPipeline, config.globalTimeframe, dispatch, setSelectedTileId],
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

      const cloneLayouts = computeNextAvailablePosition(
        config.tiles,
        tile.layouts.desktop.w,
        tile.layouts.desktop.h,
      );
      const newId = `tile_clone_${Date.now().toString(36)}`;

      const clonedTile: DashboardTileConfigV2 = {
        ...tile,
        id: newId,
        title: `${tile.title} (Kopie)`,
        layouts: cloneLayouts,
      };

      const cmd = new AddTileCommand(clonedTile);
      dispatch(cmd);
      setSelectedTileId(newId);
    },
    [config.tiles, dispatch, setSelectedTileId],
  );

  // Raster-Layout Bewegungen / Reflow committen
  const handleCommitLayout = useCallback(
    (moves: Array<{ tileId: string; from: GridPosition; to: GridPosition }>) => {
      if (moves.length === 0) return;
      if (moves.length === 1) {
        const m = moves[0]!;
        if (m.from.w !== m.to.w || m.from.h !== m.to.h) {
          dispatch(new ResizeTileCommand(m.tileId, activeBreakpoint, m.from, m.to));
        } else {
          dispatch(new MoveTileCommand(m.tileId, activeBreakpoint, m.from, m.to));
        }
      } else {
        dispatch(new BatchMoveTilesCommand(activeBreakpoint, moves));
      }
    },
    [activeBreakpoint, dispatch],
  );

  // Kachel an gezielter Rasterposition hinzufügen (Drop von WidgetLibrary)
  const handleAddTileAtPosition = useCallback(
    (catalogId: string, position: GridPosition) => {
      if (config.tiles.length >= 24) return;
      const { newTile, reflowMoves } = createTileAtGridPosition(
        catalogId,
        position,
        config.tiles,
        activeBreakpoint,
        config.globalTimeframe,
        config.globalPipeline,
      );
      if (reflowMoves.length > 0) {
        dispatch(new BatchMoveTilesCommand(activeBreakpoint, reflowMoves));
      }
      dispatch(new AddTileCommand(newTile));
      setSelectedTileId(newTile.id);
    },
    [
      activeBreakpoint,
      config.globalPipeline,
      config.globalTimeframe,
      config.tiles,
      dispatch,
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

  // Kachel-Konfigurationsänderungen aus dem Inspector anbinden
  const {
    handleTileTitleChange,
    handleTileViewChange,
    handleTileOverrideChange,
    handleTileThresholdChange,
    handleTileDrilldownChange,
  } = useTileInspectorActions({ tiles: config.tiles, dispatch });

  // Dashboard-Titel ändern
  const handleDashboardTitleChange = useCallback(
    (newTitle: string) => {
      if (newTitle === config.title) return;
      const cmd = new UpdateDashboardMetaCommand({ title: config.title }, { title: newTitle });
      dispatch(cmd);
    },
    [config.title, dispatch],
  );

  // Globale Filter ändern
  const handleGlobalFilterChange = useCallback(
    (filters: { timeframe?: string; pipeline?: string }) => {
      if (filters.timeframe !== undefined && filters.timeframe !== config.globalTimeframe) {
        dispatch(
          new SetGlobalFilterCommand('timeframe', config.globalTimeframe, filters.timeframe),
        );
      }
      if (filters.pipeline !== undefined && filters.pipeline !== config.globalPipeline) {
        dispatch(new SetGlobalFilterCommand('pipeline', config.globalPipeline, filters.pipeline));
      }
    },
    [config.globalTimeframe, config.globalPipeline, dispatch],
  );

  // Speichern
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await executeSave();
    } finally {
      setIsSaving(false);
    }
  };

  // Abbrechen
  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onCancel?.();
    }
  };

  const handleDiscardAndLeave = () => {
    executeDiscard();
    setShowDiscardConfirm(false);
    onCancel?.();
  };

  return (
    <div
      data-testid="dashboard-editor-shell-v2"
      className={cn(
        'flex h-screen w-full flex-col overflow-hidden bg-[var(--color-bg-deep,#030c0b)] text-[var(--color-text-soft,#e6f3f1)]',
        className,
      )}
    >
      {/* ZONE 1: TOP-BAR */}
      <EditorTopBarV2
        config={config}
        isDirty={isDirty}
        activeBreakpoint={activeBreakpoint}
        onBreakpointChange={setActiveBreakpoint}
        onTitleChange={handleDashboardTitleChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        isLivePaused={isLivePaused}
        onToggleLivePause={() => setIsLivePaused((prev) => !prev)}
        isPreviewMode={isPreviewMode}
        onTogglePreviewMode={() => {
          setIsPreviewMode((prev) => !prev);
          setSelectedTileId(null);
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        isSaving={isSaving}
        onCancel={handleCancelClick}
        isLibraryOpen={isLibraryOpen}
        onToggleLibrary={() => setIsLibraryOpen((prev) => !prev)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
      />

      {/* MITTLERER ARBEITSBEREICH: BIBLIOTHEK + CANVAS + INSPECTOR */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* ZONE 2: WIDGET-BIBLIOTHEK (LINKS) */}
        {!isPreviewMode && isLibraryOpen && (
          <WidgetLibraryV2
            onAddTile={handleAddTile}
            tileCount={config.tiles.length}
            maxTiles={24}
            onClose={() => setIsLibraryOpen(false)}
          />
        )}

        {/* ZONE 3: CANVAS (MITTE) */}
        <EditorCanvasV2
          config={config}
          activeBreakpoint={activeBreakpoint}
          selectedTileId={selectedTileId}
          onSelectTile={setSelectedTileId}
          onDeselect={() => setSelectedTileId(null)}
          onRemoveTile={handleRemoveTile}
          onDuplicateTile={handleDuplicateTile}
          onCommitLayout={handleCommitLayout}
          onAddTileAtPosition={handleAddTileAtPosition}
          onMoveMobile={handleMoveMobile}
          onShowDetails={onShowDetails}
          onAddTileClick={() => setIsLibraryOpen(true)}
          isPreviewMode={isPreviewMode}
          useData={useData}
        />

        {/* ZONE 4: INSPECTOR (RECHTS) */}
        {!isPreviewMode && isInspectorOpen && (
          <EditorInspectorV2
            selectedTile={selectedTile}
            config={config}
            onDeselect={() => setSelectedTileId(null)}
            onTileTitleChange={handleTileTitleChange}
            onTileViewChange={handleTileViewChange}
            onTileOverrideChange={handleTileOverrideChange}
            onTileThresholdChange={handleTileThresholdChange}
            onTileDrilldownChange={handleTileDrilldownChange}
            onOpenPanelEditor={onOpenPanelEditor}
            onClose={() => setIsInspectorOpen(false)}
          />
        )}
      </div>

      {/* ZONE 5: STATUSLEISTE (UNTEN) */}
      <EditorStatusBarV2
        connectionStatus={isLivePaused ? 'paused' : connectionStatus}
        dataTimestamp={dataTimestamp}
        tileCount={config.tiles.length}
        maxTiles={24}
        undoCount={historyStats.undoCount}
        redoCount={historyStats.redoCount}
        memoryBytes={historyStats.estimatedBytes}
        memoryWarning={Boolean(historyStats.warning)}
      />

      {/* Bestätigungsdialog bei Verwerfen von ungespeicherten Änderungen */}
      <UnsavedChangesDialog
        open={showDiscardConfirm}
        locked={isSaving}
        onStay={() => setShowDiscardConfirm(false)}
        onDiscard={handleDiscardAndLeave}
        onSave={async () => {
          await handleSave();
          setShowDiscardConfirm(false);
          onCancel?.();
        }}
      />
    </div>
  );
}
