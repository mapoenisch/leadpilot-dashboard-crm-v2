// Executive Dashboard V2 (Auftrag 148 & 157 / P05 & P09a):
// Vier-Zonen-Shell des neuen visuellen Dashboard-Editors.
// Koordiniert Top-Bar, Widget-Bibliothek, Sektions-Canvas, Inspector und Statusleiste,
// steuert Undo/Redo über den Editor-Kern und sichert Entwürfe vor Datenverlust.

import { useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { SetGlobalFilterCommand, UpdateDashboardMetaCommand } from '../../core/editorCommands';
import { useDashboardEditorV2 } from '../../hooks/useDashboardEditorV2';
import type { DashboardConfigV2 } from '../../model/dashboardConfigV2';
import type { TileDataHook } from '../LazyDashboardTile';
import { UnsavedChangesDialog } from '../UnsavedChangesDialog';
import { SectionedCanvasV2 } from './sections/SectionedCanvasV2';
import { useSectionActions } from './sections/useSectionActions';
import { EditorInspectorV2 } from './EditorInspectorV2';
import { EditorStatusBarV2 } from './EditorStatusBarV2';
import { EditorTopBarV2 } from './EditorTopBarV2';
import { WidgetLibraryV2 } from './WidgetLibraryV2';
import { useEditorShortcuts } from './useEditorShortcuts';
import { useTileInspectorActions } from './useTileInspectorActions';
import { useTilePlacementActions } from './useTilePlacementActions';

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
  const isDesktop = typeof window === 'undefined' || window.innerWidth >= 1024;
  const [isLibraryOpen, setIsLibraryOpen] = useState(isDesktop);
  const [isInspectorOpen, setIsInspectorOpen] = useState(isDesktop);
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

  // Sektionsaktionen (Auftrag 157 / P09a)
  const sectionActions = useSectionActions({
    config,
    dispatch,
    isPreviewMode,
    selectedTileId,
    setSelectedTileId,
  });

  // Platzierungs- und Layoutaktionen
  const {
    handleAddTile,
    handleRemoveTile,
    handleDuplicateTile,
    handleCommitLayout,
    handleAddTileAtPosition,
    handleMoveMobile,
  } = useTilePlacementActions({
    config,
    activeBreakpoint,
    selectedTileId,
    dispatch,
    setSelectedTileId,
    getTargetSectionForNewTile: sectionActions.getTargetSectionForNewTile,
  });

  // Kachel-Konfigurationsänderungen aus dem Inspector anbinden
  const {
    handleTileTitleChange,
    handleTileViewChange,
    handleTileOverrideChange,
    handleTileThresholdChange,
    handleTileDrilldownChange,
  } = useTileInspectorActions({ tiles: config.tiles, dispatch });

  // Ausgewählte Kachel ermitteln
  const selectedTile = useMemo(
    () => config.tiles.find((t) => t.id === selectedTileId) ?? null,
    [config.tiles, selectedTileId],
  );

  // Aktive Kachelanzahl (eingeklappte Sektionen zählen als inaktiv, Auftrag 157 §2.4 Nr. 24)
  const activeTileCount = useMemo(() => {
    if (!config.sections || config.sections.length === 0) return config.tiles.length;
    let inactive = 0;
    for (const sec of config.sections) {
      if (sectionActions.isSectionCollapsed(sec.id)) {
        inactive += sec.tileIds.length;
      }
    }
    return config.tiles.length - inactive;
  }, [config.sections, config.tiles.length, sectionActions]);

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

  // Abbrechen & Verwerfen
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

        {/* ZONE 3: SEKTIONEN-CANVAS (MITTE) */}
        <SectionedCanvasV2
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
          activeAreaId={sectionActions.activeAreaId}
          onSelectActiveArea={sectionActions.setActiveAreaId}
          isSectionCollapsed={sectionActions.isSectionCollapsed}
          onToggleCollapseSection={sectionActions.handleToggleCollapse}
          onAddSection={sectionActions.handleAddSection}
          onRenameSection={sectionActions.handleRenameSection}
          onMoveSection={sectionActions.handleMoveSection}
          onRemoveSection={sectionActions.handleRequestRemoveSection}
          onMoveTileToSection={sectionActions.handleMoveTileToSection}
          sectionToRemove={sectionActions.sectionToRemove}
          onConfirmRemoveSection={sectionActions.handleConfirmRemoveSection}
          onCancelRemoveSection={sectionActions.handleCancelRemoveSection}
          announcement={sectionActions.announcement}
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
            onMoveTileToSection={sectionActions.handleMoveTileToSection}
            onExpandSection={(secId) => sectionActions.handleToggleCollapse(secId)}
            isSectionCollapsed={sectionActions.isSectionCollapsed}
          />
        )}
      </div>

      {/* ZONE 5: STATUSLEISTE (UNTEN) */}
      <EditorStatusBarV2
        connectionStatus={isLivePaused ? 'paused' : connectionStatus}
        dataTimestamp={dataTimestamp}
        tileCount={config.tiles.length}
        activeTileCount={activeTileCount}
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
