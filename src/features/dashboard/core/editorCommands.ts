// Executive Dashboard V2 (Auftrag 147 / P04):
// Reversible-Command-Pattern mit speichereffizienten Delta-Patches.
// Jeder Schritt benötigt typischerweise < 1 KiB RAM.

import type {
  DashboardDraftState,
  DashboardMetadataV2,
  DashboardTileConfigV2,
} from '../model/dashboardConfigV2';
import {
  applyDraftMeta,
  estimatePayloadByteSize,
  generateCommandId,
  type EditorCommand,
} from './commandTypes';

// Re-Export von Basistypen und Layout-Befehlen für einheitlichen Zugriff
export * from './commandTypes';
export * from './layoutCommands';

/** 4. Neue Kachel hinzufügen */
export class AddTileCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'ADD_TILE';
  readonly description: string;
  readonly timestamp: number;
  private readonly cachedByteSize: number;

  constructor(
    public readonly tile: DashboardTileConfigV2,
    public readonly index?: number,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_add');
    this.timestamp = Date.now();
    this.description = customDesc ?? `Kachel '${tile.title || tile.catalogId}' hinzugefügt`;
    this.cachedByteSize = 150 + estimatePayloadByteSize(tile);
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const tiles = [...state.config.tiles];
    // Wenn bereits vorhanden, nicht erneut hinzufügen
    if (tiles.some((t) => t.id === this.tile.id)) {
      return state;
    }

    const insertIdx =
      this.index !== undefined && this.index >= 0 && this.index <= tiles.length
        ? this.index
        : tiles.length;

    tiles.splice(insertIdx, 0, this.tile);

    return applyDraftMeta({
      ...state,
      selectedTileId: this.tile.id,
      config: { ...state.config, tiles },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    const tiles = state.config.tiles.filter((t) => t.id !== this.tile.id);
    return applyDraftMeta({
      ...state,
      selectedTileId: state.selectedTileId === this.tile.id ? null : state.selectedTileId,
      config: { ...state.config, tiles },
    });
  }

  estimateByteSize(): number {
    return this.cachedByteSize;
  }
}

/** 5. Kachel entfernen */
export class RemoveTileCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'REMOVE_TILE';
  readonly description: string;
  readonly timestamp: number;
  private readonly cachedByteSize: number;

  constructor(
    public readonly tile: DashboardTileConfigV2,
    public readonly index: number,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_remove');
    this.timestamp = Date.now();
    this.description = customDesc ?? `Kachel '${tile.title || tile.catalogId}' entfernt`;
    this.cachedByteSize = 150 + estimatePayloadByteSize(tile);
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const tiles = state.config.tiles.filter((t) => t.id !== this.tile.id);
    return applyDraftMeta({
      ...state,
      selectedTileId: state.selectedTileId === this.tile.id ? null : state.selectedTileId,
      config: { ...state.config, tiles },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    const tiles = [...state.config.tiles];
    const insertIdx = this.index >= 0 && this.index <= tiles.length ? this.index : tiles.length;
    tiles.splice(insertIdx, 0, this.tile);

    return applyDraftMeta({
      ...state,
      selectedTileId: this.tile.id,
      config: { ...state.config, tiles },
    });
  }

  estimateByteSize(): number {
    return this.cachedByteSize;
  }
}

/** 6. Kachel-Konfiguration aktualisieren (Optionen, Titel, Filter, Overrides) */
export class UpdateTileConfigCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'UPDATE_TILE_CONFIG';
  readonly description: string;
  readonly timestamp: number;
  private readonly cachedByteSize: number;

  constructor(
    public readonly tileId: string,
    public readonly fromPatch: Partial<DashboardTileConfigV2>,
    public readonly toPatch: Partial<DashboardTileConfigV2>,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_update_tile');
    this.timestamp = Date.now();
    this.description = customDesc ?? `Kacheleinstellungen für '${tileId}' aktualisiert`;
    this.cachedByteSize =
      120 + estimatePayloadByteSize(fromPatch) + estimatePayloadByteSize(toPatch);
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const tiles = state.config.tiles.map((t) => {
      if (t.id !== this.tileId) return t;
      return {
        ...t,
        ...this.toPatch,
      };
    });

    return applyDraftMeta({
      ...state,
      selectedTileId: this.tileId,
      config: { ...state.config, tiles },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    const tiles = state.config.tiles.map((t) => {
      if (t.id !== this.tileId) return t;
      return {
        ...t,
        ...this.fromPatch,
      };
    });

    return applyDraftMeta({
      ...state,
      selectedTileId: this.tileId,
      config: { ...state.config, tiles },
    });
  }

  estimateByteSize(): number {
    return this.cachedByteSize;
  }
}

/** 7. Dashboard-Metadaten & Titel aktualisieren */
export class UpdateDashboardMetaCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'UPDATE_DASHBOARD_META';
  readonly description: string;
  readonly timestamp: number;
  private readonly cachedByteSize: number;

  constructor(
    public readonly from: { title?: string; metadata?: DashboardMetadataV2 },
    public readonly to: { title?: string; metadata?: DashboardMetadataV2 },
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_update_meta');
    this.timestamp = Date.now();
    this.description = customDesc ?? 'Dashboard-Eigenschaften aktualisiert';
    this.cachedByteSize = 100 + estimatePayloadByteSize(from) + estimatePayloadByteSize(to);
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    return applyDraftMeta({
      ...state,
      config: {
        ...state.config,
        title: this.to.title ?? state.config.title,
        metadata: {
          ...(state.config.metadata ?? {}),
          ...(this.to.metadata ?? {}),
        },
      },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    return applyDraftMeta({
      ...state,
      config: {
        ...state.config,
        title: this.from.title ?? state.config.title,
        metadata: {
          ...(state.config.metadata ?? {}),
          ...(this.from.metadata ?? {}),
        },
      },
    });
  }

  estimateByteSize(): number {
    return this.cachedByteSize;
  }
}

/** 8. Globalen Filter (Zeitraum / Pipeline) setzen */
export class SetGlobalFilterCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'SET_GLOBAL_FILTER';
  readonly description: string;
  readonly timestamp: number;
  private readonly cachedByteSize: number;

  constructor(
    public readonly filterType: 'timeframe' | 'pipeline',
    public readonly from: string | undefined,
    public readonly to: string | undefined,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_set_filter');
    this.timestamp = Date.now();
    this.description =
      customDesc ??
      (filterType === 'timeframe'
        ? `Globaler Zeitraum auf '${to}' geändert`
        : `Globale Pipeline auf '${to ?? 'alle'}' geändert`);
    this.cachedByteSize = 80 + estimatePayloadByteSize(from) + estimatePayloadByteSize(to);
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    return applyDraftMeta({
      ...state,
      config: {
        ...state.config,
        ...(this.filterType === 'timeframe'
          ? { globalTimeframe: this.to ?? 'letzte_30_tage' }
          : { globalPipeline: this.to }),
      },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    return applyDraftMeta({
      ...state,
      config: {
        ...state.config,
        ...(this.filterType === 'timeframe'
          ? { globalTimeframe: this.from ?? 'letzte_30_tage' }
          : { globalPipeline: this.from }),
      },
    });
  }

  estimateByteSize(): number {
    return this.cachedByteSize;
  }
}

/** 9. Zusammengesetzter Befehl (Bündelung mehrerer Einzelaktionen in 1 Undo-Schritt) */
export class CompoundCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'COMPOUND';
  readonly timestamp: number;

  constructor(
    public readonly commands: readonly EditorCommand[],
    public readonly description: string,
  ) {
    this.id = generateCommandId('cmd_compound');
    this.timestamp = Date.now();
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    let current = state;
    for (const cmd of this.commands) {
      current = cmd.execute(current);
    }
    return current;
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    // Rückabwicklung in umgekehrter Reihenfolge!
    let current = state;
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const cmd = this.commands[i];
      if (cmd) {
        current = cmd.undo(current);
      }
    }
    return current;
  }

  estimateByteSize(): number {
    return 100 + this.commands.reduce((sum, c) => sum + c.estimateByteSize(), 0);
  }
}
