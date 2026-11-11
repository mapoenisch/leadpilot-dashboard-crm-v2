// Executive Dashboard V2 (Auftrag 151 / P06b):
// Integritätsprüfung vor dem Speichern einer V2-Konfiguration als Revision.
// - Layouts werden deterministisch normalisiert (überlappungsfrei, innerhalb des Rasters).
// - Unbekannte Katalog-IDs werden abgelehnt.
// Die Servervalidierung (`dashboard_config_v2_invalid_reason`) bleibt unverändert; diese Prüfung
// ist die verbindliche Schranke des Editors (Serverparität: offener Punkt, Auftrag 151 §2).

import type {
  BreakpointKey,
  DashboardConfigV2,
  DashboardTileConfigV2,
  GridPosition,
} from '../model/dashboardConfigV2';
import { getCatalogEntry } from '../model/dashboardCatalog';
import {
  findOverlap,
  getBreakpointLayout,
  GRID_CONFIGS,
} from '../components/editor/grid/gridEngine';

const BREAKPOINTS: readonly BreakpointKey[] = ['desktop', 'tablet', 'mobile'];

function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/**
 * Ersetzt explizit gespeicherte Positionen, die überlappen oder das Raster verlassen, durch das
 * abgeleitete, überlappungsfreie Layout. Reihenfolge desktop → tablet → mobile, weil Tablet und
 * Mobil ohne eigene Position aus Desktop abgeleitet werden. Idempotent; liefert bei sauberem
 * Layout dasselbe Objekt zurück.
 */
export function normalizeDashboardLayouts(config: DashboardConfigV2): DashboardConfigV2 {
  let tiles: DashboardTileConfigV2[] = config.tiles;
  let changed = false;

  for (const bp of BREAKPOINTS) {
    const derived = getBreakpointLayout(tiles, bp);
    tiles = tiles.map((tile) => {
      const stored = tile.layouts[bp];
      const target = derived.get(tile.id);
      if (!stored || !target || samePosition(stored, target)) return tile;
      changed = true;
      return { ...tile, layouts: { ...tile.layouts, [bp]: { ...target } } };
    });
  }

  return changed ? { ...config, tiles } : config;
}

/** Liefert die erste Integritätsverletzung oder null */
export function findLayoutIntegrityError(config: DashboardConfigV2): string | null {
  for (let i = 0; i < config.tiles.length; i++) {
    const tile = config.tiles[i]!;
    if (!getCatalogEntry(tile.catalogId)) {
      return `tiles[${i}].catalogId '${tile.catalogId}' ist keine bekannte Katalog-ID`;
    }
  }

  for (const bp of BREAKPOINTS) {
    const cols = GRID_CONFIGS[bp].cols;
    const explicit = new Map<string, GridPosition>();
    for (const tile of config.tiles) {
      const pos = tile.layouts[bp];
      if (!pos) continue;
      if (pos.x < 0 || pos.y < 0 || pos.w < 1 || pos.h < 1 || pos.x + pos.w > cols) {
        return `Kachel '${tile.id}' liegt im Breakpoint ${bp} außerhalb des Rasters`;
      }
      explicit.set(tile.id, pos);
    }
    const overlap = findOverlap(explicit);
    if (overlap) {
      return `Kacheln '${overlap[0]}' und '${overlap[1]}' überlappen im Breakpoint ${bp}`;
    }
  }
  return null;
}

/** Normalisiert und prüft eine Konfiguration vor dem Speichern */
export function prepareConfigForStorage(
  config: DashboardConfigV2,
): { ok: true; config: DashboardConfigV2 } | { ok: false; error: string } {
  const normalized = normalizeDashboardLayouts(config);
  const error = findLayoutIntegrityError(normalized);
  return error ? { ok: false, error } : { ok: true, config: normalized };
}
