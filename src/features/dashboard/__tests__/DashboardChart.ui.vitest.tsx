// Auftrag 073 (Dashboard Teilauftrag 4): Darstellungsauswahl, Werteprüfung und Nachladen.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardChart } from '../components/DashboardChart';
import { DEFAULT_CHART_LOADERS, type ChartLoaders } from '../components/charts/chartLoaders';
import {
  getCatalogEntry,
  isActiveEntry,
  type ActiveCatalogEntry,
  type DashboardView,
} from '../model/dashboardCatalog';
import type { ResolvedTileData } from '../data/dashboardData';

function active(id: string): ActiveCatalogEntry {
  const entry = getCatalogEntry(id);
  if (!entry || !isActiveEntry(entry)) throw new Error(`kein aktiver Eintrag ${id}`);
  return entry;
}

const SHARES = [
  { label: 'Starter', value: 40 },
  { label: 'Pro', value: 35 },
  { label: 'Enterprise', value: 25 },
];

function resolved(overrides: Partial<ResolvedTileData> = {}): ResolvedTileData {
  return {
    catalogId: 'test',
    state: 'bereit',
    value: null,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'Geschäftsjahr 2025',
    asOf: null,
    origin: { layer: 'baseline', module: 'src/domain/x.ts', exportName: 'X' },
    scope: 'stammdaten',
    effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
    ...overrides,
  };
}

function countingLoaders() {
  const calls: string[] = [];
  const loaders = Object.fromEntries(
    Object.entries(DEFAULT_CHART_LOADERS).map(([id, load]) => [
      id,
      () => {
        calls.push(id);
        return load();
      },
    ]),
  ) as ChartLoaders;
  return { loaders, calls };
}

function renderChart(
  view: DashboardView,
  data: ResolvedTileData,
  entry?: ActiveCatalogEntry,
  loaders?: ChartLoaders,
  idPrefix = 'kachelA',
) {
  return render(
    <DashboardChart
      view={view}
      entry={entry}
      data={data}
      title="Testkachel"
      period="Geschäftsjahr 2025"
      idPrefix={idPrefix}
      onRetryChartLoad={() => undefined}
      loaders={loaders}
    />,
  );
}

describe('DashboardChart', () => {
  it('zeigt eine Zahl kompakt und exakt für Screenreader', () => {
    renderChart('zahl', resolved({ value: 2_345_678 }), active('baseline.arr'));
    const number = screen.getByTestId('tile-number');
    expect(number).toHaveTextContent('2,35 Mio. EUR');
    expect(number).toHaveTextContent('2.345.678 EUR');
  });

  it('zeigt fehlende Werte als „Keine Daten“, nie als 0', () => {
    renderChart('zahl', resolved({ value: null }), active('baseline.arr'));
    expect(screen.getByTestId('tile-no-data')).toHaveTextContent('Keine Daten');
    expect(screen.queryByText(/^0/)).toBeNull();
  });

  it('zeigt einen Einzelwert in der Tabelle als eine Zeile', () => {
    renderChart('tabelle', resolved({ value: 1200 }), active('baseline.arr'));
    const table = screen.getByTestId('tile-table');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(table).toHaveTextContent('1.200 EUR');
  });

  it.each<[DashboardView, string]>([
    ['saeulen', 'depth-bar-chart'],
    ['balken', 'depth-hbar-chart'],
    ['ring', 'depth-donut-chart'],
    ['kreis', 'depth-donut-chart'],
  ])('rendert %s nach dem Nachladen', async (view, testId) => {
    renderChart(view, resolved({ series: SHARES }), active('baseline.mrr_paketmix'));
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    expect(screen.getByText('Werte als Tabelle')).toBeInTheDocument();
  });

  it.each<[DashboardView, string]>([
    ['linie', 'depth-line-chart'],
    ['flaeche', 'depth-area-chart'],
  ])('rendert %s nach dem Nachladen', async (view, testId) => {
    renderChart(view, resolved({ series: SHARES }), active('baseline.arr_verlauf'));
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });

  it('zeichnet negative Säulen statt abzubrechen', async () => {
    renderChart(
      'saeulen',
      resolved({
        series: [
          { label: 'Q1', value: 30 },
          { label: 'Q2', value: -20 },
        ],
      }),
    );
    expect(await screen.findByTestId('depth-bar-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('depth-bar')).toHaveLength(2);
  });

  it.each([
    [
      'negativem Wert',
      [
        { label: 'a', value: 10 },
        { label: 'b', value: -5 },
      ],
    ],
    [
      'Summe 0',
      [
        { label: 'a', value: 0 },
        { label: 'b', value: 0 },
      ],
    ],
  ])('erklärt Kreis und Ring mit %s statt zu zeichnen', (_name, series) => {
    renderChart('ring', resolved({ series }), active('baseline.mrr_paketmix'));
    expect(screen.getByTestId('tile-chart-hint')).toHaveTextContent(
      'Nicht als Anteil darstellbar.',
    );
    expect(screen.getByTestId('tile-table')).toBeInTheDocument();
    expect(screen.queryByTestId('depth-donut-chart')).toBeNull();
  });

  it('zeigt nicht endliche Werte als „Keine Daten“', () => {
    renderChart('saeulen', resolved({ series: [{ label: 'a', value: Number.NaN }] }));
    expect(screen.getByTestId('tile-no-data')).toBeInTheDocument();
  });

  it.each<DashboardView>(['saeulen', 'balken', 'kreis', 'ring', 'linie', 'flaeche'])(
    'zeigt eine leere Reihe bei %s als „Keine Daten“ ohne Diagramm und Regler',
    (view) => {
      const { container } = renderChart(view, resolved({ state: 'bereit', series: [] }));
      expect(screen.getByTestId('tile-no-data')).toHaveTextContent('Keine Daten');
      expect(container.querySelector('svg')).toBeNull();
      expect(container.querySelector('input[type="range"]')).toBeNull();
    },
  );

  it('erklärt eine Darstellung, die nicht zur Kennzahl passt', () => {
    renderChart('ring', resolved({ value: 5 }), active('baseline.arr'));
    expect(screen.getByTestId('tile-chart-hint')).toHaveTextContent('passt nicht');
    expect(screen.getByTestId('tile-table')).toHaveTextContent('5 EUR');
  });

  it('lädt für Zahl kein Diagrammmodul und für Ring nur das Kreis/Ring-Modul, einmal', async () => {
    const { loaders, calls } = countingLoaders();
    renderChart('zahl', resolved({ value: 1 }), active('baseline.arr'), loaders);
    expect(calls).toEqual([]);
    renderChart('ring', resolved({ series: SHARES }), undefined, loaders, 'kachelB');
    renderChart('ring', resolved({ series: SHARES }), undefined, loaders, 'kachelC');
    await waitFor(() => expect(screen.getAllByTestId('depth-donut-chart')).toHaveLength(2));
    expect(calls).toEqual(['ring']);
  });

  it('vergibt zwei gleichen Kacheln getrennte SVG-IDs', async () => {
    renderChart('saeulen', resolved({ series: SHARES }), undefined, undefined, 'kachelA');
    renderChart('saeulen', resolved({ series: SHARES }), undefined, undefined, 'kachelB');
    await screen.findAllByTestId('depth-bar-chart');
    const ids = [...document.querySelectorAll('svg [id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith('kachelA'))).toBe(true);
    expect(ids.some((id) => id.startsWith('kachelB'))).toBe(true);
  });

  it('formatiert Ablesezeile, Kurzfassung und Ringmitte nach Einheit', async () => {
    const user = userEvent.setup();
    renderChart('ring', resolved({ series: SHARES }), active('baseline.mrr_paketmix'));
    await screen.findByTestId('depth-donut-chart');
    expect(screen.getByText('EUR gesamt')).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Summe 100 EUR');
    await user.click(screen.getByRole('button', { name: /Starter/ }));
    expect(screen.getByTestId('chart-readout')).toHaveTextContent('Starter · 40 EUR');
  });

  it('zeigt Vielfache in der Ablesezeile mit einer Nachkommastelle', async () => {
    const user = userEvent.setup();
    renderChart(
      'saeulen',
      resolved({
        unit: 'x',
        series: [
          { label: 'A', value: 3 },
          { label: 'B', value: 2.5 },
        ],
      }),
    );
    await screen.findByTestId('depth-bar-chart');
    await user.click(screen.getByRole('button', { name: 'A' }));
    expect(screen.getByTestId('chart-readout')).toHaveTextContent('A · 3,0x');
    expect(document.body).toHaveTextContent('Höchster Wert: A, 3,0x');
  });

  it('reicht reduzierte Bewegung an das Diagramm durch', async () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    try {
      renderChart('saeulen', resolved({ series: SHARES }));
      await screen.findByTestId('depth-bar-chart');
      for (const bar of screen.getAllByTestId('depth-bar')) {
        expect(bar.getAttribute('class') ?? '').not.toContain('transition');
      }
    } finally {
      matchMedia.mockRestore();
    }
  });
});
