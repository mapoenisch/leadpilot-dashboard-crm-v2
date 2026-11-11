// Executive Dashboard V2 (Auftrag 147 / P04):
// Debouncer für Texteingaben im Dashboard-Editor.
// Bündelt kontinuierliches Tippen (600 ms Pause / onBlur) zu genau einem Undo-Schritt.

import type { DashboardConfigV2, DashboardDraftState } from '../model/dashboardConfigV2';
import { UpdateTileConfigCommand } from './editorCommands';
import { TEXT_DEBOUNCE_MS, type PendingTextEntry } from './editorCoreTypes';

export class TextInputDebouncer {
  private pending: PendingTextEntry | null = null;

  constructor(
    private readonly onCommitCommand: (cmd: UpdateTileConfigCommand) => void,
    private readonly onDraftUpdated: (
      updater: (state: DashboardDraftState) => DashboardDraftState,
    ) => void,
  ) {}

  record(tileId: string, field: string, initialValue: string, latestValue: string): void {
    if (this.pending && (this.pending.tileId !== tileId || this.pending.field !== field)) {
      this.flush();
    }

    if (!this.pending) {
      this.pending = {
        tileId,
        field,
        initialValue,
        latestValue,
        timerId: null,
      };
    } else {
      this.pending.latestValue = latestValue;
      if (this.pending.timerId) {
        clearTimeout(this.pending.timerId);
      }
    }

    // Entwurf sofort für flüssiges Tippen aktualisieren
    this.onDraftUpdated((state) => {
      const tiles = state.config.tiles.map((t) => {
        if (t.id !== tileId) return t;
        return { ...t, [field]: latestValue };
      });
      return {
        ...state,
        isDirty: true,
        config: { ...state.config, tiles },
      };
    });

    this.pending.timerId = setTimeout(() => {
      this.flush();
    }, TEXT_DEBOUNCE_MS);
  }

  flush(): void {
    if (!this.pending) return;

    const { tileId, field, initialValue, latestValue, timerId } = this.pending;
    if (timerId) {
      clearTimeout(timerId);
    }
    this.pending = null;

    if (initialValue !== latestValue) {
      const cmd = new UpdateTileConfigCommand(
        tileId,
        { [field]: initialValue } as Partial<DashboardConfigV2['tiles'][0]>,
        { [field]: latestValue } as Partial<DashboardConfigV2['tiles'][0]>,
        `Texteingabe '${field}' geändert`,
      );
      this.onCommitCommand(cmd);
    }
  }

  cancel(): void {
    if (this.pending?.timerId) {
      clearTimeout(this.pending.timerId);
    }
    this.pending = null;
  }
}
