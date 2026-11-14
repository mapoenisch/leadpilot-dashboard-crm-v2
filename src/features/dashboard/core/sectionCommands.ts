import type { DashboardDraftState, DashboardSectionV2 } from '../model/dashboardConfigV2';
import {
  applyDraftMeta,
  estimatePayloadByteSize,
  generateCommandId,
  type EditorCommand,
} from './commandTypes';

/** 1. Sektion hinzufügen */
export class AddSectionCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'ADD_SECTION';
  readonly description: string;
  readonly timestamp: number;
  private readonly cachedByteSize: number;
  private wasSectionsUndefined = false;

  constructor(
    public readonly section: DashboardSectionV2,
    public readonly index?: number,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_add_sec');
    this.timestamp = Date.now();
    this.description = customDesc ?? `Sektion '${section.title}' hinzugefügt`;
    this.cachedByteSize = 140 + estimatePayloadByteSize(section);
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    this.wasSectionsUndefined = state.config.sections === undefined;
    const existing = state.config.sections ?? [];
    if (existing.some((s) => s.id === this.section.id)) {
      return state;
    }

    const sections = [...existing];
    const insertIdx =
      this.index !== undefined && this.index >= 0 && this.index <= sections.length
        ? this.index
        : sections.length;
    sections.splice(insertIdx, 0, this.section);

    return applyDraftMeta({
      ...state,
      config: { ...state.config, sections },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    if (this.wasSectionsUndefined) {
      const nextConfig = { ...state.config };
      delete nextConfig.sections;
      return applyDraftMeta({
        ...state,
        config: nextConfig,
      });
    }

    const sections = (state.config.sections ?? []).filter((s) => s.id !== this.section.id);
    return applyDraftMeta({
      ...state,
      config: { ...state.config, sections },
    });
  }

  estimateByteSize(): number {
    return this.cachedByteSize;
  }
}

/** 2. Sektion umbenennen */
export class RenameSectionCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'RENAME_SECTION';
  readonly description: string;
  readonly timestamp: number;
  private readonly cachedByteSize: number;

  constructor(
    public readonly sectionId: string,
    public readonly from: string,
    public readonly to: string,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_rename_sec');
    this.timestamp = Date.now();
    this.description = customDesc ?? `Sektion umbenannt in '${to}'`;
    this.cachedByteSize = 120 + from.length + to.length;
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const sections = (state.config.sections ?? []).map((s) => {
      if (s.id !== this.sectionId) return s;
      return { ...s, title: this.to };
    });

    return applyDraftMeta({
      ...state,
      config: { ...state.config, sections },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    const sections = (state.config.sections ?? []).map((s) => {
      if (s.id !== this.sectionId) return s;
      return { ...s, title: this.from };
    });

    return applyDraftMeta({
      ...state,
      config: { ...state.config, sections },
    });
  }

  estimateByteSize(): number {
    return this.cachedByteSize;
  }
}

/** 3. Sektion verschieben (Reihenfolge ändern) */
export class MoveSectionCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'MOVE_SECTION';
  readonly description: string;
  readonly timestamp: number;

  constructor(
    public readonly sectionId: string,
    public readonly fromIndex: number,
    public readonly toIndex: number,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_move_sec');
    this.timestamp = Date.now();
    this.description = customDesc ?? `Sektion an Position ${toIndex + 1} verschoben`;
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const sections = [...(state.config.sections ?? [])];
    if (this.fromIndex < 0 || this.fromIndex >= sections.length) return state;
    if (this.toIndex < 0 || this.toIndex >= sections.length) return state;
    if (this.fromIndex === this.toIndex) return state;

    const [removed] = sections.splice(this.fromIndex, 1);
    if (!removed) return state;
    sections.splice(this.toIndex, 0, removed);

    return applyDraftMeta({
      ...state,
      config: { ...state.config, sections },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    const sections = [...(state.config.sections ?? [])];
    if (this.toIndex < 0 || this.toIndex >= sections.length) return state;
    if (this.fromIndex < 0 || this.fromIndex >= sections.length) return state;
    if (this.fromIndex === this.toIndex) return state;

    const [removed] = sections.splice(this.toIndex, 1);
    if (!removed) return state;
    sections.splice(this.fromIndex, 0, removed);

    return applyDraftMeta({
      ...state,
      config: { ...state.config, sections },
    });
  }

  estimateByteSize(): number {
    return 130;
  }
}

/** 4. Einklappzustand einer Sektion ändern */
export class SetSectionCollapsedCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'SET_SECTION_COLLAPSED';
  readonly description: string;
  readonly timestamp: number;

  constructor(
    public readonly sectionId: string,
    public readonly collapsed: boolean,
    public readonly previousCollapsed?: boolean,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_collapse_sec');
    this.timestamp = Date.now();
    this.description = customDesc ?? (collapsed ? 'Sektion eingeklappt' : 'Sektion ausgeklappt');
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const sections = (state.config.sections ?? []).map((s) => {
      if (s.id !== this.sectionId) return s;
      return { ...s, collapsed: this.collapsed };
    });

    return applyDraftMeta({
      ...state,
      config: { ...state.config, sections },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    const restoreCollapsed = this.previousCollapsed ?? !this.collapsed;
    const sections = (state.config.sections ?? []).map((s) => {
      if (s.id !== this.sectionId) return s;
      return { ...s, collapsed: restoreCollapsed };
    });

    return applyDraftMeta({
      ...state,
      config: { ...state.config, sections },
    });
  }

  estimateByteSize(): number {
    return 110;
  }
}

export { RemoveSectionCommand, MoveTileToSectionCommand } from './sectionPlacementCommands';
