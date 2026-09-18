import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FunnelLeakageWaterfall } from '../FunnelLeakageWaterfall';

describe('FunnelLeakageWaterfall (characterization)', () => {
  it('rendert Header mit Leadbasis und Gesamtverlust', () => {
    const { container } = render(<FunnelLeakageWaterfall />);
    expect(screen.getByText('FUNNEL-LECKAGE-WASSERFALL')).toBeInTheDocument();
    expect(screen.getByText('Konvertierungskaskade FY 2025')).toBeInTheDocument();
    expect(container.textContent).toContain('1.776');
    expect(container.textContent).toContain('Rechnerischer Gesamtverlust');
  });

  it('zeigt alle vier Stufenübergänge mit Verbleib und Verlust', () => {
    const { container } = render(<FunnelLeakageWaterfall />);
    for (const n of ['Stufe 1 ➔ 2', 'Stufe 2 ➔ 3', 'Stufe 3 ➔ 4', 'Stufe 4 ➔ 5']) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
    expect(container.textContent).toContain('Verbleib');
    expect(container.textContent).toContain('Verlust');
  });

  it('zeigt Summenabgleich und Trial-to-Paid-Anmerkung', () => {
    const { container } = render(<FunnelLeakageWaterfall />);
    expect(screen.getByText('Ausgangsbasis Leads')).toBeInTheDocument();
    expect(screen.getByText('Gewonnene Neukunden')).toBeInTheDocument();
    expect(screen.getByText('POTENZIAL-ANMERKUNG')).toBeInTheDocument();
    expect(container.textContent).toContain('Trial-to-Paid Potenzial');
  });
});
