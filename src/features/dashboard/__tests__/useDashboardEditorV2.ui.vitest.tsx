import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MoveTileCommand } from '../core/editorCommands';
import { useDashboardEditorV2 } from '../hooks/useDashboardEditorV2';
import {
  createEmptyDashboardConfigV2,
  type DashboardTileConfigV2,
} from '../model/dashboardConfigV2';

describe('useDashboardEditorV2 (React Hook)', () => {
  const sampleTile: DashboardTileConfigV2 = {
    id: 'tile_1',
    catalogId: 'baseline.arr',
    title: 'ARR',
    presentation: 'zahl',
    layouts: {
      desktop: { x: 0, y: 0, w: 3, h: 3 },
    },
  };

  function createTestConfig() {
    const config = createEmptyDashboardConfigV2({
      ownerUserId: 'user-1',
      organizationId: 'org-1',
    });
    config.tiles = [{ ...sampleTile }];
    return config;
  }

  it('initialisiert den Entwurf sauber ohne ungespeicherte Änderungen', () => {
    const initialConfig = createTestConfig();
    const { result } = renderHook(() => useDashboardEditorV2({ initialConfig }));

    expect(result.current.state.isDirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.state.config.tiles.length).toBe(1);
  });

  it('dispatch führt Befehl aus, setzt isDirty auf true und aktiviert Undo', () => {
    const initialConfig = createTestConfig();
    const { result } = renderHook(() => useDashboardEditorV2({ initialConfig }));

    act(() => {
      result.current.dispatch(
        new MoveTileCommand(
          'tile_1',
          'desktop',
          { x: 0, y: 0, w: 3, h: 3 },
          { x: 3, y: 0, w: 3, h: 3 },
        ),
      );
    });

    expect(result.current.state.isDirty).toBe(true);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.state.config.tiles[0]!.layouts.desktop.x).toBe(3);

    act(() => {
      result.current.undo();
    });

    expect(result.current.state.config.tiles[0]!.layouts.desktop.x).toBe(0);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.state.config.tiles[0]!.layouts.desktop.x).toBe(3);
  });

  it('unterstützt Drag-Transaktionen mit Zwischenschritten', () => {
    const initialConfig = createTestConfig();
    const { result } = renderHook(() => useDashboardEditorV2({ initialConfig }));

    act(() => {
      result.current.beginTransaction('drag');
    });

    expect(result.current.state.isInterimActionActive).toBe(true);

    act(() => {
      result.current.updateDraftInterim((s) => {
        const tile = s.config.tiles[0]!;
        return {
          ...s,
          config: {
            ...s.config,
            tiles: [
              {
                ...tile,
                layouts: {
                  ...tile.layouts,
                  desktop: { x: 5, y: 0, w: 3, h: 3 },
                },
              },
            ],
          },
        };
      });
    });

    expect(result.current.state.config.tiles[0]!.layouts.desktop.x).toBe(5);
    expect(result.current.historyStats.undoCount).toBe(0);

    act(() => {
      result.current.commitTransaction(
        new MoveTileCommand(
          'tile_1',
          'desktop',
          { x: 0, y: 0, w: 3, h: 3 },
          { x: 5, y: 0, w: 3, h: 3 },
        ),
      );
    });

    expect(result.current.state.isInterimActionActive).toBe(false);
    expect(result.current.historyStats.undoCount).toBe(1);
  });

  it('Navigationsschutz: blockiert Verlassen bei ungespeicherten Änderungen', () => {
    const initialConfig = createTestConfig();
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useDashboardEditorV2({ initialConfig, onNavigate }));

    const proceedCallback = vi.fn();

    // 1. Wenn sauber: requestLeave lässt sofort durch
    act(() => {
      result.current.leaveGuard.requestLeave(proceedCallback);
    });
    expect(proceedCallback).toHaveBeenCalledTimes(1);

    // 2. Änderung vornehmen
    act(() => {
      result.current.dispatch(
        new MoveTileCommand(
          'tile_1',
          'desktop',
          { x: 0, y: 0, w: 3, h: 3 },
          { x: 4, y: 0, w: 3, h: 3 },
        ),
      );
    });
    expect(result.current.state.isDirty).toBe(true);

    // 3. Jetzt fängt requestLeave ab und fordert Entscheidung
    const blockedCallback = vi.fn();
    act(() => {
      result.current.leaveGuard.requestLeave(blockedCallback);
    });
    expect(blockedCallback).not.toHaveBeenCalled();
    expect(result.current.leaveGuard.leaveRequest).not.toBeNull();

    // Bleiben wählen
    act(() => {
      result.current.leaveGuard.leaveStay();
    });
    expect(result.current.leaveGuard.leaveRequest).toBeNull();
    expect(blockedCallback).not.toHaveBeenCalled();

    // Verwerfen wählen
    act(() => {
      result.current.leaveGuard.requestLeave(blockedCallback);
    });
    act(() => {
      result.current.leaveGuard.leaveDiscard();
    });
    expect(blockedCallback).toHaveBeenCalledTimes(1);
    expect(result.current.state.isDirty).toBe(false);
  });

  it('save() speichert atomar und setzt isDirty zurück', async () => {
    const initialConfig = createTestConfig();
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useDashboardEditorV2({ initialConfig, onSave }));

    act(() => {
      result.current.dispatch(
        new MoveTileCommand(
          'tile_1',
          'desktop',
          { x: 0, y: 0, w: 3, h: 3 },
          { x: 2, y: 0, w: 3, h: 3 },
        ),
      );
    });
    expect(result.current.state.isDirty).toBe(true);

    let saved = false;
    await act(async () => {
      saved = await result.current.save();
    });

    expect(saved).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.state.isDirty).toBe(false);
  });
});
