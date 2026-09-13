import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiScenarioComparisonChart, ScenarioSeries } from '../MultiScenarioComparisonChart';

describe('MultiScenarioComparisonChart', () => {
  it('returns null when series array is empty', () => {
    const { container } = render(<MultiScenarioComparisonChart series={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders SVG chart with scenario series and legend items', () => {
    const series: ScenarioSeries[] = [
      {
        id: 'baseline',
        name: 'Ist-Zustand',
        isReference: true,
        color: '#8FA3A1',
        points: [
          { tick: 1, value: 100 },
          { tick: 2, value: 110 },
          { tick: 3, value: 120 },
        ],
      },
      {
        id: 'growth',
        name: 'Wachstumsinitiative',
        isReference: false,
        color: '#00D9C6',
        points: [
          { tick: 1, value: 100 },
          { tick: 2, value: 130 },
          { tick: 3, value: 170 },
        ],
      },
    ];

    render(<MultiScenarioComparisonChart series={series} unit="k €" />);

    expect(
      screen.getByRole('img', { name: /Multi-Szenario Trajektorienvergleich/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ist-Zustand (Referenz)')).toBeInTheDocument();
    expect(screen.getByText('Wachstumsinitiative')).toBeInTheDocument();
  });
});
