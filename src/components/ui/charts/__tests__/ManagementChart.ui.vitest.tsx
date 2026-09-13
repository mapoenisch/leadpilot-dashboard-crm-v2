import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManagementChart } from '../ManagementChart';

describe('ManagementChart', () => {
  it('renders empty state when data or series is empty', () => {
    render(
      <ManagementChart
        data={[]}
        xKey="period"
        series={[{ key: 'val', name: 'Wert' }]}
        emptyMessage="Keine Finanzdaten vorhanden"
      />
    );

    expect(screen.getByText('Keine Finanzdaten vorhanden')).toBeInTheDocument();
    expect(screen.getByTestId('management-chart-empty')).toBeInTheDocument();
  });

  it('renders area chart with series data', () => {
    const data = [
      { period: 'Q1', arr: 100000 },
      { period: 'Q2', arr: 120000 },
    ];
    const series = [{ key: 'arr', name: 'ARR', color: '#00D9C6' }];

    const { container } = render(
      <ManagementChart
        data={data}
        xKey="period"
        series={series}
        type="area"
        height={250}
        sourceLabel="Ebene A"
      />
    );

    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders bar and line chart types without crash', () => {
    const data = [
      { period: 'Jan', deals: 5 },
      { period: 'Feb', deals: 8 },
    ];
    const series = [{ key: 'deals', name: 'Deals', color: '#7CEFE6' }];

    const { container: barContainer } = render(
      <ManagementChart data={data} xKey="period" series={series} type="bar" />
    );
    expect(barContainer.querySelector('.recharts-responsive-container')).toBeInTheDocument();

    const { container: lineContainer } = render(
      <ManagementChart data={data} xKey="period" series={series} type="line" />
    );
    expect(lineContainer.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
