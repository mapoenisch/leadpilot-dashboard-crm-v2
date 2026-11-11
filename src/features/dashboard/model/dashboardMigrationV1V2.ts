// Executive Dashboard V2 (Auftrag 148 / P05):
// Deterministische Kopiermigration von V1-Konfigurationen in das V2-Schema.
// Vollständig konform mit P03 §5 (GRID_VERGLEICH_ZIELMODELL_146.md).

import type { DashboardConfig, DashboardTileConfig } from './dashboardConfig';
import type {
  DashboardConfigV2,
  DashboardScope,
  DashboardTileConfigV2,
  GridPosition,
} from './dashboardConfigV2';
import { getCatalogEntry } from './dashboardCatalog';

export interface V1ToV2MigrationContext {
  id: string;
  title: string;
  ownerUserId: string;
  organizationId: string;
  scope?: DashboardScope;
  teamId?: string;
  lastMigratedRevision?: number;
}

function packLayout(
  tiles: readonly DashboardTileConfig[],
  cols: number,
  mode: 'desktop' | 'tablet' | 'mobile',
): GridPosition[] {
  let currentX = 0;
  let currentY = 0;
  let rowMaxH = 0;
  const positions: GridPosition[] = [];

  for (const t of tiles) {
    let w = 3;
    let h = 3;

    if (mode === 'desktop') {
      if (t.size === 'klein') {
        w = 3;
        h = 3;
      } else if (t.size === 'mittel') {
        w = 6;
        h = 4;
      } else if (t.size === 'gross') {
        w = 9;
        h = 5;
      } else if (t.size === 'voll') {
        w = 12;
        h = 6;
      }
    } else if (mode === 'tablet') {
      if (t.size === 'klein') {
        w = 3;
        h = 3;
      } else if (t.size === 'mittel') {
        w = 6;
        h = 4;
      } else if (t.size === 'gross') {
        w = 6;
        h = 5;
      } else if (t.size === 'voll') {
        w = 6;
        h = 6;
      }
    } else {
      // Mobile: Strikt 1 Spalte (x=0, w=1)
      w = 1;
      if (t.size === 'klein') h = 3;
      else if (t.size === 'mittel') h = 4;
      else if (t.size === 'gross') h = 5;
      else h = 6;
    }

    // Zeilenumbruch prüfen
    if (currentX + w > cols) {
      currentY += rowMaxH > 0 ? rowMaxH : 2;
      currentX = 0;
      rowMaxH = 0;
    }

    positions.push({
      x: currentX,
      y: currentY,
      w,
      h,
    });

    rowMaxH = Math.max(rowMaxH, h);
    currentX += w;
    if (currentX >= cols) {
      currentY += rowMaxH;
      currentX = 0;
      rowMaxH = 0;
    }
  }

  return positions;
}

/**
 * Überführt eine V1-Dashboard-Konfiguration verlustfrei in das V2-Schema.
 * Kachel-IDs, Metrikbezüge und Filter bleiben erhalten.
 */
export function migrateV1ToV2(
  v1Config: DashboardConfig,
  context: V1ToV2MigrationContext,
): DashboardConfigV2 {
  const globalPipeline = v1Config.filters?.pipeline;
  const globalTimeframe = v1Config.filters?.period
    ? `${v1Config.filters.period.from}/${v1Config.filters.period.to}`
    : 'letzte_30_tage';

  const tiles = v1Config.tiles ?? [];
  const desktopPositions = packLayout(tiles, 12, 'desktop');
  const tabletPositions = packLayout(tiles, 6, 'tablet');
  const mobilePositions = packLayout(tiles, 1, 'mobile');

  const v2Tiles: DashboardTileConfigV2[] = tiles.map((t, idx) => {
    // Kachelspezifische Filterausnahmen exakt abbilden
    const timeframeOverride =
      t.filterMode === 'eigener_zeitraum' && t.period
        ? `${t.period.from}/${t.period.to}`
        : undefined;
    const pipelineOverride = t.pipeline;

    // Titel-Auflösung: Benutzerdefinierter Titel > Katalogname aus DASHBOARD_CATALOG > Katalog-ID
    const catalogName = getCatalogEntry(t.catalogId)?.name;
    const resolvedTitle = t.title ?? catalogName ?? t.catalogId;

    return {
      id: t.tileId,
      catalogId: t.catalogId,
      title: resolvedTitle,
      presentation: t.view,
      layouts: {
        desktop: desktopPositions[idx]!,
        tablet: tabletPositions[idx]!,
        mobile: mobilePositions[idx]!,
      },
      timeframeOverride,
      pipelineOverride,
      query: {
        metricId: t.catalogId,
        pipelineId: pipelineOverride ?? globalPipeline,
        timeframe: timeframeOverride ?? globalTimeframe,
      },
    };
  });

  const now = new Date().toISOString();

  return {
    version: 2,
    id: context.id,
    title: context.title,
    scope: context.scope ?? 'personal',
    teamId: context.teamId,
    ownerUserId: context.ownerUserId,
    organizationId: context.organizationId,
    globalTimeframe,
    globalPipeline,
    tiles: v2Tiles,
    metadata: {
      migrated_from_v1: true,
      migrated_at: now,
      last_migrated_revision: context.lastMigratedRevision ?? 1,
      user_edited: false,
    },
    createdAt: now,
    updatedAt: now,
  };
}
