// Executive Dashboard V2 (Auftrag 165 / P12):
// Struktureller Konfigurationsvergleich für Revisionen und Entwürfe.

import type {
  DashboardConfigV2,
  DashboardSectionV2,
  DashboardTileConfigV2,
} from './dashboardConfigV2';

export type DiffBereich = 'dashboard' | 'kachel' | 'sektion';
export type DiffArt = 'hinzugefuegt' | 'entfernt' | 'geaendert';

export interface DiffPfad {
  pfad: string;
  alt: unknown;
  neu: unknown;
}

export interface ConfigDiffEntry {
  bereich: DiffBereich;
  id?: string;
  label: string;
  art: DiffArt;
  pfade: DiffPfad[];
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const arrB = b as unknown[];
    if (a.length !== arrB.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], arrB[i])) return false;
    }
    return true;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, k)) return false;
    if (!deepEqual(objA[k], objB[k])) return false;
  }
  return true;
}

/** Vergleicht zwei Dashboard-Konfigurationen rein strukturell (ignoriert Metadaten und Bezugsfelder). */
export function diffDashboardConfigsV2(
  altConfig: DashboardConfigV2,
  neuConfig: DashboardConfigV2,
): ConfigDiffEntry[] {
  const diffs: ConfigDiffEntry[] = [];

  // 1. Dashboard-Ebene (Titel, Zeitraum, Pipeline, Variablen)
  const dashboardPfade: DiffPfad[] = [];
  if (altConfig.title !== neuConfig.title) {
    dashboardPfade.push({ pfad: 'title', alt: altConfig.title, neu: neuConfig.title });
  }
  if (altConfig.globalTimeframe !== neuConfig.globalTimeframe) {
    dashboardPfade.push({
      pfad: 'globalTimeframe',
      alt: altConfig.globalTimeframe,
      neu: neuConfig.globalTimeframe,
    });
  }
  if (altConfig.globalPipeline !== neuConfig.globalPipeline) {
    dashboardPfade.push({
      pfad: 'globalPipeline',
      alt: altConfig.globalPipeline,
      neu: neuConfig.globalPipeline,
    });
  }
  if (!deepEqual(altConfig.variables, neuConfig.variables)) {
    dashboardPfade.push({
      pfad: 'variables',
      alt: altConfig.variables ?? null,
      neu: neuConfig.variables ?? null,
    });
  }

  if (dashboardPfade.length > 0) {
    diffs.push({
      bereich: 'dashboard',
      label: 'Dashboard-Einstellungen',
      art: 'geaendert',
      pfade: dashboardPfade,
    });
  }

  // 2. Sektionen-Ebene (Zuordnung über id)
  const altSections = altConfig.sections ?? [];
  const neuSections = neuConfig.sections ?? [];
  const altSectionMap = new Map<string, DashboardSectionV2>();
  for (const s of altSections) altSectionMap.set(s.id, s);
  const neuSectionMap = new Map<string, DashboardSectionV2>();
  for (const s of neuSections) neuSectionMap.set(s.id, s);

  // Gelöschte Sektionen
  for (const s of altSections) {
    if (!neuSectionMap.has(s.id)) {
      diffs.push({
        bereich: 'sektion',
        id: s.id,
        label: s.title || `Sektion ${s.id}`,
        art: 'entfernt',
        pfade: [{ pfad: 'sektion', alt: s, neu: null }],
      });
    }
  }

  // Hinzugefügte & Geänderte Sektionen
  for (const s of neuSections) {
    const altSec = altSectionMap.get(s.id);
    if (!altSec) {
      diffs.push({
        bereich: 'sektion',
        id: s.id,
        label: s.title || `Sektion ${s.id}`,
        art: 'hinzugefuegt',
        pfade: [{ pfad: 'sektion', alt: null, neu: s }],
      });
    } else {
      const secPfade: DiffPfad[] = [];
      if (altSec.title !== s.title) {
        secPfade.push({ pfad: 'title', alt: altSec.title, neu: s.title });
      }
      if (altSec.collapsed !== s.collapsed) {
        secPfade.push({ pfad: 'collapsed', alt: altSec.collapsed, neu: s.collapsed });
      }
      if (!deepEqual(altSec.tileIds, s.tileIds)) {
        secPfade.push({ pfad: 'tileIds', alt: altSec.tileIds, neu: s.tileIds });
      }
      if (secPfade.length > 0) {
        diffs.push({
          bereich: 'sektion',
          id: s.id,
          label: s.title || `Sektion ${s.id}`,
          art: 'geaendert',
          pfade: secPfade,
        });
      }
    }
  }

  // 3. Kacheln-Ebene (Zuordnung über id)
  const altTiles = altConfig.tiles ?? [];
  const neuTiles = neuConfig.tiles ?? [];
  const altTileMap = new Map<string, DashboardTileConfigV2>();
  for (const t of altTiles) altTileMap.set(t.id, t);
  const neuTileMap = new Map<string, DashboardTileConfigV2>();
  for (const t of neuTiles) neuTileMap.set(t.id, t);

  const findTileSectionId = (cfg: DashboardConfigV2, tileId: string): string | null => {
    const sec = cfg.sections?.find((s) => s.tileIds.includes(tileId));
    return sec?.id ?? null;
  };

  // Gelöschte Kacheln
  for (const t of altTiles) {
    if (!neuTileMap.has(t.id)) {
      diffs.push({
        bereich: 'kachel',
        id: t.id,
        label: t.title || t.catalogId,
        art: 'entfernt',
        pfade: [{ pfad: 'kachel', alt: t, neu: null }],
      });
    }
  }

  // Hinzugefügte & Geänderte Kacheln
  for (const t of neuTiles) {
    const altTile = altTileMap.get(t.id);
    if (!altTile) {
      diffs.push({
        bereich: 'kachel',
        id: t.id,
        label: t.title || t.catalogId,
        art: 'hinzugefuegt',
        pfade: [{ pfad: 'kachel', alt: null, neu: t }],
      });
    } else {
      const tilePfade: DiffPfad[] = [];
      if (altTile.catalogId !== t.catalogId) {
        tilePfade.push({ pfad: 'catalogId', alt: altTile.catalogId, neu: t.catalogId });
      }
      if (altTile.title !== t.title) {
        tilePfade.push({ pfad: 'title', alt: altTile.title, neu: t.title });
      }
      if (altTile.presentation !== t.presentation) {
        tilePfade.push({
          pfad: 'presentation',
          alt: altTile.presentation,
          neu: t.presentation,
        });
      }
      const altSecId = findTileSectionId(altConfig, t.id);
      const neuSecId = findTileSectionId(neuConfig, t.id);
      if (altSecId !== neuSecId) {
        tilePfade.push({ pfad: 'sectionId', alt: altSecId, neu: neuSecId });
      }
      if (!deepEqual(altTile.layouts, t.layouts)) {
        tilePfade.push({ pfad: 'layouts', alt: altTile.layouts, neu: t.layouts });
      }
      if (!deepEqual(altTile.query, t.query)) {
        tilePfade.push({ pfad: 'query', alt: altTile.query, neu: t.query });
      }

      if (tilePfade.length > 0) {
        diffs.push({
          bereich: 'kachel',
          id: t.id,
          label: t.title || t.catalogId,
          art: 'geaendert',
          pfade: tilePfade,
        });
      }
    }
  }

  return diffs;
}

/** Erstellt eine prägnante deutsche Kurzfassung der Unterschiede. */
export function summarizeDiffV2(diff: ConfigDiffEntry[]): string {
  if (diff.length === 0) {
    return 'Keine inhaltlichen Unterschiede.';
  }

  const parts: string[] = [];

  // Kacheln
  const kachelnAdded = diff.filter(
    (d) => d.bereich === 'kachel' && d.art === 'hinzugefuegt',
  ).length;
  const kachelnRemoved = diff.filter((d) => d.bereich === 'kachel' && d.art === 'entfernt').length;
  const kachelnChanged = diff.filter((d) => d.bereich === 'kachel' && d.art === 'geaendert').length;

  if (kachelnAdded > 0) {
    parts.push(`${kachelnAdded} ${kachelnAdded === 1 ? 'Kachel' : 'Kacheln'} hinzugefügt`);
  }
  if (kachelnChanged > 0) {
    parts.push(`${kachelnChanged} ${kachelnChanged === 1 ? 'Kachel' : 'Kacheln'} geändert`);
  }
  if (kachelnRemoved > 0) {
    parts.push(`${kachelnRemoved} ${kachelnRemoved === 1 ? 'Kachel' : 'Kacheln'} entfernt`);
  }

  // Sektionen
  const secAdded = diff.filter((d) => d.bereich === 'sektion' && d.art === 'hinzugefuegt').length;
  const secRemoved = diff.filter((d) => d.bereich === 'sektion' && d.art === 'entfernt').length;
  const secChanged = diff.filter((d) => d.bereich === 'sektion' && d.art === 'geaendert').length;

  if (secAdded > 0) {
    parts.push(`${secAdded} ${secAdded === 1 ? 'Sektion' : 'Sektionen'} hinzugefügt`);
  }
  if (secChanged > 0) {
    parts.push(`${secChanged} ${secChanged === 1 ? 'Sektion' : 'Sektionen'} geändert`);
  }
  if (secRemoved > 0) {
    parts.push(`${secRemoved} ${secRemoved === 1 ? 'Sektion' : 'Sektionen'} entfernt`);
  }

  // Dashboard-Ebene
  const dashEntry = diff.find((d) => d.bereich === 'dashboard');
  if (dashEntry) {
    for (const p of dashEntry.pfade) {
      if (p.pfad === 'title') parts.push('Titel geändert');
      if (p.pfad === 'globalTimeframe') parts.push('Zeitraum geändert');
      if (p.pfad === 'globalPipeline') parts.push('Pipeline geändert');
      if (p.pfad === 'variables') parts.push('Variablen geändert');
    }
  }

  return parts.join(', ');
}
