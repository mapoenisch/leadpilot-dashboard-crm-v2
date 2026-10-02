// Executive Dashboard, Teilauftrag 1 (Auftrag 070): Prüfung von Katalog und Konfiguration.
// Reine Funktionen ohne Datenzugriff. Die Konfiguration kommt später aus JSON (Speicherung,
// Teilauftrag 3) und wird deshalb als `unknown` streng geprüft: unbekannte Felder werden abgelehnt.
import {
  DASHBOARD_CATALOG,
  DASHBOARD_CATEGORIES,
  MIN_SIZE_BY_VIEW,
  PIE_VIEWS,
  TILE_SIZES,
  VIEWS_BY_SHAPE,
  getCatalogEntry,
  isActiveEntry,
  minSizeFor,
  sizeRank,
} from './dashboardCatalog';
import type { ActiveCatalogEntry, CatalogEntry, DashboardView, TileSize } from './dashboardCatalog';
import { DASHBOARD_CONFIG_VERSION, MAX_TILES, MAX_TITLE_LENGTH } from './dashboardConfig';
import type {
  DashboardConfig,
  DashboardFilters,
  DashboardTileConfig,
  TileFilterMode,
} from './dashboardConfig';

export interface ValidationIssue {
  /** Ort des Problems, z. B. `tiles[2].view` oder eine Katalog-ID. */
  path: string;
  code: string;
  message: string;
}

const ID_PATTERN = /^(baseline|crm|live|uebersicht)\.[a-z0-9_]+$/;
const TILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MIN_REASON_LENGTH = 15;

function checkActiveEntry(entry: ActiveCatalogEntry, issues: ValidationIssue[]): void {
  const add = (code: string, message: string) => issues.push({ path: entry.id, code, message });
  const allowed = VIEWS_BY_SHAPE[entry.shape];
  if (entry.views.length === 0) add('views_leer', 'Keine Darstellung freigegeben.');
  for (const view of entry.views) {
    if (!allowed.includes(view)) add('view_unzulaessig', `${view} passt nicht zu ${entry.shape}.`);
  }
  if (!entry.views.includes(entry.defaultView)) add('default_view', 'Standard nicht freigegeben.');
  if ((entry.funnelStages || entry.mayBeNegative) && entry.views.some((v) => PIE_VIEWS.includes(v)))
    add('kreis_gesperrt', 'Funnel-Stufen oder negative Werte nie als Kreis oder Ring.');
  if ((entry.kind === 'uebersicht') !== (entry.shape === 'uebersicht'))
    add('uebersicht', 'Übersichtskacheln und Datenform „uebersicht“ gehören zusammen.');
  if (!TILE_SIZES.includes(entry.minSize)) add('groesse', 'Unbekannte Mindestgröße.');
  const expectedMode = { baseline: 'fest', crm: 'aktuell', live: 'live' }[entry.source.layer];
  if (entry.timeMode !== expectedMode)
    add('zeitmodus', `Ebene ${entry.source.layer} verlangt ${expectedMode}.`);
  if (entry.source.layer === 'live' && entry.kind === 'kpi' && !entry.source.liveKpiId)
    add('live_id', 'Live-KPI ohne Live-ID.');
  if (entry.filters.includes('pipeline') && entry.source.layer !== 'crm')
    add('filter', 'Pipeline-Filter nur für CRM-Quellen.');
  for (const [field, value] of [
    ['definition', entry.definition],
    ['timeBasis', entry.timeBasis],
    ['access', entry.access],
    ['detailRouteId', entry.detailRouteId],
    ['unit', entry.unit],
  ] as const) {
    if (value.trim() === '') add('pflichtfeld', `${field} fehlt.`);
  }
}

/** Prüft den Katalog selbst: IDs, Quellen, Darstellungsregeln, Begründungen. */
export function validateCatalog(catalog: readonly CatalogEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const entry of catalog) {
    const add = (code: string, message: string) => issues.push({ path: entry.id, code, message });
    if (seen.has(entry.id)) add('id_doppelt', 'ID ist nicht eindeutig.');
    seen.add(entry.id);
    if (!ID_PATTERN.test(entry.id))
      add('id_format', 'ID braucht Ebenenpräfix und Kleinbuchstaben.');
    const prefix = entry.kind === 'uebersicht' ? 'uebersicht' : entry.source.layer;
    if (!entry.id.startsWith(`${prefix}.`)) add('id_praefix', `ID muss mit ${prefix}. beginnen.`);
    if (!(entry.category in DASHBOARD_CATEGORIES)) add('kategorie', 'Unbekannte Kategorie.');
    if (entry.source.module.startsWith('src/simulation') || /simulation/i.test(entry.id))
      add('simulation', 'Simulations-KPIs sind ausgeschlossen.');
    if (entry.source.module.trim() === '' || entry.source.exportName.trim() === '')
      add('quelle', 'Quelle unvollständig.');
    if (isActiveEntry(entry)) checkActiveEntry(entry, issues);
    else if (entry.reason.trim().length < MIN_REASON_LENGTH)
      add('grund', 'Nicht aktive Einträge brauchen einen konkreten Grund.');
  }
  return issues;
}

const TILE_KEYS = new Set([
  'tileId',
  'catalogId',
  'view',
  'size',
  'title',
  'filterMode',
  'period',
  'pipeline',
]);
const FILTER_KEYS = new Set(['period', 'pipeline']);
const FILTER_MODES: readonly TileFilterMode[] = ['dashboard', 'eigener_zeitraum', 'fester_stand'];
const ALL_VIEWS = Object.keys(MIN_SIZE_BY_VIEW);
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PIPELINE_LENGTH = 64;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDay = (value: unknown): value is string =>
  typeof value === 'string' &&
  DAY_PATTERN.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

function checkPeriod(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value) || !isDay(value.from) || !isDay(value.to) || value.from > value.to) {
    issues.push({
      path,
      code: 'zeitraum',
      message: 'Zeitraum braucht from und to (JJJJ-MM-TT), from nicht nach to.',
    });
    return;
  }
  for (const key of Object.keys(value)) {
    if (key !== 'from' && key !== 'to')
      issues.push({ path: `${path}.${key}`, code: 'feld_unbekannt', message: 'Unbekanntes Feld.' });
  }
}

const isPipeline = (value: unknown): boolean =>
  typeof value === 'string' && value.trim() !== '' && value.length <= MAX_PIPELINE_LENGTH;

function checkFilters(raw: unknown, issues: ValidationIssue[]): void {
  const add = (field: string, code: string, message: string): void => {
    issues.push({ path: field, code, message });
  };
  if (!isRecord(raw)) return add('filters', 'form', 'Filter sind kein Objekt.');
  for (const key of Object.keys(raw)) {
    if (!FILTER_KEYS.has(key)) add(`filters.${key}`, 'feld_unbekannt', 'Unbekanntes Feld.');
  }
  if (raw.period !== undefined) checkPeriod(raw.period, 'filters.period', issues);
  if (raw.pipeline !== undefined && !isPipeline(raw.pipeline))
    add('filters.pipeline', 'pipeline', `Pipeline mit 1 bis ${MAX_PIPELINE_LENGTH} Zeichen.`);
}

function checkTile(
  raw: unknown,
  index: number,
  catalog: readonly CatalogEntry[],
  tileIds: Set<string>,
  issues: ValidationIssue[],
  unavailable: ValidationIssue[],
): void {
  const path = `tiles[${index}]`;
  const add = (field: string, code: string, message: string): void => {
    issues.push({ path: field ? `${path}.${field}` : path, code, message });
  };
  if (!isRecord(raw)) return add('', 'kachel_form', 'Kachel ist kein Objekt.');
  for (const key of Object.keys(raw)) {
    if (!TILE_KEYS.has(key)) add(key, 'feld_unbekannt', 'Unbekanntes Feld.');
  }
  const { tileId, catalogId, view, size, title, filterMode, period, pipeline } = raw;
  if (period !== undefined) {
    if (filterMode !== 'eigener_zeitraum')
      add('period', 'zeitraum_ohne_modus', 'Zeitraum nur mit eigenem Zeitraum.');
    else checkPeriod(period, `${path}.period`, issues);
  }
  if (pipeline !== undefined && !isPipeline(pipeline))
    add('pipeline', 'pipeline', `Pipeline mit 1 bis ${MAX_PIPELINE_LENGTH} Zeichen.`);
  if (typeof tileId !== 'string' || !TILE_ID_PATTERN.test(tileId))
    add('tileId', 'kachel_id', 'Ungültige Kachel-ID.');
  else if (tileIds.has(tileId)) add('tileId', 'kachel_id_doppelt', 'Kachel-ID ist doppelt.');
  else tileIds.add(tileId);
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '' || title.length > MAX_TITLE_LENGTH)
      add('title', 'titel', `Titel mit 1 bis ${MAX_TITLE_LENGTH} Zeichen.`);
  }
  if (typeof filterMode !== 'string' || !FILTER_MODES.includes(filterMode as TileFilterMode))
    add('filterMode', 'filter_modus', 'Unbekannter Zeitbezug.');
  if (typeof catalogId !== 'string' || catalogId.trim() === '')
    return add('catalogId', 'katalog_id', 'Katalog-ID fehlt.');
  const entry = getCatalogEntry(catalogId, catalog);
  if (!entry || !isActiveEntry(entry)) {
    // Ladevertrag (Plan §8, Teilauftrag 3): Kacheln mit entfernter, umbenannter oder (noch)
    // nicht freigegebener KPI bleiben erhalten; nur die Verfügbarkeit wird gemeldet.
    if (typeof view !== 'string' || !ALL_VIEWS.includes(view))
      add('view', 'view_unbekannt', 'Unbekannte Darstellung.');
    if (typeof size !== 'string' || !TILE_SIZES.includes(size as TileSize))
      add('size', 'groesse', 'Unbekannte Größe.');
    unavailable.push({
      path: `${path}.catalogId`,
      code: entry ? 'katalog_inaktiv' : 'katalog_unbekannt',
      message: entry ? 'KPI ist nicht freigegeben.' : 'KPI ist nicht (mehr) im Katalog.',
    });
    return;
  }
  if (pipeline !== undefined && !entry.filters.includes('pipeline'))
    add('pipeline', 'filter', 'Diese Quelle unterstützt keinen Pipeline-Filter.');
  if (typeof view !== 'string' || !entry.views.includes(view as DashboardView))
    return add('view', 'view_unzulaessig', 'Darstellung ist für diese KPI nicht zulässig.');
  if (typeof size !== 'string' || !TILE_SIZES.includes(size as TileSize))
    add('size', 'groesse', 'Unbekannte Größe.');
  else if (sizeRank(size as TileSize) < sizeRank(minSizeFor(entry, view as DashboardView)))
    add('size', 'groesse_zu_klein', 'Kachel ist für diese Darstellung zu klein.');
  // Historische Werte bleiben fest; aktuelle Quellen haben (noch) keinen belegten Zeitraum.
  if (filterMode === 'eigener_zeitraum')
    add('filterMode', 'zeitraum_unbelegt', 'Die Quelle hat kein belegtes Datumsfeld.');
  else if (entry.timeMode === 'fest' && filterMode === 'dashboard')
    add('filterMode', 'historisch_fest', 'Historische Werte folgen keinem Dashboard-Zeitraum.');
  else if (entry.timeMode !== 'fest' && filterMode === 'fester_stand')
    add('filterMode', 'kein_stand', 'Für aktuelle Quellen gibt es keinen festen Stand.');
}

export type ConfigValidationResult =
  | {
      ok: true;
      config: DashboardConfig;
      /** Kacheln mit unbekannter oder nicht freigegebener KPI: bleiben in `config`, Anzeige als Platzhalter. */
      unavailable: ValidationIssue[];
    }
  | { ok: false; issues: ValidationIssue[] };

/** Prüft eine (z. B. aus JSON gelesene) Konfiguration gegen Format und Katalog. */
export function validateDashboardConfig(
  input: unknown,
  catalog: readonly CatalogEntry[] = DASHBOARD_CATALOG,
): ConfigValidationResult {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: '', code: 'form', message: 'Kein Objekt.' }] };
  }
  for (const key of Object.keys(input)) {
    if (key !== 'version' && key !== 'tiles' && key !== 'filters')
      issues.push({ path: key, code: 'feld_unbekannt', message: 'Unbekanntes Feld.' });
  }
  if (input.version !== DASHBOARD_CONFIG_VERSION) {
    // Unbekannte (z. B. neuere) Formate nie überschreiben: Aufrufer zeigt die sichere Ansicht.
    issues.push({ path: 'version', code: 'version', message: 'Unbekannte Formatversion.' });
    return { ok: false, issues };
  }
  if (!Array.isArray(input.tiles)) {
    issues.push({ path: 'tiles', code: 'form', message: 'Kachelliste fehlt.' });
    return { ok: false, issues };
  }
  if (input.tiles.length > MAX_TILES)
    issues.push({ path: 'tiles', code: 'zu_viele', message: `Höchstens ${MAX_TILES} Kacheln.` });
  if (input.filters !== undefined) checkFilters(input.filters, issues);
  const tileIds = new Set<string>();
  const unavailable: ValidationIssue[] = [];
  input.tiles.forEach((tile, index) =>
    checkTile(tile, index, catalog, tileIds, issues, unavailable),
  );
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    config: {
      version: DASHBOARD_CONFIG_VERSION,
      ...(input.filters !== undefined ? { filters: input.filters as DashboardFilters } : {}),
      tiles: input.tiles as DashboardTileConfig[],
    },
    unavailable,
  };
}
