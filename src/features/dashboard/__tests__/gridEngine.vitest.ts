// Executive Dashboard V2 (Auftrag 149 / P06):
// Unittests für die 2D-Rasterengine, Kollisionserkennung, Reflow und Kompaktierung.

import { describe, expect, it } from 'vitest';
import type { DashboardTileConfigV2, GridPosition } from '../model/dashboardConfigV2';
import {
  clamp,
  compactLayout,
  getTileGridPosition,
  rectsIntersect,
  resolveCollisions,
  sortTilesDeterministically,
} from '../components/editor/grid/gridEngine';

function createMockTile(
  id: string,
  desktop: GridPosition,
  tablet?: GridPosition,
): DashboardTileConfigV2 {
  return {
    id,
    catalogId: `metric.${id}`,
    title: `Tile ${id}`,
    presentation: 'zahl',
    layouts: {
      desktop,
      tablet,
    },
  };
}

describe('gridEngine (P06)', () => {
  describe('rectsIntersect & clamp', () => {
    it('erkennt Überschneidungen korrekt', () => {
      const a: GridPosition = { x: 0, y: 0, w: 6, h: 4 };
      const b: GridPosition = { x: 3, y: 2, w: 6, h: 4 };
      const c: GridPosition = { x: 6, y: 0, w: 6, h: 4 };

      expect(rectsIntersect(a, b)).toBe(true);
      expect(rectsIntersect(a, c)).toBe(false); // Berührend, aber nicht überlappend
    });

    it('begrenzt Werte mit clamp auf Intervall', () => {
      expect(clamp(15, 0, 12)).toBe(12);
      expect(clamp(-5, 0, 12)).toBe(0);
      expect(clamp(6, 0, 12)).toBe(6);
    });
  });

  describe('getTileGridPosition', () => {
    it('liefert Breakpoint-spezifische Position falls vorhanden', () => {
      const tile = createMockTile('t1', { x: 0, y: 0, w: 6, h: 4 }, { x: 0, y: 0, w: 3, h: 3 });
      expect(getTileGridPosition(tile, 'tablet')).toEqual({ x: 0, y: 0, w: 3, h: 3 });
      expect(getTileGridPosition(tile, 'desktop')).toEqual({ x: 0, y: 0, w: 6, h: 4 });
    });

    it('erzeugt Fallback für Tablet/Mobile bei fehlender expliziter Position', () => {
      const tile = createMockTile('t1', { x: 6, y: 0, w: 6, h: 4 });
      const mobilePos = getTileGridPosition(tile, 'mobile');
      expect(mobilePos.w).toBe(1);
      expect(mobilePos.x).toBe(0);

      const tabletPos = getTileGridPosition(tile, 'tablet');
      expect(tabletPos.w).toBe(6);
      expect(tabletPos.x).toBe(0);
    });
  });

  describe('resolveCollisions (Push-Down Reflow)', () => {
    it('verdrängt kollidierende Kachel nach unten', () => {
      const t1 = createMockTile('t1', { x: 0, y: 0, w: 6, h: 4 });
      const t2 = createMockTile('t2', { x: 6, y: 0, w: 6, h: 4 });

      // Verschiebe t2 nach (0, 0), wo t1 liegt
      const result = resolveCollisions([t1, t2], 't2', { x: 0, y: 0, w: 6, h: 4 }, 'desktop');

      expect(result.get('t2')).toEqual({ x: 0, y: 0, w: 6, h: 4 });
      // t1 muss unter t2 geschoben worden sein (y >= 4)
      expect(result.get('t1')?.y).toBe(4);
      expect(result.get('t1')?.x).toBe(0);
    });

    it('führt kaskadierenden Reflow bei Mehrfach-Kollision aus', () => {
      const t1 = createMockTile('t1', { x: 0, y: 0, w: 6, h: 4 });
      const t2 = createMockTile('t2', { x: 0, y: 4, w: 6, h: 4 });
      const t3 = createMockTile('t3', { x: 6, y: 0, w: 6, h: 4 });

      // Bewege t3 auf (0, 0)
      const result = resolveCollisions([t1, t2, t3], 't3', { x: 0, y: 0, w: 6, h: 4 }, 'desktop');

      expect(result.get('t3')).toEqual({ x: 0, y: 0, w: 6, h: 4 });
      expect(result.get('t1')?.y).toBe(4);
      expect(result.get('t2')?.y).toBe(8); // t2 wurde durch t1 weiter nach unten geschoben
    });
  });

  describe('compactLayout', () => {
    it('schließt vertikale Lücken nach oben (Gravity)', () => {
      const positions = new Map<string, GridPosition>();
      positions.set('t1', { x: 0, y: 0, w: 6, h: 2 });
      positions.set('t2', { x: 0, y: 6, w: 6, h: 2 }); // Lücke zwischen y=2 und y=6

      const compacted = compactLayout(positions);
      expect(compacted.get('t1')?.y).toBe(0);
      expect(compacted.get('t2')?.y).toBe(2); // Direkt unter t1 gerückt
    });

    it('erhält Position einer fixierten Kachel während Kompaktierung', () => {
      const positions = new Map<string, GridPosition>();
      positions.set('t1', { x: 0, y: 4, w: 6, h: 2 });
      positions.set('t2', { x: 6, y: 8, w: 6, h: 2 });

      // t1 ist fixiert
      const compacted = compactLayout(positions, 't1');
      expect(compacted.get('t1')?.y).toBe(4);
      // t2 darf nach oben aufrücken auf y=0
      expect(compacted.get('t2')?.y).toBe(0);
    });
  });

  describe('sortTilesDeterministically', () => {
    it('sortiert Kacheln deterministisch nach Zeile und Spalte', () => {
      const t1 = createMockTile('t1', { x: 6, y: 0, w: 6, h: 2 });
      const t2 = createMockTile('t2', { x: 0, y: 0, w: 6, h: 2 });
      const t3 = createMockTile('t3', { x: 0, y: 2, w: 6, h: 2 });

      const sorted = sortTilesDeterministically([t1, t3, t2], 'desktop');
      expect(sorted.map((t) => t.id)).toEqual(['t2', 't1', 't3']);
    });
  });
});
