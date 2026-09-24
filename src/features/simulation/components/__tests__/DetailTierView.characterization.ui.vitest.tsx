import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailTierView } from '../DetailTierView';

describe('DetailTierView (characterization)', () => {
  it('Standard-Render: KPI-Detail, Wachstumstreiber und Queue-Sektionen', () => {
    render(<DetailTierView />);
    expect(
      screen.getByRole('button', { name: 'ARR (Jährlich wiederkehrend)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aktive V1-Wachstumstreiber (Parameter Registry)')).toBeInTheDocument();
    expect(screen.getByText('Marketing-Budget:')).toBeInTheDocument();
    expect(
      screen.getByText('Sales Capacity & Sales Queue Analytics (Process Time vs. Queue Time)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Customer Success Health & CS Queue Analytics (Decisions 1374-1398)'),
    ).toBeInTheDocument();
  });

  it('Verteilung und Treiber-Sektionen sind vorhanden', () => {
    render(<DetailTierView />);
    expect(screen.getByText('Monte-Carlo Häufigkeitsverteilung (Histogramm)')).toBeInTheDocument();
    expect(screen.getByText(/Kanal-Mix \(Proportional Normalisiert\)/)).toBeInTheDocument();
  });
});
