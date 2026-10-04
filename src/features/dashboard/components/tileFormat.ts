// Executive Dashboard, Teilauftrag 4 (Auftrag 073): Formatierung der Kachelwerte und Kopfzeilen.
// Fehlende Werte heißen „Keine Daten“, nie 0 (Plan §4). Keine erfundenen Zeiträume.
import type { SourceLayer } from '../model/dashboardCatalog';
import type { DashboardPeriod, TileFilterMode } from '../model/dashboardConfig';

export const NO_DATA = 'Keine Daten';

const exact = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const millions = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

/**
 * Wert mit Einheit. `kompakt` (Zahlansicht) kürzt EUR ab 1 Mio.; Tabelle, Tooltip und
 * zugänglicher Text nutzen `exakt`.
 */
export function formatTileValue(
  value: number | null,
  unit: string,
  mode: 'kompakt' | 'exakt',
): string {
  if (value === null || !Number.isFinite(value)) return NO_DATA;
  if (unit === 'x') return `${oneDecimal.format(value)}x`;
  if (unit === '%') return `${oneDecimal.format(value)} %`;
  if (unit === 'EUR' && mode === 'kompakt' && Math.abs(value) >= 1_000_000) {
    return `${millions.format(value / 1_000_000)} Mio. EUR`;
  }
  const number = exact.format(value);
  return unit ? `${number} ${unit}` : number;
}

const asOfFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
});

/** Messzeitpunkt als „Stand TT.MM.JJJJ, HH:MM“ (deutsche Zeit); ungültig → null. */
export function formatAsOf(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Stand ${asOfFormat.format(date)}`;
}

/** Zeitbasis aus dem Katalog, bei Live zusätzlich der Messzeitpunkt. */
export function timeLabel(timeBasis: string, asOf: string | null): string {
  const stand = asOf ? formatAsOf(asOf) : null;
  return stand ? `${timeBasis} · ${stand}` : timeBasis;
}

const day = (iso: string) => {
  const [year, month, date] = iso.split('-');
  return year && month && date ? `${date}.${month}.${year}` : iso;
};

export function formatPeriod(period: DashboardPeriod): string {
  return `${day(period.from)} – ${day(period.to)}`;
}

export const SOURCE_LABEL: Record<SourceLayer, string> = {
  baseline: 'Stammdaten',
  crm: 'CRM',
  live: 'Live',
};

const FILTER_MODE_LABEL: Record<TileFilterMode, string> = {
  dashboard: 'Dashboard-Filter',
  eigener_zeitraum: 'Eigener Zeitraum',
  fester_stand: 'Fester historischer Stand',
};

export function filterModeLabel(mode: TileFilterMode): string {
  return FILTER_MODE_LABEL[mode];
}
