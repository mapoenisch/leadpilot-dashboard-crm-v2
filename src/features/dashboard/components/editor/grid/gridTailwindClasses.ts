// Executive Dashboard V2 (Auftrag 149 / P06):
// Statische Tailwind-Klassen-Mappings für diskrete 12-Spalten-CSS-Grid Platzierungen.
// Vermeidet Inline-Styles und schützt das Quality-Debt-Budget (Issue #7).

import type { GridPosition } from '../../../model/dashboardConfigV2';

export const COL_START_CLASSES: Record<number, string> = {
  1: 'col-start-1',
  2: 'col-start-2',
  3: 'col-start-3',
  4: 'col-start-4',
  5: 'col-start-5',
  6: 'col-start-6',
  7: 'col-start-7',
  8: 'col-start-8',
  9: 'col-start-9',
  10: 'col-start-10',
  11: 'col-start-11',
  12: 'col-start-12',
};

export const COL_SPAN_CLASSES: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
};

export const ROW_START_CLASSES: Record<number, string> = {
  1: 'row-start-1',
  2: 'row-start-2',
  3: 'row-start-3',
  4: 'row-start-4',
  5: 'row-start-5',
  6: 'row-start-6',
  7: 'row-start-7',
  8: 'row-start-8',
  9: 'row-start-9',
  10: 'row-start-10',
  11: 'row-start-11',
  12: 'row-start-12',
  13: 'row-start-13',
  14: 'row-start-14',
  15: 'row-start-15',
  16: 'row-start-16',
  17: 'row-start-17',
  18: 'row-start-18',
  19: 'row-start-19',
  20: 'row-start-20',
  21: 'row-start-21',
  22: 'row-start-22',
  23: 'row-start-23',
  24: 'row-start-24',
  25: 'row-start-25',
  26: 'row-start-26',
  27: 'row-start-27',
  28: 'row-start-28',
  29: 'row-start-29',
  30: 'row-start-30',
  31: 'row-start-31',
  32: 'row-start-32',
};

export const ROW_SPAN_CLASSES: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
  6: 'row-span-6',
  7: 'row-span-7',
  8: 'row-span-8',
  9: 'row-span-9',
  10: 'row-span-10',
  11: 'row-span-11',
  12: 'row-span-12',
};

/** Liefert die Tailwind-Klassen für eine diskrete Kachelplatzierung im Raster */
export function getGridPlacementClasses(pos: GridPosition, isMobile: boolean): string {
  if (isMobile) {
    return 'col-start-1 col-span-1 row-start-auto row-span-auto';
  }

  const colStart = COL_START_CLASSES[pos.x + 1] ?? 'col-start-1';
  const colSpan = COL_SPAN_CLASSES[pos.w] ?? 'col-span-6';
  const rowStart = ROW_START_CLASSES[pos.y + 1] ?? 'row-start-auto';
  const rowSpan = ROW_SPAN_CLASSES[pos.h] ?? 'row-span-4';

  return `${colStart} ${colSpan} ${rowStart} ${rowSpan}`;
}
