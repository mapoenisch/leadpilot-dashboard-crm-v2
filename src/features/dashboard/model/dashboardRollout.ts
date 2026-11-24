// Executive Dashboard, Aufträge 077/079/141: Adressen und Chunk-Loader.
// Auftrag 141: Die bisherige Ansicht und der Rollout-Schalter sind entfernt;
// `/dashboard` lädt ausschließlich die persönliche Ansicht.
export const DASHBOARD_PATH = '/dashboard';
export const TILE_DETAIL_PREFIX = '/dashboard/tiles/';
/** Routenmuster für den Router. */
export const TILE_DETAIL_ROUTE = '/dashboard/tiles/:tileId';

export function tileDetailPath(tileId: string): string {
  return `${TILE_DETAIL_PREFIX}${encodeURIComponent(tileId)}`;
}

/** Kachel-ID aus einem Pfad der Detailroute; sonst null (auch bei leerer oder tieferer ID). */
export function tileIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(TILE_DETAIL_PREFIX)) return null;
  const rest = pathname.slice(TILE_DETAIL_PREFIX.length).replace(/\/$/, '');
  if (!rest || rest.includes('/')) return null;
  try {
    return decodeURIComponent(rest);
  } catch {
    return null;
  }
}

// Auftrag 147 / Paket P04: Neuer Rollout-Schalter für den V2-Editor.
// Standard bleibt strikt der alte V1-Editor (false).
let runtimeEditorV2Override: boolean | null = null;

export const DASHBOARD_EDITOR_V2_STORAGE_KEY = 'lp_dashboard_editor_v2';

/**
 * Auftrag 174 / P16b: Server-Schalter je Organisation. Der Stand wird beim Öffnen des
 * Dashboards geladen und für die laufende Ansicht festgehalten (siehe useDashboardEditorChoice).
 */
export type DashboardEditorRolloutReason =
  | 'stufe_0'
  | 'rueckweg'
  | 'umgestellt'
  | 'umstellbar'
  | 'entscheidung_fehlt'
  | 'entscheidung_verfallen'
  | 'entscheidung_spaeter';

export interface DashboardEditorServerChoice {
  editor: 'v1' | 'v2';
  grund: DashboardEditorRolloutReason;
  stufe: number;
  aktiviertAt: string | null;
  umgestelltAt: string | null;
  v1UpdatedAt: string | null;
}

/** Serverstand: noch nicht geladen, nicht verfügbar (ohne Supabase/Sitzung) oder geladen. */
export type DashboardEditorServerState = 'laden' | 'nicht_verfuegbar' | DashboardEditorServerChoice;

/** Override für Tests und Pilot-Umschaltung (Laufzeit vor Session-Storage); sonst null. */
export function readDashboardEditorOverride(): boolean | null {
  if (runtimeEditorV2Override !== null) return runtimeEditorV2Override;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(DASHBOARD_EDITOR_V2_STORAGE_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // sessionStorage nicht verfügbar (z. B. Sandbox)
    }
  }
  return null;
}

export function readDashboardEditorBuildFlag(): boolean {
  return import.meta.env?.VITE_DASHBOARD_EDITOR_V2 === 'true';
}

/**
 * Reihenfolge (Auftrag 174 §2 Nr. 2): Override > Server-Schalter > Build-Variable.
 * Solange der Serverstand lädt, ist noch keine Wahl getroffen ('laden'; die Seite zeigt
 * einen Ladezustand, damit kein Editor kurz aufblitzt). Ohne Server gilt die Build-Variable.
 */
export function resolveDashboardEditorV2(input: {
  override: boolean | null;
  server: DashboardEditorServerState;
  buildFlag: boolean;
}): boolean | 'laden' {
  if (input.override !== null) return input.override;
  if (input.server === 'laden') return 'laden';
  if (input.server === 'nicht_verfuegbar') return input.buildFlag;
  return input.server.editor === 'v2';
}

let latchedServerChoice: { key: string; choice: DashboardEditorServerChoice } | null = null;

/** Hält den beim Öffnen geladenen Serverstand fest (je Organisation und Nutzer). */
export function latchDashboardEditorServerChoice(
  key: string,
  choice: DashboardEditorServerChoice | null,
): void {
  latchedServerChoice = choice ? { key, choice } : null;
}

export function getLatchedDashboardEditorServerChoice(
  key: string,
): DashboardEditorServerChoice | null {
  return latchedServerChoice?.key === key ? latchedServerChoice.choice : null;
}

/**
 * Prüft, ob der neue visuelle Dashboard-Editor (V2) aktiv ist.
 * Standard ist strikt false (alter V1-Editor aktiv).
 * Reihenfolge: Override (Tests/Pilot) > zuletzt geladener Server-Schalter > VITE_DASHBOARD_EDITOR_V2.
 */
export function isDashboardEditorV2Enabled(): boolean {
  const override = readDashboardEditorOverride();
  if (override !== null) return override;
  if (latchedServerChoice) return latchedServerChoice.choice.editor === 'v2';
  return readDashboardEditorBuildFlag();
}

/** Setzt einen programmatischen Override (für Tests oder Pilot-Umschaltung) */
export function setDashboardEditorV2Override(enabled: boolean | null): void {
  runtimeEditorV2Override = enabled;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (enabled === null) {
        window.sessionStorage.removeItem(DASHBOARD_EDITOR_V2_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(DASHBOARD_EDITOR_V2_STORAGE_KEY, String(enabled));
      }
    } catch {
      // sessionStorage nicht verfügbar
    }
  }
}

/** Liefert die aktive Editor-Version (1 oder 2) */
export function getDashboardEditorVersion(): 1 | 2 {
  return isDashboardEditorV2Enabled() ? 2 : 1;
}
