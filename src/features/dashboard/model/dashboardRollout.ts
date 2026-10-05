// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Rollout-Schalter und Adressen der neuen Ansicht.
// Entscheidung Marc E1 (05.10.2026): Build-Schalter `VITE_EXECUTIVE_DASHBOARD_V2`, Standard aus.
// Dies ist die einzige Stelle, die den Schalter liest. Ist er aus, bleibt `/dashboard` die bisherige
// Ansicht und die Detailroute existiert nicht.

export const DASHBOARD_PATH = '/dashboard';
export const TILE_DETAIL_PREFIX = '/dashboard/tiles/';
/** Routenmuster für den Router. */
export const TILE_DETAIL_ROUTE = '/dashboard/tiles/:tileId';

type RolloutEnv = { VITE_EXECUTIVE_DASHBOARD_V2?: string };

export function isPersonalDashboardEnabled(env: RolloutEnv = import.meta.env): boolean {
  return env.VITE_EXECUTIVE_DASHBOARD_V2 === 'true';
}

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
