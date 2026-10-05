// Executive Dashboard, Teilauftrag 4 (Auftrag 073): einheitlicher Kachelrahmen (Plan §3, §4).
// Kopf mit Kategorie, Titel, Zeitraum/Stand, Quelle, Zeitbezug und Geltungsbereich; Inhalt über
// DashboardChart; Fußzeile mit „Details“. Die Kachel lädt keine Daten selbst, sie bekommt sie.
import { useEffect, useId, useRef, useState, type MutableRefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_CATEGORIES,
  type ActiveCatalogEntry,
  type DashboardView,
} from '../model/dashboardCatalog';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import type { TileData } from '../data/dashboardData';
import { ChartLoadingPlaceholder, OVERLAY } from './charts/ChartModuleBoundary';
import { ChartLayoutReserve } from './charts/ChartReadout';
import { isChartView, type ChartLoaders } from './charts/chartLoaders';
import { checkTileValues, DashboardChart, reserveFor, TableToggleReserve } from './DashboardChart';
import {
  BLOCKING_STATES,
  blockingText,
  CombinationFormula,
  InlineStateBadge,
  MUTED,
  TileNotices,
  TileStateBadge,
  TimeReference,
} from './TileStatus';
import { formatAsOf, NO_DATA, SOURCE_LABEL, timeLabel } from './tileFormat';

export interface DashboardTileProps {
  tile: DashboardTileConfig;
  /** Aktiver Katalogeintrag; fehlt er, werden keine Metadaten erfunden. */
  entry?: ActiveCatalogEntry;
  data: TileData;
  onShowDetails: (tileId: string) => void;
  /**
   * „Wiederholen“ nach einem fehlgeschlagenen Modulabruf. Standard: Seite neu laden, weil der
   * Browser den fehlgeschlagenen Abruf festhält (wie in der Testkachel). Teilauftrag 5 sichert
   * vorher die Arbeitskopie.
   */
  onRetryChartLoad?: () => void;
  /** Nur für Tests: Nachladefunktionen ersetzen. */
  chartLoaders?: ChartLoaders;
  /** Zentrale Filter: nur zur Anzeige einer abgelehnten Pipeline-Wahl im Zeitbezug. */
  dashboardFilters?: DashboardFilters;
  className?: string;
}

/**
 * Höhe ohne Diagramm: Laden, Hinweis und fertige Darstellung bleiben gleich hoch. Tabelle und
 * Übersicht haben eine feste Höhe und scrollen innerhalb der Kachel (Codex-Befund PR #57).
 */
const MIN_HEIGHT: Partial<Record<DashboardView, string>> = {
  zahl: 'min-h-[96px]',
  tabelle: 'h-[240px]',
  uebersicht: 'h-[240px]',
};
const SCROLLING_VIEWS: readonly DashboardView[] = ['tabelle', 'uebersicht'];

/** Live-Kacheln: feste Höhe für bis zu drei Hinweiszeilen; mehr scrollt. */
const NOTICE_SLOT_CLASS = 'h-[56px] overflow-y-auto';
const SCOPE_NOTICE =
  'Live-Feed, nicht nach Organisation getrennt: Die Werte gelten für alle Organisationen.';

/** Vorsilbe der Ansage, wenn der Text allein den Zustand nicht nennt. */
const STATE_PREFIX: Partial<Record<TileData['state'], string>> = {
  fehler: 'Fehler: ',
  nicht_berechenbar: 'Nicht berechenbar: ',
};

/** Bereite Daten, die als „Keine Daten“ erscheinen (z. B. leere Reihe): ansagen wie einen Zustand. */
function isDerivedEmpty(
  tile: DashboardTileConfig,
  entry: ActiveCatalogEntry | undefined,
  data: TileData,
  title: string,
): boolean {
  if (data.state !== 'bereit') return false;
  const check = checkTileValues(tile.view, entry, data, title);
  // Unpassende Kombination: sichtbar ist der Hinweis, nicht „Keine Daten“.
  if (check.kind === 'hinweis') return false;
  if (tile.view === 'uebersicht') return !data.overview;
  return check.kind === 'keine_daten';
}

export function DashboardTile({
  tile,
  entry,
  data,
  onShowDetails,
  onRetryChartLoad = () => window.location.reload(),
  chartLoaders,
  dashboardFilters,
  className,
}: DashboardTileProps) {
  const title = tile.title ?? entry?.name ?? tile.catalogId;
  // useId liefert Doppelpunkte, die in SVG-Referenzen (url(#…)) stören: nur Buchstaben und Ziffern.
  const idPrefix = `tile${useId()}${tile.tileId}`.replace(/[^a-zA-Z0-9]/g, '');
  const resolved = data.state === 'nicht_verfuegbar' ? null : data;
  const period = resolved ? timeLabel(resolved.timeBasis, resolved.asOf) : '';
  // Hatte der Ladeplatzhalter den Fokus, übernimmt ihn nach dem Datenempfang der Inhaltsbereich,
  // statt auf den Seitenanfang zurückzufallen (Codex-Befund PR #57).
  const bodyRef = useRef<HTMLDivElement>(null);
  const loadingHadFocus = useRef(false);
  useEffect(() => {
    if (data.state === 'laden' || !loadingHadFocus.current) return;
    loadingHadFocus.current = false;
    bodyRef.current?.focus();
  }, [data.state]);
  // Auch nicht blockierende Wechsel ansagen: ein sichtbarer, aber veralteter Wert (Codex-Befund).
  const stand = resolved?.asOf ? formatAsOf(resolved.asOf) : null;
  // Rückkehr von „veraltet“ oder „eingeschränkt“ zu normalen Daten ansagen (Codex-Befund).
  const warned = data.state === 'veraltet' || resolved?.quality === 'degradiert';
  const wasWarned = useRef(false);
  const [recovered, setRecovered] = useState(false);
  useEffect(() => {
    if (warned) {
      wasWarned.current = true;
      setRecovered(false);
    } else if (wasWarned.current && data.state === 'bereit') {
      wasWarned.current = false;
      setRecovered(true);
    } else if (data.state !== 'bereit') {
      setRecovered(false);
    }
  }, [warned, data.state]);
  const liveText = BLOCKING_STATES.has(data.state)
    ? `${STATE_PREFIX[data.state] ?? ''}${blockingText(data)}`
    : warned
      ? // Beide Warnungen zusammen (veraltet und eingeschränkt) in einer Meldung.
        [
          data.state === 'veraltet' ? `Wert veraltet. ${stand ?? 'Zeitpunkt unbekannt'}.` : '',
          resolved?.quality === 'degradiert' ? 'Datenqualität eingeschränkt.' : '',
        ]
          .filter(Boolean)
          .join(' ')
      : isDerivedEmpty(tile, entry, data, title)
        ? NO_DATA
        : recovered
          ? 'Wert wieder aktuell.'
          : '';

  return (
    <Card
      variant="glass"
      aria-label={`Kachel: ${title}`}
      data-testid="dashboard-tile"
      data-size={tile.size}
      data-view={tile.view}
      data-state={data.state}
      className={cn('w-full min-w-0 motion-reduce:transition-none', className)}
    >
      <div className="flex flex-col gap-[12px]">
        <header className="flex flex-wrap items-start justify-between gap-[10px]">
          <div className="min-w-0">
            {entry ? (
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {DASHBOARD_CATEGORIES[entry.category]}
              </p>
            ) : null}
            <h3 className="m-0 mt-[4px] break-words text-[17px] font-semibold text-[var(--color-text-primary,#fff)]">
              {title}
            </h3>
            {resolved ? (
              <p className={cn(MUTED, 'mt-[4px]')} data-testid="tile-meta">
                {period}
                {resolved.origin.layer === 'live' && !resolved.asOf ? (
                  // Reserviert den Umbruch des späteren „Stand …“, damit der Kopf nicht springt.
                  <span aria-hidden="true" className="invisible" data-testid="tile-stand-reserve">
                    {' · Stand 00.00.0000, 00:00'}
                  </span>
                ) : null}{' '}
                · Quelle: {SOURCE_LABEL[resolved.origin.layer]}
              </p>
            ) : null}
            <CombinationFormula entry={entry} />
            <TimeReference tile={tile} data={resolved} dashboardFilters={dashboardFilters} />
          </div>
          <TileStateBadge data={data} />
        </header>

        {resolved?.scope === 'organisationsuebergreifend' ? (
          <p data-testid="tile-scope-notice" className="m-0 text-[12px] text-accent">
            {SCOPE_NOTICE}
          </p>
        ) : null}
        {/* Live-Hinweise (veraltet, eingeschränkt) erscheinen nach dem Laden: zwei Zeilen reservieren. */}
        <div
          data-testid="tile-notice-slot"
          {...(resolved?.origin.layer === 'live'
            ? {
                className: NOTICE_SLOT_CLASS,
                // Überläuft der Platz (beide Hinweise in einer schmalen Kachel): per Tastatur scrollbar.
                ...(warned
                  ? { role: 'region', tabIndex: 0, 'aria-label': 'Hinweise zur Datenqualität' }
                  : {}),
              }
            : {})}
        >
          <TileNotices data={data} />
        </div>

        {/* Bleibt bestehen: Zustandswechsel (z. B. Laden → Fehler) werden vorgelesen. */}
        <p role="status" className="sr-only" data-testid="tile-live-status">
          {liveText}
        </p>
        <div
          ref={bodyRef}
          tabIndex={-1}
          className="min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="tile-body"
        >
          <TileBody
            loadingHadFocus={loadingHadFocus}
            tile={tile}
            entry={entry}
            data={data}
            title={title}
            period={period}
            idPrefix={idPrefix}
            onRetryChartLoad={onRetryChartLoad}
            chartLoaders={chartLoaders}
          />
        </div>

        <footer className="flex justify-end border-0 border-t border-solid border-border pt-[10px]">
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Details zu ${title}`}
            onClick={() => onShowDetails(tile.tileId)}
          >
            Details
          </Button>
        </footer>
      </div>
    </Card>
  );
}

function TileBody({
  loadingHadFocus,
  tile,
  entry,
  data,
  title,
  period,
  idPrefix,
  onRetryChartLoad,
  chartLoaders,
}: {
  loadingHadFocus: MutableRefObject<boolean>;
  tile: DashboardTileConfig;
  entry?: ActiveCatalogEntry;
  data: TileData;
  title: string;
  period: string;
  idPrefix: string;
  onRetryChartLoad: () => void;
  chartLoaders?: ChartLoaders;
}) {
  const chartView = isChartView(tile.view) ? tile.view : null;
  const caption = `${title}, ${period || 'Zeitraum unbekannt'}`;

  if (data.state === 'laden') {
    if (chartView) {
      return (
        <>
          <ChartLoadingPlaceholder
            label={caption}
            reserve={reserveFor(chartView, [])}
            hadFocus={loadingHadFocus}
          />
          <TableToggleReserve />
        </>
      );
    }
    return (
      <div
        role="status"
        tabIndex={0}
        aria-label={`${caption}: wird geladen`}
        onFocus={() => {
          loadingHadFocus.current = true;
        }}
        onBlur={(event) => {
          // Beim Entfernen aus dem DOM (Daten da) bleibt die Markierung für die Fokusübergabe.
          if (event.currentTarget.isConnected) loadingHadFocus.current = false;
        }}
        className={cn(
          'flex items-center rounded-md text-[13px] text-[var(--color-text-muted)] outline-none focus-visible:ring-2 focus-visible:ring-primary',
          MIN_HEIGHT[tile.view],
        )}
      >
        {title}: wird geladen …
      </div>
    );
  }

  if (BLOCKING_STATES.has(data.state)) {
    const text = blockingText(data);
    const testId = data.state === 'keine_daten' ? 'tile-no-data' : 'tile-blocked';
    if (chartView) {
      return (
        <div className="relative">
          <ChartLayoutReserve {...reserveFor(chartView, [])} />
          <TableToggleReserve />
          <div className={cn(OVERLAY, 'items-start')}>
            <InlineStateBadge data={data} />
            <p data-testid={testId} className="m-0 text-[13px] text-[var(--color-text-muted)]">
              {text}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div
        className={cn('flex flex-col items-start justify-center gap-[6px]', MIN_HEIGHT[tile.view])}
      >
        <InlineStateBadge data={data} />
        <p data-testid={testId} className="m-0 text-[13px] text-[var(--color-text-muted)]">
          {text}
        </p>
      </div>
    );
  }

  if (data.state === 'nicht_verfuegbar') return null;
  if (SCROLLING_VIEWS.includes(tile.view)) {
    return (
      <div
        role="region"
        aria-label={`${caption}, scrollbar`}
        tabIndex={0}
        className={cn(
          'overflow-y-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary',
          MIN_HEIGHT[tile.view],
        )}
      >
        <DashboardChart
          view={tile.view}
          entry={entry}
          data={data}
          title={title}
          period={period}
          idPrefix={idPrefix}
          onRetryChartLoad={onRetryChartLoad}
          loaders={chartLoaders}
        />
      </div>
    );
  }
  return (
    <div className={MIN_HEIGHT[tile.view]}>
      <DashboardChart
        view={tile.view}
        entry={entry}
        data={data}
        title={title}
        period={period}
        idPrefix={idPrefix}
        onRetryChartLoad={onRetryChartLoad}
        loaders={chartLoaders}
      />
    </div>
  );
}
