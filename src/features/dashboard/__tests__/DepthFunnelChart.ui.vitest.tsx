// Test für DepthFunnelChart (Trichterdiagramm)
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepthFunnelChart } from '../components/charts/DepthFunnelChart';

describe('DepthFunnelChart', () => {
  const baseData = [
    { label: 'Leads', value: 500 },
    { label: 'Qualifiziert', value: 300 },
    { label: 'Angebot', value: 150 },
    { label: 'Gewonnen', value: 60 },
  ];

  const baseProps = {
    idPrefix: 'test-funnel',
    data: baseData,
    unit: 'Deals',
    period: 'Q4 2026',
    title: 'Pipeline-Trichter',
    reducedMotion: true,
  };

  it('rendert alle Stufen mit Stufenverbindern und Werten', () => {
    render(<DepthFunnelChart {...baseProps} />);
    expect(screen.getByTestId('depth-funnel-chart')).toBeInTheDocument();
    const stages = screen.getAllByTestId('funnel-stage');
    expect(stages).toHaveLength(4);
    expect(screen.getByText('500 Deals')).toBeInTheDocument();
    expect(screen.getByText('60 Deals')).toBeInTheDocument();
  });

  it('zeigt Stufen mit Werten und Bezeichnungen ohne fiktive Konvertierungsraten', () => {
    render(<DepthFunnelChart {...baseProps} />);
    expect(screen.queryByText(/Konvertierung/i)).not.toBeInTheDocument();
    expect(screen.queryByText('60 %')).not.toBeInTheDocument();
  });

  it('erlaubt Auswahl einer Stufe per Klick oder Tastatur-Legende mit Rang-Angabe', async () => {
    const user = userEvent.setup();
    render(<DepthFunnelChart {...baseProps} />);

    const offerBtn = screen.getByRole('button', { name: 'Angebot' });
    await user.click(offerBtn);

    const readout = screen.getByTestId('chart-readout');
    expect(readout).toHaveTextContent('Angebot');
    expect(readout).toHaveTextContent('150 Deals');
    expect(readout).toHaveTextContent('Rang 3 von 4');
  });

  it('verknüpft das SVG per aria-describedby mit der Zusammenfassung', () => {
    render(<DepthFunnelChart {...baseProps} />);
    const svg = screen.getByRole('img', { name: /Trichterdiagramm/i });
    expect(svg).toHaveAttribute('aria-describedby', 'test-funnel-funnel-summary');
    const summary = document.getElementById('test-funnel-funnel-summary');
    expect(summary).toHaveTextContent(
      /Trichter mit 4 Stufen von Leads \(500 Deals\) bis Gewonnen \(60 Deals\), Q4 2026\./,
    );
  });

  it('verhindert Überlappungen bei langen Stufenlisten (mehr als 10 Stufen)', () => {
    const manyStages = Array.from({ length: 15 }, (_, i) => ({
      label: `Stufe ${i + 1}`,
      value: 100 - i * 5,
    }));
    render(<DepthFunnelChart {...baseProps} data={manyStages} />);
    const stageElements = screen.getAllByTestId('funnel-stage');
    expect(stageElements).toHaveLength(15);
    const svg = screen.getByRole('img', { name: /Trichterdiagramm/i });
    const viewBox = svg.getAttribute('viewBox');
    expect(viewBox).toBeTruthy();
    const [, , , heightStr] = viewBox!.split(' ');
    const height = Number(heightStr);
    expect(height).toBeGreaterThanOrEqual(400);
  });

  it('reserviert die Legendenhöhe bei Einzelstufen mit stableLegend', () => {
    const { container } = render(
      <DepthFunnelChart
        {...baseProps}
        data={[{ label: 'Einzige Stufe', value: 42 }]}
        stableLegend
      />,
    );
    const reserve = container.querySelector('.h-\\[62px\\]');
    expect(reserve).toBeInTheDocument();
  });
});
