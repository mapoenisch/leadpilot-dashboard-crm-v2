// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTileInspectorActions } from '../components/editor/useTileInspectorActions';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';

describe('useTileInspectorActions', () => {
  const mockTile: DashboardTileConfigV2 = {
    id: 't-1',
    catalogId: 'baseline.arr',
    title: 'ARR',
    presentation: 'zahl',
    layouts: { desktop: { x: 0, y: 0, w: 4, h: 4 } },
    drilldownUrl: 'https://example.com/arr',
  };

  it('dispatches title change when tile exists and title differs', () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useTileInspectorActions({ tiles: [mockTile], dispatch }));

    act(() => {
      result.current.handleTileTitleChange('t-1', 'Neuer ARR');
    });
    expect(dispatch).toHaveBeenCalled();

    // No-op when title is identical or tile not found
    dispatch.mockClear();
    act(() => {
      result.current.handleTileTitleChange('t-1', 'ARR'); // same title
      result.current.handleTileTitleChange('t-nonexistent', 'Neuer ARR');
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches view change when presentation differs', () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useTileInspectorActions({ tiles: [mockTile], dispatch }));

    act(() => {
      result.current.handleTileViewChange('t-1', 'sparkline');
    });
    expect(dispatch).toHaveBeenCalled();

    dispatch.mockClear();
    act(() => {
      result.current.handleTileViewChange('t-1', 'zahl'); // same
      result.current.handleTileViewChange('t-nonexistent', 'sparkline');
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches override changes', () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useTileInspectorActions({ tiles: [mockTile], dispatch }));

    act(() => {
      result.current.handleTileOverrideChange('t-1', { timeframeOverride: 'jahr' });
    });
    expect(dispatch).toHaveBeenCalled();

    dispatch.mockClear();
    act(() => {
      result.current.handleTileOverrideChange('t-nonexistent', { timeframeOverride: 'jahr' });
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches threshold and drilldown changes', () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useTileInspectorActions({ tiles: [mockTile], dispatch }));

    act(() => {
      result.current.handleTileThresholdChange('t-1', {
        enabled: true,
        operator: 'gt',
        warningValue: 100,
      });
    });
    expect(dispatch).toHaveBeenCalled();

    dispatch.mockClear();
    act(() => {
      result.current.handleTileThresholdChange('t-nonexistent', undefined);
    });
    expect(dispatch).not.toHaveBeenCalled();

    act(() => {
      result.current.handleTileDrilldownChange('t-1', 'https://example.com/new');
    });
    expect(dispatch).toHaveBeenCalled();

    dispatch.mockClear();
    act(() => {
      result.current.handleTileDrilldownChange('t-nonexistent', 'https://example.com/new');
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
