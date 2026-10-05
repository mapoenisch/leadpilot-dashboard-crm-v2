// Executive Dashboard, Teilauftrag 4 (Auftrag 073): Datenzustand je Kachel (Plan §4).
// Verständliche Texte statt technischer Meldungen; „Keine Daten“ statt 0.
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData, TileData } from '../data/dashboardData';
import { filterModeLabel, formatAsOf, formatPeriod, NO_DATA } from './tileFormat';

/** Gedämpfter Kleintext der Kachel. */
export const MUTED = 'm-0 text-[12px] text-[var(--color-text-muted)]';
/** Lange Namen ohne Leerzeichen (Pipeline) brechen um, statt die Kachel zu verbreitern. */
const BREAK = '[overflow-wrap:anywhere]';

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
      // Resolvermeldungen nennen interne Exporte und Felder: nie in der Kachel zeigen.
      return 'Die Daten konnten nicht geladen werden.';
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

/** Zeitbezug je Kachel (Plan §4, „Filter“) samt wirksamem Zeitraum, Pipeline und Hinweisen. */
export function TimeReference({
  tile,
  data,
  dashboardFilters,
}: {
  tile: DashboardTileConfig;
  data: ResolvedTileData | null;
  dashboardFilters?: DashboardFilters;
}) {
  const filter = data?.effectiveFilter;
  const parts = [`Zeitbezug: ${filterModeLabel(filter?.mode ?? tile.filterMode)}`];
  if (filter?.period) parts.push(formatPeriod(filter.period));
  // Der Resolver setzt einen nicht wirksamen eigenen Zeitraum auf null; die Wahl bleibt sichtbar.
  else if ((filter?.mode ?? tile.filterMode) === 'eigener_zeitraum' && tile.period) {
    parts.push(`gewählt: ${formatPeriod(tile.period)}`);
  } else if ((filter?.mode ?? tile.filterMode) === 'dashboard' && dashboardFilters?.period) {
    // Der zentrale Zeitraum wird von allen derzeitigen Quellen abgelehnt; die Wahl bleibt sichtbar.
    parts.push(`gewählt: ${formatPeriod(dashboardFilters.period)}`);
  }
  if (filter?.pipeline) parts.push(`Pipeline: ${filter.pipeline}`);
  // Der Resolver setzt eine nicht wirksame Pipeline auf null; die gewählte bleibt sichtbar.
  else if (filter?.pipelineReason) {
    const requested = tile.pipeline ?? dashboardFilters?.pipeline;
    if (requested) parts.push(`Pipeline gewählt: ${requested}`);
  }
  const reasons = [filter?.periodReason, filter?.pipelineReason].filter(
    (reason): reason is string => Boolean(reason),
  );
  return (
    <div data-testid="tile-time-reference">
      <p className={cn(MUTED, BREAK)}>{parts.join(' · ')}</p>
      {reasons.map((reason) => (
        <p key={reason} className={cn(MUTED, BREAK, 'italic')}>
          {reason}
        </p>
      ))}
    </div>
  );
}
