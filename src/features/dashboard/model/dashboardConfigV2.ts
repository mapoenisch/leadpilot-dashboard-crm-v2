// Executive Dashboard V2 (Auftrag 147 / P04):
// Typdefinitionen und Schema-Validierung für die V2-Dashboard-Konfiguration.
// Vollständig konform mit P02 §9.1 & P03 (GRID_VERGLEICH_ZIELMODELL_146.md).

export const DASHBOARD_CONFIG_VERSION_V2 = 2 as const;
export const MAX_TILES_V2 = 24;
export const MAX_CONFIG_V2_BYTES = 65536; // 64 KiB

export type DashboardScope = 'personal' | 'team';
export type BreakpointKey = 'desktop' | 'tablet' | 'mobile';

/** Raster-Position und Dimension einer Kachel */
export interface GridPosition {
  x: number; // Spaltenindex (0-basiert)
  y: number; // Zeilenindex (0-basiert)
  w: number; // Breite in Spalten
  h: number; // Höhe in Zeilen
}

/** Getrennte Rasterpositionen je Breakpoint */
export interface BreakpointGridPositions {
  desktop: GridPosition; // 12-Spalten-Raster (Pflicht)
  tablet?: GridPosition; // 6-Spalten-Raster (Optional / berechneter Fallback)
  mobile?: GridPosition; // 1-Spalten-Raster (Optional / berechneter Fallback)
}

/** Editierbare visuelle Optionen einer Kachel */
export interface TileDisplayOptions {
  showLegend?: boolean;
  colorScheme?: string;
  stacked?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  decimalPlaces?: number;
  [key: string]: unknown;
}

/**
 * Persistierte Abfragestruktur einer Kachel (Auftrag 154 §2.1).
 * metricId: Pflicht, identisch mit catalogId.
 * pipelineId: fehlt = erbt Dashboard-Pipeline; string = feste Pipeline; null = ausdrücklich alle Pipelines.
 * timeframe: fehlt oder genau der Zeitbezug der Kennzahl ('fest' | 'aktuell' | 'live').
 * aggregation: optional, nur aus getQueryCapabilities.
 * groupBy: fehlt oder ['stage'], nur bei Kennzahlen mit dieser Gruppierung.
 * filters: fehlt oder leeres Objekt {}.
 */
export interface TileQueryConfig {
  metricId?: string;
  pipelineId?: string | null;
  timeframe?: string;
  aggregation?: string;
  groupBy?: string[];
  filters?: Record<string, unknown>;
}

/** Schwellenwert-Regel einer Kachel */
export interface TileThresholdRule {
  enabled: boolean;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between';
  warningValue?: number;
  criticalValue?: number;
  secondaryWarningValue?: number;
  secondaryCriticalValue?: number;
}

/** Konfiguration einer einzelnen Kachel (V2) */
export interface DashboardTileConfigV2 {
  id: string; // Eindeutige Kachel-ID (z. B. 'std_baseline_arr' oder UUID)
  catalogId: string; // Referenz auf DASHBOARD_CATALOG (z. B. 'baseline.arr')
  title: string; // Benutzerdefinierter Titel
  presentation: string; // Renderer (z. B. 'zahl', 'balken', 'donut', etc.)
  layouts: BreakpointGridPositions; // Getrennte Rasterpositionen je Breakpoint
  displayOptions?: TileDisplayOptions;
  query?: TileQueryConfig;
  timeframeOverride?: string;
  pipelineOverride?: string;
  aggregationOverride?: string;
  threshold?: TileThresholdRule;
  drilldownUrl?: string;
}

/** Metadaten zur Migration und Herkunft */
export interface DashboardMetadataV2 {
  migrated_from_v1?: boolean;
  migrated_at?: string;
  last_migrated_revision?: number;
  user_edited?: boolean;
  [key: string]: unknown;
}

/** Vollständige Dashboard-Konfiguration (V2) */
export interface DashboardConfigV2 {
  version: typeof DASHBOARD_CONFIG_VERSION_V2;
  id: string; // Dashboard-UUID
  title: string;
  scope: DashboardScope;
  teamId?: string; // Pflicht wenn scope === 'team'
  ownerUserId: string; // Ersteller / Eigentümer
  organizationId: string; // Mandant
  globalTimeframe: string; // Standard-Zeitraum
  globalPipeline?: string; // Standard-Pipeline
  tiles: DashboardTileConfigV2[]; // Max. 24 Kacheln
  sections?: unknown[];
  metadata?: DashboardMetadataV2;
  variables?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/** Zustand der Bearbeitungs-Arbeitskopie im Editor-Kern */
export interface DashboardDraftState {
  config: DashboardConfigV2;
  isDirty: boolean;
  activeBreakpoint: BreakpointKey;
  selectedTileId: string | null;
  isInterimActionActive: boolean;
}

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'version',
  'id',
  'title',
  'scope',
  'teamId',
  'ownerUserId',
  'organizationId',
  'globalTimeframe',
  'globalPipeline',
  'tiles',
  'sections',
  'metadata',
  'variables',
  'createdAt',
  'updatedAt',
]);

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Validiert ein Konfigurationsobjekt gegen das V2-Schema.
 * Entspricht 1:1 den serverseitigen Regeln aus `dashboard_config_v2_invalid_reason` (P03 §4.1).
 */
export function validateDashboardConfigV2(
  config: unknown,
): { ok: true; config: DashboardConfigV2 } | { ok: false; error: string } {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { ok: false, error: 'kein Objekt' };
  }

  const rawJson = JSON.stringify(config);
  // Byte-Länge prüfen (UTF-8)
  const byteLength = new TextEncoder().encode(rawJson).length;
  if (byteLength > MAX_CONFIG_V2_BYTES) {
    return { ok: false, error: 'Konfiguration überschreitet Maximalgröße von 64 KiB' };
  }

  const record = config as Record<string, unknown>;

  // Version muss 2 sein
  if (record.version !== 2) {
    return { ok: false, error: 'ungültige oder fehlende Schema-Version (erwartet: 2)' };
  }

  // Top-Level-Keys prüfen
  for (const key of Object.keys(record)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      return { ok: false, error: `unbekanntes Top-Level-Feld im JSON: ${key}` };
    }
  }

  // Pflichtfelder Typisierung
  if (typeof record.id !== 'string' || record.id.trim() === '') {
    return { ok: false, error: 'id muss ein nicht-leerer String sein' };
  }
  if (typeof record.title !== 'string' || record.title.trim() === '' || record.title.length > 120) {
    return { ok: false, error: 'title muss ein nicht-leerer String (max. 120 Zeichen) sein' };
  }
  if (record.scope !== 'personal' && record.scope !== 'team') {
    return { ok: false, error: "scope muss 'personal' oder 'team' sein" };
  }
  if (record.scope === 'team' && (typeof record.teamId !== 'string' || !record.teamId.trim())) {
    return { ok: false, error: "teamId ist Pflichtfeld bei scope = 'team'" };
  }
  if (typeof record.ownerUserId !== 'string' || !record.ownerUserId.trim()) {
    return { ok: false, error: 'ownerUserId muss ein String sein' };
  }
  if (typeof record.organizationId !== 'string' || !record.organizationId.trim()) {
    return { ok: false, error: 'organizationId muss ein String sein' };
  }
  if (typeof record.globalTimeframe !== 'string' || !record.globalTimeframe.trim()) {
    return { ok: false, error: 'globalTimeframe muss ein String sein' };
  }

  // Kacheln prüfen
  if (!Array.isArray(record.tiles)) {
    return { ok: false, error: 'tiles muss ein Array sein' };
  }

  if (record.tiles.length > MAX_TILES_V2) {
    return { ok: false, error: 'maximal 24 Kacheln zulässig' };
  }

  const tileIds = new Set<string>();

  for (let i = 0; i < record.tiles.length; i++) {
    const tile = record.tiles[i];
    if (!tile || typeof tile !== 'object' || Array.isArray(tile)) {
      return { ok: false, error: `tiles[${i}] ist kein Objekt` };
    }

    const t = tile as Record<string, unknown>;
    if (typeof t.id !== 'string' || !t.id.trim()) {
      return { ok: false, error: `tiles[${i}].id muss ein String sein` };
    }
    if (tileIds.has(t.id)) {
      return { ok: false, error: `Kachel-ID '${t.id}' ist mehrfach vorhanden` };
    }
    tileIds.add(t.id);

    if (typeof t.catalogId !== 'string' || !t.catalogId.trim()) {
      return { ok: false, error: `tiles[${i}].catalogId muss ein String sein` };
    }
    if (typeof t.title !== 'string') {
      return { ok: false, error: `tiles[${i}].title muss ein String sein` };
    }
    if (typeof t.presentation !== 'string' || !t.presentation.trim()) {
      return { ok: false, error: `tiles[${i}].presentation muss ein String sein` };
    }

    // Layouts
    if (!t.layouts || typeof t.layouts !== 'object' || Array.isArray(t.layouts)) {
      return { ok: false, error: `tiles[${i}].layouts ist kein Objekt` };
    }
    const layouts = t.layouts as Record<string, unknown>;

    // Desktop ist Pflicht
    if (!layouts.desktop || typeof layouts.desktop !== 'object' || Array.isArray(layouts.desktop)) {
      return { ok: false, error: `tiles[${i}].layouts.desktop ist Pflichtfeld` };
    }
    const d = layouts.desktop as Record<string, unknown>;
    if (!isInteger(d.x) || !isInteger(d.y) || !isInteger(d.w) || !isInteger(d.h)) {
      return { ok: false, error: `tiles[${i}].layouts.desktop Koordinaten müssen Ganzzahlen sein` };
    }
    if (d.x < 0 || d.y < 0 || d.w < 1 || d.h < 1) {
      return { ok: false, error: `tiles[${i}].layouts.desktop Koordinaten müssen positiv sein` };
    }
    if (d.w > 12 || d.x + d.w > 12) {
      return {
        ok: false,
        error: `tiles[${i}].layouts.desktop überschreitet 12 Spalten (x=${d.x}, w=${d.w})`,
      };
    }
    if (d.h > 24) {
      return { ok: false, error: `tiles[${i}].layouts.desktop maximale Zeilenhöhe ist 24` };
    }

    // Tablet (optional)
    if (layouts.tablet !== undefined) {
      if (typeof layouts.tablet !== 'object' || Array.isArray(layouts.tablet) || !layouts.tablet) {
        return { ok: false, error: `tiles[${i}].layouts.tablet ist ungültig` };
      }
      const tab = layouts.tablet as Record<string, unknown>;
      if (!isInteger(tab.x) || !isInteger(tab.y) || !isInteger(tab.w) || !isInteger(tab.h)) {
        return {
          ok: false,
          error: `tiles[${i}].layouts.tablet Koordinaten müssen Ganzzahlen sein`,
        };
      }
      if (tab.x < 0 || tab.y < 0 || tab.w < 1 || tab.h < 1) {
        return { ok: false, error: `tiles[${i}].layouts.tablet Koordinaten müssen positiv sein` };
      }
      if (tab.w > 6 || tab.x + tab.w > 6) {
        return {
          ok: false,
          error: `tiles[${i}].layouts.tablet überschreitet 6 Spalten (x=${tab.x}, w=${tab.w})`,
        };
      }
    }

    // Mobile (optional)
    if (layouts.mobile !== undefined) {
      if (typeof layouts.mobile !== 'object' || Array.isArray(layouts.mobile) || !layouts.mobile) {
        return { ok: false, error: `tiles[${i}].layouts.mobile ist ungültig` };
      }
      const mob = layouts.mobile as Record<string, unknown>;
      if (!isInteger(mob.x) || !isInteger(mob.y) || !isInteger(mob.w) || !isInteger(mob.h)) {
        return {
          ok: false,
          error: `tiles[${i}].layouts.mobile Koordinaten müssen Ganzzahlen sein`,
        };
      }
      if (mob.x !== 0 || mob.w !== 1 || mob.y < 0 || mob.h < 1) {
        return {
          ok: false,
          error: `tiles[${i}].layouts.mobile muss 1 Spalte (x=0, w=1) haben`,
        };
      }
    }
  }

  return { ok: true, config: config as unknown as DashboardConfigV2 };
}

/** Erstellt eine leere, valide DashboardConfigV2 */
export function createEmptyDashboardConfigV2(params: {
  id?: string;
  title?: string;
  ownerUserId: string;
  organizationId: string;
  scope?: DashboardScope;
  teamId?: string;
  globalTimeframe?: string;
}): DashboardConfigV2 {
  const now = new Date().toISOString();
  return {
    version: DASHBOARD_CONFIG_VERSION_V2,
    id:
      params.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'dash_new'),
    title: params.title ?? 'Neues Dashboard',
    scope: params.scope ?? 'personal',
    teamId: params.teamId,
    ownerUserId: params.ownerUserId,
    organizationId: params.organizationId,
    globalTimeframe: params.globalTimeframe ?? 'letzte_30_tage',
    tiles: [],
    metadata: {
      user_edited: false,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/** Tiefes Klonen einer DashboardConfigV2 */
export function cloneDashboardConfigV2(config: DashboardConfigV2): DashboardConfigV2 {
  return JSON.parse(JSON.stringify(config)) as DashboardConfigV2;
}

/** Stabile Textform für den Vergleich ohne flüchtige Zeitstempel */
function canonicalConfig(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalConfig).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key, item]) => item !== undefined && key !== 'updatedAt' && key !== 'createdAt')
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, item]) => {
        // Bei metadata user_edited ignorieren beim inhaltlichen Abgleich
        if (key === 'metadata' && item && typeof item === 'object') {
          const metaEntries = Object.entries(item as Record<string, unknown>)
            .filter(([mKey]) => mKey !== 'user_edited')
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([mKey, mVal]) => `${JSON.stringify(mKey)}:${canonicalConfig(mVal)}`);
          return `${JSON.stringify(key)}:{${metaEntries.join(',')}}`;
        }
        return `${JSON.stringify(key)}:${canonicalConfig(item)}`;
      });
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Prüft zwei V2-Konfigurationen auf inhaltliche Gleichheit (ignoriert Zeitstempel und user_edited-Flag) */
export function isSameConfigV2(a: DashboardConfigV2, b: DashboardConfigV2): boolean {
  return canonicalConfig(a) === canonicalConfig(b);
}
