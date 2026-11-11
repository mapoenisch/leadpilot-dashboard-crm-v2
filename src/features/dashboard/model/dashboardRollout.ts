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
 * Prüft, ob der neue visuelle Dashboard-Editor (V2) aktiv ist.
 * Standard ist strikt false (alter V1-Editor aktiv).
 * Lässt sich über VITE_DASHBOARD_EDITOR_V2=true oder für Pilot-Tests über SessionStorage/Override aktivieren.
 */
export function isDashboardEditorV2Enabled(): boolean {
  if (runtimeEditorV2Override !== null) {
    return runtimeEditorV2Override;
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(DASHBOARD_EDITOR_V2_STORAGE_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // sessionStorage nicht verfügbar (z. B. Sandbox)
    }
  }
  return import.meta.env?.VITE_DASHBOARD_EDITOR_V2 === 'true';
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
