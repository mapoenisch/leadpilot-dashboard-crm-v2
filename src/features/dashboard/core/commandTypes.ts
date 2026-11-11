// Executive Dashboard V2 (Auftrag 147 / P04):
// Basistypen und Hilfsfunktionen für das Reversible-Command-Pattern.

import type { DashboardDraftState } from '../model/dashboardConfigV2';

export interface EditorCommand {
  readonly id: string;
  readonly type: string;
  readonly description: string;
  readonly timestamp: number;

  /** Führt die Änderung auf dem Entwurf aus (Vorwärtsrichtung) */
  execute(state: DashboardDraftState): DashboardDraftState;

  /** Führt die exakte Rückabwicklung auf dem Entwurf aus (Rückwärtsrichtung) */
  undo(state: DashboardDraftState): DashboardDraftState;

  /** Schätzt den Speicherbedarf dieses Befehls in Bytes */
  estimateByteSize(): number;
}

export function generateCommandId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${Date.now()}_${rand}`;
}

/** Hilfsfunktion: Markiert Entwurf als vom Benutzer bearbeitet und aktualisiert updatedAt */
export function applyDraftMeta(state: DashboardDraftState): DashboardDraftState {
  const currentMeta = state.config.metadata ?? {};
  return {
    ...state,
    isDirty: true,
    config: {
      ...state.config,
      metadata: {
        ...currentMeta,
        user_edited: true,
      },
      updatedAt: new Date().toISOString(),
    },
  };
}
