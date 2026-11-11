// Auftrag 151 (P06b): Raster-Invarianten.
// Regressionsfälle aus dem externen Audit (N-1 bis N-5) und eine eigenschaftsbasierte
// Schleife über zufällige Operationsfolgen: Nach jeder Operation darf sich in keinem
// Breakpoint eine Kachel mit einer anderen überschneiden.

import { describe, expect, it } from 'vitest';
import type {
  BreakpointKey,
  DashboardTileConfigV2,
  GridPosition,
} from '../model/dashboardConfigV2';
import { getActiveEntries } from '../model/dashboardCatalog';
import {
  findOverlap,
  getBreakpointLayout,
  GRID_CONFIGS,
  rectsIntersect,
  resolveCollisions,
} from '../components/editor/grid/gridEngine';
import {
  buildDuplicateTile,
  buildNewTile,
  createTileAtGridPosition,
  planLayoutChange,
  reorderMobileTiles,
} from '../components/editor/editorPlacement';
import type { TileMovement } from '../core/layoutCommands';

const BREAKPOINTS: readonly BreakpointKey[] = ['desktop', 'tablet', 'mobile'];
const ACTIVE_IDS = getActiveEntries().map((e) => e.id);

function tile(id: string, desktop: GridPosition, tablet?: GridPosition): DashboardTileConfigV2 {
  return {
    id,
    catalogId: ACTIVE_IDS[0]!,
    title: id,
    presentation: 'zahl',
    layouts: tablet ? { desktop, tablet } : { desktop },
  };
}

/** Liefert eine Beschreibung der ersten Überlappung oder null */
function firstViolation(tiles: readonly DashboardTileConfigV2[]): string | null {
  for (const bp of BREAKPOINTS) {
    const derived = getBreakpointLayout(tiles, bp);
    const overlap = findOverlap(derived);
    if (overlap) return `${bp} abgeleitet: ${overlap[0]} ↔ ${overlap[1]}`;

    const explicit = new Map<string, GridPosition>();
    for (const t of tiles) {
      const pos = t.layouts[bp];
      if (pos) explicit.set(t.id, pos);
    }
    const explicitOverlap = findOverlap(explicit);
    if (explicitOverlap) return `${bp} gespeichert: ${explicitOverlap[0]} ↔ ${explicitOverlap[1]}`;

    for (const [id, pos] of explicit) {
      const cols = GRID_CONFIGS[bp].cols;
      if (pos.x < 0 || pos.y < 0 || pos.w < 1 || pos.x + pos.w > cols) {
        return `${bp} außerhalb des Rasters: ${id}`;
      }
    }
  }
  return null;
}

function applyMoves(
  tiles: DashboardTileConfigV2[],
  bp: BreakpointKey,
  moves: readonly TileMovement[],
): DashboardTileConfigV2[] {
  const byId = new Map(moves.map((m) => [m.tileId, m.to]));
  return tiles.map((t) => {
    const to = byId.get(t.id);
    return to ? { ...t, layouts: { ...t.layouts, [bp]: { ...to } } } : t;
  });
}

describe('Raster-Invarianten (Auftrag 151 / P06b)', () => {
  describe('Regressionsfälle aus dem Audit', () => {
    const auditTiles = [
      tile('a', { x: 1, y: 9, w: 2, h: 3 }),
      tile('b', { x: 6, y: 4, w: 3, h: 2 }),
      tile('c', { x: 3, y: 9, w: 4, h: 2 }),
    ];

    it('N-1: Hinzufügen platziert die neue Kachel ohne Überlappung', () => {
      const newTile = buildNewTile(ACTIVE_IDS[0]!, auditTiles, { timeframe: 'monat' });
      expect(newTile).not.toBeNull();
      expect(firstViolation([...auditTiles, newTile!])).toBeNull();
    });

    it('N-1: Duplizieren platziert die Kopie ohne Überlappung', () => {
      const clone = buildDuplicateTile(auditTiles[2]!, auditTiles);
      expect(firstViolation([...auditTiles, clone])).toBeNull();
    });

    it('N-1: Drop erzeugt in den Nicht-Ziel-Breakpoints keine Überlappung', () => {
      const result = createTileAtGridPosition(
        ACTIVE_IDS[0]!,
        { x: 6, y: 0, w: 6, h: 4 },
        auditTiles,
        'tablet',
        'monat',
      );
      expect(result).not.toBeNull();
      const tiles = applyMoves([...auditTiles], 'tablet', result!.reflowMoves);
      expect(firstViolation([...tiles, result!.newTile])).toBeNull();
    });

    it('N-2: Tablet-Fallback stapelt Kacheln nicht übereinander', () => {
      const tiles = [tile('l', { x: 0, y: 0, w: 6, h: 4 }), tile('r', { x: 6, y: 0, w: 6, h: 4 })];
      const tablet = getBreakpointLayout(tiles, 'tablet');
      expect(rectsIntersect(tablet.get('l')!, tablet.get('r')!)).toBe(false);
      const mobile = getBreakpointLayout(tiles, 'mobile');
      expect(rectsIntersect(mobile.get('l')!, mobile.get('r')!)).toBe(false);
    });

    it('N-3: Reflow hinterlässt auf dichten Layouts keine Restüberlappung', () => {
      // Dichte, überlappungsfreie Startlayouts aus schmalen, unterschiedlich hohen Kacheln;
      // die aktive Kachel wird an zufällige Ziele gezogen und skaliert.
      let s = 7;
      const next = (n: number) => {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s % n;
      };
      for (let run = 0; run < 400; run++) {
        const tiles: DashboardTileConfigV2[] = [];
        for (let i = 0; i < 14; i++) {
          const w = 2 + next(4);
          const h = 1 + next(4);
          const placed = tiles.map((t) => t.layouts.desktop);
          let pos: GridPosition = { x: next(13 - w), y: next(8), w, h };
          while (placed.some((p) => rectsIntersect(p, pos))) pos = { ...pos, y: pos.y + 1 };
          tiles.push(tile(`t${i}`, pos));
        }
        const active = tiles[next(tiles.length)]!;
        const proposal = { x: next(9), y: next(10), w: 2 + next(6), h: 2 + next(5) };
        const result = resolveCollisions(tiles, active.id, proposal, 'desktop');
        expect(findOverlap(result), `Lauf ${run}`).toBeNull();
      }
    });

    it('N-5: Drop mit unbekannter Katalog-ID erzeugt keine Kachel', () => {
      expect(
        createTileAtGridPosition(
          'kein.katalog',
          { x: 0, y: 0, w: 6, h: 4 },
          [],
          'desktop',
          'monat',
        ),
      ).toBeNull();
      expect(buildNewTile('<script>', [], { timeframe: 'monat' })).toBeNull();
    });

    it('Mobil-Tausch ungleicher Höhen erzeugt keine Überlappung', () => {
      const tiles = [
        tile('a', { x: 0, y: 0, w: 12, h: 3 }),
        tile('b', { x: 0, y: 3, w: 12, h: 4 }),
      ];
      const moves = reorderMobileTiles(tiles, 'b', 'up');
      expect(moves).not.toBeNull();
      expect(firstViolation(applyMoves(tiles, 'mobile', moves!))).toBeNull();
    });
  });

  describe('eigenschaftsbasiert: zufällige Operationsfolgen', () => {
    /** Deterministischer Zufallsgenerator (mulberry32) */
    function rng(seed: number) {
      let s = seed >>> 0;
      return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    it('hält „keine Überlappung“ über 150 Läufe × 30 Operationen in allen Breakpoints', () => {
      for (let seed = 1; seed <= 150; seed++) {
        const rand = rng(seed);
        const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
        const pick = <T>(arr: readonly T[]): T => arr[int(0, arr.length - 1)]!;
        let tiles: DashboardTileConfigV2[] = [];
        const log: string[] = [];

        for (let step = 0; step < 30; step++) {
          const op = tiles.length === 0 ? 'add' : pick(OPS);
          const bp = pick<BreakpointKey>(['desktop', 'tablet']);
          log.push(`${op}@${bp}`);

          if (op === 'add' && tiles.length < 24) {
            const t = buildNewTile(pick(ACTIVE_IDS), tiles, { timeframe: 'monat' });
            if (t) tiles = [...tiles, t];
          } else if (op === 'duplicate' && tiles.length < 24) {
            tiles = [...tiles, buildDuplicateTile(pick(tiles), tiles)];
          } else if (op === 'drop' && tiles.length < 24) {
            const cols = GRID_CONFIGS[bp].cols;
            const res = createTileAtGridPosition(
              pick(ACTIVE_IDS),
              { x: int(0, cols - 1), y: int(0, 14), w: int(2, cols), h: int(2, 6) },
              tiles,
              bp,
              'monat',
            );
            if (res) tiles = [...applyMoves(tiles, bp, res.reflowMoves), res.newTile];
          } else if (op === 'move' || op === 'resize') {
            const target = pick(tiles);
            const cur = getBreakpointLayout(tiles, bp).get(target.id)!;
            const cols = GRID_CONFIGS[bp].cols;
            const proposed =
              op === 'move'
                ? { ...cur, x: int(0, cols - cur.w), y: int(0, 16) }
                : { ...cur, w: int(2, cols - cur.x), h: int(2, 8) };
            const plan = planLayoutChange(tiles, bp, target.id, proposed);
            tiles = applyMoves(tiles, bp, plan.moves);
          } else if (op === 'mobile') {
            const moves = reorderMobileTiles(tiles, pick(tiles).id, pick(['up', 'down'] as const));
            if (moves) tiles = applyMoves(tiles, 'mobile', moves);
          } else if (op === 'remove') {
            const victim = pick(tiles);
            tiles = tiles.filter((t) => t.id !== victim.id);
          }

          const violation = firstViolation(tiles);
          if (violation) {
            throw new Error(`Seed ${seed}, Schritt ${step} (${log.join(' → ')}): ${violation}`);
          }
        }
      }
    });
  });
});

const OPS = ['add', 'duplicate', 'drop', 'move', 'resize', 'mobile', 'remove'] as const;
