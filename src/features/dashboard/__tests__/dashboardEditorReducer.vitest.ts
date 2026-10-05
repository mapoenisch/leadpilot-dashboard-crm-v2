// Auftrag 074 (Dashboard Teilauftrag 5): reine Funktionen der Arbeitskopie.
import { describe, expect, it } from 'vitest';
import {
  MAX_TILES,
  type DashboardConfig,
  type DashboardTileConfig,
} from '../model/dashboardConfig';
import { getActiveEntries, getCatalogEntry, isActiveEntry } from '../model/dashboardCatalog';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { validateDashboardConfig } from '../model/dashboardValidation';
import {
  addTile,
  allowedFilterModes,
  canonical,
  createTileId,
  isSameConfig,
  moveTile,
  moveTileTo,
  removeTile,
  resetToDefault,
  saveErrorMessage,
  setStartFilters,
  updateTile,
} from '../hooks/dashboardEditorReducer';

const ZAHL: DashboardTileConfig = {
  tileId: 'a',
  catalogId: 'baseline.arr',
  view: 'zahl',
  size: 'klein',
  filterMode: 'fester_stand',
};
const UNBEKANNT: DashboardTileConfig = {
  tileId: 'u',
  catalogId: 'baseline.gibt_es_nicht',
  view: 'zahl',
  size: 'klein',
  filterMode: 'fester_stand',
};

function config(...tiles: DashboardTileConfig[]): DashboardConfig {
  return { version: 1, tiles };
}

const ids = (c: DashboardConfig) => c.tiles.map((t) => t.tileId);

describe('canonical und isSameConfig', () => {
  it('ignoriert Schlüsselreihenfolge und undefined-Felder', () => {
    const a = config({ ...ZAHL, title: undefined });
    const b = config({
      filterMode: 'fester_stand',
      size: 'klein',
      view: 'zahl',
      catalogId: 'baseline.arr',
      tileId: 'a',
    });
    expect(canonical(a)).toBe(canonical(b));
    expect(isSameConfig(a, b)).toBe(true);
  });

  it('erkennt Änderungen und Rückänderungen', () => {
    const a = config(ZAHL);
    const changed = config({ ...ZAHL, size: 'mittel' });
    expect(isSameConfig(a, changed)).toBe(false);
    expect(isSameConfig(a, config({ ...changed.tiles[0]!, size: 'klein' }))).toBe(true);
  });
});

describe('createTileId', () => {
  it('vergibt gültige, eindeutige IDs auch nach Entfernen und Hinzufügen', () => {
    let current = config();
    const seen = new Set<string>();
    for (let i = 0; i < 6; i += 1) {
      const result = addTile(current, {
        catalogId: 'baseline.arr',
        view: 'zahl',
        size: 'klein',
        filterMode: 'fester_stand',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      current = result.config;
      if (i === 2) current = removeTile(current, current.tiles[0]!.tileId);
      for (const tile of current.tiles) seen.add(tile.tileId);
      expect(new Set(ids(current)).size).toBe(current.tiles.length);
      expect(validateDashboardConfig(current).ok).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('kürzt lange Katalog-IDs auf das erlaubte Muster', () => {
    const id = createTileId([], 'live.' + 'x'.repeat(120));
    expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });
});

describe('addTile', () => {
  it('fügt am Ende hinzu und liefert die neue ID', () => {
    const result = addTile(config(ZAHL), {
      catalogId: 'baseline.umsatz',
      view: 'zahl',
      size: 'klein',
      title: 'Umsatz',
      filterMode: 'fester_stand',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.tiles).toHaveLength(2);
    expect(result.config.tiles[1]).toMatchObject({ catalogId: 'baseline.umsatz', title: 'Umsatz' });
    expect(result.tileId).toBe(result.config.tiles[1]!.tileId);
  });

  it('lehnt die 25. Kachel mit einem Grund ab', () => {
    const full = config(
      ...Array.from({ length: MAX_TILES }, (_, i) => ({ ...ZAHL, tileId: `k${i}` })),
    );
    const result = addTile(full, {
      catalogId: 'baseline.arr',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    });
    expect(result).toEqual({ ok: false, reason: `Höchstens ${MAX_TILES} Kacheln.` });
  });

  it('übernimmt keine unzulässige Kombination und nennt den Grund', () => {
    const result = addTile(config(), {
      catalogId: 'baseline.arr',
      view: 'ring',
      size: 'mittel',
      filterMode: 'fester_stand',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/nicht zulässig/);
  });
});

describe('updateTile', () => {
  it('ändert Größe und Titel, entfernt den Titel bei undefined', () => {
    const base = config({ ...ZAHL, title: 'Alt' });
    const grown = updateTile(base, 'a', { size: 'mittel', title: 'Neu' });
    expect(grown.ok && grown.config.tiles[0]).toMatchObject({ size: 'mittel', title: 'Neu' });
    const cleared = updateTile(base, 'a', { title: undefined });
    expect(cleared.ok && 'title' in cleared.config.tiles[0]!).toBe(false);
  });

  it('lehnt eine zu kleine Größe oder unzulässige Darstellung ab', () => {
    const result = updateTile(config(ZAHL), 'a', { view: 'tabelle' });
    expect(result.ok).toBe(false);
  });

  it('meldet eine unbekannte Kachel-ID', () => {
    expect(updateTile(config(ZAHL), 'x', { size: 'mittel' })).toEqual({
      ok: false,
      reason: 'Kachel nicht gefunden.',
    });
  });

  it('lässt andere Kacheln, auch unbekannte, unverändert', () => {
    const base = config(ZAHL, UNBEKANNT);
    const result = updateTile(base, 'a', { size: 'mittel' });
    expect(result.ok && result.config.tiles[1]).toEqual(UNBEKANNT);
  });
});

describe('removeTile und Verschieben', () => {
  const base = config({ ...ZAHL, tileId: 'a' }, { ...ZAHL, tileId: 'b' }, { ...ZAHL, tileId: 'c' });

  it('entfernt genau die gewählte Kachel', () => {
    expect(ids(removeTile(base, 'b'))).toEqual(['a', 'c']);
    expect(removeTile(base, 'x')).toBe(base);
  });

  it('verschiebt um eine Position, am Rand ohne Wirkung', () => {
    expect(ids(moveTile(base, 'b', 'hoch'))).toEqual(['b', 'a', 'c']);
    expect(ids(moveTile(base, 'b', 'runter'))).toEqual(['a', 'c', 'b']);
    expect(moveTile(base, 'a', 'hoch')).toBe(base);
    expect(moveTile(base, 'c', 'runter')).toBe(base);
  });

  it('verschiebt auf einen Zielindex und begrenzt ihn', () => {
    expect(ids(moveTileTo(base, 'a', 2))).toEqual(['b', 'c', 'a']);
    expect(ids(moveTileTo(base, 'c', 0))).toEqual(['c', 'a', 'b']);
    expect(ids(moveTileTo(base, 'a', 99))).toEqual(['b', 'c', 'a']);
    expect(moveTileTo(base, 'b', 1)).toBe(base);
  });
});

describe('Erhalt unbekannter Kacheln', () => {
  const base = config(ZAHL, UNBEKANNT, { ...ZAHL, tileId: 'c' });

  it('bleibt bei gewöhnlichen Bearbeitungen erhalten', () => {
    const added = addTile(base, {
      catalogId: 'baseline.umsatz',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    });
    expect(added.ok && added.config.tiles.find((t) => t.tileId === 'u')).toEqual(UNBEKANNT);
    expect(removeTile(base, 'a').tiles.find((t) => t.tileId === 'u')).toEqual(UNBEKANNT);
    expect(moveTile(base, 'u', 'runter').tiles.find((t) => t.tileId === 'u')).toEqual(UNBEKANNT);
    expect(moveTileTo(base, 'a', 2).tiles.find((t) => t.tileId === 'u')).toEqual(UNBEKANNT);
    const filters = setStartFilters(base, { pipeline: 'Direkt' });
    expect(filters.ok && filters.config.tiles.find((t) => t.tileId === 'u')).toEqual(UNBEKANNT);
  });

  it('verschwindet nur durch ausdrückliches Entfernen oder Zurücksetzen', () => {
    expect(removeTile(base, 'u').tiles.some((t) => t.tileId === 'u')).toBe(false);
    expect(resetToDefault().tiles.some((t) => t.tileId === 'u')).toBe(false);
  });
});

describe('Zurücksetzen und Startfilter', () => {
  it('liefert die Standardansicht', () => {
    expect(resetToDefault()).toEqual(DEFAULT_DASHBOARD_CONFIG);
  });

  it('setzt und entfernt Startfilter und prüft sie', () => {
    const set = setStartFilters(config(ZAHL), { pipeline: 'Direkt' });
    expect(set.ok && set.config.filters).toEqual({ pipeline: 'Direkt' });
    const cleared = setStartFilters(set.ok ? set.config : config(), undefined);
    expect(cleared.ok && 'filters' in cleared.config).toBe(false);
    const bad = setStartFilters(config(ZAHL), { pipeline: 'x'.repeat(65) });
    expect(bad.ok).toBe(false);
  });
});

describe('allowedFilterModes', () => {
  it('erlaubt für historische KPIs nur den festen Stand, für aktuelle den Dashboard-Filter', () => {
    const fest = getCatalogEntry('baseline.arr');
    const crm = getCatalogEntry('crm.pipeline_deals');
    if (!fest || !isActiveEntry(fest) || !crm || !isActiveEntry(crm)) throw new Error('Katalog');
    const allowed = (entry: typeof fest) =>
      allowedFilterModes(entry)
        .filter((option) => option.allowed)
        .map((option) => option.mode);
    expect(allowed(fest)).toEqual(['fester_stand']);
    expect(allowed(crm)).toEqual(['dashboard']);
  });

  it('nennt für gesperrte Optionen einen verständlichen Grund', () => {
    for (const entry of getActiveEntries()) {
      for (const option of allowedFilterModes(entry)) {
        if (!option.allowed) expect(option.reason).toBeTruthy();
      }
    }
  });
});

describe('saveErrorMessage', () => {
  const kinds = [
    { kind: 'konflikt' },
    { kind: 'ungueltig', detail: 'tiles[0].view: x' },
    { kind: 'keine_mitgliedschaft' },
    { kind: 'sitzung_abgelaufen' },
    { kind: 'nicht_konfiguriert' },
    { kind: 'technisch' },
    { kind: 'keine_sitzung' },
    { kind: 'gesperrt' },
    { kind: 'sitzung_gewechselt' },
  ] as const;

  it('hat für jede Fehlerart einen eigenen verständlichen Text ohne Feldnamen', () => {
    const texts = kinds.map((error) => saveErrorMessage(error));
    expect(new Set(texts).size).toBe(kinds.length);
    for (const text of texts) {
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(/tiles\[|view:|detail/);
    }
  });
});
