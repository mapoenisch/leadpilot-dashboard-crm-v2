import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketOpportunityStack } from '../MarketOpportunityStack';

describe('MarketOpportunityStack (characterization)', () => {
  it('rendert alle drei Stapelschichten mit Kennzahlen', () => {
    const { container } = render(<MarketOpportunityStack />);
    expect(screen.getByText('Chancenstapel Marktpotenzial')).toBeInTheDocument();
    for (const badge of ['Marktvolumen', 'Adressierbarer Fokusmarkt', 'Erreichte Aufmerksamkeit']) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }
    expect(container.textContent).toContain('14,23 Mrd. USD');
    expect(container.textContent).toContain('< 0,1 %');
  });

  it('blendet die Referenztabelle per Button ein und aus', () => {
    const { container } = render(<MarketOpportunityStack />);
    expect(container.querySelector('#market-stack-table')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Detailtabelle einblenden' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Tabelle ausblenden' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(container.querySelector('#market-stack-table')).not.toBeNull();
    expect(screen.getByText('Referenztabelle (MARKT.overview)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle ausblenden' }));
    expect(container.querySelector('#market-stack-table')).toBeNull();
  });

  it('zeigt methodische Fußzeile mit DE-Anteil', () => {
    const { container } = render(<MarketOpportunityStack />);
    expect(container.textContent).toContain('DE-Anteil: 24,4 %');
    expect(container.textContent).toContain('LeadPilot: < 0,1 %');
  });
});
