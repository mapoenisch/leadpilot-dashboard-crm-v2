// Auftrag 171 (P15a): Adresse der Kiosk-Ansicht.
// `/dashboard/kiosk?ids=<id1>,<id2>&intervall=60` — eine Ansicht, kein Zugang: kein Link-Token,
// keine öffentlichen Parameter. Unbekannte oder fremde IDs filtert erst die Kiosk-Seite anhand der
// Leserechte (RLS) heraus.

export const KIOSK_PATH = '/dashboard/kiosk';
export const KIOSK_INTERVAL_MIN_S = 30;
export const KIOSK_INTERVAL_MAX_S = 600;
export const KIOSK_INTERVAL_DEFAULT_S = 60;
/** Obergrenze der Rotationsliste (Schutz vor überlangen Adressen). */
export const KIOSK_MAX_DASHBOARDS = 20;

export type KioskTheme = 'dark' | 'light';

export interface KioskParams {
  /** Angefragte Dashboard-IDs in Reihenfolge, ohne Dubletten; leer = aktives Dashboard. */
  ids: string[];
  intervalSec: number;
  /** Gewähltes Theme aus der Adresse, sonst null (dann gilt das gespeicherte App-Theme). */
  theme: KioskTheme | null;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function clampKioskInterval(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) return KIOSK_INTERVAL_DEFAULT_S;
  const rounded = Math.round(value);
  if (rounded < KIOSK_INTERVAL_MIN_S) return KIOSK_INTERVAL_MIN_S;
  if (rounded > KIOSK_INTERVAL_MAX_S) return KIOSK_INTERVAL_MAX_S;
  return rounded;
}

export function parseKioskParams(search: string): KioskParams {
  const sp = new URLSearchParams(search);
  const rawIds = (sp.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => ID_PATTERN.test(id));
  const ids = Array.from(new Set(rawIds)).slice(0, KIOSK_MAX_DASHBOARDS);
  const rawInterval = sp.get('intervall');
  const intervalSec =
    rawInterval === null || rawInterval.trim() === ''
      ? KIOSK_INTERVAL_DEFAULT_S
      : clampKioskInterval(rawInterval);
  const rawTheme = sp.get('theme');
  const theme: KioskTheme | null =
    rawTheme === 'hell' ? 'light' : rawTheme === 'dunkel' ? 'dark' : null;
  return { ids, intervalSec, theme };
}

export function buildKioskUrl(params: {
  ids: readonly string[];
  intervalSec?: number;
  theme?: KioskTheme | null;
}): string {
  const sp = new URLSearchParams();
  const ids = Array.from(new Set(params.ids.filter((id) => ID_PATTERN.test(id)))).slice(
    0,
    KIOSK_MAX_DASHBOARDS,
  );
  if (ids.length > 0) sp.set('ids', ids.join(','));
  sp.set('intervall', String(clampKioskInterval(params.intervalSec ?? KIOSK_INTERVAL_DEFAULT_S)));
  if (params.theme) sp.set('theme', params.theme === 'light' ? 'hell' : 'dunkel');
  // Kommata lesbar lassen (URLSearchParams kodiert sie als %2C)
  return `${KIOSK_PATH}?${sp.toString().replace(/%2C/g, ',')}`;
}

/** Uhrzeit HH:MM (de-DE) eines ISO-Zeitpunkts; leer bei ungültigem Wert. */
export function formatKioskTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/** Rotationsliste: nur lesbare IDs in angefragter Reihenfolge; ohne Angabe das aktive Dashboard. */
export function resolveKioskRotation(
  requestedIds: readonly string[],
  readable: readonly { id: string }[],
  activeId: string | null,
): { ids: string[]; skipped: string[] } {
  const readableIds = new Set(readable.map((d) => d.id));
  if (requestedIds.length === 0) {
    const fallback = activeId && readableIds.has(activeId) ? activeId : readable[0]?.id;
    return { ids: fallback ? [fallback] : [], skipped: [] };
  }
  const ids = requestedIds.filter((id) => readableIds.has(id));
  const skipped = requestedIds.filter((id) => !readableIds.has(id));
  return { ids, skipped };
}
