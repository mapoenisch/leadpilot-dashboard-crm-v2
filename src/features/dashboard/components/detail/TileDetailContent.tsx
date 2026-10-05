// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Inhalt der Kachel-Details (Plan §3, §8).
// Titel, Definition, Wert, tatsächlicher Zeitraum, Quelle, Aktualität, Aufteilung/Verlauf und eine
// zugängliche Tabelle. Übersichten zeigen ihre Übersichtsdetails statt einer Kennzahlendefinition.
// Alle Werte stammen aus den übergebenen Kacheldaten; hier wird nichts berechnet.
import { useEffect, useRef, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { DASHBOARD_CATEGORIES, type ActiveCatalogEntry } from '../../model/dashboardCatalog';
import type { DashboardTileConfig } from '../../model/dashboardConfig';
import type { ResolvedTileData, TileData, TileDataState } from '../../data/dashboardData';
import { isChartView, type ChartLoaders, type ChartView } from '../charts/chartLoaders';
import { DashboardChart, NoData } from '../DashboardChart';
import { TileOverview } from '../TileOverview';
import { TileTable } from '../TileValue';
import { BLOCKING_STATES, blockingText, MUTED, TileNotices, TileStateBadge } from '../TileStatus';
import { formatAsOf, formatPeriod, formatTileValue, SOURCE_LABEL, timeLabel } from '../tileFormat';
import { CombinationDetails } from './CombinationDetails';
import { DETAIL_CARD, DETAIL_SECTION_TITLE } from './detailStyles';

const STATE_LABEL: Record<TileDataState, string> = {
  bereit: 'Aktuell',
  laden: 'Wird geladen',
  keine_daten: 'Keine Daten',
  fehler: 'Fehler beim Laden',
  offline: 'Live-Verbindung getrennt',
  veraltet: 'Veraltet',
  nicht_konfiguriert: 'Datenquelle nicht eingerichtet',
  nicht_verfuegbar: 'Nicht verfügbar',
  nicht_berechenbar: 'Nicht berechenbar',
};

const SCOPE_LABEL: Record<ResolvedTileData['scope'], string> = {
  stammdaten: 'Stammdaten des Unternehmens',
  organisation: 'Daten deiner Organisation',
  organisationsuebergreifend: 'Live-Feed für alle Organisationen',
};

export const UNAVAILABLE_TEXT =
  'Diese Kachel ist in dieser Version des Dashboards nicht verfügbar. Sie bleibt gespeichert.';

export interface TileDetailContentProps {
  tile: DashboardTileConfig;
  entry?: ActiveCatalogEntry;
  data: TileData;
  title: string;
  chartLoaders?: ChartLoaders;
}

function freshness(data: ResolvedTileData): string {
  if (data.asOf) return formatAsOf(data.asOf) ?? 'Zeitpunkt unbekannt';
  if (data.origin.layer === 'live') return 'Noch kein Messzeitpunkt empfangen';
  return `Fester Stand der Quelle (${data.timeBasis})`;
}

function period(data: ResolvedTileData): string {
  const base = timeLabel(data.timeBasis, data.asOf);
  const filter = data.effectiveFilter.period;
  return filter ? `${base} · Filter ${formatPeriod(filter)}` : base;
}

/**
 * Diagramm der Detailseite: die Darstellung der Kachel, wenn sie ein Diagramm ist, sonst die
 * Standard- bzw. erste erlaubte Diagrammdarstellung des Eintrags. Auch eine als Tabelle gespeicherte
 * Reihe zeigt in den Details ihren Verlauf bzw. ihre Aufteilung (Codex PR #61).
 */
export function detailChartView(
  tile: DashboardTileConfig,
  entry?: ActiveCatalogEntry,
): ChartView | null {
  if (isChartView(tile.view)) return tile.view;
  if (!entry) return null;
  if (isChartView(entry.defaultView)) return entry.defaultView;
  return entry.views.find(isChartView) ?? null;
}

function filterText(data: ResolvedTileData): string {
  const { pipeline, pipelineReason } = data.effectiveFilter;
  if (pipeline) return `Pipeline ${pipeline}`;
  return pipelineReason ?? 'Kein Filter';
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={MUTED}>{label}</dt>
      <dd className="m-0 mt-[2px] text-[14px] text-[var(--color-text-primary,#e6f3f1)] [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

export function TileDetailContent({
  tile,
  entry,
  data,
  title,
  chartLoaders,
}: TileDetailContentProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const resolved = data.state === 'nicht_verfuegbar' ? null : data;
  const isOverview = entry?.kind === 'uebersicht';
  const blocking = BLOCKING_STATES.has(data.state);
  const rows =
    resolved?.series ?? (resolved?.value != null ? [{ label: title, value: resolved.value }] : []);
  const chartView = detailChartView(tile, entry);
  const showChart = resolved?.state === 'bereit' && chartView && (resolved.series?.length ?? 0) > 0;
  const periodText = resolved ? period(resolved) : '';

  return (
    <Card variant="glass" className={DETAIL_CARD} data-testid="tile-detail" data-state={data.state}>
      <div className="flex flex-col gap-[20px]">
        <header className="flex flex-wrap items-start justify-between gap-[10px]">
          <div className="min-w-0">
            {entry ? (
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {DASHBOARD_CATEGORIES[entry.category]}
                {isOverview ? ' · Übersicht' : ''}
              </p>
            ) : null}
            <h2
              ref={headingRef}
              tabIndex={-1}
              data-testid="tile-detail-heading"
              className="m-0 mt-[4px] break-words text-[22px] font-semibold text-[var(--color-text-primary,#fff)] outline-none"
            >
              {title}
            </h2>
            {entry && !isOverview ? (
              <p
                className="m-0 mt-[6px] text-[14px] text-[var(--color-text-muted)]"
                data-testid="tile-detail-definition"
              >
                {entry.definition}
              </p>
            ) : null}
          </div>
          <TileStateBadge data={data} />
        </header>

        {resolved ? (
          <dl
            className="m-0 grid grid-cols-1 gap-[12px] md:grid-cols-2 lg:grid-cols-3"
            data-testid="tile-detail-facts"
          >
            {isOverview ? null : (
              <Fact label="Wert">
                <span className="font-mono text-primary" data-testid="tile-detail-value">
                  {resolved.state === 'bereit' || resolved.state === 'veraltet'
                    ? formatTileValue(resolved.value, resolved.unit, 'exakt')
                    : STATE_LABEL[resolved.state]}
                </span>
              </Fact>
            )}
            <Fact label="Zeitraum">{periodText}</Fact>
            <Fact label="Filter">{filterText(resolved)}</Fact>
            <Fact label="Quelle">
              {SOURCE_LABEL[resolved.origin.layer]} · {SCOPE_LABEL[resolved.scope]}
            </Fact>
            <Fact label="Aktualität">{freshness(resolved)}</Fact>
            <Fact label="Datenzustand">{STATE_LABEL[resolved.state]}</Fact>
          </dl>
        ) : null}

        {resolved ? <TileNotices data={resolved} /> : null}

        {data.state === 'laden' ? (
          <p role="status" className="m-0 min-h-[96px] text-[13px] text-[var(--color-text-muted)]">
            {title}: wird geladen …
          </p>
        ) : blocking ? (
          <p
            data-testid="tile-detail-blocked"
            className="m-0 text-[14px] text-[var(--color-text-muted)]"
          >
            {data.state === 'nicht_verfuegbar' ? UNAVAILABLE_TEXT : blockingText(data)}
          </p>
        ) : null}

        {resolved?.combination ? <CombinationDetails data={resolved} title={title} /> : null}

        {resolved && isOverview && !blocking && data.state !== 'laden' ? (
          <section aria-labelledby="detail-overview">
            <h3 id="detail-overview" className={DETAIL_SECTION_TITLE}>
              Übersicht
            </h3>
            <div className="mt-[8px]">
              {resolved.overview ? <TileOverview overview={resolved.overview} /> : <NoData />}
            </div>
          </section>
        ) : null}

        {showChart && chartView && resolved ? (
          <section aria-labelledby="detail-chart" className="min-w-0">
            <h3 id="detail-chart" className={DETAIL_SECTION_TITLE}>
              {entry?.shape === 'zeitreihe' ? 'Verlauf' : 'Aufteilung'}
            </h3>
            <div className="mt-[8px]">
              <DashboardChart
                view={chartView}
                entry={entry}
                data={resolved}
                title={title}
                period={periodText}
                idPrefix={`detail${tile.tileId}`.replace(/[^a-zA-Z0-9]/g, '')}
                onRetryChartLoad={() => window.location.reload()}
                loaders={chartLoaders}
              />
            </div>
          </section>
        ) : null}

        {resolved && !isOverview && !blocking && data.state !== 'laden' ? (
          <section aria-labelledby="detail-values" className={cn('min-w-0')}>
            <h3 id="detail-values" className={DETAIL_SECTION_TITLE}>
              Werte
            </h3>
            <div className="mt-[8px]" data-testid="tile-detail-table">
              {rows.length > 0 ? (
                <TileTable rows={rows} unit={resolved.unit} caption={`${title}, ${periodText}`} />
              ) : (
                <NoData />
              )}
            </div>
          </section>
        ) : null}
      </div>
    </Card>
  );
}
