// Aus DashboardGrid.tsx ausgelagert (Auftrag 168, Dateigrößengrenze 400 Zeilen).

/** Berechnet die Zielposition unter Berücksichtigung der Vor-/Nach-Seite und des Entfernens der Quelle. */
export function calculateDropIndex(from: number, target: number, side: 'before' | 'after'): number {
  if (from === target) return from;
  if (from < target)
    return side === 'before' && target === from + 1
      ? target
      : side === 'before'
        ? target - 1
        : target;
  return side === 'after' && target === from - 1 ? target : side === 'before' ? target : target + 1;
}
