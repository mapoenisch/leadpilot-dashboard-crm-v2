/**
 * Typdefinitionen für Kachel-Transformationen (Auftrag 169 / P14a).
 * Kette statt Formel: Maximal 3 Schritte je Kachel.
 */

export type TransformationArt = 'umbenennen' | 'einheit_umrechnen' | 'gleitender_durchschnitt';

export interface RenameTransformation {
  art: 'umbenennen';
  name: string; // Neuer Anzeigename (1–60 Zeichen)
}

export interface UnitConversionTransformation {
  art: 'einheit_umrechnen';
  von: string; // Ausgangseinheit (z. B. 'EUR')
  zu: string; // Zieleinheit (z. B. 'Tsd. EUR')
}

export interface MovingAverageTransformation {
  art: 'gleitender_durchschnitt';
  fenster: number; // Fenstergröße (2–30 Punkte), nachlaufend
}

export type TileTransformation =
  RenameTransformation | UnitConversionTransformation | MovingAverageTransformation;

export interface TransformationValidationResult {
  ok: boolean;
  grund?: string;
  index?: number;
}
