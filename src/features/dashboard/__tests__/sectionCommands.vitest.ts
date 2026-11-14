import { describe, it, expect } from 'vitest';
import type {
  DashboardConfigV2,
  DashboardDraftState,
  DashboardSectionV2,
  DashboardTileConfigV2,
} from '../model/dashboardConfigV2';
import {
  createEmptyDashboardConfigV2,
  validateDashboardConfigV2,
} from '../model/dashboardConfigV2';
import { findLayoutIntegrityError } from '../services/dashboardLayoutIntegrity';
import {
  AddSectionCommand,
  RenameSectionCommand,
  MoveSectionCommand,
  SetSectionCollapsedCommand,
  RemoveSectionCommand,
  MoveTileToSectionCommand,
} from '../core/sectionCommands';
import { AddTileCommand, RemoveTileCommand } from '../core/editorCommands';
import { computeNextAvailablePosition } from '../components/editor/editorPlacement';

function createTile(id: string, x = 0, y = 0, w = 4, h = 2): DashboardTileConfigV2 {
  return {
    id,
    catalogId: 'crm.pipeline_deals',
    title: `Kachel ${id}`,
    presentation: 'zahl',
    layouts: {
      desktop: { x, y, w, h },
    },
  };
}

function createInitialState(customConfig?: Partial<DashboardConfigV2>): DashboardDraftState {
  const base = createEmptyDashboardConfigV2({
    ownerUserId: '00000000-0000-0000-0000-000000000001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    title: 'Test Dashboard',
  });

  const config: DashboardConfigV2 = {
    ...base,
    tiles: [createTile('t1', 0, 0), createTile('t2', 4, 0), createTile('t3', 0, 0)],
    sections: [
      { id: 'sec-1', title: 'Sektion 1', collapsed: false, tileIds: ['t1', 't2'] },
      { id: 'sec-2', title: 'Sektion 2', collapsed: true, tileIds: ['t3'] },
    ],
    ...customConfig,
  };

  return {
    config,
    isDirty: false,
    activeBreakpoint: 'desktop',
    selectedTileId: null,
    isInterimActionActive: false,
  };
}

function stripTimestamps(config: DashboardConfigV2): Record<string, unknown> {
  const { updatedAt: _u, metadata: _m, ...rest } = config;
  return rest;
}

describe('Auftrag 157 – Sektions-Befehle (2.3 Nr. 15 Tabellentest)', () => {
  const commandsToTest = [
    {
      name: 'AddSectionCommand (neue Sektion anhängen)',
      createCmd: () => {
        const sec: DashboardSectionV2 = {
          id: 'sec-new',
          title: 'Neue Gruppe',
          collapsed: false,
          tileIds: [],
        };
        return new AddSectionCommand(sec);
      },
    },
    {
      name: 'AddSectionCommand (an bestimmtem Index einfügen)',
      createCmd: () => {
        const sec: DashboardSectionV2 = {
          id: 'sec-insert',
          title: 'Eingefügte Gruppe',
          collapsed: false,
          tileIds: [],
        };
        return new AddSectionCommand(sec, 1);
      },
    },
    {
      name: 'RenameSectionCommand (Sektion umbenennen)',
      createCmd: () => new RenameSectionCommand('sec-1', 'Sektion 1', 'Pipeline Metriken'),
    },
    {
      name: 'MoveSectionCommand (Sektion nach hinten verschieben)',
      createCmd: () => new MoveSectionCommand('sec-1', 0, 1),
    },
    {
      name: 'SetSectionCollapsedCommand (Sektion einklappen)',
      createCmd: () => new SetSectionCollapsedCommand('sec-1', true),
    },
    {
      name: 'SetSectionCollapsedCommand (Sektion ausklappen)',
      createCmd: () => new SetSectionCollapsedCommand('sec-2', false),
    },
    {
      name: 'RemoveSectionCommand (Sektion entfernen, Kacheln nach Ohne Sektion)',
      createCmd: () => new RemoveSectionCommand('sec-1'),
    },
    {
      name: 'MoveTileToSectionCommand (Kachel aus Sektion 1 nach Sektion 2 verschieben)',
      createCmd: () => new MoveTileToSectionCommand('t1', 'sec-2'),
    },
    {
      name: 'MoveTileToSectionCommand (Kachel aus Sektion in den Bereich Ohne Sektion verschieben)',
      createCmd: () => new MoveTileToSectionCommand('t3', null),
    },
    {
      name: 'AddTileCommand (Kachel direkt in Zielsektion an freier Position anlegen)',
      createCmd: (state: DashboardDraftState) => {
        const sec1Tiles = state.config.tiles.filter((t) =>
          state.config.sections?.find((s) => s.id === 'sec-1')?.tileIds.includes(t.id),
        );
        const freePos = computeNextAvailablePosition(sec1Tiles, 4, 2);
        const newTile: DashboardTileConfigV2 = {
          ...createTile('t_brand_new', 0, 0),
          layouts: freePos,
        };
        return new AddTileCommand(newTile, undefined, undefined, 'sec-1');
      },
    },
    {
      name: 'RemoveTileCommand (Kachel aus Sektion entfernen und wiederherstellen)',
      createCmd: () => {
        const t1 = createTile('t1', 0, 0);
        return new RemoveTileCommand(t1, 0);
      },
    },
  ];

  it.each(commandsToTest)(
    'Befehl erfüllt Undo/Redo-Invariante und Integrität: $name',
    ({ createCmd }) => {
      const state = createInitialState();
      const cmd = createCmd(state);

      // 1. Ausführung
      const executed = cmd.execute(state);
      expect(executed.config).not.toEqual(state.config);

      // Integrität und Validierung nach Ausführung
      const validExec = validateDashboardConfigV2(executed.config);
      expect(validExec.ok).toBe(true);
      expect(findLayoutIntegrityError(executed.config)).toBeNull();

      // 2. Undo
      const undone = cmd.undo(executed);
      expect(stripTimestamps(undone.config)).toEqual(stripTimestamps(state.config));

      // Integrität und Validierung nach Undo
      const validUndo = validateDashboardConfigV2(undone.config);
      expect(validUndo.ok).toBe(true);
      expect(findLayoutIntegrityError(undone.config)).toBeNull();

      // 3. Redo
      const redone = cmd.execute(undone);
      expect(stripTimestamps(redone.config)).toEqual(stripTimestamps(executed.config));

      // Speicherabschätzung implementiert
      expect(cmd.estimateByteSize()).toBeGreaterThan(0);
    },
  );

  it('AddSectionCommand stellt bei vorher unkonfiguriertem sections genau undefined wieder her', () => {
    const stateWithoutSections = createInitialState({ sections: undefined });
    const sec: DashboardSectionV2 = {
      id: 'sec-first',
      title: 'Erste Sektion',
      collapsed: false,
      tileIds: [],
    };
    const cmd = new AddSectionCommand(sec);

    const executed = cmd.execute(stateWithoutSections);
    expect(executed.config.sections).toBeDefined();
    expect(executed.config.sections).toHaveLength(1);

    const undone = cmd.undo(executed);
    expect(undone.config.sections).toBeUndefined();
    expect(stripTimestamps(undone.config)).toEqual(stripTimestamps(stateWithoutSections.config));
  });
});
