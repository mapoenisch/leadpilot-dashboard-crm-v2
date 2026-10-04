// Executive Dashboard, Teilauftrag 4 (Auftrag 073): Datenzustand je Kachel (Plan §4).
// Verständliche Texte statt technischer Meldungen; „Keine Daten“ statt 0.
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { TileData } from '../data/dashboardData';
import { formatAsOf, NO_DATA } from './tileFormat';

const BADGE: Record<TileData['state'], { text: string; variant: BadgeVariant } | null> = {
  bereit: null,
  laden: { text: 'Lädt', variant: 'neutral' },
  keine_daten: { text: NO_DATA, variant: 'neutral' },
  fehler: { text: 'Fehler', variant: 'red' },
  offline: { text: 'Offline', variant: 'orange' },
  veraltet: { text: 'Veraltet', variant: 'orange' },
  nicht_konfiguriert: { text: 'Nicht eingerichtet', variant: 'neutral' },
  nicht_verfuegbar: { text: 'Nicht verfügbar', variant: 'neutral' },
};

export function TileStateBadge({ data }: { data: TileData }) {
  const badge = BADGE[data.state];
  const degraded = data.state !== 'nicht_verfuegbar' && data.quality === 'degradiert';
  if (!badge && !degraded) return null;
  return (
    <span className="flex shrink-0 flex-wrap gap-[6px]" data-testid="tile-state-badge">
      {badge ? (
        <Badge variant={badge.variant} size="sm">
          {badge.text}
        </Badge>
      ) : null}
      {degraded ? (
        <Badge variant="orange" size="sm">
          Eingeschränkt
        </Badge>
      ) : null}
    </span>
  );
}

/** Zustände ohne darstellbaren Inhalt: Text statt Kachelinhalt. */
export const BLOCKING_STATES: ReadonlySet<TileData['state']> = new Set([
  'keine_daten',
  'offline',
  'fehler',
  'nicht_konfiguriert',
  'nicht_verfuegbar',
]);

/** Text für blockierende Zustände. */
export function blockingText(data: TileData): string {
  switch (data.state) {
    case 'keine_daten':
      return NO_DATA;
    case 'fehler':
      return data.message ?? 'Die Daten konnten nicht geladen werden.';
    case 'offline':
      // Auftrag 071: `offline` heißt ohne letzten Wert; ein vorhandener Wert kommt als `veraltet`.
      return 'Live-Verbindung getrennt, noch kein Wert empfangen.';
    case 'nicht_konfiguriert':
      return 'Datenquelle nicht eingerichtet.';
    case 'nicht_verfuegbar':
      return data.message;
    default:
      return '';
  }
}

/** Hinweise, die über einem weiterhin sichtbaren Inhalt stehen (veraltet, degradiert). */
export function TileNotices({ data }: { data: TileData }) {
  if (data.state === 'nicht_verfuegbar') return null;
  const stand = data.asOf ? formatAsOf(data.asOf) : null;
  const notices: string[] = [];
  if (data.state === 'veraltet') {
    notices.push(`Wert veraltet. ${stand ?? 'Zeitpunkt unbekannt'}.`);
  }
  if (data.quality === 'degradiert') notices.push('Eingeschränkte Datenqualität laut Quelle.');
  if (notices.length === 0) return null;
  return (
    <div data-testid="tile-notice" className="flex flex-col gap-[2px] text-[12px] text-accent">
      {notices.map((text) => (
        <p key={text} className="m-0">
          {text}
        </p>
      ))}
    </div>
  );
}
