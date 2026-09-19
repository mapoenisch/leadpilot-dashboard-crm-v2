import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevenueCostShoreline } from '../RevenueCostShoreline';
import { GUV } from '../../../../domain/finanzenData';

describe('RevenueCostShoreline (branch2)', () => {
  it('rendert Kopf mit dynamischer Jahresspanne und Ergebnislücken-Text', () => {
    render(<RevenueCostShoreline />);
    expect(screen.getByText('ERTRAGSUFER GUV')).toBeInTheDocument();
    expect(screen.getByText(/Ertragsufer & Ergebnislücke \(/)).toBeInTheDocument();
    expect(screen.getByText(/Die schraffierte Spanne/)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Diagramm: Ertragsufer Umsatz vs. Kosten' }),
    ).toBeInTheDocument();
  });

  it('zeichnet Achsen-Ticks, Lücken-Polygon und beide Uferlinien', () => {
    const { container } = render(<RevenueCostShoreline />);
    const ticks = Array.from(container.querySelectorAll('text')).filter((t) =>
      /k€$/.test(t.textContent ?? ''),
    );
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    const paths = container.querySelectorAll('path');
    // Gap-Polygon + Kosten- + Umsatz-Linie
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });

  it('Legende erklärt Umsatz, Kosten und Ergebnislücke', () => {
    render(<RevenueCostShoreline />);
    expect(screen.getByText('Umsatzerlöse (Gesamtumsatz)')).toBeInTheDocument();
    expect(screen.getByText('Operative Gesamtkosten')).toBeInTheDocument();
    expect(screen.getByText('Ergebnislücke (EBITDA)')).toBeInTheDocument();
  });

  it('je Periode eine Detailkarte mit allen GuV-Zeilen', () => {
    render(<RevenueCostShoreline />);
    const region = screen.getByRole('region', { name: 'GuV-Periodenvergleich' });
    expect(region).toBeInTheDocument();
    const articles = region.querySelectorAll('article');
    expect(articles.length).toBe(GUV.headers.length - 1);
    expect(screen.getAllByText('Umsatzerlöse:').length).toBe(articles.length);
    expect(screen.getAllByText('Gesamtkosten:').length).toBe(articles.length);
    expect(screen.getAllByText('EBITDA (Lücke):').length).toBe(articles.length);
    expect(screen.getAllByText('Jahresfehlbetrag:').length).toBe(articles.length);
    expect(screen.getAllByText('GuV-Abschnitt').length).toBe(articles.length);
  });

  it('Perioden-Labels erscheinen in Diagramm und Karten', () => {
    render(<RevenueCostShoreline />);
    const labels = GUV.headers.filter((_, i) => i > 0);
    for (const label of labels) {
      expect(screen.getAllByText(label as string).length).toBeGreaterThanOrEqual(2);
    }
  });
});
