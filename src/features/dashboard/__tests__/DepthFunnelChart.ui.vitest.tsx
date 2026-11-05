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

  it('zeigt relative Konvertierungsraten zwischen den Stufen', () => {
    render(<DepthFunnelChart {...baseProps} />);
    // 300 / 500 = 60 %
    expect(screen.getByText('60 %')).toBeInTheDocument();
    // 150 / 300 = 50 %
    expect(screen.getByText('50 %')).toBeInTheDocument();
    // 60 / 150 = 40 %
    expect(screen.getByText('40 %')).toBeInTheDocument();
  });

  it('erlaubt Auswahl einer Stufe per Klick oder Tastatur-Legende', async () => {
    const user = userEvent.setup();
    render(<DepthFunnelChart {...baseProps} />);

    const offerBtn = screen.getByRole('button', { name: 'Angebot' });
    await user.click(offerBtn);

    const readout = screen.getByTestId('chart-readout');
    expect(readout).toHaveTextContent('Angebot');
    expect(readout).toHaveTextContent('150 Deals');
    expect(readout).toHaveTextContent('50 % Konvertierung zur Vorstufe');
  });

  it('verknüpft das SVG per aria-describedby mit der Zusammenfassung', () => {
    render(<DepthFunnelChart {...baseProps} />);
    const svg = screen.getByRole('img', { name: /Trichterdiagramm/i });
    expect(svg).toHaveAttribute('aria-describedby', 'test-funnel-funnel-summary');
    const summary = document.getElementById('test-funnel-funnel-summary');
    expect(summary).toHaveTextContent(/Trichter mit 4 Stufen/);
    expect(summary).toHaveTextContent(/Gesamt-Konvertierung 12 %/);
  });
});
