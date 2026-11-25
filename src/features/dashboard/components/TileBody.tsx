// Executive Dashboard (Auftrag 073 & 161): Inhaltsbereich einer Kachel.
// Rendert Ladeplatzhalter, Fehler/Hinweise, Zeitpunkt-Hinweise oder das fertige Diagramm.
import type { MutableRefObject } from 'react';
import { cn } from '@/lib/utils';
import type { ActiveCatalogEntry, DashboardView } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { TileData } from '../data/dashboardData';
import { ChartLoadingPlaceholder, OVERLAY } from './charts/ChartModuleBoundary';
import { ChartLayoutReserve } from './charts/ChartReadout';
import { isChartView, type ChartLoaders } from './charts/chartLoaders';
import { DashboardChart, reserveFor, TableToggleReserve } from './DashboardChart';
import { BLOCKING_STATES, blockingText, InlineStateBadge } from './TileStatus';
import { readTileStand } from '../time/useTimeControlledData';
import { useTileFit } from './tileFit';

export const MIN_HEIGHT: Partial<Record<DashboardView, string>> = {
  zahl: 'min-h-[48px]',
  tabelle: 'h-[240px]',
  uebersicht: 'h-[240px]',
};

const SCROLLING_VIEWS: readonly DashboardView[] = ['tabelle', 'uebersicht'];

const berlinDateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
});

function formatBerlinDateTime(iso: string | null): string {
  if (!iso) return 'gewählten Zeitpunkt';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : berlinDateTimeFormatter.format(d);
}

export interface TileBodyProps {
  loadingHadFocus: MutableRefObject<boolean>;
  tile: DashboardTileConfig;
  entry?: ActiveCatalogEntry;
  data: TileData;
  title: string;
  period: string;
  idPrefix: string;
  onRetryChartLoad: () => void;
  chartLoaders?: ChartLoaders;
}

export function TileBody({
  loadingHadFocus,
  tile,
  entry,
  data,
  title,
  period,
  idPrefix,
  onRetryChartLoad,
  chartLoaders,
}: TileBodyProps) {
  // Auftrag 174b (K2): eingepasst gibt es keine feste Höhe mit eigenem Scrollbereich.
  const fit = useTileFit();
  const heightClass =
    fit && SCROLLING_VIEWS.includes(tile.view) ? undefined : MIN_HEIGHT[tile.view];
  const chartView = isChartView(tile.view) ? tile.view : null;
  const caption = `${title}, ${period || 'Zeitraum unbekannt'}`;
  const stand = readTileStand(data);

  // Auftrag 161 (2.1 Nr. 2): Kacheln mit puffer oder keine zeigen im Modus zeitpunkt keinen Wert
  if (
    stand?.mode === 'zeitpunkt' &&
    entry &&
    (entry.history.kind === 'puffer' || entry.history.kind === 'keine')
  ) {
    const hint = `Für ${formatBerlinDateTime(stand.analysisAt)} ist kein Stand gespeichert.`;
    return (
      <div className={cn('flex flex-col items-start justify-center gap-[6px]', heightClass)}>
        <p data-testid="tile-no-data" className="m-0 text-[13px] text-[var(--color-text-muted)]">
          {hint}
        </p>
      </div>
    );
  }

  if (data.state === 'laden') {
    if (chartView) {
      return (
        <>
          <ChartLoadingPlaceholder
            // Auftrag 174b (K3): eingepasst ohne den langen Zeitbezug im sichtbaren Ladehinweis.
            label={fit ? title : caption}
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
          if (event.currentTarget.isConnected) loadingHadFocus.current = false;
        }}
        className={cn(
          'flex items-center rounded-md text-[13px] text-[var(--color-text-muted)] outline-none focus-visible:ring-2 focus-visible:ring-primary',
          heightClass,
        )}
      >
        {title}: wird geladen …
      </div>
    );
  }

  if (BLOCKING_STATES.has(data.state)) {
    const text = blockingText(data);
    const testId = data.state === 'keine_daten' ? 'tile-no-data' : 'tile-blocked';
    const blockedContent = (
      <>
        <InlineStateBadge data={data} />
        <p data-testid={testId} className="m-0 text-[13px] text-[var(--color-text-muted)]">
          {text}
        </p>
      </>
    );
    if (chartView) {
      return (
        <div className="relative">
          <ChartLayoutReserve {...reserveFor(chartView, [])} />
          <TableToggleReserve />
          <div className={cn(OVERLAY, 'items-start')}>{blockedContent}</div>
        </div>
      );
    }
    return (
      <div className={cn('flex flex-col items-start justify-center gap-[6px]', heightClass)}>
        {blockedContent}
      </div>
    );
  }

  if (data.state === 'nicht_verfuegbar') return null;
  const chartElement = (
    <DashboardChart
      view={tile.view}
      entry={entry}
      data={data}
      title={title}
      period={period}
      idPrefix={idPrefix}
      tileId={tile.tileId}
      onRetryChartLoad={onRetryChartLoad}
      loaders={chartLoaders}
    />
  );
  if (!fit && SCROLLING_VIEWS.includes(tile.view)) {
    return (
      <div
        role="region"
        aria-label={`${caption}, scrollbar`}
        tabIndex={0}
        className={cn(
          'overflow-y-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary',
          heightClass,
        )}
      >
        {chartElement}
      </div>
    );
  }
  return <div className={heightClass}>{chartElement}</div>;
}
