import { useCallback, useMemo, useState } from 'react';
import { SetGlobalFilterCommand, UpdateDashboardMetaCommand } from '../../core/editorCommands';
import type { useDashboardEditorV2 } from '../../hooks/useDashboardEditorV2';
import type { useTimeControl } from '../../time/TimeControlProvider';
import { useEditorLiveStatus, type EditorLiveStatus } from '../../time/useEditorLiveStatus';
import type { LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import type { useSectionActions } from './sections/useSectionActions';
import { useTilePlacementActions } from './useTilePlacementActions';
import { useTileInspectorActions } from './useTileInspectorActions';

export interface UseDashboardShellControllerParams {
  editor: ReturnType<typeof useDashboardEditorV2>;
  sectionActions: ReturnType<typeof useSectionActions>;
  timeControl: ReturnType<typeof useTimeControl>;
  onResume?: () => void;
  onCancel?: () => void;
  liveStore?: LiveKpiStreamStore;
  liveConfigured?: boolean;
  liveStatusOverrides?: Partial<EditorLiveStatus>;
}

export function useDashboardShellController({
  editor,
  sectionActions,
  timeControl,
  onResume,
  onCancel,
  liveStore,
  liveConfigured,
  liveStatusOverrides,
}: UseDashboardShellControllerParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const { state, dispatch, setSelectedTileId, save: executeSave, discard: executeDiscard } = editor;
  const { config, isDirty, activeBreakpoint, selectedTileId } = state;

  const placementActions = useTilePlacementActions({
    config,
    activeBreakpoint,
    selectedTileId,
    dispatch,
    setSelectedTileId,
    getTargetSectionForNewTile: sectionActions.getTargetSectionForNewTile,
  });

  const inspectorActions = useTileInspectorActions({
    tiles: config.tiles,
    dispatch,
  });

  const selectedTile = useMemo(
    () => config.tiles.find((t) => t.id === selectedTileId) ?? null,
    [config.tiles, selectedTileId],
  );

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

  const visibleTiles = useMemo(
    () =>
      config.tiles.filter(
        (tile) =>
          !config.sections?.some(
            (section) =>
              sectionActions.isSectionCollapsed(section.id) && section.tileIds.includes(tile.id),
          ),
      ),
    [config.sections, config.tiles, sectionActions],
  );

  const liveStatus = useEditorLiveStatus({
    tiles: visibleTiles,
    defaultPipeline: config.globalPipeline,
    ...(liveStore ? { store: liveStore } : {}),
    ...(liveConfigured !== undefined ? { configured: liveConfigured } : {}),
    ...(liveStatusOverrides ? { overrides: liveStatusOverrides } : {}),
  });

  const handleToggleLivePause = useCallback(() => {
    if (timeControl.state.mode === 'pausiert' || timeControl.state.mode === 'zeitpunkt') {
      timeControl.resume();
      onResume?.();
    } else {
      timeControl.pause();
    }
  }, [timeControl, onResume]);

  const handleDashboardTitleChange = useCallback(
    (newTitle: string) => {
      if (newTitle === config.title) return;
      const cmd = new UpdateDashboardMetaCommand({ title: config.title }, { title: newTitle });
      dispatch(cmd);
    },
    [config.title, dispatch],
  );

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await executeSave();
    } finally {
      setIsSaving(false);
    }
  };

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

  return {
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
  };
}
