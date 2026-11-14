import type { DashboardSectionV2, DashboardTileConfigV2 } from './dashboardConfigV2';

export const MAX_SECTIONS_V2 = 12;
export const MAX_SECTION_TITLE_LENGTH = 80;
export const MAX_SECTION_ID_LENGTH = 64;
export const DEFAULT_SECTION_TITLE = 'Neue Sektion';

const ALLOWED_SECTION_KEYS = new Set(['id', 'title', 'collapsed', 'tileIds']);

/**
 * Validiert die sections-Liste eines V2-Dashboards.
 * Liefert identische Fehlermeldungen wie die Server-Funktion dashboard_config_v2_invalid_reason.
 */
export function validateDashboardSections(
  sections: unknown,
  allTileIds: Set<string>,
): { ok: true } | { ok: false; error: string } {
  if (!Array.isArray(sections)) {
    return { ok: false, error: 'sections muss ein Array sein' };
  }

  if (sections.length > MAX_SECTIONS_V2) {
    return { ok: false, error: 'maximal 12 Sektionen zulässig' };
  }

  const sectionIds = new Set<string>();
  const assignedTileIds = new Set<string>();

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      return { ok: false, error: 'Sektion-Eintrag ist kein Objekt' };
    }

    const s = section as Record<string, unknown>;
    for (const key of Object.keys(s)) {
      if (!ALLOWED_SECTION_KEYS.has(key)) {
        return { ok: false, error: 'unbekanntes Sektions-Feld im JSON' };
      }
    }

    if (!('id' in s) || !('title' in s) || !('collapsed' in s) || !('tileIds' in s)) {
      return {
        ok: false,
        error: 'Sektion-Pflichtfeld fehlt (erwartet: id, title, collapsed, tileIds)',
      };
    }

    if (typeof s.id !== 'string' || s.id.trim() === '' || s.id.length > MAX_SECTION_ID_LENGTH) {
      return {
        ok: false,
        error: 'Sektion-ID muss ein nicht-leerer String (max. 64 Zeichen) sein',
      };
    }

    if (sectionIds.has(s.id)) {
      return { ok: false, error: 'Sektion-IDs müssen eindeutig sein' };
    }
    sectionIds.add(s.id);

    if (
      typeof s.title !== 'string' ||
      s.title.trim().length < 1 ||
      s.title.trim().length > MAX_SECTION_TITLE_LENGTH
    ) {
      return {
        ok: false,
        error: 'Sektion-Titel muss nach dem Trimmen zwischen 1 und 80 Zeichen lang sein',
      };
    }

    if (typeof s.collapsed !== 'boolean') {
      return { ok: false, error: 'Sektion-collapsed muss ein boolescher Wert sein' };
    }

    if (!Array.isArray(s.tileIds)) {
      return { ok: false, error: 'Sektion-tileIds muss ein Array sein' };
    }

    for (let j = 0; j < s.tileIds.length; j++) {
      const tid = s.tileIds[j];
      if (typeof tid !== 'string' || !tid.trim()) {
        return { ok: false, error: 'Kachel-ID in Sektion muss ein String sein' };
      }
      if (!allTileIds.has(tid)) {
        return { ok: false, error: 'Kachel-ID in Sektion existiert nicht in tiles' };
      }
      if (assignedTileIds.has(tid)) {
        return { ok: false, error: 'Kachel-ID ist mehr als einer Sektion zugeordnet' };
      }
      assignedTileIds.add(tid);
    }
  }

  return { ok: true };
}

/** Erzeugt einen eindeutigen Standardtitel: "Neue Sektion", "Neue Sektion 2", usw. */
export function getUniqueSectionTitle(
  existingSections: readonly DashboardSectionV2[] | undefined,
  baseTitle = DEFAULT_SECTION_TITLE,
): string {
  if (!existingSections || existingSections.length === 0) {
    return baseTitle;
  }
  const titles = new Set(existingSections.map((s) => s.title.trim().toLowerCase()));
  if (!titles.has(baseTitle.toLowerCase())) {
    return baseTitle;
  }
  let counter = 2;
  while (titles.has(`${baseTitle.toLowerCase()} ${counter}`)) {
    counter++;
  }
  return `${baseTitle} ${counter}`;
}

/** Ermittelt die Sektion einer Kachel oder null, falls im Bereich "Ohne Sektion" */
export function getSectionForTile(
  sections: readonly DashboardSectionV2[] | undefined,
  tileId: string,
): DashboardSectionV2 | null {
  if (!sections) return null;
  for (const section of sections) {
    if (section.tileIds.includes(tileId)) {
      return section;
    }
  }
  return null;
}

/** Ermittelt die Sektions-ID einer Kachel oder null */
export function getSectionIdForTile(
  sections: readonly DashboardSectionV2[] | undefined,
  tileId: string,
): string | null {
  return getSectionForTile(sections, tileId)?.id ?? null;
}

export interface GroupedDashboardTiles {
  unsectionedTiles: DashboardTileConfigV2[];
  sectionedTiles: Array<{
    section: DashboardSectionV2;
    tiles: DashboardTileConfigV2[];
  }>;
}

/** Gruppiert Kacheln in den Bereich "Ohne Sektion" und die definierten Sektionen */
export function groupTilesBySection(
  tiles: readonly DashboardTileConfigV2[],
  sections: readonly DashboardSectionV2[] | undefined,
): GroupedDashboardTiles {
  const tileMap = new Map<string, DashboardTileConfigV2>();
  for (const tile of tiles) {
    tileMap.set(tile.id, tile);
  }

  const assignedTileIds = new Set<string>();
  const sectionedTiles: Array<{
    section: DashboardSectionV2;
    tiles: DashboardTileConfigV2[];
  }> = [];

  if (sections && sections.length > 0) {
    for (const section of sections) {
      const sTiles: DashboardTileConfigV2[] = [];
      for (const tid of section.tileIds) {
        const tile = tileMap.get(tid);
        if (tile) {
          sTiles.push(tile);
          assignedTileIds.add(tid);
        }
      }
      sectionedTiles.push({
        section,
        tiles: sTiles,
      });
    }
  }

  const unsectionedTiles = tiles.filter((t) => !assignedTileIds.has(t.id));

  return {
    unsectionedTiles,
    sectionedTiles,
  };
}

/**
 * Normalisiert Sektionen vor dem Speichern (idempotent):
 * - Titel getrimmt
 * - tileIds sortiert nach y, x (Desktop-Layout) und ursprünglichem Index
 * - tileIds auf existierende Kacheln begrenzt
 */
export function normalizeSections(
  sections: readonly DashboardSectionV2[] | undefined,
  tiles: readonly DashboardTileConfigV2[],
): DashboardSectionV2[] | undefined {
  if (!sections) {
    return undefined;
  }

  const tileOrderMap = new Map<string, { y: number; x: number; index: number }>();
  tiles.forEach((tile, index) => {
    const d = tile.layouts?.desktop;
    tileOrderMap.set(tile.id, {
      y: d?.y ?? 0,
      x: d?.x ?? 0,
      index,
    });
  });

  return sections.map((section) => {
    const validTileIds = section.tileIds.filter((tid) => tileOrderMap.has(tid));
    validTileIds.sort((a, b) => {
      const posA = tileOrderMap.get(a)!;
      const posB = tileOrderMap.get(b)!;
      if (posA.y !== posB.y) return posA.y - posB.y;
      if (posA.x !== posB.x) return posA.x - posB.x;
      return posA.index - posB.index;
    });

    return {
      id: section.id,
      title: section.title.trim(),
      collapsed: Boolean(section.collapsed),
      tileIds: validTileIds,
    };
  });
}
