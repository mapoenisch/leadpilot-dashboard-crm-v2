import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimpleChart, ChartConfig } from '../Charts';

describe('SimpleChart', () => {
  it('returns null when config is empty or invalid', () => {
    // @ts-expect-error testing invalid config
    const { container: c1 } = render(<SimpleChart config={null} />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <SimpleChart config={{ type: 'bar', labels: [], datasets: [] }} />,
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('renders doughnut chart correctly', () => {
    const config: ChartConfig = {
      type: 'doughnut',
      labels: ['Neu', 'Bestand'],
      datasets: [{ data: [40, 60], colors: ['#00d9c6', '#3ddc97'] }],
    };

    const { container } = render(<SimpleChart config={config} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders bar chart with multiple datasets and legend', () => {
    const config: ChartConfig = {
      type: 'bar',
      labels: ['Q1', 'Q2'],
      datasets: [
        { label: 'Umsatz', data: [100, 150], color: '#00d9c6' },
        { label: 'Kosten', data: [80, 90], color: '#ff5a5f' },
      ],
    };

    render(<SimpleChart config={config} height={300} />);
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
    expect(screen.getByText('Umsatz')).toBeInTheDocument();
    expect(screen.getByText('Kosten')).toBeInTheDocument();
  });

  it('renders line chart with svg paths and labels', () => {
    const config: ChartConfig = {
      type: 'line',
      labels: ['Jan', 'Feb', 'Mär'],
      datasets: [
        { label: 'ARR', data: [1000, 1200, 1500], fill: true },
        { label: 'MRR', data: [80, 100, 125], fill: false },
      ],
    };

    render(<SimpleChart config={config} height={250} />);
    expect(screen.getByRole('img', { name: 'Verlaufsdiagramm' })).toBeInTheDocument();
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Feb')).toBeInTheDocument();
    expect(screen.getByText('Mär')).toBeInTheDocument();
    expect(screen.getByText('ARR')).toBeInTheDocument();
    expect(screen.getByText('MRR')).toBeInTheDocument();
  });
});
