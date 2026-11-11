// Executive Dashboard V2 (Auftrag 148 / P05):
// Hilfsfunktion zur Berechnung der nächsten freien Rasterposition beim Hinzufügen / Duplizieren.

import type { DashboardTileConfigV2 } from '../../model/dashboardConfigV2';

/** Berechnet die nächste freie Rasterposition für eine neue Kachel */
export function computeNextAvailablePosition(
  tiles: readonly DashboardTileConfigV2[],
  width = 6,
  height = 4,
): {
  desktop: { x: number; y: number; w: number; h: number };
  tablet: { x: number; y: number; w: number; h: number };
  mobile: { x: number; y: number; w: number; h: number };
} {
  let maxY = 0;
  for (const t of tiles) {
    const bottom = t.layouts.desktop.y + t.layouts.desktop.h;
    if (bottom > maxY) maxY = bottom;
  }

  // Suche in der letzten Zeile nach freier x-Position
  let currentX = 0;
  const lastRowTiles = tiles.filter((t) => t.layouts.desktop.y + t.layouts.desktop.h > maxY - 1);
  for (const t of lastRowTiles) {
    const right = t.layouts.desktop.x + t.layouts.desktop.w;
    if (right > currentX && right <= 12) {
      currentX = right;
    }
  }

  let finalX = currentX;
  let finalY = maxY > 0 && currentX + width <= 12 ? Math.max(0, maxY - height) : maxY;

  if (finalX + width > 12) {
    finalX = 0;
    finalY = maxY;
  }

  return {
    desktop: { x: finalX, y: finalY, w: width, h: height },
    tablet: { x: 0, y: finalY, w: Math.min(6, width), h: height },
    mobile: { x: 0, y: finalY, w: 1, h: height },
  };
}
