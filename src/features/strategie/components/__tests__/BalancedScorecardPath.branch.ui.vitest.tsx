import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalancedScorecardPath } from '../BalancedScorecardPath';

describe('BalancedScorecardPath (branch)', () => {
  it('rendert Kopf und alle vier Stufen-Badges', () => {
    render(<BalancedScorecardPath />);
    expect(
      screen.getByText('Wirkungsbahn: Lernen → Prozesse → Kunde → Finanzen'),
    ).toBeInTheDocument();
    for (const badge of [
      'STUFE 1 · LERNEN & ENTWICKLUNG',
      'STUFE 2 · INTERNE PROZESSE',
      'STUFE 3 · KUNDENPERSPEKTIVE',
      'STUFE 4 · FINANZEN (ZIELERGEBNIS)',
    ]) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }
  });

  it('rendert drei gerichtete Kausalverbinder mit Brückentext', () => {
    render(<BalancedScorecardPath />);
    expect(screen.getAllByRole('separator').length).toBe(3);
    expect(screen.getAllByText('Kausalitätsbrücke:').length).toBe(3);
    expect(screen.getByText(/Personal\/Skills → Plattformstabilität/)).toBeInTheDocument();
    expect(screen.getByText(/Time-to-Value und geführte Trials/)).toBeInTheDocument();
    expect(screen.getByText(/Net Promoter Score/)).toBeInTheDocument();
  });

  it('rendert KPI-Chips je Perspektive', () => {
    const { container } = render(<BalancedScorecardPath />);
    const chips = container.querySelectorAll('.bsc-kpi-grid > div');
    expect(chips.length).toBeGreaterThan(4);
  });

  it('ist als region mit Stufen-Labels für Screenreader ausgezeichnet', () => {
    render(<BalancedScorecardPath />);
    expect(
      screen.getByRole('region', { name: 'Kausale Wirkungskette der Balanced Scorecard' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/STUFE 4 · FINANZEN/)).toBeInTheDocument();
  });
});
