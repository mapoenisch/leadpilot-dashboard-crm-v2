// Executive Dashboard, Teilauftrag 4 (Auftrag 073): einheitlicher Kachelrahmen (Plan §3, §4).
// Kopf mit Kategorie, Titel, Zeitraum/Stand, Quelle, Zeitbezug und Geltungsbereich; Inhalt über
// DashboardChart; Fußzeile mit „Details“. Die Kachel lädt keine Daten selbst, sie bekommt sie.
import { useEffect, useId, useRef, type MutableRefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_CATEGORIES,
  type ActiveCatalogEntry,
  type DashboardView,
} from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData, TileData } from '../data/dashboardData';
import { ChartLoadingPlaceholder, OVERLAY } from './charts/ChartModuleBoundary';
import { ChartLayoutReserve } from './charts/ChartReadout';
import { isChartView, type ChartLoaders } from './charts/chartLoaders';
import { DashboardChart, reserveFor, TableToggleReserve } from './DashboardChart';
import { BLOCKING_STATES, blockingText, TileNotices, TileStateBadge } from './TileStatus';
import { filterModeLabel, formatAsOf, formatPeriod, SOURCE_LABEL, timeLabel } from './tileFormat';

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

const MUTED = 'm-0 text-[12px] text-[var(--color-text-muted)]';
const SCOPE_NOTICE =
  'Live-Feed, nicht nach Organisation getrennt: Die Werte gelten für alle Organisationen.';

export function DashboardTile({
  tile,
  entry,
  data,
  onShowDetails,
  onRetryChartLoad = () => window.location.reload(),
  chartLoaders,
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
  const liveText = BLOCKING_STATES.has(data.state)
    ? `${data.state === 'fehler' ? 'Fehler: ' : ''}${blockingText(data)}`
    : data.state === 'veraltet'
      ? `Wert veraltet. ${stand ?? 'Zeitpunkt unbekannt'}.`
      : resolved?.quality === 'degradiert'
        ? 'Datenqualität eingeschränkt.'
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
                {period} · Quelle: {SOURCE_LABEL[resolved.origin.layer]}
              </p>
            ) : null}
            <TimeReference tile={tile} data={resolved} />
          </div>
          <TileStateBadge data={data} />
        </header>

        {resolved?.scope === 'organisationsuebergreifend' ? (
          <p data-testid="tile-scope-notice" className="m-0 text-[12px] text-accent">
            {SCOPE_NOTICE}
          </p>
        ) : null}
        <TileNotices data={data} />

        {/* Bleibt bestehen: Zustandswechsel (z. B. Laden → Fehler) werden vorgelesen. */}
        <p role="status" className="sr-only" data-testid="tile-live-status">
          {liveText}
        </p>
        <div
          ref={bodyRef}
          tabIndex={-1}
          className="min-w-0 rounded-md outline-none"
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

/** Zeitbezug je Kachel (Plan §4, „Filter“) samt wirksamem Zeitraum, Pipeline und Hinweisen. */
function TimeReference({
  tile,
  data,
}: {
  tile: DashboardTileConfig;
  data: ResolvedTileData | null;
}) {
  const filter = data?.effectiveFilter;
  const parts = [`Zeitbezug: ${filterModeLabel(filter?.mode ?? tile.filterMode)}`];
  if (filter?.period) parts.push(formatPeriod(filter.period));
  // Der Resolver setzt einen nicht wirksamen eigenen Zeitraum auf null; die Wahl bleibt sichtbar.
  else if ((filter?.mode ?? tile.filterMode) === 'eigener_zeitraum' && tile.period) {
    parts.push(`gewählt: ${formatPeriod(tile.period)}`);
  }
  if (filter?.pipeline) parts.push(`Pipeline: ${filter.pipeline}`);
  const reasons = [filter?.periodReason, filter?.pipelineReason].filter(
    (reason): reason is string => Boolean(reason),
  );
  return (
    <div data-testid="tile-time-reference">
      <p className={MUTED}>{parts.join(' · ')}</p>
      {reasons.map((reason) => (
        <p key={reason} className={cn(MUTED, 'italic')}>
          {reason}
        </p>
      ))}
    </div>
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
          <p
            data-testid={testId}
            className={cn(OVERLAY, 'm-0 text-[13px] text-[var(--color-text-muted)]')}
          >
            {text}
          </p>
        </div>
      );
    }
    return (
      <p
        data-testid={testId}
        className={cn(
          'm-0 flex items-center text-[13px] text-[var(--color-text-muted)]',
          MIN_HEIGHT[tile.view],
        )}
      >
        {text}
      </p>
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
