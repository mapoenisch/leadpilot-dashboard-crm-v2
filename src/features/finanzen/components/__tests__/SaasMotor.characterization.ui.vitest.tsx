import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SaasMotor } from '../SaasMotor';

describe('SaasMotor (characterization)', () => {
  it('rendert alle vier KPI-Knoten in Lesereihenfolge', () => {
    render(<SaasMotor />);
    expect(screen.getByText('SAAS-MOTOR')).toBeInTheDocument();
    for (const title of [
      'ARPA & Deckungsbeitrag',
      'CAC-Payback',
      'Kunden-Retention',
      'Wiederkehrender MRR',
    ]) {
      expect(screen.getAllByText(title).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getByText('KNOTEN 1 VON 4')).toBeInTheDocument();
    expect(screen.getByText('KNOTEN 4 VON 4')).toBeInTheDocument();
  });

  it('rendert vier Kanten mit neutralen Texten', () => {
    render(<SaasMotor />);
    for (const n of ['KANTE 1:', 'KANTE 2:', 'KANTE 3:', 'KANTE 4:']) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
    expect(screen.getByText('(Rechnerische Verknüpfung)')).toBeInTheDocument();
  });

  it('kennzeichnet nicht-kausale Zusammenhänge mit Disclaimer', () => {
    const { container } = render(<SaasMotor />);
    const matches = (container.textContent ?? '').match(
      /KPI-Zusammenhang, keine nachgewiesene Kausalität/g,
    );
    expect(matches?.length).toBe(3);
  });
});
