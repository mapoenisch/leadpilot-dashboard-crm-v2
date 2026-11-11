import { describe, expect, it } from 'vitest';
import {
  AddTileCommand,
  BatchMoveTilesCommand,
  CompoundCommand,
  MoveTileCommand,
  RemoveTileCommand,
  ResizeTileCommand,
  SetGlobalFilterCommand,
  UpdateDashboardMetaCommand,
  UpdateTileConfigCommand,
} from '../core/editorCommands';
import {
  createEmptyDashboardConfigV2,
  type DashboardDraftState,
  type DashboardTileConfigV2,
} from '../model/dashboardConfigV2';

describe('editorCommands (Reversible-Command-Pattern)', () => {
  const initialConfig = createEmptyDashboardConfigV2({
    ownerUserId: 'user-1',
    organizationId: 'org-1',
  });

  const sampleTile: DashboardTileConfigV2 = {
    id: 'tile_1',
    catalogId: 'baseline.arr',
    title: 'ARR',
    presentation: 'zahl',
    layouts: {
      desktop: { x: 0, y: 0, w: 3, h: 3 },
      tablet: { x: 0, y: 0, w: 3, h: 3 },
      mobile: { x: 0, y: 0, w: 1, h: 2 },
    },
  };

  const sampleTile2: DashboardTileConfigV2 = {
    id: 'tile_2',
    catalogId: 'baseline.mrr',
    title: 'MRR',
    presentation: 'balken',
    layouts: {
      desktop: { x: 3, y: 0, w: 6, h: 4 },
      tablet: { x: 3, y: 0, w: 3, h: 3 },
      mobile: { x: 0, y: 2, w: 1, h: 2 },
    },
  };

  function createInitialState(): DashboardDraftState {
    return {
      config: {
        ...initialConfig,
        tiles: [{ ...sampleTile }, { ...sampleTile2 }],
      },
      isDirty: false,
      activeBreakpoint: 'desktop',
      selectedTileId: null,
      isInterimActionActive: false,
    };
  }

  it('MoveTileCommand: verschiebt eine Kachel und macht die Verschiebung exakt rückgängig', () => {
    const state = createInitialState();
    const cmd = new MoveTileCommand(
      'tile_1',
      'desktop',
      { x: 0, y: 0, w: 3, h: 3 },
      { x: 6, y: 2, w: 3, h: 3 },
    );

    const movedState = cmd.execute(state);
    expect(movedState.isDirty).toBe(true);
    expect(movedState.config.metadata?.user_edited).toBe(true);
    expect(movedState.selectedTileId).toBe('tile_1');
    expect(movedState.config.tiles.find((t) => t.id === 'tile_1')?.layouts.desktop).toEqual({
      x: 6,
      y: 2,
      w: 3,
      h: 3,
    });

    const undoneState = cmd.undo(movedState);
    expect(undoneState.config.tiles.find((t) => t.id === 'tile_1')?.layouts.desktop).toEqual({
      x: 0,
      y: 0,
      w: 3,
      h: 3,
    });
    expect(cmd.estimateByteSize()).toBeLessThan(500);
  });

  it('MoveTileCommand: stellt bei wasDerived=true die ursprüngliche Abwesenheit der Breakpoint-Position wieder her', () => {
    const state = createInitialState();
    // tile_1 hat zunächst kein eigenes tablet-Layout
    const stateWithoutTablet: DashboardDraftState = {
      ...state,
      config: {
        ...state.config,
        tiles: state.config.tiles.map((t) =>
          t.id === 'tile_1' ? { ...t, layouts: { desktop: t.layouts.desktop } } : t,
        ),
      },
    };
    expect(stateWithoutTablet.config.tiles[0]!.layouts.tablet).toBeUndefined();

    const cmd = new MoveTileCommand(
      'tile_1',
      'tablet',
      { x: 0, y: 0, w: 3, h: 3 },
      { x: 3, y: 0, w: 3, h: 3 },
      undefined,
      true, // wasDerived = true
    );

    const executed = cmd.execute(stateWithoutTablet);
    expect(executed.config.tiles[0]!.layouts.tablet).toEqual({ x: 3, y: 0, w: 3, h: 3 });

    const undone = cmd.undo(executed);
    expect(undone.config.tiles[0]!.layouts.tablet).toBeUndefined();
  });

  it('ResizeTileCommand: skaliert eine Kachel und stellt Ursprungsdimensionen wieder her', () => {
    const state = createInitialState();
    const cmd = new ResizeTileCommand(
      'tile_1',
      'desktop',
      { x: 0, y: 0, w: 3, h: 3 },
      { x: 0, y: 0, w: 6, h: 4 },
    );

    const resized = cmd.execute(state);
    expect(resized.config.tiles[0]!.layouts.desktop.w).toBe(6);
    expect(resized.config.tiles[0]!.layouts.desktop.h).toBe(4);

    const undone = cmd.undo(resized);
    expect(undone.config.tiles[0]!.layouts.desktop.w).toBe(3);
    expect(undone.config.tiles[0]!.layouts.desktop.h).toBe(3);
  });

  it('BatchMoveTilesCommand: führt Auto-Reflow atomar aus und stellt alle Kacheln wieder her', () => {
    const state = createInitialState();
    const cmd = new BatchMoveTilesCommand('desktop', [
      { tileId: 'tile_1', from: { x: 0, y: 0, w: 3, h: 3 }, to: { x: 0, y: 4, w: 3, h: 3 } },
      { tileId: 'tile_2', from: { x: 3, y: 0, w: 6, h: 4 }, to: { x: 3, y: 4, w: 6, h: 4 } },
    ]);

    const batchExecuted = cmd.execute(state);
    expect(batchExecuted.config.tiles.find((t) => t.id === 'tile_1')?.layouts.desktop.y).toBe(4);
    expect(batchExecuted.config.tiles.find((t) => t.id === 'tile_2')?.layouts.desktop.y).toBe(4);

    const batchUndone = cmd.undo(batchExecuted);
    expect(batchUndone.config.tiles.find((t) => t.id === 'tile_1')?.layouts.desktop.y).toBe(0);
    expect(batchUndone.config.tiles.find((t) => t.id === 'tile_2')?.layouts.desktop.y).toBe(0);
  });

  it('BatchMoveTilesCommand: stellt bei wasDerived=true die ursprüngliche Abwesenheit wieder her (Codex P2)', () => {
    const state = createInitialState();
    // tile_2 hat kein eigenes tablet-Layout (nur abgeleitet aus Desktop)
    const stateWithDerived: DashboardDraftState = {
      ...state,
      config: {
        ...state.config,
        tiles: [
          state.config.tiles[0]!, // tile_1 hat explizites tablet
          {
            ...state.config.tiles[1]!,
            layouts: { desktop: state.config.tiles[1]!.layouts.desktop },
          },
        ],
      },
    };
    expect(stateWithDerived.config.tiles[1]!.layouts.tablet).toBeUndefined();

    // Verschieben materialisiert tablet für tile_2 mit wasDerived=true
    const cmd = new BatchMoveTilesCommand('tablet', [
      {
        tileId: 'tile_1',
        from: { x: 0, y: 0, w: 3, h: 3 },
        to: { x: 0, y: 4, w: 3, h: 3 },
        wasDerived: false,
      },
      {
        tileId: 'tile_2',
        from: { x: 3, y: 0, w: 3, h: 3 },
        to: { x: 3, y: 4, w: 3, h: 3 },
        wasDerived: true, // zuvor abgeleitet!
      },
    ]);

    const executed = cmd.execute(stateWithDerived);
    expect(executed.config.tiles.find((t) => t.id === 'tile_2')?.layouts.tablet).toEqual({
      x: 3,
      y: 4,
      w: 3,
      h: 3,
    });

    const undone = cmd.undo(executed);
    // tile_1 erhält seine explizite Ausgangsposition zurück
    expect(undone.config.tiles.find((t) => t.id === 'tile_1')?.layouts.tablet).toEqual({
      x: 0,
      y: 0,
      w: 3,
      h: 3,
    });
    // tile_2 ist wieder undefined – spätere Desktop-Änderungen greifen weiter durch!
    expect(undone.config.tiles.find((t) => t.id === 'tile_2')?.layouts.tablet).toBeUndefined();
  });

  it('AddTileCommand & RemoveTileCommand: hinzufügen, entfernen und indexgetreu wiederherstellen', () => {
    const state = createInitialState();
    const newTile: DashboardTileConfigV2 = {
      id: 'tile_new',
      catalogId: 'deals.won',
      title: 'Gewonnene Deals',
      presentation: 'donut',
      layouts: { desktop: { x: 0, y: 4, w: 6, h: 4 } },
    };

    const addCmd = new AddTileCommand(newTile, 1);
    const withNewTile = addCmd.execute(state);
    expect(withNewTile.config.tiles.length).toBe(3);
    expect(withNewTile.config.tiles[1]!.id).toBe('tile_new');

    const undoneAdd = addCmd.undo(withNewTile);
    expect(undoneAdd.config.tiles.length).toBe(2);
    expect(undoneAdd.config.tiles.some((t) => t.id === 'tile_new')).toBe(false);

    // Teste RemoveTileCommand
    const removeCmd = new RemoveTileCommand(sampleTile, 0);
    const afterRemove = removeCmd.execute(state);
    expect(afterRemove.config.tiles.length).toBe(1);
    expect(afterRemove.config.tiles[0]!.id).toBe('tile_2');

    const undoneRemove = removeCmd.undo(afterRemove);
    expect(undoneRemove.config.tiles.length).toBe(2);
    expect(undoneRemove.config.tiles[0]!.id).toBe('tile_1');
  });

  it('UpdateTileConfigCommand: aktualisiert Kachel-Einstellungen partiell und invertiert sie', () => {
    const state = createInitialState();
    const cmd = new UpdateTileConfigCommand(
      'tile_1',
      { title: 'ARR', presentation: 'zahl' },
      { title: 'Jahresumsatz (ARR)', presentation: 'balken' },
    );

    const updated = cmd.execute(state);
    expect(updated.config.tiles[0]!.title).toBe('Jahresumsatz (ARR)');
    expect(updated.config.tiles[0]!.presentation).toBe('balken');

    const reverted = cmd.undo(updated);
    expect(reverted.config.tiles[0]!.title).toBe('ARR');
    expect(reverted.config.tiles[0]!.presentation).toBe('zahl');
  });

  it('UpdateDashboardMetaCommand: aktualisiert Metadaten und macht rückgängig', () => {
    const state = createInitialState();
    const cmd = new UpdateDashboardMetaCommand(
      { title: 'Neues Dashboard' },
      { title: 'Geschäftsführung Q4' },
    );

    const updated = cmd.execute(state);
    expect(updated.config.title).toBe('Geschäftsführung Q4');

    const reverted = cmd.undo(updated);
    expect(reverted.config.title).toBe('Neues Dashboard');
  });

  it('SetGlobalFilterCommand: setzt Zeitraum und Pipeline und invertiert', () => {
    const state = createInitialState();
    const cmd = new SetGlobalFilterCommand('timeframe', 'letzte_30_tage', 'dieses_jahr');

    const updated = cmd.execute(state);
    expect(updated.config.globalTimeframe).toBe('dieses_jahr');

    const reverted = cmd.undo(updated);
    expect(reverted.config.globalTimeframe).toBe('letzte_30_tage');
  });

  it('CompoundCommand: führt Befehle sequentiell aus und rollt sie in umgekehrter Reihenfolge zurück', () => {
    const state = createInitialState();
    const moveCmd = new MoveTileCommand(
      'tile_1',
      'desktop',
      { x: 0, y: 0, w: 3, h: 3 },
      { x: 6, y: 0, w: 3, h: 3 },
    );
    const titleCmd = new UpdateTileConfigCommand('tile_1', { title: 'ARR' }, { title: 'ARR Neu' });

    const compound = new CompoundCommand([moveCmd, titleCmd], 'Verschieben und Umbenennen');

    const executed = compound.execute(state);
    expect(executed.config.tiles[0]!.layouts.desktop.x).toBe(6);
    expect(executed.config.tiles[0]!.title).toBe('ARR Neu');

    const undone = compound.undo(executed);
    expect(undone.config.tiles[0]!.layouts.desktop.x).toBe(0);
    expect(undone.config.tiles[0]!.title).toBe('ARR');
  });
});
