// Executive Dashboard V2 (Auftrag 165 / P12):
// Export und Import von Dashboard-Konfigurationen als geprüfte JSON-Dateien.

import { type DashboardConfigV2, validateDashboardConfigV2 } from './dashboardConfigV2';
import { getCatalogEntry, isActiveEntry } from './dashboardCatalog';
import { DASHBOARD_EXCHANGE_LIMITS, DASHBOARD_VERSION_MESSAGES } from './dashboardVersionMessages';

export interface DashboardExportEnvelopeV2 {
  format: 'leadpilot-dashboard';
  formatVersion: 1;
  exportedAt: string;
  sourceRevision: number;
  dashboard: Omit<
    DashboardConfigV2,
    | 'id'
    | 'ownerUserId'
    | 'organizationId'
    | 'scope'
    | 'teamId'
    | 'metadata'
    | 'createdAt'
    | 'updatedAt'
  >;
}

export interface ImportSessionContext {
  ownerUserId: string;
  organizationId: string;
  scope: 'personal' | 'team';
  teamId?: string;
}

export type ParseImportResult =
  { ok: true; config: DashboardConfigV2; warnungen: string[] } | { ok: false; grund: string };

/** Erzeugt einen URL- und Dateinamen-sicheren Slug (nur a-z, 0-9, -, max 60 Zeichen). */
export function slugifyDashboardTitle(title: string): string {
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const slug = normalized.slice(0, DASHBOARD_EXCHANGE_LIMITS.maxSlugLength).replace(/-+$/, '');
  return slug || 'dashboard';
}

/** Generiert den vertraglichen Dateinamen für einen Export. */
export function buildExportFileNameV2(title: string, revision: number): string {
  const slug = slugifyDashboardTitle(title);
  return `leadpilot-dashboard-${slug}-r${revision}.json`;
}

/** Erstellt den Export-Umschlag ohne Bezugsfelder, Rechte oder Secrets. */
export function buildDashboardExportV2(
  config: DashboardConfigV2,
  options: { sourceRevision: number },
): DashboardExportEnvelopeV2 {
  // 2.1 Nr. 5: Entfernt werden id, ownerUserId, organizationId, scope, teamId, metadata, createdAt, updatedAt
  const cleanDashboard: DashboardExportEnvelopeV2['dashboard'] = {
    version: 2,
    title: config.title,
    globalTimeframe: config.globalTimeframe,
    ...(config.globalPipeline ? { globalPipeline: config.globalPipeline } : {}),
    tiles: JSON.parse(JSON.stringify(config.tiles ?? [])),
    ...(config.sections ? { sections: JSON.parse(JSON.stringify(config.sections)) } : {}),
    ...(config.variables ? { variables: JSON.parse(JSON.stringify(config.variables)) } : {}),
  };

  return {
    format: 'leadpilot-dashboard',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    sourceRevision: options.sourceRevision,
    dashboard: cleanDashboard,
  };
}

/** Prüft ein Objekt rekursiv auf verbotene Schlüssel (__proto__, constructor, prototype). */
function hasForbiddenKeys(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (hasForbiddenKeys(item)) return true;
    }
    return false;
  }

  const record = obj as Record<string, unknown>;
  const keys = Object.getOwnPropertyNames(record);
  for (const k of keys) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      return true;
    }
    if (hasForbiddenKeys(record[k])) {
      return true;
    }
  }
  return false;
}

/** Generiert eine eindeutige V2-Dashboard-ID */
function generateImportDashboardId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'dash_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return 'dash_imp_' + Math.random().toString(36).slice(2, 12);
}

/** Parst und validiert eine importierte JSON-Datei vor dem Persistieren. */
export function parseDashboardImportV2(
  text: string,
  session: ImportSessionContext,
): ParseImportResult {
  // 1. Textlänge prüfen (≤ 128 KiB vor dem Parsen)
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > DASHBOARD_EXCHANGE_LIMITS.maxFileSizeBytes) {
    return { ok: false, grund: DASHBOARD_VERSION_MESSAGES.fileTooLarge };
  }

  // 2. Fast-Check auf verbotene Schlüssel
  if (/"(?:__proto__|constructor|prototype)"\s*:/i.test(text)) {
    return { ok: false, grund: DASHBOARD_VERSION_MESSAGES.prototypePollution };
  }

  // 3. JSON parsen
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, grund: DASHBOARD_VERSION_MESSAGES.invalidJson };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, grund: DASHBOARD_VERSION_MESSAGES.invalidFormat };
  }

  // 4. Rekursive Tiefenprüfung auf verbotene Schlüssel
  if (hasForbiddenKeys(parsed)) {
    return { ok: false, grund: DASHBOARD_VERSION_MESSAGES.prototypePollution };
  }

  const envelope = parsed as Record<string, unknown>;

  // 5. Umschlag prüfen
  if (envelope['format'] !== 'leadpilot-dashboard') {
    return { ok: false, grund: DASHBOARD_VERSION_MESSAGES.invalidFormat };
  }
  if (envelope['formatVersion'] !== 1) {
    return { ok: false, grund: DASHBOARD_VERSION_MESSAGES.invalidFormatVersion };
  }

  const rawDashboard = envelope['dashboard'];
  if (!rawDashboard || typeof rawDashboard !== 'object' || Array.isArray(rawDashboard)) {
    return { ok: false, grund: DASHBOARD_VERSION_MESSAGES.missingDashboard };
  }

  const dashObj = rawDashboard as Record<string, unknown>;

  // 6. Neue Konfiguration aus Daten + Sitzungskontext aufbauen
  const newConfig: DashboardConfigV2 = {
    version: 2,
    id: generateImportDashboardId(),
    title: typeof dashObj['title'] === 'string' ? dashObj['title'].trim() : '',
    scope: session.scope,
    teamId: session.scope === 'team' ? session.teamId : undefined,
    ownerUserId: session.ownerUserId,
    organizationId: session.organizationId,
    globalTimeframe: (dashObj['globalTimeframe'] as string) ?? 'letzte_30_tage',
    ...(typeof dashObj['globalPipeline'] === 'string'
      ? { globalPipeline: dashObj['globalPipeline'] }
      : {}),
    tiles: Array.isArray(dashObj['tiles']) ? (dashObj['tiles'] as DashboardConfigV2['tiles']) : [],
    ...(Array.isArray(dashObj['sections'])
      ? { sections: dashObj['sections'] as DashboardConfigV2['sections'] }
      : {}),
    ...(dashObj['variables'] && typeof dashObj['variables'] === 'object'
      ? { variables: dashObj['variables'] as Record<string, unknown> }
      : {}),
    metadata: {},
  };

  // 7. Client-Validierung (Schema, Kachel-Obergrenze, Pflichtfelder)
  const validation = validateDashboardConfigV2(newConfig);
  if (!validation.ok) {
    return {
      ok: false,
      grund: DASHBOARD_VERSION_MESSAGES.invalidConfig(validation.error),
    };
  }

  // 8. Katalog-Prüfung jeder Kachel (2.1 Nr. 7: unbekannte/inaktive sperren den Import)
  const unsupportedTileTitles: string[] = [];
  for (const tile of newConfig.tiles) {
    const entry = getCatalogEntry(tile.catalogId);
    if (!entry || !isActiveEntry(entry)) {
      unsupportedTileTitles.push(tile.title || tile.catalogId);
    }
  }

  if (unsupportedTileTitles.length > 0) {
    return {
      ok: false,
      grund: DASHBOARD_VERSION_MESSAGES.unsupportedTiles(unsupportedTileTitles),
    };
  }

  return {
    ok: true,
    config: newConfig,
    warnungen: [],
  };
}
