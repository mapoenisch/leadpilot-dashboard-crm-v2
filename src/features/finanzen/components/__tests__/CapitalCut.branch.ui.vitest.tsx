import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapitalCut } from '../CapitalCut';
import { BILANZ } from '@/domain/finanzenData';

describe('CapitalCut (branch)', () => {
  it('rendert Kopf, Bilanzsumme und beide Hälften', () => {
    render(<CapitalCut />);
    expect(screen.getByText('KAPITAL-SCHNITT')).toBeInTheDocument();
    expect(screen.getByText('Mittelverwendung (Aktiva)')).toBeInTheDocument();
    expect(screen.getByText('Finanzierung (Passiva)')).toBeInTheDocument();
    const total = BILANZ.aktiva.find((r) => r[0]?.includes('Gesamtaktiva'))?.[1] ?? '';
    expect(screen.getAllByText(total).length).toBeGreaterThan(0);
  });

  it('rendert alle Aktiva-Hauptpositionen mit Anteilen', () => {
    const { container } = render(<CapitalCut />);
    for (const idx of [0, 3, 7]) {
      const title = BILANZ.aktiva[idx]?.[0] ?? '';
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    // Prozentanteile im Format "12,3 %"
    const shares = container.querySelectorAll('span');
    const hasShare = Array.from(shares).some((s) => /\(\d+,\d %\)/.test(s.textContent ?? ''));
    expect(hasShare).toBe(true);
  });

  it('rendert alle Passiva-Hauptpositionen mit Unterpositionen', () => {
    render(<CapitalCut />);
    for (const idx of [0, 5, 6, 10]) {
      const title = BILANZ.passiva[idx]?.[0] ?? '';
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    // Unterpositionen (z. B. Eigenkapital-Details) sind sichtbar
    const sub = BILANZ.passiva[1]?.[0]?.trim() ?? '';
    if (sub) expect(screen.getByText(sub)).toBeInTheDocument();
  });

  it('zeichnet proportionale Balken mit Titeln je Segment', () => {
    const { container } = render(<CapitalCut />);
    const titled = container.querySelectorAll('div[title]');
    // 3 Aktiva- + 4 Passiva-Segmente
    expect(titled.length).toBe(7);
    for (const el of Array.from(titled)) {
      expect(el.getAttribute('title')).toMatch(/\(.*%\)/);
    }
  });

  it('ist als region mit aussagekräftigem Label ausgezeichnet', () => {
    render(<CapitalCut />);
    expect(
      screen.getByRole('region', { name: 'Mittelverwendung und Finanzierung' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Kapital-Schnitt Mittelverwendung und Finanzierung'),
    ).toBeInTheDocument();
  });
});
