import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSeriesCorridorChart } from '../TimeSeriesCorridorChart';
import type { TimeSeriesPoint } from '../TimeSeriesCorridorChart';

const PTS: TimeSeriesPoint[] = [
  { tick: 0, p10: 380000, median: 411840, p90: 445000, target: 500000 },
  {
    tick: 1,
    p10: 390000,
    median: 425000,
    p90: 460000,
    target: 500000,
    event: { title: 'Launch', type: 'release' },
  },
  { tick: 2, p10: 400000, median: 438000, p90: 475000 },
];

describe('TimeSeriesCorridorChart (branch2)', () => {
  it('null bei leerer Punktliste, eigenes Aria-Label sonst', () => {
    const { container } = render(<TimeSeriesCorridorChart points={[]} />);
    expect(container.innerHTML).toBe('');
    render(<TimeSeriesCorridorChart points={PTS} ariaLabel="Mein Verlauf" unit="$" />);
    expect(screen.getByRole('img', { name: 'Mein Verlauf' })).toBeInTheDocument();
  });

  it('showCorridor=false blendet Korridor-Polygon aus', () => {
    const { container } = render(<TimeSeriesCorridorChart points={PTS} showCorridor={false} />);
    expect(container.querySelector('polygon')).toBeNull();
    // Median-Linie bleibt
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('showTarget=false blendet Ziellinie und Ziel-Legende aus', () => {
    const { container } = render(
      <TimeSeriesCorridorChart points={PTS} targetValue={500000} showTarget={false} />,
    );
    expect(screen.queryByText(/Ziel:/)).toBeNull();
    expect(container.innerHTML).not.toContain('Ziel (');
  });

  it('ohne targetValue keine Ziellinie trotz showTarget', () => {
    render(<TimeSeriesCorridorChart points={PTS} showTarget />);
    expect(screen.queryByText(/Ziel:/)).toBeNull();
  });

  it('Baseline-Punkt und Legenden-Einträge bei Basis- und Zielwert', () => {
    const { container } = render(
      <TimeSeriesCorridorChart points={PTS} baselineValue={411840} targetValue={500000} />,
    );
    expect(screen.getByText('Ebene A Basis')).toBeInTheDocument();
    expect(screen.getByText(/Ziel \(/)).toBeInTheDocument();
    // Baseline-Kreis am ersten Median
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it('Event-Marker-Linie bei Punkt mit Event', () => {
    const { container } = render(<TimeSeriesCorridorChart points={PTS} />);
    // Event-Linie nutzt accent-Farbe mit dasharray 2 2
    const dashed = Array.from(container.querySelectorAll('line')).filter(
      (l) => l.getAttribute('stroke-dasharray') === '2 2',
    );
    expect(dashed.length).toBeGreaterThanOrEqual(1);
  });

  it('Hover über Trefferfläche zeigt Tooltip mit P10/P50/P90', () => {
    const { container } = render(<TimeSeriesCorridorChart points={PTS} />);
    const hitAreas = Array.from(container.querySelectorAll('rect')).filter(
      (r) => r.getAttribute('fill') === 'transparent',
    );
    expect(hitAreas.length).toBe(PTS.length);
    fireEvent.mouseEnter(hitAreas[1]!);
    expect(screen.getByText('Tick #1')).toBeInTheDocument();
    // P50 steht zusätzlich in der Legende -> Tooltip bringt zweites Vorkommen
    expect(screen.getAllByText('P50 Median').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('P90 (Optimistisch)')).toBeInTheDocument();
    expect(screen.getByText('P10 (Pessimistisch)')).toBeInTheDocument();
  });

  it('Einzelpunkt und Punkt-Targets fließen in Skala ein', () => {
    const { container } = render(
      <TimeSeriesCorridorChart points={[PTS[0]!]} baselineValue={100} targetValue={900000} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText(/Ziel \(/)).toBeInTheDocument();
  });
});
