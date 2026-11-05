// Executive Dashboard: Aktionen auf der Arbeitskopie des Dashboard-Editors.
import { useCallback, type MutableRefObject } from 'react';
import type { DashboardConfig, DashboardFilters } from '../model/dashboardConfig';
import {
  addTile as addTileTo,
  applyPreset as applyPresetTo,
  moveTile as moveTileIn,
  moveTileTo as moveTileToIn,
  removeTile as removeTileFrom,
  resetToDefault as defaultConfig,
  setStartFilters as setFiltersOn,
  tileTitle,
  updateTile as updateTileIn,
  type EditResult,
  type NewTileInput,
  type TilePatch,
} from './dashboardEditorReducer';
import { getPresetById } from '../model/dashboardPresets';
import type { useDashboardEditorHistory } from './useDashboardEditorHistory';

const BUSY: EditResult = { ok: false, reason: 'Gerade nicht möglich.' };

export interface DraftActionsDeps {
  draftRef: MutableRefObject<DashboardConfig | null>;
  lockedRef: MutableRefObject<boolean>;
  history: ReturnType<typeof useDashboardEditorHistory>;
  commit: (next: DashboardConfig | null) => void;
  announce: (text: string) => void;
}

export function useDashboardDraftActions(deps: DraftActionsDeps) {
  const { draftRef, lockedRef, history, commit, announce } = deps;

  const edit = useCallback(
    (
      change: (current: DashboardConfig) => EditResult,
      message: (config: DashboardConfig) => string,
    ) => {
      const current = draftRef.current;
      if (!current || lockedRef.current) return BUSY;
      const result = change(current);
      if (result.ok) {
        history.pushHistory(result.config);
        commit(result.config);
        announce(message(result.config));
      }
      return result;
    },
    [draftRef, lockedRef, history, commit, announce],
  );

  const addTile = useCallback(
    (input: NewTileInput): EditResult =>
      edit(
        (config) => addTileTo(config, input),
        (config) => {
          const added = config.tiles[config.tiles.length - 1];
          return `${added ? tileTitle(added) : 'Kachel'} hinzugefügt. Sie steht an Position ${config.tiles.length} von ${config.tiles.length}.`;
        },
      ),
    [edit],
  );

  const updateTile = useCallback(
    (tileId: string, patch: TilePatch): EditResult =>
      edit(
        (config) => updateTileIn(config, tileId, patch),
        (config) => {
          const changed = config.tiles.find((tile) => tile.tileId === tileId);
          return `${changed ? tileTitle(changed) : 'Kachel'} geändert.`;
        },
      ),
    [edit],
  );

  const removeTile = useCallback(
    (tileId: string): void => {
      const current = draftRef.current;
      const removed = current?.tiles.find((tile) => tile.tileId === tileId);
      if (!removed) return;
      edit(
        (config) => ({ ok: true, config: removeTileFrom(config, tileId) }),
        () => `${tileTitle(removed)} entfernt.`,
      );
    },
    [draftRef, edit],
  );

  const moveWith = useCallback(
    (tileId: string, move: (config: DashboardConfig) => DashboardConfig): void => {
      const current = draftRef.current;
      if (!current || lockedRef.current) return;
      const next = move(current);
      if (next === current) return;
      history.pushHistory(next);
      commit(next);
      const index = next.tiles.findIndex((tile) => tile.tileId === tileId);
      const moved = next.tiles[index];
      if (moved) {
        announce(
          `${tileTitle(moved)} steht jetzt an Position ${index + 1} von ${next.tiles.length}.`,
        );
      }
    },
    [draftRef, lockedRef, history, commit, announce],
  );

  const moveTile = useCallback(
    (tileId: string, direction: 'hoch' | 'runter'): void =>
      moveWith(tileId, (config) => moveTileIn(config, tileId, direction)),
    [moveWith],
  );

  const moveTileTo = useCallback(
    (tileId: string, toIndex: number): void =>
      moveWith(tileId, (config) => moveTileToIn(config, tileId, toIndex)),
    [moveWith],
  );

  const resetToDefault = useCallback((): void => {
    if (!draftRef.current || lockedRef.current) return;
    const cfg = defaultConfig();
    history.pushHistory(cfg);
    commit(cfg);
    announce('Auf Standard zurückgesetzt. Die Änderung gilt erst nach „Speichern“.');
  }, [draftRef, lockedRef, history, commit, announce]);

  const applyPreset = useCallback(
    (presetId: string): EditResult => {
      const current = draftRef.current;
      if (!current || lockedRef.current) return BUSY;
      const preset = getPresetById(presetId);
      if (!preset) return { ok: false, reason: 'Vorlage nicht gefunden.' };
      const result = applyPresetTo(preset);
      if (result.ok) {
        history.pushHistory(result.config);
        commit(result.config);
        announce(`Vorlage „${preset.name}“ angewendet. Die Änderung gilt erst nach „Speichern“.`);
      }
      return result;
    },
    [draftRef, lockedRef, history, commit, announce],
  );

  const setStartFilters = useCallback(
    (filters?: DashboardFilters): EditResult =>
      edit(
        (config) => setFiltersOn(config, filters),
        () => (filters ? 'Startfilter übernommen.' : 'Startfilter entfernt.'),
      ),
    [edit],
  );

  return {
    addTile,
    updateTile,
    removeTile,
    moveTile,
    moveTileTo,
    resetToDefault,
    applyPreset,
    setStartFilters,
  };
}
