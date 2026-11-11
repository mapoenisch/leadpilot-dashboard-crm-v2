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

/**
 * Schätzt den Speicherbedarf eines beliebigen Nutzdaten-Objekts (Patches, Kacheln, Configs)
 * unter Berücksichtigung von Zeichenketten (UTF-16 Heap-Bedarf in V8) und Objekt-Overhead.
 */
export function estimatePayloadByteSize(payload: unknown): number {
  if (payload === null || payload === undefined) {
    return 0;
  }
  if (typeof payload === 'string') {
    return payload.length * 2 + 16;
  }
  if (typeof payload === 'number') {
    return 8;
  }
  if (typeof payload === 'boolean') {
    return 4;
  }
  try {
    const json = JSON.stringify(payload);
    // V8 speichert Strings typischerweise mit 1-2 Bytes pro Char, plus Objekt-Deskriptor & Referenz-Overhead
    return json.length * 2 + 64;
  } catch {
    return 256;
  }
}
