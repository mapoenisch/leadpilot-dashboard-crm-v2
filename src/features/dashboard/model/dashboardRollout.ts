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
