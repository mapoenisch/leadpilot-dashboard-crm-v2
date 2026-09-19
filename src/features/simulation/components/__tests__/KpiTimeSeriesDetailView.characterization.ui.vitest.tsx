import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KpiTimeSeriesDetailView } from '../KpiTimeSeriesDetailView';

describe('KpiTimeSeriesDetailView (characterization)', () => {
  it('Standard-Render: KPI-Tabs, Summary und Darstellungsmodus', () => {
    render(<KpiTimeSeriesDetailView />);
    expect(
      screen.getByRole('button', { name: 'ARR (Jährlich wiederkehrend)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'MRR (Monatlich wiederkehrend)' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Detailanalyse \(P50 Median\)/)).toBeInTheDocument();
    expect(screen.getByText('Darstellungsmodus:')).toBeInTheDocument();
    expect(screen.getByText('Monte-Carlo Häufigkeitsverteilung (Histogramm)')).toBeInTheDocument();
  });

  it('Darstellungsmodus Delta bleibt interaktiv', async () => {
    const user = userEvent.setup();
    render(<KpiTimeSeriesDetailView />);
    await user.click(screen.getByRole('button', { name: /Delta Baseline/ }));
    expect(screen.getByText('Darstellungsmodus:')).toBeInTheDocument();
    expect(screen.getByText(/P50 \(Median\):/)).toBeInTheDocument();
  });

  it('KPI-Wechsel auf MRR aktualisiert die Detailüberschrift', async () => {
    const user = userEvent.setup();
    render(<KpiTimeSeriesDetailView />);
    await user.click(screen.getByRole('button', { name: 'MRR (Monatlich wiederkehrend)' }));
    expect(screen.getByText(/MRR \(Monatlich wiederkehrend\) · Detailanalyse/)).toBeInTheDocument();
  });
});
