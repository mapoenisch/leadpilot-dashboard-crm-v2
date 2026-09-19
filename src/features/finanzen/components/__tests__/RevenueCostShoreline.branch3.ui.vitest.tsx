import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevenueCostShoreline } from '../RevenueCostShoreline';
import { GUV } from '@/domain/finanzenData';

const origHeaders = [...GUV.headers];
const origRows = GUV.rows.map((r) => [...r]);

function setGuv(headers: string[], rows: string[][]) {
  GUV.headers.splice(0, GUV.headers.length, ...headers);
  GUV.rows.splice(0, GUV.rows.length, ...rows);
}

afterEach(() => {
  setGuv(origHeaders, origRows);
});

describe('RevenueCostShoreline (branch3)', () => {
  it('parst ASCII-Minus, Unicode-Minus und positive Werte', () => {
    setGuv(
      ['Position (€)', 'FY 2024', 'FY 2025'],
      [
        ['Umsatzerlöse (Gesamtumsatz)', '164.000 €', '336.000 €'],
        ['Umsatzkosten (Hosting)', '-64.000 €', '-121.000 €'],
        ['Brutto', '100.000 €', '215.000 €'],
        ['Zwischen', '0 €', '0 €'],
        ['Rest', '0 €', '0 €'],
        ['Puffer', '0 €', '0 €'],
        ['Sales & Marketing', '−141.000 €', '−209.000 €'],
        ['Forschung & Entwicklung', '50.000 €', '60.000 €'],
        ['General & Administrative', '−83.000 €', '−107.000 €'],
        ['EBITDA', '−288.000 €', '−309.000 €'],
        ['AfA', '−14.000 €', '−18.000 €'],
        ['EBIT', '−302.000 €', '−327.000 €'],
        ['Finanz', '−4.000 €', '−5.500 €'],
        ['EBT', '−306.000 €', '−332.500 €'],
        ['Steuern', '−1.000 €', '−1.500 €'],
        ['Jahresfehlbetrag', '−307.000 €', '−334.000 €'],
      ],
    );
    render(<RevenueCostShoreline />);
    expect(screen.getByText('ERTRAGSUFER GUV')).toBeInTheDocument();
    expect(screen.getAllByText('164.000 €').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('−288.000 €').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('−307.000 €').length).toBeGreaterThanOrEqual(1);
  });

  it('nutzt Fallback-Zeilen wenn Suchbegriffe fehlen (EBITDA per Index, Fehlbetrag leer)', () => {
    const rows = Array.from({ length: 10 }, (_, i) => [
      `Generische Zeile ${i}`,
      '10.000 €',
      '20.000 €',
      '30.000 €',
    ]);
    setGuv(['Position (€)', 'FY 2024', 'FY 2025', 'Plan 2026'], rows);
    render(<RevenueCostShoreline />);
    // Keine der bekannten Zeilen gefunden -> Fallback-Indizes greifen,
    // Jahresfehlbetrag fällt auf die leere Standardzeile zurück.
    expect(screen.getByText('ERTRAGSUFER GUV')).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'GuV-Periodenvergleich' });
    expect(region.querySelectorAll('article')).toHaveLength(3);
    expect(screen.getAllByText('Jahresfehlbetrag:')).toHaveLength(3);
  });

  it('leere GuV rendert ohne Perioden und mit leerer Jahresspanne', () => {
    setGuv(['Position (€)'], []);
    render(<RevenueCostShoreline />);
    expect(screen.getByText('ERTRAGSUFER GUV')).toBeInTheDocument();
    expect(screen.getByText(/Ertragsufer & Ergebnislücke \( – \)/)).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'GuV-Periodenvergleich' });
    expect(region.querySelectorAll('article')).toHaveLength(0);
    expect(
      screen.getByRole('img', { name: 'Diagramm: Ertragsufer Umsatz vs. Kosten' }),
    ).toBeInTheDocument();
  });

  it('einzelne Periode ohne Jahreszahl nutzt Label-Spanne und erste Periode als Vergleich', () => {
    setGuv(
      ['Position', 'Q1'],
      [
        ['Umsatzerlöse (Gesamtumsatz)', '164.000 €'],
        ['Umsatzkosten (Hosting)', '−64.000 €'],
        ['Brutto', '100.000 €'],
        ['Zwischen', '0 €'],
        ['Rest', '0 €'],
        ['Puffer', '0 €'],
        ['Sales & Marketing', '−141.000 €'],
        ['Forschung & Entwicklung', '−164.000 €'],
        ['General & Administrative', '−83.000 €'],
        ['EBITDA', '−288.000 €'],
        ['AfA', '−14.000 €'],
        ['EBIT', '−302.000 €'],
        ['Finanz', '−4.000 €'],
        ['EBT', '−306.000 €'],
        ['Steuern', '−1.000 €'],
        ['Jahresfehlbetrag', '−307.000 €'],
      ],
    );
    const { container } = render(<RevenueCostShoreline />);
    expect(screen.getByText(/Ertragsufer & Ergebnislücke \(Q1 – Q1\)/)).toBeInTheDocument();
    const ticks = Array.from(container.querySelectorAll('text')).filter((t) =>
      /k€$/.test(t.textContent ?? ''),
    );
    expect(ticks.length).toBeGreaterThanOrEqual(2);
  });

  it('sehr große Werte fallen auf die Standard-Tickweite zurück', () => {
    setGuv(
      ['Position (€)', 'FY 2024', 'FY 2025'],
      [
        ['Umsatzerlöse (Gesamtumsatz)', '9.000.000 €', '12.000.000 €'],
        ['Umsatzkosten (Hosting)', '−64.000 €', '−121.000 €'],
        ['Brutto', '100.000 €', '215.000 €'],
        ['Zwischen', '0 €', '0 €'],
        ['Rest', '0 €', '0 €'],
        ['Puffer', '0 €', '0 €'],
        ['Sales & Marketing', '−141.000 €', '−209.000 €'],
        ['Forschung & Entwicklung', '−164.000 €', '−208.000 €'],
        ['General & Administrative', '−83.000 €', '−107.000 €'],
        ['EBITDA', '−288.000 €', '−309.000 €'],
        ['AfA', '−14.000 €', '−18.000 €'],
        ['EBIT', '−302.000 €', '−327.000 €'],
        ['Finanz', '−4.000 €', '−5.500 €'],
        ['EBT', '−306.000 €', '−332.500 €'],
        ['Steuern', '−1.000 €', '−1.500 €'],
        ['Jahresfehlbetrag', '−307.000 €', '−334.000 €'],
      ],
    );
    const { container } = render(<RevenueCostShoreline />);
    const ticks = Array.from(container.querySelectorAll('text')).filter((t) =>
      /k€$/.test(t.textContent ?? ''),
    );
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('9.000.000 €').length).toBeGreaterThanOrEqual(1);
  });
});
