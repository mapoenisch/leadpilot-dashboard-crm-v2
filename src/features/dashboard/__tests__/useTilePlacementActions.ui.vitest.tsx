// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTilePlacementActions } from '../components/editor/useTilePlacementActions';
import type { DashboardConfigV2, DashboardTileConfigV2 } from '../model/dashboardConfigV2';

describe('useTilePlacementActions', () => {
  const makeTile = (id: string, metric: string, x = 0, y = 0): DashboardTileConfigV2 => ({
    id,
    title: id,
    catalogId: metric,
    presentation: 'zahl',
    layouts: {
      desktop: { x, y, w: 4, h: 4 },
      tablet: { x, y, w: 6, h: 4 },
      mobile: { x: 0, y, w: 1, h: 4 },
    },
  });

  const baseConfig: DashboardConfigV2 = {
    version: 2,
    id: 'd-1',
    title: 'Dashboard',
    scope: 'personal',
    ownerUserId: 'u1',
    organizationId: 'org1',
    globalTimeframe: 'monat',
    globalPipeline: 'all',
    tiles: [makeTile('t-1', 'baseline.arr', 0, 0), makeTile('t-2', 'baseline.umsatz', 4, 0)],
    sections: [],
  };

  it('adds tile and respects max limit 24', () => {
    const dispatch = vi.fn();
    const setSelectedTileId = vi.fn();

    const { result } = renderHook(() =>
      useTilePlacementActions({
        config: baseConfig,
        activeBreakpoint: 'desktop',
        selectedTileId: null,
        dispatch,
        setSelectedTileId,
      }),
    );

    act(() => {
      result.current.handleAddTile('baseline.ebitda');
    });
    expect(dispatch).toHaveBeenCalled();
    expect(setSelectedTileId).toHaveBeenCalled();

    // Limit 24
    const fullConfig = {
      ...baseConfig,
      tiles: Array.from({ length: 24 }, (_, i) =>
        makeTile(`t-${i}`, 'baseline.arr', (i % 3) * 4, Math.floor(i / 3) * 4),
      ),
    };

    dispatch.mockClear();
    const { result: fullRes } = renderHook(() =>
      useTilePlacementActions({
        config: fullConfig,
        activeBreakpoint: 'desktop',
        selectedTileId: null,
        dispatch,
        setSelectedTileId,
      }),
    );

    act(() => {
      fullRes.current.handleAddTile('baseline.ebitda');
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('removes tile and resets selection if selected', () => {
    const dispatch = vi.fn();
    const setSelectedTileId = vi.fn();

    const { result } = renderHook(() =>
      useTilePlacementActions({
        config: baseConfig,
        activeBreakpoint: 'desktop',
        selectedTileId: 't-1',
        dispatch,
        setSelectedTileId,
      }),
    );

    act(() => {
      result.current.handleRemoveTile('t-1');
    });
    expect(dispatch).toHaveBeenCalled();
    expect(setSelectedTileId).toHaveBeenCalledWith(null);

    // Non-existent tile
    dispatch.mockClear();
    act(() => {
      result.current.handleRemoveTile('t-nonexistent');
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('duplicates tile', () => {
    const dispatch = vi.fn();
    const setSelectedTileId = vi.fn();

    const { result } = renderHook(() =>
      useTilePlacementActions({
        config: baseConfig,
        activeBreakpoint: 'desktop',
        selectedTileId: null,
        dispatch,
        setSelectedTileId,
      }),
    );

    act(() => {
      result.current.handleDuplicateTile('t-1');
    });
    expect(dispatch).toHaveBeenCalled();
    expect(setSelectedTileId).toHaveBeenCalled();

    dispatch.mockClear();
    act(() => {
      result.current.handleDuplicateTile('t-nonexistent');
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('commits layout moves (empty, resize, move, batch)', () => {
    const dispatch = vi.fn();
    const setSelectedTileId = vi.fn();

    const { result } = renderHook(() =>
      useTilePlacementActions({
        config: baseConfig,
        activeBreakpoint: 'desktop',
        selectedTileId: null,
        dispatch,
        setSelectedTileId,
      }),
    );

    // Empty
    act(() => {
      result.current.handleCommitLayout([]);
    });
    expect(dispatch).not.toHaveBeenCalled();

    // Resize
    act(() => {
      result.current.handleCommitLayout([
        { tileId: 't-1', from: { x: 0, y: 0, w: 4, h: 4 }, to: { x: 0, y: 0, w: 6, h: 4 } },
      ]);
    });
    expect(dispatch).toHaveBeenCalled();

    // Move
    act(() => {
      result.current.handleCommitLayout([
        { tileId: 't-1', from: { x: 0, y: 0, w: 4, h: 4 }, to: { x: 2, y: 0, w: 4, h: 4 } },
      ]);
    });
    expect(dispatch).toHaveBeenCalled();

    // Batch
    act(() => {
      result.current.handleCommitLayout([
        { tileId: 't-1', from: { x: 0, y: 0, w: 4, h: 4 }, to: { x: 2, y: 0, w: 4, h: 4 } },
        { tileId: 't-2', from: { x: 4, y: 0, w: 4, h: 4 }, to: { x: 6, y: 0, w: 4, h: 4 } },
      ]);
    });
    expect(dispatch).toHaveBeenCalled();
  });

  it('adds tile at position and moves mobile tiles', () => {
    const dispatch = vi.fn();
    const setSelectedTileId = vi.fn();

    const { result } = renderHook(() =>
      useTilePlacementActions({
        config: baseConfig,
        activeBreakpoint: 'desktop',
        selectedTileId: null,
        dispatch,
        setSelectedTileId,
      }),
    );

    act(() => {
      result.current.handleAddTileAtPosition('baseline.kunden_aktiv', { x: 0, y: 4, w: 4, h: 4 });
    });
    expect(dispatch).toHaveBeenCalled();

    act(() => {
      result.current.handleMoveMobile('t-1', 'down');
    });
    expect(dispatch).toHaveBeenCalled();
  });
});
