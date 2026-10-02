// Designprobe Dashboard-Testkachel (Teilauftrag 0, Auftrag ANTIGRAVITY_AUFTRAG_DASHBOARD_TESTKACHEL.md).
// Eine isolierte, bedienbare Kachel mit umschaltbarer Darstellung und Größe auf festen Beispieldaten.
// Keine Abfragen, keine Speicherung, kein Katalog. Diagrammmodule werden je Darstellung nachgeladen.
import React, { Suspense, useId, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { ChartModuleBoundary } from './ChartModuleBoundary';
import type { DepthChartProps } from './charts/chartTypes';
import { formatDe } from './charts/depthGeometry';
import type { DatumInput } from './charts/depthGeometry';
import {
  SAMPLE_NOTICE,
  SAMPLE_PERIOD,
  SAMPLE_SERIES,
  SAMPLE_SERIES_PERIOD,
  SAMPLE_SHARES,
  SAMPLE_SHARE_UNIT,
  SAMPLE_STAGES,
  SAMPLE_STAND,
  SAMPLE_UNIT,
} from './previewSampleData';

export type PreviewView =
  'zahl' | 'tabelle' | 'saeulen' | 'balken' | 'kreis' | 'ring' | 'linie' | 'flaeche';
export type PreviewSize = 'klein' | 'mittel' | 'gross' | 'voll';
type ChartView = Exclude<PreviewView, 'zahl' | 'tabelle'>;
type ChartModule = { default: React.ComponentType<DepthChartProps> };
export type ChartLoaders = Record<ChartView, () => Promise<ChartModule>>;

export const DEFAULT_CHART_LOADERS: ChartLoaders = {
  saeulen: () => import('./charts/Depth3dBarChart').then((m) => ({ default: m.Depth3dBarChart })),
  balken: () => import('./charts/Depth3dBarChart').then((m) => ({ default: m.Depth3dBarChart })),
  kreis: () => import('./charts/Depth3dDonutChart').then((m) => ({ default: m.Depth3dDonutChart })),
  ring: () => import('./charts/Depth3dDonutChart').then((m) => ({ default: m.Depth3dDonutChart })),
  linie: () => import('./charts/DepthLineChart').then((m) => ({ default: m.DepthLineChart })),
  flaeche: () => import('./charts/DepthAreaChart').then((m) => ({ default: m.DepthAreaChart })),
};

// Ein lazy-Modul je Loader-Satz, Darstellung und Ladeversuch. „Wiederholen“ erhöht den Versuch und
// erzeugt damit einen frischen Import, weil React.lazy einen fehlgeschlagenen Import sonst behält.
const lazyCache = new WeakMap<
  ChartLoaders,
  Map<string, React.LazyExoticComponent<React.ComponentType<DepthChartProps>>>
>();

function lazyChart(loaders: ChartLoaders, view: ChartView, attempt: number) {
  const perLoaders = lazyCache.get(loaders) ?? new Map();
  lazyCache.set(loaders, perLoaders);
  const key = `${view}:${attempt}`;
  let component = perLoaders.get(key);
  if (!component) {
    component = React.lazy(loaders[view]);
    perLoaders.set(key, component);
  }
  return component;
}

const VIEWS: { id: PreviewView; label: string }[] = [
  { id: 'zahl', label: 'Zahl' },
  { id: 'tabelle', label: 'Tabelle' },
  { id: 'saeulen', label: 'Säulen' },
  { id: 'balken', label: 'Balken' },
  { id: 'kreis', label: 'Kreis' },
  { id: 'ring', label: 'Ring' },
  { id: 'linie', label: 'Linie' },
  { id: 'flaeche', label: 'Fläche' },
];

// Raster des Plans (Abschnitt „Vorgeschlagenes Raster“) auf der 1200-px-Vorschauseite:
// Desktop (ab 1280 px) 3/12, 6/12, 9/12, 12/12 = 300, 600, 900, 1200 px; Tablet Klein 3/6 = halbe
// Breite, Mittel und Groß 6/6 = volle Breite; Handy immer volle Breite.
const SIZES: { id: PreviewSize; label: string; className: string }[] = [
  { id: 'klein', label: 'Klein', className: 'md:max-w-[50%] xl:max-w-[300px]' },
  { id: 'mittel', label: 'Mittel', className: 'xl:max-w-[600px]' },
  { id: 'gross', label: 'Groß', className: 'xl:max-w-[900px]' },
  { id: 'voll', label: 'Volle Breite', className: 'max-w-full' },
];

interface Dataset {
  title: string;
  data: readonly DatumInput[];
  unit: string;
  period: string;
}

const STAGES: Dataset = {
  title: 'Fortschritt nach Stufe',
  data: SAMPLE_STAGES,
  unit: SAMPLE_UNIT,
  period: SAMPLE_PERIOD,
};
const SHARES: Dataset = {
  title: 'Herkunft der Anfragen',
  data: SAMPLE_SHARES,
  unit: SAMPLE_SHARE_UNIT,
  period: SAMPLE_PERIOD,
};
const SERIES: Dataset = {
  title: 'Anfragen je Monat',
  data: SAMPLE_SERIES,
  unit: SAMPLE_UNIT,
  period: SAMPLE_SERIES_PERIOD,
};

const DATASETS: Record<PreviewView, Dataset> = {
  zahl: STAGES,
  tabelle: STAGES,
  saeulen: STAGES,
  balken: STAGES,
  kreis: SHARES,
  ring: SHARES,
  linie: SERIES,
  flaeche: SERIES,
};

function ValueTable({ dataset, caption }: { dataset: Dataset; caption: string }) {
  return (
    <table className="w-full border-collapse text-[13px] text-[var(--color-text-muted)]">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-0 border-b border-solid border-border">
          <th scope="col" className="py-[8px] text-left font-semibold">
            Kategorie
          </th>
          <th scope="col" className="py-[8px] text-right font-semibold">
            Wert ({dataset.unit})
          </th>
        </tr>
      </thead>
      <tbody>
        {dataset.data.map((entry) => (
          <tr
            key={entry.label}
            className="border-0 border-b border-solid border-[var(--color-border-glass,rgba(0,217,198,0.08))]"
          >
            <th
              scope="row"
              className="py-[8px] text-left font-normal text-[var(--color-text-primary,#e6f3f1)]"
            >
              {entry.label}
            </th>
            <td className="py-[8px] text-right font-mono text-primary">{formatDe(entry.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NumberView({ dataset }: { dataset: Dataset }) {
  const lead = dataset.data[0];
  const last = dataset.data[dataset.data.length - 1];
  if (!lead || !last) return null;
  return (
    <div className="flex min-h-[220px] flex-col justify-center gap-[6px]" data-testid="number-view">
      <p className="m-0 text-[12px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
        {lead.label}
      </p>
      <p className="m-0 font-mono text-[44px] font-bold leading-none text-[var(--color-text-primary,#fff)]">
        {formatDe(lead.value)}
        <span className="ml-[8px] text-[16px] font-medium text-[var(--color-text-muted)]">
          {dataset.unit}
        </span>
      </p>
      <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
        {dataset.period} · davon {last.label}:{' '}
        <span className="font-mono text-primary">{formatDe(last.value)}</span>
      </p>
    </div>
  );
}

// Ein zweiter Fehlschlag desselben Moduls: Der Browser hält einen fehlgeschlagenen Modulabruf unter
// demselben Specifier unter Umständen fest. Dann bleibt nur ein Neuladen der Seite; die Auswahl
// (Darstellung, Größe) überlebt es über sessionStorage (nur diese Sitzung, kein Datenspeicher).
export const RETRY_STATE_KEY = 'dashboard-preview-retry';

const isView = (value: unknown): value is PreviewView => VIEWS.some((entry) => entry.id === value);
const isSize = (value: unknown): value is PreviewSize => SIZES.some((entry) => entry.id === value);

function takeRetryState(): { view?: PreviewView; size?: PreviewSize } {
  try {
    const raw = window.sessionStorage.getItem(RETRY_STATE_KEY);
    if (!raw) return {};
    window.sessionStorage.removeItem(RETRY_STATE_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const { view, size } = parsed as Record<string, unknown>;
    return { view: isView(view) ? view : undefined, size: isSize(size) ? size : undefined };
  } catch {
    return {};
  }
}

export interface DashboardDesignPreviewProps {
  initialView?: PreviewView;
  initialSize?: PreviewSize;
  /** Nur für Tests: Nachladefunktionen der Diagrammmodule ersetzen. */
  chartLoaders?: ChartLoaders;
  /** Nur für Tests: Seite neu laden, wenn ein erneuter Import wieder scheitert. */
  reloadPage?: () => void;
}

export function DashboardDesignPreview({
  initialView = 'saeulen',
  initialSize = 'mittel',
  chartLoaders = DEFAULT_CHART_LOADERS,
  reloadPage = () => window.location.reload(),
}: DashboardDesignPreviewProps) {
  const [restored] = useState(takeRetryState);
  const [view, setView] = useState<PreviewView>(restored.view ?? initialView);
  const [size, setSize] = useState<PreviewSize>(restored.size ?? initialSize);
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    if (attempt === 0) {
      setAttempt(1);
      return;
    }
    try {
      window.sessionStorage.setItem(RETRY_STATE_KEY, JSON.stringify({ view, size }));
    } catch {
      // Ohne sessionStorage startet die Kachel nach dem Neuladen mit der Standardauswahl.
    }
    reloadPage();
  };
  const reducedMotion = useReducedMotion();
  // useId liefert Doppelpunkte, die in SVG-Referenzen (url(#…)) stören: nur Buchstaben und Ziffern.
  const idPrefix = `tile-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const dataset = DATASETS[view];
  const isChart = view !== 'zahl' && view !== 'tabelle';

  // Je Darstellung und Versuch ein eigenes lazy-Modul: ein fehlgeschlagener Import bleibt sonst zwischengespeichert.
  const Chart = useMemo(
    () => (isChart ? lazyChart(chartLoaders, view as ChartView, attempt) : null),
    [view, isChart, chartLoaders, attempt],
  );

  return (
    <Card
      variant="glass"
      aria-label={`Testkachel: ${dataset.title}`}
      data-testid="dashboard-test-tile"
      data-size={size}
      className={cn('w-full', SIZES.find((entry) => entry.id === size)?.className)}
    >
      <div className="flex flex-col gap-[14px]">
        <header className="flex flex-wrap items-start justify-between gap-[10px]">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Vertrieb
            </p>
            <h2 className="m-0 mt-[4px] text-[19px] font-semibold text-[var(--color-text-primary,#fff)]">
              {dataset.title}
            </h2>
            <p className="m-0 mt-[4px] text-[12px] text-[var(--color-text-muted)]">
              {dataset.period} · {SAMPLE_STAND} · Quelle: Beispieldaten
            </p>
          </div>
          <Badge variant="mint" size="sm">
            {SAMPLE_NOTICE}
          </Badge>
        </header>

        <Tabs
          items={VIEWS}
          activeId={view}
          onChange={(id) => setView(id as PreviewView)}
          ariaLabel="Darstellung"
        />

        <div
          role="tabpanel"
          aria-label={VIEWS.find((entry) => entry.id === view)?.label}
          className="min-w-0"
        >
          {view === 'zahl' ? <NumberView dataset={dataset} /> : null}
          {view === 'tabelle' ? (
            <ValueTable dataset={dataset} caption={`${dataset.title}, ${dataset.period}`} />
          ) : null}
          {Chart ? (
            <>
              <ChartModuleBoundary key={`${view}-${attempt}`} onRetry={retry}>
                <Suspense
                  fallback={
                    <div
                      role="status"
                      aria-live="polite"
                      tabIndex={0}
                      aria-label={`${dataset.title}, ${dataset.period}: Darstellung wird geladen`}
                      className="flex min-h-[220px] items-center rounded-md text-[13px] text-[var(--color-text-muted)] outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {dataset.title}, {dataset.period}: Darstellung wird geladen …
                    </div>
                  }
                >
                  <Chart
                    idPrefix={idPrefix}
                    data={dataset.data}
                    unit={dataset.unit}
                    period={dataset.period}
                    title={dataset.title}
                    reducedMotion={reducedMotion}
                    orientation={view === 'balken' ? 'horizontal' : 'vertical'}
                    solid={view === 'kreis'}
                  />
                </Suspense>
              </ChartModuleBoundary>
              {/* Außerhalb der Fehlergrenze: Fällt die Grafik aus, bleibt die Datenalternative. */}
              <details className="mt-[10px] text-[12px] text-[var(--color-text-muted)]">
                <summary className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Werte als Tabelle
                </summary>
                <div className="mt-[8px]">
                  <ValueTable dataset={dataset} caption={`${dataset.title}, ${dataset.period}`} />
                </div>
              </details>
            </>
          ) : null}
        </div>

        <div
          role="group"
          aria-label="Kachelgröße"
          className="flex flex-wrap gap-[6px] border-0 border-t border-solid border-border pt-[12px]"
        >
          {SIZES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={size === entry.id}
              onClick={() => setSize(entry.id)}
              className={cn(
                'rounded-md border border-solid bg-transparent px-[10px] py-[5px] font-body text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-primary',
                size === entry.id
                  ? 'border-primary text-primary'
                  : 'border-border text-[var(--color-text-muted)] hover:border-primary',
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
