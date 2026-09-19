import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChannelInvestmentRoute } from '../ChannelInvestmentRoute';

describe('ChannelInvestmentRoute (characterization)', () => {
  it('rendert Header und Benchmark-Leiste', () => {
    render(<ChannelInvestmentRoute />);
    expect(screen.getByText('INVESTITIONSROUTE')).toBeInTheDocument();
    expect(screen.getByText('Kanal-Allokationspfad & CAC-Effizienz')).toBeInTheDocument();
    expect(screen.getByText('Gesamter Spend (Ist)')).toBeInTheDocument();
    expect(screen.getByText('Gewonnene Neukunden')).toBeInTheDocument();
    expect(screen.getByText('Blended Marketing-CAC')).toBeInTheDocument();
  });

  it('vergibt alle drei Maßnahmen-Badges aus den Kanaldaten', () => {
    render(<ChannelInvestmentRoute />);
    expect(screen.getAllByText('Erhöhen')).toHaveLength(2);
    expect(screen.getAllByText('Stoppen')).toHaveLength(1);
    expect(screen.getAllByText('Halten')).toHaveLength(2);
  });

  it('zeigt je Kanal Budget, CAC, Neukunden und Quellenbewertung', () => {
    const { container } = render(<ChannelInvestmentRoute />);
    for (const channel of [
      'LinkedIn-Content',
      'SEO / Content',
      'Partner / Empfehlung',
      'Webinare',
      'Outbound-E-Mail',
    ]) {
      expect(screen.getByText(channel)).toBeInTheDocument();
    }
    expect(container.textContent).toContain('1. Budget & Spend');
    expect(container.textContent).toContain('2. Marketing-CAC');
    expect(container.textContent).toContain('3. Neukunden');
    expect(container.textContent).toContain('4. Maßnahme');
    expect(screen.getAllByText('Quellenbewertung:').length).toBe(5);
  });
});
