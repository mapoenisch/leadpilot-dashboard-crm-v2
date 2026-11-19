/**
 * Alarmfähigkeits-Matrix für Transformationen (Auftrag 169 / P14a, Masterplan §4.D).
 *
 * Regeln:
 * - umbenennen: Wert unverändert -> erbt Alarmfähigkeit der Kennzahl.
 * - einheit_umrechnen: Alarmfähig via Server-Parität (Funktion alarm_apply_transformations).
 * - gleitender_durchschnitt: Nicht alarmfähig (Ergebnis ist Zeitreihe ohne Einzelwert).
 * - Unbekannte/zukünftige Arten: Standardmäßig nicht alarmfähig.
 */

import type { TileTransformation, TransformationArt } from './types';

export interface TransformationAlarmCapability {
  alarmfaehig: boolean;
  grund?: string;
}

export const TRANSFORMATION_ALARM_MATRIX: Record<
  TransformationArt,
  (t: TileTransformation) => TransformationAlarmCapability
> = {
  umbenennen: () => ({
    alarmfaehig: true,
  }),
  einheit_umrechnen: () => ({
    alarmfaehig: true,
  }),
  gleitender_durchschnitt: () => ({
    alarmfaehig: false,
    grund: 'Geglättete Verläufe haben keinen einzelnen Wert für einen Alarm.',
  }),
};

export function getTransformationAlarmCapability(
  transformation: TileTransformation,
): TransformationAlarmCapability {
  const handler = TRANSFORMATION_ALARM_MATRIX[transformation.art];
  if (!handler) {
    return {
      alarmfaehig: false,
      grund: `Unbekannte Transformationsart '${(transformation as { art?: string }).art ?? 'unbekannt'}'.`,
    };
  }
  return handler(transformation);
}

export function isTransformationChainAlarmPermitted(
  transformations?: readonly TileTransformation[] | null,
): { alarmfaehig: boolean; grund?: string; blockingIndex?: number } {
  if (!transformations || transformations.length === 0) {
    return { alarmfaehig: true };
  }

  for (let i = 0; i < transformations.length; i++) {
    const step = transformations[i];
    if (!step) continue;
    const cap = getTransformationAlarmCapability(step);
    if (!cap.alarmfaehig) {
      return {
        alarmfaehig: false,
        grund: cap.grund,
        blockingIndex: i,
      };
    }
  }

  return { alarmfaehig: true };
}
