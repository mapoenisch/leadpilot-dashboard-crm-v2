// Test für DepthSparklineChart (Kompakter Trendverlauf)
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepthSparklineChart } from '../components/charts/DepthSparklineChart';

describe('DepthSparklineChart', () => {
  const baseData = [
    { label: 'Q1', value: 100 },
    { label: 'Q2', value: 120 },
    { label: 'Q3', value: 110 },
    { label: 'Q4', value: 150 },
  ];

  const baseProps = {
    idPrefix: 'test-sparkline',
    data: baseData,
    unit: 'EUR',
    period: '2025',
    title: 'ARR-Trend',
    reducedMotion: true,
  };

  it('rendert Sparkline-Diagramm mit Delta-Badge', () => {
    render(<DepthSparklineChart {...baseProps} />);
    expect(screen.getByTestId('depth-sparkline-chart')).toBeInTheDocument();
    // Delta von 100 auf 150 = +50 %
    expect(screen.getByText('+50 %')).toBeInTheDocument();
  });

  it('verknüpft das SVG per aria-describedby mit der Zusammenfassung', () => {
    render(<DepthSparklineChart {...baseProps} />);
    const svg = screen.getByRole('img', { name: /Kompakter Trendverlauf/i });
    expect(svg).toHaveAttribute('aria-describedby', 'test-sparkline-sparkline-summary');
    const summary = document.getElementById('test-sparkline-sparkline-summary');
    expect(summary).toHaveTextContent(/Von Q1 .* bis Q4 .* gestiegen/);
  });

  it('unterstützt Scrubbing über den Schieberegler', async () => {
    const user = userEvent.setup();
    render(<DepthSparklineChart {...baseProps} />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();

    // Regler auf ersten Punkt setzen
    await user.click(slider);
    // Readout sollte sichtbar sein
    expect(screen.getByTestId('chart-readout')).toBeInTheDocument();
  });

  it('behandelt leere Daten oder Einzelwert ohne Absturz', () => {
    render(<DepthSparklineChart {...baseProps} data={[{ label: 'Stand', value: 100 }]} />);
    expect(screen.getByTestId('depth-sparkline-chart')).toBeInTheDocument();
  });
});
