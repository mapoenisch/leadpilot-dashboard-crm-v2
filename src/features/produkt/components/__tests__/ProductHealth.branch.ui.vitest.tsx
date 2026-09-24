import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductHealth } from '../ProductHealth';
import { PERF } from '@/domain/produktData';

describe('ProductHealth (branch)', () => {
  it('rendert Titel und alle drei Säulen', () => {
    render(<ProductHealth />);
    expect(screen.getByText(PERF.title)).toBeInTheDocument();
    for (const title of ['Stabilität', 'Nutzung', 'Onboarding']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('rendert erreichte und verfehlte Kennzahlen farblich getrennt', () => {
    const { container } = render(<ProductHealth />);
    // erreichte Werte (enthalten "erreicht") in Primärfarbe …
    expect(screen.getByText('99,7 % (Ziel: 99,5 % · erreicht)')).toHaveClass('text-primary');
    // … verfehlte Werte in Akzentfarbe
    expect(screen.getByText('58 % (Ziel: 70 % · verfehlt)')).toHaveClass('text-accent');
    expect(screen.getByText('59 % (Ziel: 60 % · verfehlt)')).toHaveClass('text-accent');
    expect(container.textContent).toContain('Ziel erreicht');
    expect(container.textContent).toContain('Ziel verfehlt');
  });

  it('blendet die Original-Tabelle per Toggle ein und aus', async () => {
    const user = userEvent.setup();
    render(<ProductHealth />);
    expect(
      screen.queryByText('Vollständige Liste der Leistungskennzahlen (Originaldaten):'),
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Tabelle anzeigen' }));
    expect(
      screen.getByText('Vollständige Liste der Leistungskennzahlen (Originaldaten):'),
    ).toBeInTheDocument();
    expect(document.getElementById('product-health-table')).not.toBeNull();
    // Alle sechs Original-Metriken stehen in der Tabelle
    for (const m of PERF.metrics) {
      expect(screen.getAllByText(m.label).length).toBeGreaterThan(0);
    }

    await user.click(screen.getByRole('button', { name: 'Tabelle verbergen' }));
    expect(
      screen.queryByText('Vollständige Liste der Leistungskennzahlen (Originaldaten):'),
    ).toBeNull();
  });
});
