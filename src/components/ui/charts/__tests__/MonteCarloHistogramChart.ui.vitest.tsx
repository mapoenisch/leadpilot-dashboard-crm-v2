import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonteCarloHistogramChart, HistogramBucket } from '../MonteCarloHistogramChart';

describe('MonteCarloHistogramChart', () => {
  it('renders empty state when total runs is below required threshold', () => {
    render(
      <MonteCarloHistogramChart
        buckets={[]}
        totalRuns={1}
        minRequiredRuns={3}
        median={100}
      />
    );

    expect(screen.getByText('Monte-Carlo Verteilung im Aufbau')).toBeInTheDocument();
    expect(screen.getByText(/Aktuell: 1 \/ 3 Läufen/)).toBeInTheDocument();
  });

  it('renders histogram buckets and median statistics when enough runs exist', () => {
    const buckets: HistogramBucket[] = [
      { min: 80, max: 100, count: 5, label: '80-100' },
      { min: 100, max: 120, count: 12, label: '100-120' },
      { min: 120, max: 140, count: 4, label: '120-140' },
    ];

    render(
      <MonteCarloHistogramChart
        buckets={buckets}
        totalRuns={21}
        minRequiredRuns={3}
        median={108}
        p10={90}
        p90={130}
        unit="k €"
      />
    );

    expect(screen.getByText(/108 k €/)).toBeInTheDocument();
    expect(screen.getByText('Median-Intervall')).toBeInTheDocument();
    expect(screen.getByText('Verteilungs-Buckets')).toBeInTheDocument();
  });
});
