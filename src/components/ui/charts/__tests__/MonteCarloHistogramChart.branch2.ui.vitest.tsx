import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonteCarloHistogramChart } from '../MonteCarloHistogramChart';

const BUCKETS = [
  { min: 380000, max: 400000, count: 2 },
  { min: 400000, max: 420000, count: 8 },
  { min: 420000, max: 440000, count: 0 },
  { min: 440000, max: 460000, count: 5 },
];

describe('MonteCarloHistogramChart (branch2)', () => {
  it('leere Buckets bei genug Runs zeigen ebenfalls Empty-State', () => {
    render(<MonteCarloHistogramChart buckets={[]} totalRuns={10} median={410000} />);
    expect(screen.getByText('Monte-Carlo Verteilung im Aufbau')).toBeInTheDocument();
    expect(screen.getByText(/Aktuell: 10 \/ 3 Läufen/)).toBeInTheDocument();
  });

  it('custom minRequiredRuns hebt Schwelle', () => {
    render(
      <MonteCarloHistogramChart
        buckets={BUCKETS}
        totalRuns={5}
        median={410000}
        minRequiredRuns={10}
      />,
    );
    expect(screen.getByText(/Aktuell: 5 \/ 10 Läufen/)).toBeInTheDocument();
  });

  it('Hover zeigt Tooltip mit Häufigkeit und Prozent', () => {
    render(<MonteCarloHistogramChart buckets={BUCKETS} totalRuns={15} median={410000} unit="€" />);
    const bars = screen.getAllByRole('button', { name: /Histogramm-Bereich/ });
    expect(bars.length).toBe(4);
    fireEvent.mouseEnter(bars[1]!);
    expect(screen.getByText(/Intervall:/)).toBeInTheDocument();
    expect(screen.getByText('Häufigkeit')).toBeInTheDocument();
    // 8/15 ≈ 53 %
    expect(screen.getByText(/8 Läufe \(53%\)/)).toBeInTheDocument();
    fireEvent.mouseLeave(bars[1]!);
    expect(screen.queryByText('Häufigkeit')).not.toBeInTheDocument();
  });

  it('Null-Count-Bucket ohne Label, Median-Bucket hervorgehoben', () => {
    const { container } = render(
      <MonteCarloHistogramChart buckets={BUCKETS} totalRuns={15} median={410000} />,
    );
    // Median 410000 liegt in Bucket 400000–420000
    expect(screen.getByText('P50 Median:')).toBeInTheDocument();
    expect(container.innerHTML).toContain('Histogramm-Bereich 420000 bis 440000: 0 Treffer');
  });

  it('p10/p90 undefined fallen auf Bucket-Ränder zurück', () => {
    render(<MonteCarloHistogramChart buckets={BUCKETS} totalRuns={15} median={410000} unit="€" />);
    expect(screen.getByText('Min (P10):')).toBeInTheDocument();
    expect(screen.getByText('Max (P90):')).toBeInTheDocument();
  });

  it('p10/p90 gesetzt werden formatiert angezeigt, Tastatur wählt Bucket', async () => {
    const user = userEvent.setup();
    render(
      <MonteCarloHistogramChart
        buckets={BUCKETS}
        totalRuns={15}
        median={410000}
        p10={385000}
        p90={455000}
        unit="€"
      />,
    );
    const bars = screen.getAllByRole('button', { name: /Histogramm-Bereich/ });
    bars[0]!.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText(/Intervall:/)).toBeInTheDocument();
    fireEvent.blur(bars[0]!);
    expect(screen.queryByText('Häufigkeit')).not.toBeInTheDocument();
  });
});
