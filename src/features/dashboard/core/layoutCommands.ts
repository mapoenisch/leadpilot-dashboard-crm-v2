// Executive Dashboard V2 (Auftrag 147 / P04):
// Raster- und Layout-Befehle (Move, Resize, BatchMove für Reflow).

import type { BreakpointKey, DashboardDraftState, GridPosition } from '../model/dashboardConfigV2';
import { applyDraftMeta, generateCommandId, type EditorCommand } from './commandTypes';

/** 1. Kachel im Raster verschieben */
export class MoveTileCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'MOVE_TILE';
  readonly description: string;
  readonly timestamp: number;

  constructor(
    public readonly tileId: string,
    public readonly breakpoint: BreakpointKey,
    public readonly from: GridPosition,
    public readonly to: GridPosition,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_move');
    this.timestamp = Date.now();
    this.description = customDesc ?? `Kachel verschoben auf (${to.x}, ${to.y})`;
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const tiles = state.config.tiles.map((t) => {
      if (t.id !== this.tileId) return t;
      return {
        ...t,
        layouts: {
          ...t.layouts,
          [this.breakpoint]: { ...this.to },
        },
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
        layouts: {
          ...t.layouts,
          [this.breakpoint]: { ...this.from },
        },
      };
    });

    return applyDraftMeta({
      ...state,
      selectedTileId: this.tileId,
      config: { ...state.config, tiles },
    });
  }

  estimateByteSize(): number {
    return 180;
  }
}

/** 2. Kachelgröße im Raster ändern */
export class ResizeTileCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'RESIZE_TILE';
  readonly description: string;
  readonly timestamp: number;

  constructor(
    public readonly tileId: string,
    public readonly breakpoint: BreakpointKey,
    public readonly from: GridPosition,
    public readonly to: GridPosition,
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_resize');
    this.timestamp = Date.now();
    this.description = customDesc ?? `Kachelgröße geändert auf ${to.w}x${to.h}`;
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const tiles = state.config.tiles.map((t) => {
      if (t.id !== this.tileId) return t;
      return {
        ...t,
        layouts: {
          ...t.layouts,
          [this.breakpoint]: { ...this.to },
        },
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
        layouts: {
          ...t.layouts,
          [this.breakpoint]: { ...this.from },
        },
      };
    });

    return applyDraftMeta({
      ...state,
      selectedTileId: this.tileId,
      config: { ...state.config, tiles },
    });
  }

  estimateByteSize(): number {
    return 180;
  }
}

/** 3. Mehrere Kacheln gleichzeitig verschieben (Reflow bei Kollision) */
export interface TileMovement {
  tileId: string;
  from: GridPosition;
  to: GridPosition;
}

export class BatchMoveTilesCommand implements EditorCommand {
  readonly id: string;
  readonly type = 'BATCH_MOVE_TILES';
  readonly description: string;
  readonly timestamp: number;

  constructor(
    public readonly breakpoint: BreakpointKey,
    public readonly moves: readonly TileMovement[],
    customDesc?: string,
  ) {
    this.id = generateCommandId('cmd_batch_move');
    this.timestamp = Date.now();
    this.description = customDesc ?? `${moves.length} Kacheln neu angeordnet (Auto-Reflow)`;
  }

  execute(state: DashboardDraftState): DashboardDraftState {
    const toMap = new Map<string, GridPosition>();
    for (const m of this.moves) {
      toMap.set(m.tileId, m.to);
    }

    const tiles = state.config.tiles.map((t) => {
      const targetPos = toMap.get(t.id);
      if (!targetPos) return t;
      return {
        ...t,
        layouts: {
          ...t.layouts,
          [this.breakpoint]: { ...targetPos },
        },
      };
    });

    return applyDraftMeta({
      ...state,
      config: { ...state.config, tiles },
    });
  }

  undo(state: DashboardDraftState): DashboardDraftState {
    const fromMap = new Map<string, GridPosition>();
    for (const m of this.moves) {
      fromMap.set(m.tileId, m.from);
    }

    const tiles = state.config.tiles.map((t) => {
      const origPos = fromMap.get(t.id);
      if (!origPos) return t;
      return {
        ...t,
        layouts: {
          ...t.layouts,
          [this.breakpoint]: { ...origPos },
        },
      };
    });

    return applyDraftMeta({
      ...state,
      config: { ...state.config, tiles },
    });
  }

  estimateByteSize(): number {
    return 120 + this.moves.length * 80;
  }
}
