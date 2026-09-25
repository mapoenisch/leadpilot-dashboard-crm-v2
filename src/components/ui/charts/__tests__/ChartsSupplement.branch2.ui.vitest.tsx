import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartEmptyState } from '../ChartEmptyState';
import { ChartFrame } from '../ChartFrame';
import { ChartInsight } from '../ChartInsight';
import { ChartLegend } from '../ChartLegend';
import { ChartMetricHeader } from '../ChartMetricHeader';
import { ChartTooltip } from '../ChartTooltip';
import { ManagementChartState } from '../ManagementChartState';
import { ManagementChartTooltip } from '../ManagementChartTooltip';

describe('Chart-Primitives (branch2)', () => {
  it('EmptyState: eigenes Icon, className-Override und ohne Zähler kein Fortschritt', () => {
    const { container } = render(
      <ChartEmptyState title="Leer" message="Nichts da" iconName="info" className="border-error" />,
    );
    expect(screen.getByText('Leer')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('border-error');
    expect(container.firstElementChild).not.toHaveClass('border-border');
    expect(screen.queryByText(/Aktuell:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/benötigt/)).not.toBeInTheDocument();
  });

  it('Frame: ohne Subtitle/Source/Action/Insight nur Titel plus Kinder', () => {
    render(
      <ChartFrame title="Nur Titel" minHeight={120} height={200}>
        <span>Kinder-Inhalt</span>
      </ChartFrame>,
    );
    expect(screen.getByText('Nur Titel')).toBeInTheDocument();
    expect(screen.getByText('Kinder-Inhalt')).toBeInTheDocument();
    expect(screen.queryByText(/Quelle/)).not.toBeInTheDocument();
  });

  it('Frame: Insight-Callout rendert unterhalb', () => {
    render(
      <ChartFrame title="Mit Hinweis" insight={<span>Detail-Hinweis</span>}>
        <span>Kinder-Inhalt</span>
      </ChartFrame>,
    );
    expect(screen.getByText('Detail-Hinweis')).toBeInTheDocument();
  });

  it('Insight: Warn-Typ ohne Titel nutzt Alert-Icon', () => {
    const { container } = render(<ChartInsight type="warning">Achtung Inhalt</ChartInsight>);
    expect(screen.getByText('Achtung Inhalt')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('Legend: alle Shapes, vertikal, Größe sm, Werte und Anteile', () => {
    const onHover = vi.fn();
    const { container } = render(
      <ChartLegend
        orientation="vertical"
        size="sm"
        onItemHover={onHover}
        items={[
          { label: 'Linie', color: '#fff', shape: 'line', value: 1234 },
          { label: 'Strich', color: '#fff', shape: 'dashed', value: '12 €', sharePercent: 33.4 },
          { label: 'Rechteck', color: '#fff', shape: 'rect' },
          { label: 'Kreis', color: '#fff' },
        ]}
      />,
    );
    expect(screen.getByRole('list', { name: 'Diagrammlegende' })).toBeInTheDocument();
    expect(screen.getByText('1.234')).toBeInTheDocument();
    expect(screen.getByText('(33%)')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('flex-col');
    const first = screen.getAllByRole('listitem')[0]!;
    fireEvent.mouseEnter(first);
    expect(onHover).toHaveBeenCalledWith(0);
    fireEvent.mouseLeave(first);
    expect(onHover).toHaveBeenCalledWith(null);
  });

  it('MetricHeader: String-Wert, negatives Delta, String-Basis, anderer Zielstatus', () => {
    render(
      <ChartMetricHeader
        label="KPI"
        value="n/a"
        unit="€"
        baselineValue="Basis-X"
        deltaAbsolute={-500}
        deltaPercent={-2.5}
        isPositiveChange={false}
        goalStatus="OFFEN"
      />,
    );
    expect(screen.getByText('n/a')).toBeInTheDocument();
    expect(screen.getByText('OFFEN')).toBeInTheDocument();
    expect(screen.getByText(/-500/)).toBeInTheDocument();
    // toFixed nutzt Punkt-Dezimaltrennzeichen
    expect(screen.getByText(/-2\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/Basis: Basis-X/)).toBeInTheDocument();
  });

  it('MetricHeader: nur Prozent-Delta ohne Absolut, ohne Einheit kein Unit-Span', () => {
    render(<ChartMetricHeader label="KPI" value={1000} deltaPercent={5} goalStatus="ACHIEVED" />);
    expect(screen.getByText('1.000')).toBeInTheDocument();
    expect(screen.getByText('ACHIEVED')).toBeInTheDocument();
    expect(screen.getByText(/\+5\.0%/)).toBeInTheDocument();
  });

  it('Tooltip: ohne Titel, Zahlenwert, Deltas günstig/ungünstig/neutral, ohne Farbpunkt', () => {
    render(
      <ChartTooltip
        x={10}
        y={20}
        items={[
          { label: 'Gut', value: 1500, color: '#0f0', delta: '+5', isFavorable: true },
          { label: 'Schlecht', value: 'x', delta: '-3', isFavorable: false },
          { label: 'Neutral', value: 7, delta: '0' },
          { label: 'Ohne Farbe', value: 1 },
        ]}
      />,
    );
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('1.500')).toBeInTheDocument();
    expect(screen.getByText('(+5)')).toBeInTheDocument();
    expect(screen.getByText('(-3)')).toBeInTheDocument();
    expect(screen.getByText('(0)')).toBeInTheDocument();
  });

  it('ManagementChartState: error/loading/empty mit Custom-Message, -Label und -Höhe', () => {
    const { unmount } = render(<ManagementChartState type="error" />);
    expect(screen.getByTestId('management-chart-error')).toBeInTheDocument();
    expect(screen.getByText('Fehler beim Laden der Zeitreihendaten')).toBeInTheDocument();
    unmount();
    render(
      <ManagementChartState type="loading" message="Lade nach" sourceLabel="Live" height={300} />,
    );
    expect(screen.getByTestId('management-chart-loading')).toBeInTheDocument();
    expect(screen.getByText('Lade nach')).toBeInTheDocument();
    expect(screen.getByText(/\(Live\)/)).toBeInTheDocument();
  });

  it('ManagementChartTooltip: inaktiv/leer null, sonst Label ohne Source und Fallback-Name', () => {
    const { container } = render(<ManagementChartTooltip active={false} payload={[]} />);
    expect(container.innerHTML).toBe('');
    render(
      <ManagementChartTooltip
        active
        label="Jan"
        sourceLabel=""
        payload={[{ value: '42' }, { name: 'Serie', value: 8, color: '#f00' }]}
      />,
    );
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Wert')).toBeInTheDocument();
    expect(screen.getByText('Serie')).toBeInTheDocument();
  });
});
