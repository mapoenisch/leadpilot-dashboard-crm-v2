// Executive Dashboard, Teilauftrag 5 (Auftrag 074): reine Funktionen auf der Arbeitskopie des
// Dashboards. Kein React, keine Speicherung. Jede ändernde Funktion prüft das Ergebnis mit
// `validateDashboardConfig`; eine unzulässige Kombination wird nie übernommen, der Grund kommt als
// verständlicher Text zurück. Kacheln mit unbekannter oder inaktiver KPI bleiben bei gewöhnlichen
// Bearbeitungen unverändert erhalten; nur „Entfernen“ und „Zurücksetzen“ nehmen sie heraus.
import {
  getCatalogEntry,
  isActiveEntry,
  minSizeFor,
  type ActiveCatalogEntry,
  type DashboardView,
  type TileSize,
} from '../model/dashboardCatalog';
import {
  DASHBOARD_CONFIG_VERSION,
  MAX_TILES,
  type DashboardConfig,
  type DashboardFilters,
  type DashboardTileConfig,
  type TileFilterMode,
} from '../model/dashboardConfig';
import { validateDashboardConfig, type ValidationIssue } from '../model/dashboardValidation';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import type { SaveResult } from './useDashboardPreferences';

export const VIEW_LABEL: Record<DashboardView, string> = {
  zahl: 'Zahl',
  tabelle: 'Tabelle',
  saeulen: 'Säulen',
  balken: 'Balken',
  kreis: 'Kreis',
  ring: 'Ring',
  linie: 'Linie',
  flaeche: 'Fläche',
  uebersicht: 'Übersicht',
};

export const SIZE_LABEL: Record<TileSize, string> = {
  klein: 'Klein',
  mittel: 'Mittel',
  gross: 'Groß',
  voll: 'Volle Breite',
};

export interface NewTileInput {
  catalogId: string;
  view: DashboardView;
  size: TileSize;
  title?: string;
  filterMode: TileFilterMode;
  pipeline?: string;
}

export type TilePatch = Partial<
  Pick<DashboardTileConfig, 'view' | 'size' | 'title' | 'filterMode' | 'pipeline'>
>;

export type EditResult =
  { ok: true; config: DashboardConfig; tileId?: string } | { ok: false; reason: string };

/** Stabile Textform für den Vergleich: sortierte Schlüssel, `undefined`-Felder entfallen. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function isSameConfig(a: DashboardConfig, b: DashboardConfig): boolean {
  return canonical(a) === canonical(b);
}

/** Neue, innerhalb der Liste eindeutige Kachel-ID nach dem Muster `[A-Za-z0-9_-]{1,64}`. */
export function createTileId(existing: readonly DashboardTileConfig[], catalogId: string): string {
  const used = new Set(existing.map((tile) => tile.tileId));
  const base = `kachel_${catalogId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40)}`;
  for (let n = 1; ; n += 1) {
    const id = `${base}_${n}`;
    if (!used.has(id)) return id;
  }
}

/** Prüft die Konfiguration; der erste verständliche Grund wird zurückgegeben. */
function checked(config: DashboardConfig, tileId?: string): EditResult {
  const result = validateDashboardConfig(config);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.issues[0]?.message ?? 'Die Einstellung ist nicht zulässig.',
    };
  }
  return { ok: true, config: result.config, ...(tileId ? { tileId } : {}) };
}

function withoutUndefined(tile: DashboardTileConfig): DashboardTileConfig {
  return Object.fromEntries(
    Object.entries(tile).filter(([, value]) => value !== undefined),
  ) as unknown as DashboardTileConfig;
}

export function addTile(config: DashboardConfig, input: NewTileInput): EditResult {
  if (config.tiles.length >= MAX_TILES) {
    return { ok: false, reason: `Höchstens ${MAX_TILES} Kacheln.` };
  }
  const tileId = createTileId(config.tiles, input.catalogId);
  const tile = withoutUndefined({ tileId, ...input });
  return checked({ ...config, tiles: [...config.tiles, tile] }, tileId);
}

export function updateTile(config: DashboardConfig, tileId: string, patch: TilePatch): EditResult {
  const index = config.tiles.findIndex((tile) => tile.tileId === tileId);
  const current = config.tiles[index];
  if (!current) return { ok: false, reason: 'Kachel nicht gefunden.' };
  const next = withoutUndefined({ ...current, ...patch });
  const tiles = config.tiles.map((tile, i) => (i === index ? next : tile));
  return checked({ ...config, tiles }, tileId);
}

export function removeTile(config: DashboardConfig, tileId: string): DashboardConfig {
  if (!config.tiles.some((tile) => tile.tileId === tileId)) return config;
  return { ...config, tiles: config.tiles.filter((tile) => tile.tileId !== tileId) };
}

/** Verschiebt auf einen Zielindex (begrenzt auf die Liste); ohne Änderung bleibt die Liste dieselbe. */
export function moveTileTo(
  config: DashboardConfig,
  tileId: string,
  toIndex: number,
): DashboardConfig {
  const from = config.tiles.findIndex((tile) => tile.tileId === tileId);
  if (from < 0) return config;
  const to = Math.max(0, Math.min(config.tiles.length - 1, toIndex));
  if (to === from) return config;
  const tiles = [...config.tiles];
  const [moved] = tiles.splice(from, 1);
  if (!moved) return config;
  tiles.splice(to, 0, moved);
  return { ...config, tiles };
}

export function moveTile(
  config: DashboardConfig,
  tileId: string,
  direction: 'hoch' | 'runter',
): DashboardConfig {
  const from = config.tiles.findIndex((tile) => tile.tileId === tileId);
  if (from < 0) return config;
  return moveTileTo(config, tileId, direction === 'hoch' ? from - 1 : from + 1);
}

export function resetToDefault(): DashboardConfig {
  return DEFAULT_DASHBOARD_CONFIG;
}

export function setStartFilters(config: DashboardConfig, filters?: DashboardFilters): EditResult {
  const { filters: _old, ...rest } = config;
  void _old;
  const next: DashboardConfig = filters
    ? { ...rest, version: DASHBOARD_CONFIG_VERSION, filters }
    : { ...rest, version: DASHBOARD_CONFIG_VERSION };
  return checked(next);
}

/** Verstöße einer einzelnen Kachel (für Konfigurator und Optionen), ohne Listenbezug. */
export function validateTileCandidate(tile: DashboardTileConfig): ValidationIssue[] {
  const result = validateDashboardConfig({ version: DASHBOARD_CONFIG_VERSION, tiles: [tile] });
  return result.ok ? [] : result.issues;
}

const FILTER_MODES: readonly TileFilterMode[] = ['dashboard', 'eigener_zeitraum', 'fester_stand'];

/** Zeitbezug-Optionen eines Eintrags: erlaubt oder gesperrt mit dem Grund aus der Validierung. */
export function allowedFilterModes(
  entry: ActiveCatalogEntry,
): { mode: TileFilterMode; allowed: boolean; reason?: string }[] {
  return FILTER_MODES.map((mode) => {
    const issue = validateTileCandidate({
      tileId: 'probe',
      catalogId: entry.id,
      view: entry.defaultView,
      size: minSizeFor(entry, entry.defaultView),
      filterMode: mode,
    }).find((item) => item.path.endsWith('filterMode'));
    return issue ? { mode, allowed: false, reason: issue.message } : { mode, allowed: true };
  });
}

/** Aktiver Katalogeintrag einer Kachel, sonst `undefined` (unbekannt oder nicht freigegeben). */
export function activeEntryOf(tile: DashboardTileConfig): ActiveCatalogEntry | undefined {
  const entry = getCatalogEntry(tile.catalogId);
  return entry && isActiveEntry(entry) ? entry : undefined;
}

type SaveError = Extract<SaveResult, { ok: false }>['error'];

/** Verständlicher Text je Fehlerart; keine Feld-, Export- oder Resolvernamen. */
export function saveErrorMessage(error: SaveError): string {
  switch (error.kind) {
    case 'konflikt':
      return 'Die Ansicht wurde inzwischen an anderer Stelle geändert. Dein Entwurf bleibt erhalten.';
    case 'ungueltig':
      return 'Die Ansicht enthält eine ungültige Einstellung und wurde nicht gespeichert.';
    case 'keine_mitgliedschaft':
      return 'Du gehörst dieser Organisation nicht mehr. Die Ansicht wurde nicht gespeichert.';
    case 'sitzung_abgelaufen':
      return 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an; dein Entwurf bleibt erhalten, solange diese Seite offen ist.';
    case 'nicht_konfiguriert':
      return 'Die Speicherung ist nicht eingerichtet. Die Ansicht wurde nicht gespeichert.';
    case 'technisch':
      return 'Die Ansicht konnte nicht gespeichert werden. Bitte versuche es später erneut.';
    case 'keine_sitzung':
      return 'Du bist nicht angemeldet. Die Ansicht wurde nicht gespeichert.';
    case 'gesperrt':
      return 'Das Speichern ist für diese Ansicht gesperrt.';
    case 'sitzung_gewechselt':
      return 'Benutzer oder Organisation wurden gewechselt. Die Ansicht wurde nicht gespeichert.';
  }
}
