// Test für DepthGaugeChart (Tachometer / Skala)
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepthGaugeChart } from '../components/charts/DepthGaugeChart';

describe('DepthGaugeChart', () => {
  const baseProps = {
    idPrefix: 'test-gauge',
    data: [{ label: 'EBITDA-Marge', value: 24 }],
    unit: '%',
    period: 'FY 2025',
    title: 'EBITDA-Marge',
    reducedMotion: true,
  };

  it('rendert SVG-Tachometer mit Halbbogen, Wert und Label', () => {
    render(<DepthGaugeChart {...baseProps} />);
    const chart = screen.getByTestId('depth-gauge-chart');
    expect(chart).toBeInTheDocument();
    expect(screen.getAllByText('24 %').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EBITDA-Marge').length).toBeGreaterThan(0);
  });

  it('verknüpft das SVG per aria-describedby mit der Zusammenfassung', () => {
    render(<DepthGaugeChart {...baseProps} />);
    const svg = screen.getByRole('img', { name: /Tachometer/i });
    expect(svg).toHaveAttribute('aria-describedby', 'test-gauge-gauge-summary');
    const summary = document.getElementById('test-gauge-gauge-summary');
    expect(summary).toHaveTextContent('Tachometer für EBITDA-Marge: 24 %');
  });

  it('unterstützt mehrere Kennzahlen und Wechsel per Tastatur/Klick', async () => {
    const user = userEvent.setup();
    const multiData = [
      { label: 'EBITDA-Marge', value: 24 },
      { label: 'Bruttomarge', value: 68 },
    ];
    render(<DepthGaugeChart {...baseProps} data={multiData} />);

    expect(screen.getAllByText('24 %').length).toBeGreaterThan(0);
    const secondButton = screen.getByRole('button', { name: 'Bruttomarge' });
    await user.click(secondButton);

    expect(screen.getAllByText('68 %').length).toBeGreaterThan(0);
  });

  it('behandelt negative Werte sicher mit Warnfarbe', () => {
    render(
      <DepthGaugeChart
        {...baseProps}
        data={[{ label: 'EBITDA-Marge', value: -15 }]}
      />,
    );
    expect(screen.getAllByText('-15 %').length).toBeGreaterThan(0);
  });

  it('erhält die reservierte Legendenhöhe bei Einzelwerten mit stableLegend', () => {
    const { container } = render(<DepthGaugeChart {...baseProps} stableLegend />);
    const reserve = container.querySelector('.h-\\[62px\\]');
    expect(reserve).toBeInTheDocument();
    expect(reserve).toHaveAttribute('aria-hidden', 'true');
  });

  it('rendert keine Legendenreserve ohne stableLegend bei Einzelwerten', () => {
    const { container } = render(<DepthGaugeChart {...baseProps} stableLegend={false} />);
    const reserve = container.querySelector('.h-\\[62px\\]');
    expect(reserve).not.toBeInTheDocument();
  });
});
