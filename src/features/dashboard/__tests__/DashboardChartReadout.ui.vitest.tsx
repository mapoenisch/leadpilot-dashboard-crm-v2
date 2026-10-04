// Auftrag 073 (Dashboard Teilauftrag 4): Ablesezeile, Anteil im Ring und Grenzen der Zeichenfläche.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardChart } from '../components/DashboardChart';
import type { DashboardView } from '../model/dashboardCatalog';
import type { ResolvedTileData } from '../data/dashboardData';

const SHARES = [
  { label: 'Starter', value: 40 },
  { label: 'Pro', value: 35 },
  { label: 'Enterprise', value: 25 },
];

function resolved(series: ResolvedTileData['series']): ResolvedTileData {
  return {
    catalogId: 'test',
    state: 'bereit',
    value: null,
    series,
    overview: null,
    unit: 'EUR',
    timeBasis: 'Geschäftsjahr 2025',
    asOf: null,
    origin: { layer: 'baseline', module: 'src/domain/x.ts', exportName: 'X' },
    scope: 'stammdaten',
    effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
  };
}

function renderChart(
  view: DashboardView,
  series: ResolvedTileData['series'],
  period = 'Geschäftsjahr 2025',
) {
  return render(
    <DashboardChart
      view={view}
      data={resolved(series)}
      title="Testkachel"
      period={period}
      idPrefix="kachelR"
      onRetryChartLoad={() => undefined}
    />,
  );
}

/** Sichtbarer Text je SVG-Label ohne das `<title>` mit dem Volltext. */
function visibleLabels(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('text')).map((node) =>
    Array.from(node.childNodes)
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent)
      .join(''),
  );
}

describe('Diagramm-Ablesezeile und Grenzen', () => {
  it('hält die Ablesezeile fest hoch, auch mit langer Zeitangabe', async () => {
    const user = userEvent.setup();
    const longPeriod =
      'Alle Deals der importierten Pipeline nach Stufen, Stand der letzten Synchronisierung';
    renderChart('saeulen', SHARES, longPeriod);
    await screen.findByTestId('depth-bar-chart');
    const readout = screen.getByTestId('chart-readout');
    expect(readout.className).toContain('h-[60px]');
    await user.click(screen.getByRole('button', { name: /Starter/ }));
    expect(readout).toHaveTextContent(longPeriod);
    expect(readout.className).toContain('h-[60px]');
    expect(readout).toHaveAttribute('tabindex', '0');
  });

  it('nennt im Ring den Anteil des gewählten Segments, in Säulen nicht', async () => {
    const user = userEvent.setup();
    const { unmount } = renderChart('ring', SHARES);
    await screen.findByTestId('depth-donut-chart');
    await user.click(screen.getByRole('button', { name: /Starter/ }));
    expect(screen.getByTestId('chart-readout')).toHaveTextContent('Starter · 40 EUR · 40 % Anteil');
    unmount();
    renderChart('saeulen', SHARES);
    await screen.findByTestId('depth-bar-chart');
    await user.click(screen.getByRole('button', { name: /Starter/ }));
    expect(screen.getByTestId('chart-readout')).not.toHaveTextContent('Anteil');
  });

  it('begrenzt die Zeichenfläche auf lesbare Kategorien und verweist auf die Tabelle', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      label: `Stufe ${i + 1}`,
      value: 100 - i,
    }));
    const { unmount } = renderChart('balken', many);
    const bars = await screen.findByTestId('depth-hbar-chart');
    expect(within(bars).getAllByTestId('depth-bar')).toHaveLength(12);
    expect(screen.getByTestId('chart-readout')).toHaveTextContent(
      '12 von 25 Kategorien dargestellt, alle Werte stehen in der Tabelle.',
    );
    unmount();
    renderChart('saeulen', many);
    const columns = await screen.findByTestId('depth-bar-chart');
    expect(within(columns).getAllByTestId('depth-bar')).toHaveLength(10);
    expect(screen.getByTestId('chart-readout')).toHaveTextContent('10 von 25 Kategorien');
  });

  it('kürzt Kategorien unter senkrechten Säulen nach Spaltenbreite, Volltext im title', async () => {
    renderChart(
      'saeulen',
      Array.from({ length: 10 }, (_, i) => ({
        label: `Sehr lange Stufe ${i + 1}`,
        value: 10 + i,
      })),
    );
    const columns = await screen.findByTestId('depth-bar-chart');
    expect(visibleLabels(columns)).toContain('Sehr la…');
    expect(columns.querySelector('text > title')?.textContent).toBe('Sehr lange Stufe 1');
  });
});
