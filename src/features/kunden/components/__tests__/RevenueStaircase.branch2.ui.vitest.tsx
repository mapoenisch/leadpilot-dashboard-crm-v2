import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevenueStaircase } from '../RevenueStaircase';

describe('RevenueStaircase (branch2)', () => {
  it('rendert Header mit Gesamt-ARR und alle vier Stufen', () => {
    render(<RevenueStaircase />);
    expect(screen.getByText('UMSATZ-STAFFEL')).toBeInTheDocument();
    expect(screen.getByText('Stufenweiser Aufbau des Gesamt-ARR (411.840 €)')).toBeInTheDocument();
    expect(screen.getByText('Gesamtsumme ARR')).toBeInTheDocument();
    expect(screen.getAllByText('411.840 €').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Stufe 01')).toBeInTheDocument();
    expect(screen.getByText('Stufe 02')).toBeInTheDocument();
    expect(screen.getByText('Stufe 03')).toBeInTheDocument();
    expect(screen.getByText('Stufe 04')).toBeInTheDocument();
  });

  it('zeigt alle Segmentnamen mit Kunden- und Beitragswerten', () => {
    render(<RevenueStaircase />);
    expect(screen.getByText('Agenturen')).toBeInTheDocument();
    expect(screen.getByText('Großhandel')).toBeInTheDocument();
    expect(screen.getByText('IT / Software')).toBeInTheDocument();
    expect(screen.getByText('Maschinenbau')).toBeInTheDocument();
    expect(screen.getByText('10 Kunden')).toBeInTheDocument();
    expect(screen.getByText('14 Kunden')).toBeInTheDocument();
    expect(screen.getByText('18 Kunden')).toBeInTheDocument();
    expect(screen.getByText('24 Kunden')).toBeInTheDocument();
    expect(screen.getByText('+42.000 €')).toBeInTheDocument();
    expect(screen.getByText('+78.960 €')).toBeInTheDocument();
    expect(screen.getByText('+112.320 €')).toBeInTheDocument();
    expect(screen.getByText('+178.560 €')).toBeInTheDocument();
  });

  it('zeigt kumulierte ARR-Werte und Prozentanteile', () => {
    render(<RevenueStaircase />);
    expect(screen.getByText('42.000 €')).toBeInTheDocument();
    expect(screen.getByText('120.960 €')).toBeInTheDocument();
    expect(screen.getByText('233.280 €')).toBeInTheDocument();
    expect(screen.getAllByText('411.840 €').length).toBeGreaterThanOrEqual(2);
    // 42000/411840≈10 %, 120960/411840≈29 %, 233280/411840≈57 %, 411840/411840=100 %
    expect(screen.getByText('10 % vom Gesamt-ARR')).toBeInTheDocument();
    expect(screen.getByText('29 % vom Gesamt-ARR')).toBeInTheDocument();
    expect(screen.getByText('57 % vom Gesamt-ARR')).toBeInTheDocument();
    expect(screen.getByText('100 % vom Gesamt-ARR')).toBeInTheDocument();
  });

  it('setzt Stufenfarben als Inline-Styles (Border und Balken)', () => {
    const { container } = render(<RevenueStaircase />);
    const stepCard = container.querySelector('.staircase-step-1');
    expect(stepCard).not.toBeNull();
    const style = (stepCard as HTMLElement).getAttribute('style') ?? '';
    expect(style).toContain('border');
  });

  it('hat zugängliche Section-Beschriftung', () => {
    render(<RevenueStaircase />);
    expect(
      screen.getByRole('region', { name: 'Umsatz-Staffel Branchensegmente' }),
    ).toBeInTheDocument();
  });
});
