import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimpleChart } from '../Charts';
import type { ChartConfig } from '../Charts';

describe('SimpleChart (branch2)', () => {
  it('null bei fehlenden Labels, Datasets und leerer Dataset-Liste', () => {
    const { container: c1 } = render(
      // @ts-expect-error branch: null-Konfig
      <SimpleChart config={null} />,
    );
    expect(c1.innerHTML).toBe('');
    const { container: c2 } = render(
      <SimpleChart config={{ type: 'bar', labels: [], datasets: [] } as unknown as ChartConfig} />,
    );
    expect(c2.innerHTML).toBe('');
  });

  it('Doughnut ohne datasets[0] gibt null zurück', () => {
    const { container } = render(
      <SimpleChart
        config={{ type: 'doughnut', labels: ['A'], datasets: [] } as unknown as ChartConfig}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('Doughnut ohne Farbarray nutzt Theme-Primärfarbe', () => {
    render(
      <SimpleChart
        config={{
          type: 'doughnut',
          labels: ['A', 'B'],
          datasets: [{ data: [60, 40] }],
        }}
      />,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('Balken Einzelserie: keine Legende, Custom-Höhe, Fallback-Farbe', () => {
    const { container } = render(
      <SimpleChart
        height={300}
        config={{
          type: 'bar',
          labels: ['Q1', 'Q2'],
          datasets: [{ label: 'Umsatz', data: [100, 0] }],
        }}
      />,
    );
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
    // keine Legende bei einer Serie
    expect(screen.queryByText('Umsatz', { selector: 'span' })).toBeNull();
    const plot = container.querySelector('[style*="height: 300px"]');
    expect(plot).not.toBeNull();
  });

  it('Balken mit ds.color und colors-Array je Label', () => {
    const { container } = render(
      <SimpleChart
        config={{
          type: 'bar',
          labels: ['A', 'B'],
          datasets: [
            { label: 'Fix', data: [10, 20], color: '#ff0000' },
            { label: 'Dyn', data: [5, 15], colors: ['#00ff00', '#0000ff'] },
          ],
        }}
      />,
    );
    // Legende bei mehreren Serien mit Fallback-Label
    expect(screen.getByText('Fix')).toBeInTheDocument();
    expect(screen.getByText('Dyn')).toBeInTheDocument();
    const bars = container.querySelectorAll('[title]');
    expect(bars.length).toBe(4);
  });

  it('Linie mit Fill-Fläche und Legende bei mehreren Serien', () => {
    render(
      <SimpleChart
        config={{
          type: 'line',
          labels: ['Jan', 'Feb', 'Mär'],
          datasets: [
            { label: 'Ist', data: [10, 20, 15], color: '#00d9c6', fill: true },
            { data: [8, 18, 12] },
          ],
        }}
      />,
    );
    expect(screen.getByRole('img', { name: 'Verlaufsdiagramm' })).toBeInTheDocument();
    expect(screen.getByText('Ist')).toBeInTheDocument();
    expect(screen.getByText('Serie 2')).toBeInTheDocument();
    expect(screen.getByText('Jan')).toBeInTheDocument();
  });

  it('Linie Einzelserie ohne Fill: keine Legende, Balken-Titel ohne Label', () => {
    const { container } = render(
      <SimpleChart
        config={{
          type: 'bar',
          labels: ['Solo'],
          datasets: [{ data: [42] }],
        }}
      />,
    );
    // title ohne ds.label nutzt nur formatierten Wert
    const bar = container.querySelector('[title]');
    expect(bar?.getAttribute('title')).toContain('42');
  });
});
