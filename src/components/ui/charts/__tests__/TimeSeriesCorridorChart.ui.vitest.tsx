import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeSeriesCorridorChart } from '../TimeSeriesCorridorChart';

describe('TimeSeriesCorridorChart', () => {
  it('returns null when points array is empty', () => {
    const { container } = render(<TimeSeriesCorridorChart points={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders SVG chart with points, corridor and legend', () => {
    const points = [
      { tick: 1, p10: 100, median: 150, p90: 200, target: 160 },
      { tick: 2, p10: 120, median: 170, p90: 220, target: 180 },
      { tick: 3, p10: 140, median: 190, p90: 250, target: 200 },
    ];

    render(
      <TimeSeriesCorridorChart
        points={points}
        unit="k €"
        baselineValue={100}
        targetValue={220}
        showCorridor={true}
        showTarget={true}
      />,
    );

    expect(screen.getByRole('img', { name: /Zeitreihen-Verlauf/i })).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('P50 Median')).toBeInTheDocument();
    expect(screen.getByText('P10–P90 Korridor')).toBeInTheDocument();
  });
});
