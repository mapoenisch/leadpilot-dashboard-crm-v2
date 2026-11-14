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
import { getCatalogEntry, isActiveEntry } from '../model/dashboardCatalog';
import { normalizeTileQuery, validateTileQuery } from '../model/tileQuery';
import {
  findOverlap,
  getBreakpointLayout,
  GRID_CONFIGS,
} from '../components/editor/grid/gridEngine';
import { groupTilesBySection, normalizeSections } from '../model/dashboardSections';
import { validateDashboardConfigV2 } from '../model/dashboardConfigV2';

const BREAKPOINTS: readonly BreakpointKey[] = ['desktop', 'tablet', 'mobile'];

function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/**
 * Ersetzt explizit gespeicherte Positionen, die überlappen oder das Raster verlassen, durch das
 * abgeleitete, überlappungsfreie Layout. Läuft je Bereich (Ohne Sektion + jede definierte Sektion).
 * Reihenfolge desktop → tablet → mobile, weil Tablet und Mobil ohne eigene Position aus Desktop
 * abgeleitet werden. Idempotent; liefert bei sauberem Layout dasselbe Objekt zurück.
 */
export function normalizeDashboardLayouts(config: DashboardConfigV2): DashboardConfigV2 {
  const grouped = groupTilesBySection(config.tiles, config.sections);
  const bereiche: DashboardTileConfigV2[][] = [
    grouped.unsectionedTiles,
    ...grouped.sectionedTiles.map((s) => s.tiles),
  ];

  let changed = false;
  const tileReplacements = new Map<string, DashboardTileConfigV2>();

  for (const bereichTiles of bereiche) {
    if (bereichTiles.length === 0) continue;
    let currentBereich = bereichTiles;

    for (const bp of BREAKPOINTS) {
      const derived = getBreakpointLayout(currentBereich, bp);
      currentBereich = currentBereich.map((tile) => {
        const stored = tile.layouts[bp];
        const target = derived.get(tile.id);
        if (!stored || !target || samePosition(stored, target)) return tile;
        changed = true;
        return { ...tile, layouts: { ...tile.layouts, [bp]: { ...target } } };
      });
    }

    for (const tile of currentBereich) {
      tileReplacements.set(tile.id, tile);
    }
  }

  if (!changed) return config;

  const tiles = config.tiles.map((t) => tileReplacements.get(t.id) ?? t);
  return { ...config, tiles };
}

/** Liefert die erste Integritätsverletzung oder null. Prüfung erfolgt je Bereich und Breakpoint. */
export function findLayoutIntegrityError(config: DashboardConfigV2): string | null {
  for (let i = 0; i < config.tiles.length; i++) {
    const tile = config.tiles[i]!;
    const entry = getCatalogEntry(tile.catalogId);
    if (!entry) {
      return `tiles[${i}].catalogId '${tile.catalogId}' ist keine bekannte Katalog-ID`;
    }
    if (isActiveEntry(entry)) {
      const query = tile.query ?? normalizeTileQuery(tile, config);
      const val = validateTileQuery(query, entry);
      if (!val.valid) {
        return `Kachel '${tile.id}' (${tile.title}): ${val.errors[0]?.message}`;
      }
    }
  }

  const grouped = groupTilesBySection(config.tiles, config.sections);
  const bereiche: DashboardTileConfigV2[][] = [
    grouped.unsectionedTiles,
    ...grouped.sectionedTiles.map((s) => s.tiles),
  ];

  for (const bereichTiles of bereiche) {
    if (bereichTiles.length === 0) continue;

    for (const bp of BREAKPOINTS) {
      const cols = GRID_CONFIGS[bp].cols;
      const explicit = new Map<string, GridPosition>();
      for (const tile of bereichTiles) {
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
  }

  return null;
}

/** Normalisiert und prüft eine Konfiguration vor dem Speichern */
export function prepareConfigForStorage(
  config: DashboardConfigV2,
): { ok: true; config: DashboardConfigV2 } | { ok: false; error: string } {
  const normalizedLayout = normalizeDashboardLayouts(config);

  // Auftrag 154 §2.1 Nr. 4: Normalisiert jede Kachelabfrage und verwirft Legacy-Overrides beim Speichern
  const canonicalTiles = normalizedLayout.tiles.map((tile) => {
    const query = normalizeTileQuery(tile, config);
    const {
      pipelineOverride: _p,
      timeframeOverride: _t,
      aggregationOverride: _a,
      ...cleanTile
    } = tile;
    return {
      ...cleanTile,
      query,
    };
  });

  // Auftrag 157 §2.1 Nr. 7: Sektionen normalisieren (Titel getrimmt, tileIds nach Desktop-Position sortiert)
  const normalizedSections = normalizeSections(normalizedLayout.sections, canonicalTiles);

  const canonicalConfig: DashboardConfigV2 = {
    ...normalizedLayout,
    tiles: canonicalTiles,
    ...(normalizedSections !== undefined ? { sections: normalizedSections } : {}),
  };

  const error = findLayoutIntegrityError(canonicalConfig);
  if (error) {
    return { ok: false, error };
  }

  const valid = validateDashboardConfigV2(canonicalConfig);
  if (!valid.ok) {
    return { ok: false, error: valid.error };
  }

  return { ok: true, config: canonicalConfig };
}
