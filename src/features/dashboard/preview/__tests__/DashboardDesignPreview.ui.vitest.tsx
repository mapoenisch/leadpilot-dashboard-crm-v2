// Designprobe Testkachel (Teilauftrag 0): Bedienung, Zugänglichkeit und Grenzen der Kachel.
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardDesignPreview, DEFAULT_CHART_LOADERS } from '../DashboardDesignPreview';
import type { ChartLoaders } from '../DashboardDesignPreview';
import {
  SAMPLE_NOTICE,
  SAMPLE_PERIOD,
  SAMPLE_SERIES_PERIOD,
  SAMPLE_STAGES,
} from '../previewSampleData';

describe('DashboardDesignPreview', () => {
  it('kennzeichnet die Werte als Beispieldaten und zeigt standardmäßig Säulen', async () => {
    render(<DashboardDesignPreview />);
    expect(screen.getByText(SAMPLE_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(/Quelle: Beispieldaten/)).toBeInTheDocument();
    expect(await screen.findByTestId('depth-bar-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('depth-bar')).toHaveLength(SAMPLE_STAGES.length);
  });

  it('zeigt Wert, Einheit, Kategorie und Zeitraum, wenn eine Säule per Schaltfläche gewählt wird', async () => {
    const user = userEvent.setup();
    render(<DashboardDesignPreview />);
    await screen.findByTestId('depth-bar-chart');
    const button = screen.getByRole('button', { name: 'Gespräch' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    const readout = screen.getByTestId('chart-readout');
    expect(readout).toHaveTextContent('Gespräch');
    expect(readout).toHaveTextContent('240 Stück');
    expect(readout).toHaveTextContent(SAMPLE_PERIOD);
    const bars = screen.getAllByTestId('depth-bar');
    expect(bars[2]).toHaveAttribute('data-active', 'true');
    expect(bars[0]).toHaveAttribute('data-active', 'false');
  });

  it('schaltet auf Zahl und Tabelle um; beide ohne räumlichen Diagrammeffekt', async () => {
    const user = userEvent.setup();
    render(<DashboardDesignPreview />);
    await user.click(screen.getByRole('tab', { name: 'Zahl' }));
    expect(screen.getByTestId('number-view')).toHaveTextContent('1.280');
    expect(document.querySelector('svg polygon')).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Tabelle' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(SAMPLE_STAGES.length + 1);
    expect(document.querySelector('svg polygon')).toBeNull();
  });

  it('zeigt den Ring mit exakten Anteilen in der Legende', async () => {
    const user = userEvent.setup();
    render(<DashboardDesignPreview />);
    await user.click(screen.getByRole('tab', { name: 'Ring' }));
    await screen.findByTestId('depth-donut-chart');
    expect(screen.getAllByTestId('depth-ring-segment')).toHaveLength(5);
    expect(screen.getByText('41 %')).toBeInTheDocument();
    expect(screen.getByText('27,5 %')).toBeInTheDocument();
  });

  it('wählt bei der Linie einen Zeitpunkt per Regler (Tastatur und Touch)', async () => {
    const user = userEvent.setup();
    render(<DashboardDesignPreview />);
    await user.click(screen.getByRole('tab', { name: 'Linie' }));
    await screen.findByTestId('depth-line-chart');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '11' } });
    const readout = screen.getByTestId('chart-readout');
    expect(readout).toHaveTextContent('Sep');
    expect(readout).toHaveTextContent('540 Stück');
    expect(readout).toHaveTextContent(SAMPLE_SERIES_PERIOD);
  });

  it('bietet zu jedem Diagramm die Werte als Tabelle', async () => {
    const user = userEvent.setup();
    render(<DashboardDesignPreview />);
    await user.click(screen.getByRole('tab', { name: 'Fläche' }));
    await screen.findByTestId('depth-area-chart');
    expect(screen.getByText('Werte als Tabelle')).toBeInTheDocument();
    expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument();
  });

  it('wechselt die Kachelgröße über die Größenwahl', async () => {
    const user = userEvent.setup();
    render(<DashboardDesignPreview />);
    const tile = screen.getByTestId('dashboard-test-tile');
    expect(tile).toHaveAttribute('data-size', 'mittel');
    await user.click(screen.getByRole('button', { name: 'Volle Breite' }));
    expect(tile).toHaveAttribute('data-size', 'voll');
    expect(screen.getByRole('button', { name: 'Volle Breite' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('vergibt SVG-IDs je Kachel eindeutig, damit sich zwei Kacheln nicht beeinflussen', async () => {
    render(
      <>
        <DashboardDesignPreview />
        <DashboardDesignPreview />
      </>,
    );
    expect(await screen.findAllByTestId('depth-bar-chart')).toHaveLength(2);
    const ids = [...document.querySelectorAll('svg [id]')].map((node) => node.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9-]+$/);
  });

  it('zeigt horizontale Balken und den Kreis mit den Beispieldaten', async () => {
    const user = userEvent.setup();
    render(<DashboardDesignPreview />);
    await user.click(screen.getByRole('tab', { name: 'Balken' }));
    expect(await screen.findByTestId('depth-hbar-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('depth-bar')).toHaveLength(SAMPLE_STAGES.length);
    await user.click(screen.getByRole('tab', { name: 'Kreis' }));
    await screen.findByTestId('depth-donut-chart');
    expect(screen.getAllByTestId('depth-ring-segment')).toHaveLength(5);
    expect(screen.getByRole('img', { name: /Kreis/ })).toBeInTheDocument();
    expect(screen.queryByText('gesamt')).toBeNull();
  });

  it('wählt einen Datenpunkt schon beim Tastaturfokus und räumt beim Verlassen auf', async () => {
    const user = userEvent.setup();
    render(<DashboardDesignPreview />);
    await screen.findByTestId('depth-bar-chart');
    await user.tab();
    const bars = screen.getAllByTestId('depth-bar');
    const buttons = screen.getAllByRole('button', { name: /Anfragen|Qualifiziert|Gespräch/ });
    act(() => buttons[1]?.focus());
    expect(screen.getByTestId('chart-readout')).toHaveTextContent('Qualifiziert');
    expect(bars[1]).toHaveAttribute('data-active', 'true');
    act(() => buttons[1]?.blur());
    expect(bars[1]).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('chart-readout')).toHaveTextContent('Datenpunkt wählen');
  });

  it('zeichnet bei einem Nullwert keine Säulenflächen', async () => {
    const { Depth3dBarChart } = await import('../charts/Depth3dBarChart');
    const { container } = render(
      <Depth3dBarChart
        idPrefix="t"
        data={[
          { label: 'A', value: 10 },
          { label: 'Null', value: 0 },
        ]}
        unit="Stück"
        period="Q3"
        title="Test"
        reducedMotion
      />,
    );
    const [full, zero] = screen.getAllByTestId('depth-bar');
    expect(full?.querySelectorAll('polygon')).toHaveLength(2);
    expect(zero?.querySelectorAll('polygon')).toHaveLength(0);
    expect(zero?.querySelectorAll('rect')).toHaveLength(0);
    expect(zero?.querySelectorAll('ellipse')).toHaveLength(0);
    expect(container.querySelectorAll('polygon')).toHaveLength(2);
  });

  it('setzt den Zeitreihenregler beim Fokus auf den ersten Zeitpunkt', async () => {
    const user = userEvent.setup();
    render(<DashboardDesignPreview />);
    await user.click(screen.getByRole('tab', { name: 'Linie' }));
    await screen.findByTestId('depth-line-chart');
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuetext', 'kein Zeitpunkt gewählt');
    act(() => slider.focus());
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('Okt'));
  });

  it('macht Diagramme auf schmalen Kacheln scrollbar statt die Beschriftung zu verkleinern', async () => {
    render(<DashboardDesignPreview />);
    await screen.findByTestId('depth-bar-chart');
    const region = screen.getByRole('region', { name: /scrollbar/ });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.querySelector('svg')?.getAttribute('class')).toContain('min-w-[560px]');
  });

  it('behält bei einem Modulfehler die Werte als Tabelle', async () => {
    const loaders: ChartLoaders = {
      ...DEFAULT_CHART_LOADERS,
      saeulen: () => Promise.reject(new Error('Netz weg')),
    };
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(<DashboardDesignPreview chartLoaders={loaders} />);
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Werte als Tabelle')).toBeInTheDocument();
      expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument();
    } finally {
      quiet.mockRestore();
    }
  });

  it('lädt bei „Wiederholen“ sofort neu und behält die Auswahl', async () => {
    const loaders: ChartLoaders = {
      ...DEFAULT_CHART_LOADERS,
      saeulen: () => Promise.reject(new Error('Netz weg')),
    };
    const reloadPage = vi.fn();
    const user = userEvent.setup();
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.sessionStorage.clear();
    try {
      const first = render(
        <DashboardDesignPreview chartLoaders={loaders} reloadPage={reloadPage} />,
      );
      await user.click(screen.getByRole('button', { name: 'Groß' }));
      await act(async () => {
        await user.click(await screen.findByRole('button', { name: 'Wiederholen' }));
      });
      expect(reloadPage).toHaveBeenCalledTimes(1);
      first.unmount();
      render(<DashboardDesignPreview />);
      expect(screen.getByTestId('dashboard-test-tile')).toHaveAttribute('data-size', 'gross');
      expect(window.sessionStorage.getItem('dashboard-preview-retry')).toBeNull();
    } finally {
      quiet.mockRestore();
    }
  });

  it('zeigt bei einem fehlgeschlagenen Modul einen erklärten Zustand mit „Wiederholen“', async () => {
    const loaders: ChartLoaders = {
      ...DEFAULT_CHART_LOADERS,
      saeulen: () => Promise.reject(new Error('Netz weg')),
    };
    // React meldet den absichtlich fehlschlagenden Import über console.error; im Test stumm schalten.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(<DashboardDesignPreview chartLoaders={loaders} />);
      expect(await screen.findByRole('alert')).toHaveTextContent('nicht geladen');
      expect(screen.getByRole('button', { name: 'Wiederholen' })).toBeInTheDocument();
    } finally {
      quiet.mockRestore();
    }
  });

  it('gibt den Fokus vom Ladeplatzhalter an den Diagrammbereich weiter, wenn das Modul fertig ist', async () => {
    let finish: () => void = () => undefined;
    const loaders: ChartLoaders = {
      ...DEFAULT_CHART_LOADERS,
      saeulen: () =>
        new Promise((resolve) => {
          finish = () => resolve(DEFAULT_CHART_LOADERS.saeulen());
        }),
    };
    render(<DashboardDesignPreview chartLoaders={loaders} />);
    const placeholder = await screen.findByRole('status', { name: /Darstellung wird geladen/ });
    expect(placeholder).toHaveClass('min-h-[360px]');
    act(() => placeholder.focus());
    expect(placeholder).toHaveFocus();
    await act(async () => {
      finish();
    });
    expect(await screen.findByTestId('depth-bar-chart')).toBeInTheDocument();
    const slot = screen.getByRole('group', { name: /Fortschritt nach Stufe/ });
    expect(slot).toHaveFocus();
    expect(slot).toHaveClass('min-h-[360px]');
  });

  it('nimmt dem Diagrammbereich den Fokus nicht, wenn der Platzhalter ihn vorher verloren hat', async () => {
    let finish: () => void = () => undefined;
    const loaders: ChartLoaders = {
      ...DEFAULT_CHART_LOADERS,
      saeulen: () =>
        new Promise((resolve) => {
          finish = () => resolve(DEFAULT_CHART_LOADERS.saeulen());
        }),
    };
    render(<DashboardDesignPreview chartLoaders={loaders} />);
    const placeholder = await screen.findByRole('status', { name: /Darstellung wird geladen/ });
    act(() => placeholder.focus());
    const sizeButton = screen.getByRole('button', { name: 'Klein' });
    act(() => sizeButton.focus());
    await act(async () => {
      finish();
    });
    await screen.findByTestId('depth-bar-chart');
    expect(sizeButton).toHaveFocus();
  });

  it('reserviert im Fehlerzustand dieselbe Höhe wie Ladeplatzhalter und Diagramm', async () => {
    const loaders: ChartLoaders = {
      ...DEFAULT_CHART_LOADERS,
      saeulen: () => Promise.reject(new Error('Netz weg')),
    };
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(<DashboardDesignPreview chartLoaders={loaders} />);
      expect(await screen.findByRole('alert')).toHaveClass('min-h-[360px]');
    } finally {
      quiet.mockRestore();
    }
  });

  it('animiert die Größenänderung bei reduzierter Bewegung nicht', () => {
    render(<DashboardDesignPreview />);
    expect(screen.getByTestId('dashboard-test-tile')).toHaveClass('motion-reduce:transition-none');
  });
});
