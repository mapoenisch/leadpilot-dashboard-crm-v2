// Executive Dashboard V2 (Auftrag 157 / P09a):
// Befehle zur Platzierungsänderung von Sektionen & Kacheln:
// RemoveSectionCommand & MoveTileToSectionCommand mit deterministischem Undo.

import { generateCommandId, applyDraftMeta, type EditorCommand } from './editorCommands';
import type {
  BreakpointGridPositions,
  DashboardDraftState,
  DashboardSectionV2,
  DashboardTileConfigV2,
} from '../model/dashboardConfigV2';
import { computeNextAvailablePosition } from '../components/editor/editorPlacement';

/** Sektion entfernen (Kacheln wandern in den Bereich "Ohne Sektion") */
export class RemoveSectionCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'REMOVE_SECTION';
  readonly description: string;
  readonly timestamp: number;
  private readonly cachedByteSize: number;

  private removedSection?: DashboardSectionV2;
  private removedIndex?: number;
  private originalLayouts = new Map<string, DashboardTileConfigV2['layouts']>();

  constructor(
    public readonly sectionId: string,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_remove_sec');
    this.timestamp = Date.now();
    this.description = customDesc ?? 'Sektion entfernt (Kacheln nach Ohne Sektion verschoben)';
    this.cachedByteSize = 250;
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const sections = state.config.sections ?? [];
    const secIdx = sections.findIndex((s) => s.id === this.sectionId);
    if (secIdx === -1) return state;

    const sec = sections[secIdx]!;
    this.removedSection = sec;
    this.removedIndex = secIdx;

    // Kacheln der Sektion und Kacheln in "Ohne Sektion" ermitteln
    const sectionTileIds = new Set(sec.tileIds);
    const assignedTileIds = new Set<string>();
    sections.forEach((s) => {
      s.tileIds.forEach((id) => assignedTileIds.add(id));
    });

    // Unsectioned vor der Aktion
    const unsectionedTiles = state.config.tiles.filter((t) => !assignedTileIds.has(t.id));

    // Kacheln der zu entfernenden Sektion
    const movingTiles = state.config.tiles.filter((t) => sectionTileIds.has(t.id));

    this.originalLayouts.clear();
    movingTiles.forEach((t) => {
      this.originalLayouts.set(t.id, { ...t.layouts });
    });

    const accumulatedUnsectioned = [...unsectionedTiles];
    const updatedTilesMap = new Map<string, DashboardTileConfigV2>();

    for (const t of movingTiles) {
      const w = t.layouts.desktop.w;
      const h = t.layouts.desktop.h;
      const newLayouts = computeNextAvailablePosition(accumulatedUnsectioned, w, h);
      const updatedTile: DashboardTileConfigV2 = {
        ...t,
        layouts: newLayouts,
      };
      accumulatedUnsectioned.push(updatedTile);
      updatedTilesMap.set(t.id, updatedTile);
    }

    const nextTiles = state.config.tiles.map((t) => updatedTilesMap.get(t.id) ?? t);
    const nextSections = sections.filter((s) => s.id !== this.sectionId);

    return applyDraftMeta({
      ...state,
      config: { ...state.config, tiles: nextTiles, sections: nextSections },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    if (!this.removedSection || this.removedIndex === undefined) return state;

    const sections = [...(state.config.sections ?? [])];
    const insertIdx =
      this.removedIndex >= 0 && this.removedIndex <= sections.length
        ? this.removedIndex
        : sections.length;
    sections.splice(insertIdx, 0, this.removedSection);

    const nextTiles = state.config.tiles.map((t) => {
      const originalLayout = this.originalLayouts.get(t.id);
      if (!originalLayout) return t;
      return {
        ...t,
        layouts: { ...originalLayout },
      };
    });

    return applyDraftMeta({
      ...state,
      config: { ...state.config, tiles: nextTiles, sections },
    });
  }

  estimateByteSize(): number {
    return this.cachedByteSize;
  }
}

/** Kachel in eine andere Sektion (oder "Ohne Sektion") verschieben */
export class MoveTileToSectionCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'MOVE_TILE_TO_SECTION';
  readonly description: string;
  readonly timestamp: number;
  private readonly cachedByteSize: number;

  private previousSectionId?: string | null;
  private previousSectionIndex?: number;
  private previousLayouts?: DashboardTileConfigV2['layouts'];

  constructor(
    public readonly tileId: string,
    public readonly targetSectionId: string | null,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_move_tile_sec');
    this.timestamp = Date.now();
    this.description =
      customDesc ??
      (targetSectionId ? `Kachel in Sektion verschoben` : `Kachel nach 'Ohne Sektion' verschoben`);
    this.cachedByteSize = 200;
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const tile = state.config.tiles.find((t) => t.id === this.tileId);
    if (!tile) return state;

    const sections = state.config.sections ?? [];
    const currentSection = sections.find((s) => s.tileIds.includes(this.tileId)) ?? null;
    const currentSectionId = currentSection?.id ?? null;

    if (currentSectionId === this.targetSectionId) {
      return state;
    }

    this.previousSectionId = currentSectionId;
    this.previousSectionIndex = currentSection
      ? currentSection.tileIds.indexOf(this.tileId)
      : undefined;
    this.previousLayouts = { ...tile.layouts };

    // Kacheln im Zielbereich ermitteln
    let targetAreaTiles: DashboardTileConfigV2[] = [];
    if (this.targetSectionId === null) {
      const assignedIds = new Set<string>();
      sections.forEach((s) => s.tileIds.forEach((id) => assignedIds.add(id)));
      targetAreaTiles = state.config.tiles.filter(
        (t) => t.id !== this.tileId && !assignedIds.has(t.id),
      );
    } else {
      const targetSec = sections.find((s) => s.id === this.targetSectionId);
      const targetIds = new Set(targetSec?.tileIds ?? []);
      targetAreaTiles = state.config.tiles.filter(
        (t) => t.id !== this.tileId && targetIds.has(t.id),
      );
    }

    const nextLayouts: Required<BreakpointGridPositions> = computeNextAvailablePosition(
      targetAreaTiles,
      tile.layouts.desktop.w,
      tile.layouts.desktop.h,
    );

    const nextTiles = state.config.tiles.map((t) => {
      if (t.id !== this.tileId) return t;
      return {
        ...t,
        layouts: nextLayouts,
      };
    });

    const nextSections = sections.map((s) => {
      let tids = s.tileIds;
      if (s.id === currentSectionId) {
        tids = tids.filter((id) => id !== this.tileId);
      }
      if (s.id === this.targetSectionId) {
        tids = [...tids, this.tileId];
      }
      return { ...s, tileIds: tids };
    });

    return applyDraftMeta({
      ...state,
      selectedTileId: this.tileId,
      config: { ...state.config, tiles: nextTiles, sections: nextSections },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    if (!this.previousLayouts) return state;

    const sections = state.config.sections ?? [];
    const nextTiles = state.config.tiles.map((t) => {
      if (t.id !== this.tileId) return t;
      return {
        ...t,
        layouts: { ...this.previousLayouts! },
      };
    });

    const nextSections = sections.map((s) => {
      let tids = s.tileIds;
      // Aus Zielsektion entfernen
      if (this.targetSectionId && s.id === this.targetSectionId) {
        tids = tids.filter((id) => id !== this.tileId);
      }
      // In Ursprungssektion wieder einfügen
      if (this.previousSectionId && s.id === this.previousSectionId) {
        const copy = [...tids];
        const idx =
          this.previousSectionIndex !== undefined &&
          this.previousSectionIndex >= 0 &&
          this.previousSectionIndex <= copy.length
            ? this.previousSectionIndex
            : copy.length;
        copy.splice(idx, 0, this.tileId);
        tids = copy;
      }
      return { ...s, tileIds: tids };
    });

    return applyDraftMeta({
      ...state,
      selectedTileId: this.tileId,
      config: { ...state.config, tiles: nextTiles, sections: nextSections },
    });
  }

  estimateByteSize(): number {
    return this.cachedByteSize;
  }
}
