import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevenueCostShoreline } from '../RevenueCostShoreline';

describe('RevenueCostShoreline (characterization)', () => {
  it('rendert Header, Diagramm und Legende', () => {
    const { container } = render(<RevenueCostShoreline />);
    expect(screen.getByText('ERTRAGSUFER GUV')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Ertragsufer Umsatz vs. Kosten/ })).toBeInTheDocument();
    expect(screen.getByText('Umsatzerlöse (Gesamtumsatz)')).toBeInTheDocument();
    expect(screen.getByText('Operative Gesamtkosten')).toBeInTheDocument();
    expect(screen.getByText('Ergebnislücke (EBITDA)')).toBeInTheDocument();
    expect(container.textContent).toContain('Ertragsufer & Ergebnislücke');
  });

  it('zeigt je Periode eine Detailkarte mit GuV-Kennzahlen', () => {
    const { container } = render(<RevenueCostShoreline />);
    const region = screen.getByRole('region', { name: 'GuV-Periodenvergleich' });
    const cards = region.querySelectorAll('article');
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain('Umsatzerlöse:');
    expect(container.textContent).toContain('Gesamtkosten:');
    expect(container.textContent).toContain('EBITDA (Lücke):');
    expect(container.textContent).toContain('Jahresfehlbetrag:');
  });
});
