import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManagementChart } from '../ManagementChart';

const data = [
  { period: 'Q1', arr: 100000, deals: 5 },
  { period: 'Q2', arr: 120000, deals: 8 },
];

describe('ManagementChart (branch3)', () => {
  it('leerer Series-Array und null-Daten zeigen den Empty-Zustand', () => {
    const { unmount } = render(
      <ManagementChart data={data} xKey="period" series={[]} emptyMessage="Nichts da" />,
    );
    expect(screen.getByText('Nichts da')).toBeInTheDocument();
    expect(screen.getByTestId('management-chart-empty')).toBeInTheDocument();
    unmount();

    render(
      <ManagementChart data={null as never} xKey="period" series={[{ key: 'arr', name: 'ARR' }]} />,
    );
    expect(screen.getByTestId('management-chart-empty')).toBeInTheDocument();
  });

  it('Empty ohne Nachricht nutzt Standardtext und Quellenlabel', () => {
    render(
      <ManagementChart
        data={[]}
        xKey="period"
        series={[{ key: 'arr', name: 'ARR' }]}
        sourceLabel="Quelle X"
      />,
    );
    expect(screen.getByTestId('management-chart-empty')).toBeInTheDocument();
    expect(screen.getByText(/Quelle X/)).toBeInTheDocument();
  });

  it('Balkendiagramm mit Legende mischt Farb-, Alert- und Standardserien', () => {
    const { container } = render(
      <ManagementChart
        data={data}
        xKey="period"
        type="bar"
        showLegend
        yAxisFormatter={(v) => `${v} €`}
        series={[
          { key: 'arr', name: 'ARR fix', color: '#00D9C6' },
          { key: 'deals', name: 'Deals Warnung', isNegativeAlert: true },
          { key: 'deals', name: 'Deals Standard' },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(screen.getByText('ARR fix')).toBeInTheDocument();
    expect(screen.getByText('Deals Warnung')).toBeInTheDocument();
    expect(screen.getByText('Deals Standard')).toBeInTheDocument();
  });

  it('Liniendiagramm mit Legende nutzt Alert-Farbe ohne Custom-Color', () => {
    const { container } = render(
      <ManagementChart
        data={data}
        xKey="period"
        type="line"
        showLegend
        series={[{ key: 'arr', name: 'ARR Linie', isNegativeAlert: true }]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(screen.getByText('ARR Linie')).toBeInTheDocument();
  });

  it('Flächendiagramm (Standardtyp) mit Legende, Tooltip-Formatter und Höhe', () => {
    const { container } = render(
      <ManagementChart
        data={data}
        xKey="period"
        showLegend
        height={300}
        sourceLabel="Ebene A"
        tooltipValueFormatter={(v) => `${v} Einheiten`}
        series={[
          { key: 'arr', name: 'ARR Fläche', color: '#00D9C6' },
          { key: 'deals', name: 'Deals Verlauf', isNegativeAlert: true },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(screen.getByText('ARR Fläche')).toBeInTheDocument();
    expect(screen.getByText('Deals Verlauf')).toBeInTheDocument();
    expect(screen.getByTestId('management-chart-container')).toHaveStyle({ height: '300px' });
  });
});
