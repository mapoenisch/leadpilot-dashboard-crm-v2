// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  useDashboardShellController,
  type UseDashboardShellControllerParams,
} from '../components/editor/useDashboardShellController';
import { TimeControlProvider } from '../time/TimeControlProvider';

describe('useDashboardShellController', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TimeControlProvider>{children}</TimeControlProvider>
  );

  const makeMockEditor = (isDirty = false) => ({
    state: {
      config: {
        id: 'd-1',
        title: 'Mein Dashboard',
        version: 2 as const,
        scope: 'personal' as const,
        ownerUserId: 'u-1',
        organizationId: 'org-1',
        globalTimeframe: 'monat',
        globalPipeline: 'all',
        tiles: [
          { id: 't-1', title: 'Tile 1', metric: 'kpi_1', layout: { x: 0, y: 0, w: 4, h: 4 } },
          { id: 't-2', title: 'Tile 2', metric: 'kpi_2', layout: { x: 4, y: 0, w: 4, h: 4 } },
        ],
        sections: [{ id: 'sec-1', title: 'Sektion 1', tileIds: ['t-2'] }],
      },
      isDirty,
      activeBreakpoint: 'lg' as const,
      selectedTileId: 't-1',
    },
    dispatch: vi.fn(),
    setSelectedTileId: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    discard: vi.fn(),
  });

  const makeMockSectionActions = (isCollapsed = false) => ({
    getTargetSectionForNewTile: vi.fn(),
    isSectionCollapsed: vi.fn().mockReturnValue(isCollapsed),
    toggleSectionCollapse: vi.fn(),
    addSection: vi.fn(),
    renameSection: vi.fn(),
    deleteSection: vi.fn(),
  });

  const makeMockTimeControl = (mode: 'live' | 'pausiert' = 'live') => ({
    state: { mode, pauseTime: null, selectedPoint: null },
    pause: vi.fn(),
    resume: vi.fn(),
    selectPoint: vi.fn(),
  });

  it('computes selectedTile, activeTileCount, and visibleTiles correctly', () => {
    const editor = makeMockEditor();
    const sectionActions = makeMockSectionActions(true); // sec-1 collapsed
    const timeControl = makeMockTimeControl('live');

    const { result } = renderHook(
      () =>
        useDashboardShellController({
          editor: editor as unknown as UseDashboardShellControllerParams['editor'],
          sectionActions:
            sectionActions as unknown as UseDashboardShellControllerParams['sectionActions'],
          timeControl: timeControl as unknown as UseDashboardShellControllerParams['timeControl'],
        }),
      { wrapper },
    );

    expect(result.current.selectedTile?.id).toBe('t-1');
    expect(result.current.activeTileCount).toBe(1);
  });

  it('handles pause and resume toggle', () => {
    const editor = makeMockEditor();
    const sectionActions = makeMockSectionActions();
    const timeControl = makeMockTimeControl('live');
    const onResume = vi.fn();

    const { result, rerender } = renderHook(
      ({ mode }) =>
        useDashboardShellController({
          editor: editor as unknown as UseDashboardShellControllerParams['editor'],
          sectionActions:
            sectionActions as unknown as UseDashboardShellControllerParams['sectionActions'],
          timeControl: {
            ...timeControl,
            state: { ...timeControl.state, mode },
          } as unknown as UseDashboardShellControllerParams['timeControl'],
          onResume,
        }),
      { initialProps: { mode: 'live' as 'live' | 'pausiert' }, wrapper },
    );

    act(() => {
      result.current.handleToggleLivePause();
    });
    expect(timeControl.pause).toHaveBeenCalled();

    rerender({ mode: 'pausiert' as const });
    act(() => {
      result.current.handleToggleLivePause();
    });
    expect(timeControl.resume).toHaveBeenCalled();
    expect(onResume).toHaveBeenCalled();
  });

  it('handles title and filter changes via dispatch', () => {
    const editor = makeMockEditor();
    const sectionActions = makeMockSectionActions();
    const timeControl = makeMockTimeControl();

    const { result } = renderHook(
      () =>
        useDashboardShellController({
          editor: editor as unknown as UseDashboardShellControllerParams['editor'],
          sectionActions:
            sectionActions as unknown as UseDashboardShellControllerParams['sectionActions'],
          timeControl: timeControl as unknown as UseDashboardShellControllerParams['timeControl'],
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleDashboardTitleChange('Neuer Titel');
    });
    expect(editor.dispatch).toHaveBeenCalled();

    act(() => {
      result.current.handleGlobalFilterChange({ timeframe: 'jahr', pipeline: 'enterprise' });
    });
    expect(editor.dispatch).toHaveBeenCalledTimes(3);
  });

  it('handles save, cancel, and discard flows', async () => {
    const editorClean = makeMockEditor(false);
    const sectionActions = makeMockSectionActions();
    const timeControl = makeMockTimeControl();
    const onCancel = vi.fn();

    const { result: resClean } = renderHook(
      () =>
        useDashboardShellController({
          editor: editorClean as unknown as UseDashboardShellControllerParams['editor'],
          sectionActions:
            sectionActions as unknown as UseDashboardShellControllerParams['sectionActions'],
          timeControl: timeControl as unknown as UseDashboardShellControllerParams['timeControl'],
          onCancel,
        }),
      { wrapper },
    );

    await act(async () => {
      await resClean.current.handleSave();
    });
    expect(editorClean.save).toHaveBeenCalled();

    act(() => {
      resClean.current.handleCancelClick();
    });
    expect(onCancel).toHaveBeenCalled();

    // With dirty state
    const editorDirty = makeMockEditor(true);
    const { result: resDirty } = renderHook(
      () =>
        useDashboardShellController({
          editor: editorDirty as unknown as UseDashboardShellControllerParams['editor'],
          sectionActions:
            sectionActions as unknown as UseDashboardShellControllerParams['sectionActions'],
          timeControl: timeControl as unknown as UseDashboardShellControllerParams['timeControl'],
          onCancel,
        }),
      { wrapper },
    );

    act(() => {
      resDirty.current.handleCancelClick();
    });
    expect(resDirty.current.showDiscardConfirm).toBe(true);

    act(() => {
      resDirty.current.handleDiscardAndLeave();
    });
    expect(editorDirty.discard).toHaveBeenCalled();
    expect(resDirty.current.showDiscardConfirm).toBe(false);
  });
});
