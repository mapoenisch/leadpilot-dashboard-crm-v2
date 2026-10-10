// Executive Dashboard, Teilauftrag 4 (Auftrag 073): wählt die Darstellung einer Kachel und prüft
// vorher, ob die Werte dafür taugen (Plan §4). Nichts wirft: ungeeignete Werte ergeben einen
// erklärten Zustand mit Tabelle. Diagrammmodule werden je Darstellung nachgeladen (Plan §5).
import { Suspense, useMemo, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ActiveCatalogEntry, DashboardView } from '../model/dashboardCatalog';
import type { ResolvedTileData } from '../data/dashboardData';
import {
  ChartLoadingPlaceholder,
  ChartModuleBoundary,
  FocusAfterLoad,
  type ChartReserveSpec,
} from './charts/ChartModuleBoundary';
import {
  DEFAULT_CHART_LOADERS,
  isChartView,
  lazyChart,
  type ChartLoaders,
  type ChartView,
} from './charts/chartLoaders';
import { ChartLayoutReserve } from './charts/ChartReadout';
import type { DatumInput } from './charts/depthGeometry';
import { TileNumber, TileTable } from './TileValue';
import { TileOverview } from './TileOverview';
import { formatTileValue, NO_DATA } from './tileFormat';

export interface DashboardChartProps {
  view: DashboardView;
  entry?: ActiveCatalogEntry;
  data: ResolvedTileData;
  title: string;
  /** Zeitraum/Stand für Tooltip und zugängliche Texte. */
  period: string;
  /** Eindeutig je Kachel: SVG-Verläufe und Filter dürfen sich nicht gegenseitig beeinflussen. */
  idPrefix: string;
  onRetryChartLoad: () => void;
  /** Nur für Tests: Nachladefunktionen ersetzen. */
  loaders?: ChartLoaders;
}

/** Bedienelemente unter dem Diagramm; Lade- und Fehlerzustand bauen sie für die Endhöhe nach. */
export function reserveFor(view: ChartView, labels: readonly string[]): ChartReserveSpec {
  return {
    labels,
    stableLegend: true,
    controls:
      view === 'linie' || view === 'flaeche'
        ? 'slider'
        : view === 'kreis' || view === 'ring'
          ? 'legend-dots'
          : 'legend',
  };
}

type Check =
  | { kind: 'ok'; rows: readonly DatumInput[] }
  | { kind: 'keine_daten' }
  | { kind: 'hinweis'; text: string; rows: readonly DatumInput[] };

const SERIES_VIEWS: readonly DashboardView[] = [
  'saeulen',
  'balken',
  'kreis',
  'ring',
  'linie',
  'flaeche',
];

/** Prüft die Werte für die gewählte Darstellung. */
export function checkTileValues(
  view: DashboardView,
  entry: ActiveCatalogEntry | undefined,
  data: ResolvedTileData,
  title: string,
): Check {
  const series = data.series ?? [];
  if (series.some((row) => !Number.isFinite(row.value))) return { kind: 'keine_daten' };
  if (entry && !entry.views.includes(view)) {
    return {
      kind: 'hinweis',
      text: 'Diese Darstellung passt nicht zu dieser Kennzahl.',
      rows: series.length > 0 ? series : valueRow(data, title),
    };
  }
  if (view === 'zahl') {
    const rows = valueRow(data, title);
    return rows.length > 0 ? { kind: 'ok', rows } : { kind: 'keine_daten' };
  }
  if (view === 'tabelle') {
    const rows = series.length > 0 ? series : valueRow(data, title);
    return rows.length > 0 ? { kind: 'ok', rows } : { kind: 'keine_daten' };
  }
  if (!SERIES_VIEWS.includes(view)) return { kind: 'ok', rows: [] };
  if (series.length === 0) return { kind: 'keine_daten' };
  const negative = series.some((row) => row.value < 0);
  if (view === 'kreis' || view === 'ring') {
    const total = series.reduce((sum, row) => sum + row.value, 0);
    if (negative || total <= 0) {
      return { kind: 'hinweis', text: 'Nicht als Anteil darstellbar.', rows: series };
    }
  }
  if ((view === 'linie' || view === 'flaeche') && negative) {
    return {
      kind: 'hinweis',
      text: 'Verlauf mit negativen Werten wird als Tabelle gezeigt.',
      rows: series,
    };
  }
  return { kind: 'ok', rows: series };
}

function valueRow(data: ResolvedTileData, title: string): DatumInput[] {
  return data.value !== null && Number.isFinite(data.value)
    ? [{ label: title, value: data.value }]
    : [];
}

export function NoData() {
  return (
    <p data-testid="tile-no-data" className="m-0 text-[13px] text-[var(--color-text-muted)]">
      {NO_DATA}
    </p>
  );
}

export function DashboardChart(props: DashboardChartProps) {
  const { view, entry, data, title, period } = props;
  const check = checkTileValues(view, entry, data, title);
  const caption = `${title}, ${period}`;

  // Unzulässige gespeicherte Kombination zuerst erklären, auch bei der Übersicht.
  if (view === 'uebersicht' && check.kind !== 'hinweis') {
    return data.overview ? <TileOverview overview={data.overview} /> : <NoData />;
  }
  const chartView = isChartView(view) ? view : null;
  if (check.kind === 'keine_daten') {
    return chartView ? (
      <ChartFrame view={chartView}>
        <NoData />
      </ChartFrame>
    ) : (
      <NoData />
    );
  }
  if (check.kind === 'hinweis') {
    const hint = (
      <div className="flex flex-col gap-[10px]">
        <p data-testid="tile-chart-hint" className="m-0 text-[13px] text-accent">
          {check.text}
        </p>
        <TileTable rows={check.rows} unit={data.unit} caption={caption} />
      </div>
    );
    return chartView ? (
      <ChartFrame view={chartView} label={`${caption}, scrollbar`}>
        {hint}
      </ChartFrame>
    ) : view === 'zahl' ? (
      // Zahlkachel: der Hinweis bleibt in der reservierten Ladehöhe (96 px), der Rest scrollt.
      <div
        role="region"
        aria-label={`${caption}, Hinweis, scrollbar`}
        tabIndex={0}
        data-testid="tile-hint-scroll"
        className="max-h-[96px] overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {hint}
      </div>
    ) : (
      hint
    );
  }
  if (view === 'zahl' && check.rows[0]) {
    return (
      <TileNumber value={check.rows[0].value} unit={data.unit} comparison={entry?.comparison} />
    );
  }
  if (!isChartView(view)) {
    return <TileTable rows={check.rows} unit={data.unit} caption={caption} />;
  }
  return <LazyChart {...props} view={view} rows={check.rows} caption={caption} />;
}

/** Platz der Zeile „Werte als Tabelle“ unter jedem Diagramm: Laden und fertig sind gleich hoch. */
export function TableToggleReserve() {
  return (
    <details aria-hidden="true" className="invisible mt-[10px] text-[12px]">
      <summary tabIndex={-1}>Werte als Tabelle</summary>
    </details>
  );
}

/**
 * Hinweise und „Keine Daten“ einer Diagrammkachel stehen in derselben Höhe wie das Diagramm
 * (Gerüst plus Tabellenzeile), damit die Kachel beim Ladeabschluss nicht springt. Längere Inhalte
 * scrollen innerhalb dieser Fläche (Codex-Befund PR #57).
 */
export function ChartFrame({
  view,
  label,
  children,
}: {
  view: ChartView;
  /** Mit Beschriftung wird die Fläche ein fokussierbarer Scrollbereich. */
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative" data-testid="tile-chart-frame">
      <ChartLayoutReserve {...reserveFor(view, [])} />
      <TableToggleReserve />
      <div
        role={label ? 'region' : undefined}
        aria-label={label}
        tabIndex={label ? 0 : undefined}
        className="absolute inset-0 flex flex-col overflow-y-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="my-auto">{children}</div>
      </div>
    </div>
  );
}

function LazyChart({
  view,
  rows,
  caption,
  data,
  title,
  period,
  idPrefix,
  onRetryChartLoad,
  loaders = DEFAULT_CHART_LOADERS,
}: DashboardChartProps & { view: ChartView; rows: readonly DatumInput[]; caption: string }) {
  const reducedMotion = useReducedMotion();
  const unit = data.unit;
  const formatValue = useMemo(
    () => (value: number) => formatTileValue(value, unit, 'exakt'),
    [unit],
  );
  const slotRef = useRef<HTMLDivElement>(null);
  const placeholderHadFocus = useRef(false);
  const Chart = useMemo(() => lazyChart(loaders, view), [loaders, view]);
  const reserve = reserveFor(
    view,
    rows.map((row) => row.label),
  );
  return (
    <>
      <ChartModuleBoundary
        key={view}
        onRetry={onRetryChartLoad}
        placeholderHadFocus={placeholderHadFocus}
        reserve={reserve}
      >
        <Suspense
          fallback={
            <ChartLoadingPlaceholder
              label={caption}
              reserve={reserve}
              hadFocus={placeholderHadFocus}
            />
          }
        >
          <FocusAfterLoad placeholderHadFocus={placeholderHadFocus} target={slotRef} />
          <div
            ref={slotRef}
            tabIndex={-1}
            role="group"
            aria-label={caption}
            data-testid="tile-chart"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Chart
              idPrefix={idPrefix}
              data={rows}
              unit={data.unit}
              period={period}
              title={title}
              reducedMotion={reducedMotion}
              orientation={view === 'balken' ? 'horizontal' : 'vertical'}
              solid={view === 'kreis'}
              formatValue={formatValue}
              stableLegend
            />
          </div>
        </Suspense>
      </ChartModuleBoundary>
      {/* Außerhalb der Fehlergrenze: Fällt die Grafik aus, bleibt die Datenalternative. */}
      <details className="mt-[10px] text-[12px] text-[var(--color-text-muted)]">
        <summary className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Werte als Tabelle
        </summary>
        <div className="mt-[8px]">
          <TileTable rows={rows} unit={data.unit} caption={caption} />
        </div>
      </details>
    </>
  );
}
