import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardEditorCore, TEXT_DEBOUNCE_MS } from '../core/dashboardEditorCore';
import { MoveTileCommand, ResizeTileCommand } from '../core/editorCommands';
import {
  createEmptyDashboardConfigV2,
  type DashboardTileConfigV2,
} from '../model/dashboardConfigV2';

describe('DashboardEditorCore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const sampleTile: DashboardTileConfigV2 = {
    id: 'tile_1',
    catalogId: 'baseline.arr',
    title: 'ARR',
    presentation: 'zahl',
    layouts: {
      desktop: { x: 0, y: 0, w: 3, h: 3 },
    },
  };

  function createCore(): DashboardEditorCore {
    const base = createEmptyDashboardConfigV2({
      ownerUserId: 'user-1',
      organizationId: 'org-1',
    });
    base.tiles = [{ ...sampleTile }];
    return new DashboardEditorCore(base);
  }

  it('unterstützt lange Sitzungen mit über 100 Aktionen ohne 50er-Abbruch', () => {
    const core = createCore();

    // 120 Verschiebungen ausführen
    for (let i = 1; i <= 120; i++) {
      const fromY = (i - 1) % 10;
      const toY = i % 10;
      core.execute(
        new MoveTileCommand(
          'tile_1',
          'desktop',
          { x: 0, y: fromY, w: 3, h: 3 },
          { x: 0, y: toY, w: 3, h: 3 },
        ),
      );
    }

    const stats = core.getStats();
    // V1 schnitt bei 50 hart ab. V2 hält alle 120 Aktionen im Undo-Stack!
    expect(stats.undoCount).toBe(120);
    expect(core.canUndo()).toBe(true);
    // Checkpoints wurden bei 50 und 100 angelegt
    expect(stats.checkpointsCount).toBeGreaterThanOrEqual(3); // Initial + 50 + 100

    // 120x Undo ohne Absturz
    for (let i = 0; i < 120; i++) {
      expect(core.undo()).not.toBeNull();
    }
    expect(core.canUndo()).toBe(false);
    expect(core.canRedo()).toBe(true);
    expect(core.getStats().redoCount).toBe(120);

    // Am Anfang angelangt: Entwurf ist wieder identisch mit gespeichertem Stand
    expect(core.getState().isDirty).toBe(false);
  });

  it('Transaktionsbündelung: Zwischenschritte bei Drag erzeugen genau EINEN Undo-Schritt', () => {
    const core = createCore();

    core.beginTransaction('drag');
    expect(core.getState().isInterimActionActive).toBe(true);

    // 5 Zwischenbewegungen während Drag
    for (let step = 1; step <= 5; step++) {
      core.updateDraftInterim((state) => {
        const tile = state.config.tiles[0]!;
        return {
          ...state,
          config: {
            ...state.config,
            tiles: [
              {
                ...tile,
                layouts: {
                  ...tile.layouts,
                  desktop: { x: step, y: 0, w: 3, h: 3 },
                },
              },
            ],
          },
        };
      });
    }

    // Während Drag: noch kein Undo-Schritt!
    expect(core.getStats().undoCount).toBe(0);

    // Transaktion abschließen mit einem atomaren Final-Command
    core.commitTransaction(
      new MoveTileCommand(
        'tile_1',
        'desktop',
        { x: 0, y: 0, w: 3, h: 3 },
        { x: 5, y: 0, w: 3, h: 3 },
      ),
    );

    expect(core.getState().isInterimActionActive).toBe(false);
    expect(core.getStats().undoCount).toBe(1); // Genau 1 Schritt!

    // Undo stellt Ausgangsposition (x=0) wieder her
    core.undo();
    expect(core.getState().config.tiles[0]!.layouts.desktop.x).toBe(0);
  });

  it('Transaktionsabbruch: cancelTransaction stellt den Zustand vor Drag wieder her', () => {
    const core = createCore();

    core.beginTransaction('drag');
    core.updateDraftInterim((state) => {
      const tile = state.config.tiles[0]!;
      return {
        ...state,
        config: {
          ...state.config,
          tiles: [
            {
              ...tile,
              layouts: {
                ...tile.layouts,
                desktop: { x: 8, y: 0, w: 3, h: 3 },
              },
            },
          ],
        },
      };
    });

    core.cancelTransaction();
    expect(core.getState().isInterimActionActive).toBe(false);
    expect(core.getState().config.tiles[0]!.layouts.desktop.x).toBe(0);
    expect(core.getStats().undoCount).toBe(0);
  });

  it('Texteingabebündelung (Debounce): Schnelles Tippen bündelt sich in einen Schritt nach 600ms', () => {
    const core = createCore();

    // 3 Tastenanschläge schnell hintereinander
    core.recordTextInput('tile_1', 'title', 'ARR', 'AR');
    vi.advanceTimersByTime(200);
    core.recordTextInput('tile_1', 'title', 'ARR', 'ARR ');
    vi.advanceTimersByTime(200);
    core.recordTextInput('tile_1', 'title', 'ARR', 'ARR Gesamt');

    // Vor Ablauf der 600ms: Entwurf zeigt den aktuellen Text, aber noch kein Undo-Eintrag
    expect(core.getState().config.tiles[0]!.title).toBe('ARR Gesamt');
    expect(core.getStats().undoCount).toBe(0);

    // 600ms vergehen lassen
    vi.advanceTimersByTime(TEXT_DEBOUNCE_MS);

    // Jetzt ist genau 1 Undo-Schritt vorhanden
    expect(core.getStats().undoCount).toBe(1);

    // Undo stellt den ursprünglichen Titel 'ARR' wieder her
    core.undo();
    expect(core.getState().config.tiles[0]!.title).toBe('ARR');
  });

  it('Texteingabebündelung (Blur): flushTextInput schließt sofort beim Fokuswechsel ab', () => {
    const core = createCore();

    core.recordTextInput('tile_1', 'title', 'ARR', 'Neuer Titel');
    expect(core.getStats().undoCount).toBe(0);

    // Fokuswechsel (Blur)
    core.flushTextInput();
    expect(core.getStats().undoCount).toBe(1);

    core.undo();
    expect(core.getState().config.tiles[0]!.title).toBe('ARR');
  });

  it('Ausschluss von Daten-Updates: Ticks und Live-Updates erzeugen kein Undo und ändern isDirty nicht', () => {
    const core = createCore();

    expect(core.getState().isDirty).toBe(false);
    expect(core.getStats().undoCount).toBe(0);

    // Simuliere 10 Hintergrund-Ticks
    for (let i = 0; i < 10; i++) {
      core.applyBackgroundDataUpdate();
    }

    expect(core.getState().isDirty).toBe(false);
    expect(core.getStats().undoCount).toBe(0);
  });

  it('discard() setzt Entwurf sauber auf den letzten Speicherstand zurück', () => {
    const core = createCore();

    core.execute(
      new ResizeTileCommand(
        'tile_1',
        'desktop',
        { x: 0, y: 0, w: 3, h: 3 },
        { x: 0, y: 0, w: 6, h: 4 },
      ),
    );
    expect(core.getState().isDirty).toBe(true);

    core.discard();
    expect(core.getState().isDirty).toBe(false);
    expect(core.getState().config.tiles[0]!.layouts.desktop.w).toBe(3);
    expect(core.getStats().undoCount).toBe(0);
  });
});
