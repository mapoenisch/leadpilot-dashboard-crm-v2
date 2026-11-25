// Auftrag 174b (K6, K7): Rasterzeilen jenseits von 13 und Säulenachse ab 0.

import resolveConfig from 'tailwindcss/resolveConfig';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- Tailwind-Konfiguration ist JavaScript ohne Typdeklaration.
import tailwindConfigJs from '../../../../tailwind.config.js';
import {
  getGridPlacementClasses,
  GRID_MAX_ROW_START,
  rowStartClass,
} from '../components/editor/grid/gridTailwindClasses';
import { niceSignedScale } from '../components/charts/depthGeometry';
import type { Config } from 'tailwindcss';

const tailwindConfig = tailwindConfigJs as Config & { safelist: Array<{ pattern: RegExp }> };

describe('Rasterzeilen (K6)', () => {
  it('jede Startzeile bis zur Obergrenze hat eine Tailwind-Klasse', () => {
    const theme = resolveConfig(tailwindConfig).theme as { gridRowStart: Record<string, string> };
    for (let row = 1; row <= GRID_MAX_ROW_START; row++) {
      expect(rowStartClass(row)).toBe(`row-start-${row}`);
      expect(theme.gridRowStart[String(row)]).toBe(String(row));
    }
  });

  it('die safelist erzeugt die zur Laufzeit gebildeten Klassen', () => {
    const entry = tailwindConfig.safelist[0];
    if (!entry) throw new Error('safelist fehlt');
    for (const row of [1, 13, 14, 99, 100, 200]) {
      expect(entry.pattern.test(`row-start-${row}`)).toBe(true);
    }
    expect(entry.pattern.test('row-start-201')).toBe(false);
  });

  it('eine Kachel ab Zeile 14 behält ihre feste Startzeile', () => {
    expect(getGridPlacementClasses({ x: 0, y: 20, w: 6, h: 4 }, false)).toContain('row-start-21');
    expect(rowStartClass(0)).toBe('row-start-auto');
    expect(rowStartClass(GRID_MAX_ROW_START + 1)).toBe('row-start-auto');
  });
});

describe('Säulenachse (K7)', () => {
  it('beginnt bei positiven Werten bei 0', () => {
    const scale = niceSignedScale(0, 50_000);
    expect(scale.min).toBe(0);
    expect(scale.ticks[0]).toBe(0);
    expect(scale.max).toBeGreaterThanOrEqual(50_000);
  });
});
