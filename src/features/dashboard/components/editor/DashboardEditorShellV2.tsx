// Executive Dashboard V2 (Auftrag 148 & 157 / P05 & P09a): Vier-Zonen-Shell des neuen Dashboard-Editors.
// Koordiniert Top-Bar, Widget-Bibliothek, Sektions-Canvas, Inspector und Statusleiste.

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDashboardEditorV2 } from '../../hooks/useDashboardEditorV2';
import type { DashboardConfigV2 } from '../../model/dashboardConfigV2';
import {
  TimeControlProvider,
  useTimeControl,
  useOptionalTimeControl,
} from '../../time/TimeControlProvider';
import type { EditorLiveStatus } from '../../time/useEditorLiveStatus';
import type { LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import type { TileDataHook } from '../LazyDashboardTile';
import { UnsavedChangesDialog } from '../UnsavedChangesDialog';
import { SectionedCanvasV2 } from './sections/SectionedCanvasV2';
import { useSectionActions } from './sections/useSectionActions';
import { EditorInspectorV2 } from './EditorInspectorV2';
import { EditorStatusBarV2 } from './EditorStatusBarV2';
import { EditorTopBarV2 } from './EditorTopBarV2';
import { WidgetLibraryV2 } from './WidgetLibraryV2';
import { useEditorShortcuts } from './useEditorShortcuts';
import { useDashboardShellController } from './useDashboardShellController';
import { ReadOnlyNoticeV2 } from './ReadOnlyNoticeV2';

export interface DashboardEditorShellV2Props {
  initialConfig: DashboardConfigV2;
  useData: TileDataHook;
  onSave?: (config: DashboardConfigV2) => Promise<boolean>;
  onCancel?: () => void;
  onShowDetails?: (tileId: string) => void;
  onOpenPanelEditor?: (tileId: string) => void;
  /** Auftrag 159: einmaliges Neuladen der sichtbaren CRM-Abfragen nach „Fortsetzen“. */
  onResume?: () => void;
  /** Nur Vorschau/Harness: simulierter Live-Store und Konfiguration. */
  liveStore?: LiveKpiStreamStore;
  liveConfigured?: boolean;
  liveStatusOverrides?: Partial<EditorLiveStatus>;
  readOnly?: boolean;
  readOnlyCopyError?: string | null;
  onSaveAsPersonalCopy?: () => Promise<void>;
  isSavingPersonalCopy?: boolean;
  className?: string;
  dashboards?: (
    | import('../../services/dashboardStorageV2Types').AccessibleDashboardListItemV2
    | import('../../services/dashboardStorageV2Types').PersonalDashboardListItemV2
  )[];
  currentStoredDashboard?: import('../../services/dashboardStorageV2Types').StoredDashboardV2Row;
  onOpenDashboard?: (id: string) => Promise<boolean>;
  onCreateFromTemplate?: (
    templateId: string,
    title?: string,
  ) => Promise<{ ok: boolean; error?: unknown }>;
  onDuplicateCurrent?: (title?: string) => Promise<{ ok: boolean; error?: unknown }>;
  onDeleteDashboard?: (
    id: string,
  ) => Promise<{ ok: boolean; nextDashboardId?: string | null; error?: unknown }>;
  onShareWithTeam?: (teamId: string, title: string) => Promise<{ ok: boolean; error?: unknown }>;
  onRefreshList?: () => Promise<void>;
  listError?: import('../../services/dashboardStorageV2Types').DashboardV2StorageError | null;
  onOpenVersions?: (context?: { isDirty: boolean; draftConfig: DashboardConfigV2 }) => void;
  onOpenImport?: () => void;
}

export function DashboardEditorShellV2(props: DashboardEditorShellV2Props) {
  const existing = useOptionalTimeControl();
  if (existing) {
    return <DashboardEditorShellBody {...props} />;
  }
  return (
    <TimeControlProvider>
      <DashboardEditorShellBody {...props} />
    </TimeControlProvider>
  );
}

function DashboardEditorShellBody({
  initialConfig,
  useData,
  onSave,
  onCancel,
  onShowDetails,
  onOpenPanelEditor,
  onResume,
  liveStore,
  liveConfigured,
  liveStatusOverrides,
  readOnly: explicitReadOnly,
  readOnlyCopyError,
  onSaveAsPersonalCopy,
  isSavingPersonalCopy,
  className,
  dashboards,
  currentStoredDashboard,
  onOpenDashboard,
  onCreateFromTemplate,
  onDuplicateCurrent,
  onDeleteDashboard,
  onShareWithTeam,
  onRefreshList,
  listError,
  onOpenVersions,
  onOpenImport,
}: DashboardEditorShellV2Props) {
  const isReadOnly = explicitReadOnly ?? currentStoredDashboard?.canWrite === false;
  const isDesktop = typeof window === 'undefined' || window.innerWidth >= 1024;
  const [isLibraryOpen, setIsLibraryOpen] = useState(!isReadOnly && isDesktop);
  const [isInspectorOpen, setIsInspectorOpen] = useState(!isReadOnly && isDesktop);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const timeControl = useTimeControl();
  const isLivePaused = timeControl.state.mode === 'pausiert';

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
  } = editor;

  const { config, isDirty, activeBreakpoint, selectedTileId } = state;

  // Sektionsaktionen (Auftrag 157 / P09a; flüchtiges Einklappen auch im Lesemodus)
  const sectionActions = useSectionActions({
    config,
    dispatch,
    isPreviewMode: isPreviewMode || isReadOnly,
    selectedTileId,
    setSelectedTileId,
  });

  const {
    isSaving,
    showDiscardConfirm,
    setShowDiscardConfirm,
    selectedTile,
    activeTileCount,
    liveStatus,
    handleToggleLivePause,
    handleDashboardTitleChange,
    handleGlobalFilterChange,
    handleSave,
    handleCancelClick,
    handleDiscardAndLeave,
    placementActions,
    inspectorActions,
  } = useDashboardShellController({
    editor,
    sectionActions,
    timeControl,
    onResume,
    onCancel,
    liveStore,
    liveConfigured,
    liveStatusOverrides,
  });

  useEditorShortcuts({
    isSaving,
    showDiscardConfirm,
    isLeaving: editor.leaveGuard.leaving,
    hasLeaveRequest: editor.leaveGuard.leaveRequest !== null,
    canUndo: !isReadOnly && canUndo,
    canRedo: !isReadOnly && canRedo,
    undo,
    redo,
  });

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
        onToggleLivePause={handleToggleLivePause}
        onResume={onResume}
        isPreviewMode={isPreviewMode}
        onTogglePreviewMode={() => {
          setIsPreviewMode((p) => !p);
          setSelectedTileId(null);
        }}
        canUndo={!isReadOnly && canUndo}
        canRedo={!isReadOnly && canRedo}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        isSaving={isSaving}
        onCancel={handleCancelClick}
        readOnly={isReadOnly}
        isLibraryOpen={isLibraryOpen}
        onToggleLibrary={() => setIsLibraryOpen((prev) => !prev)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        dashboards={dashboards}
        currentStoredDashboard={currentStoredDashboard}
        onOpenDashboard={onOpenDashboard}
        onCreateFromTemplate={onCreateFromTemplate}
        onDuplicateCurrent={onDuplicateCurrent}
        onDeleteDashboard={onDeleteDashboard}
        onShareWithTeam={onShareWithTeam}
        onRefreshList={onRefreshList}
        listError={listError}
        onOpenVersions={onOpenVersions}
        onOpenImport={onOpenImport}
      />

      {/* LESEANSICHT-HINWEISBALKEN (Auftrag 163 §2.1 Nr. 2) */}
      {isReadOnly && (
        <ReadOnlyNoticeV2
          teamName={currentStoredDashboard?.teamName}
          copyError={readOnlyCopyError}
          isCopying={isSavingPersonalCopy}
          onSaveAsPersonalCopy={async () => {
            if (isSavingPersonalCopy) return;
            if (onSaveAsPersonalCopy) {
              await onSaveAsPersonalCopy();
            } else if (onDuplicateCurrent) {
              await onDuplicateCurrent();
            }
          }}
        />
      )}

      {/* MITTLERER ARBEITSBEREICH: BIBLIOTHEK + CANVAS + INSPECTOR */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* ZONE 2: WIDGET-BIBLIOTHEK (LINKS) */}
        {!isReadOnly && !isPreviewMode && isLibraryOpen && (
          <WidgetLibraryV2
            onAddTile={placementActions.handleAddTile}
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
          onRemoveTile={placementActions.handleRemoveTile}
          onDuplicateTile={placementActions.handleDuplicateTile}
          onCommitLayout={placementActions.handleCommitLayout}
          onAddTileAtPosition={placementActions.handleAddTileAtPosition}
          onMoveMobile={placementActions.handleMoveMobile}
          onShowDetails={onShowDetails}
          onAddTileClick={() => setIsLibraryOpen(true)}
          isPreviewMode={isPreviewMode || isReadOnly}
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
        {!isReadOnly && !isPreviewMode && isInspectorOpen && (
          <EditorInspectorV2
            selectedTile={selectedTile}
            config={config}
            onDeselect={() => setSelectedTileId(null)}
            onTileTitleChange={inspectorActions.handleTileTitleChange}
            onTileViewChange={inspectorActions.handleTileViewChange}
            onTileOverrideChange={inspectorActions.handleTileOverrideChange}
            onTileThresholdChange={inspectorActions.handleTileThresholdChange}
            onTileDrilldownChange={inspectorActions.handleTileDrilldownChange}
            onOpenPanelEditor={onOpenPanelEditor}
            onClose={() => setIsInspectorOpen(false)}
            onMoveTileToSection={sectionActions.handleMoveTileToSection}
            onExpandSection={(secId) => sectionActions.handleToggleCollapse(secId)}
            isSectionCollapsed={sectionActions.isSectionCollapsed}
            useData={useData}
            isDirty={isDirty}
          />
        )}
      </div>

      {/* ZONE 5: STATUSLEISTE (UNTEN) */}
      <EditorStatusBarV2
        liveStatus={liveStatus}
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
