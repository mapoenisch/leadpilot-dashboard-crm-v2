// Auftrag 174b (K2): Kachelinhalt passt in die belegte Rasterfläche, ohne Scrollen.
// Reine Rechenlogik der Einpassung, getrennt von der Messung im DOM (TileFitBox).

import { createContext, useContext } from 'react';

/**
 * Kleinster Verkleinerungsfaktor, bei dem der Inhalt noch gut lesbar ist. Bei 0,8 werden aus
 * 12-px-Text 9,6 px und die Diagrammzeichenfläche (560 px) bleibt mindestens 448 px breit.
 * Unterhalb davon lässt sich eine Kachel im Editor nicht weiter verkleinern.
 */
export const TILE_FIT_MIN_SCALE = 0.8;

/** Schmalste Layoutbreite des Inhalts, auch wenn sein Mindestinhalt schmaler wäre. */
export const TILE_FIT_MIN_LAYOUT_WIDTH = 120;

/** Ergebnis der Einpassung: Layoutbreite, Faktor und Versatz zur Zentrierung. */
export interface TileFitResult {
  /** Breite, in der der Inhalt gesetzt wird (unskaliert, px) */
  layoutWidth: number;
  /** Höhe des Inhalts bei dieser Breite (unskaliert, px) */
  layoutHeight: number;
  scale: number;
  left: number;
  top: number;
}

/** Platzbedarf des Inhalts bei Mindestfaktor (für die Mindestgröße der Kachel, px). */
export interface TileFitMinimum {
  width: number;
  height: number;
}

/**
 * Wählt Layoutbreite und Faktor für eine Fläche von `width` × `height` px.
 * `measure(L)` liefert die natürliche Höhe des Inhalts bei Layoutbreite L. `minLayoutWidth` ist
 * die Breite, unter der der Inhalt überläuft (Mindestinhalt). Bevorzugt wird Faktor 1 bei voller
 * Breite; sonst der größte Faktor, bei dem der Inhalt vollständig hineinpasst. Diagramme werden
 * mit der Breite höher, deshalb wird bei knapper Höhe auch eine schmalere Layoutbreite geprüft
 * (der Inhalt steht dann zentriert).
 */
export function computeTileFit(
  width: number,
  height: number,
  minLayoutWidth: number,
  measure: (layoutWidth: number) => number,
): TileFitResult {
  const minWidth = Math.max(TILE_FIT_MIN_LAYOUT_WIDTH, Math.ceil(minLayoutWidth));
  const place = (layoutWidth: number, layoutHeight: number, scale: number): TileFitResult => ({
    layoutWidth,
    layoutHeight,
    scale,
    left: Math.max(0, (width - layoutWidth * scale) / 2),
    top: Math.max(0, (height - layoutHeight * scale) / 2),
  });

  if (width >= minWidth) {
    const full = measure(width);
    if (full <= height) return place(width, full, 1);
  }

  // Für einen Faktor s: passt der Inhalt bei voller Breite (W/s) oder bei Mindestbreite?
  const tryScale = (scale: number): TileFitResult | null => {
    const candidates = [Math.max(minWidth, Math.floor(width / scale)), minWidth];
    for (const layoutWidth of candidates) {
      if (layoutWidth * scale > width + 0.5) continue;
      const layoutHeight = measure(layoutWidth);
      if (layoutHeight * scale <= height + 0.5) return place(layoutWidth, layoutHeight, scale);
    }
    return null;
  };

  // Binäre Suche nach dem größten passenden Faktor (monoton: kleiner passt leichter).
  let low = 0.05;
  let high = 1;
  let best: TileFitResult | null = null;
  for (let i = 0; i < 9; i++) {
    const mid = (low + high) / 2;
    const fit = tryScale(mid);
    if (fit) {
      best = fit;
      low = mid;
    } else {
      high = mid;
    }
  }
  if (best) return best;
  // Notfall (z. B. Fläche 0): kleinster Faktor bei Mindestbreite, oben links.
  const layoutHeight = measure(minWidth);
  const scale = Math.max(0.05, Math.min(width / minWidth, height / Math.max(1, layoutHeight)));
  return { layoutWidth: minWidth, layoutHeight, scale, left: 0, top: 0 };
}

/** Platzbedarf des Inhalts bei Mindestfaktor und Mindestbreite. */
export function computeTileFitMinimum(
  minLayoutWidth: number,
  measure: (layoutWidth: number) => number,
): TileFitMinimum {
  const minWidth = Math.max(TILE_FIT_MIN_LAYOUT_WIDTH, Math.ceil(minLayoutWidth));
  return {
    width: Math.ceil(minWidth * TILE_FIT_MIN_SCALE),
    height: Math.ceil(measure(minWidth) * TILE_FIT_MIN_SCALE),
  };
}

/**
 * Kontext „Inhalt wird eingepasst“: Innerhalb von TileFitBox verzichten Tabellen, Hinweise und
 * Trichter auf eigene Scrollbereiche mit fester Höhe, weil die Einpassung die Höhe übernimmt.
 */
export const TileFitContext = createContext(false);

export function useTileFit(): boolean {
  return useContext(TileFitContext);
}
