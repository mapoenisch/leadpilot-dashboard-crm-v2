import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DecisionTopology } from '../DecisionTopology';

describe('DecisionTopology (characterization)', () => {
  it('rendert Header, Legende und LeadPilot-Standardzone', () => {
    const { container } = render(<DecisionTopology />);
    expect(screen.getByText('Wettbewerbs-Topografie nach Einführungsaufwand')).toBeInTheDocument();
    expect(container.textContent).toContain('Höhenlegende:');
    expect(container.textContent).toContain('Keine Darstellung von Marktanteilen.');
    expect(screen.getAllByText(/LeadPilot Hochebene/).length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain('< 30 Minuten Setup');
  });

  it('bietet vier Zonenschalter mit LeadPilot-Vorauswahl', () => {
    render(<DecisionTopology />);
    const leadpilotBtn = screen.getByRole('button', { name: /LeadPilot Hochebene/ });
    expect(leadpilotBtn).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['Enterprise Suites', 'Marketing- & Service-Systeme', 'Pipeline Tools']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('wechselt die Detailkarte beim Zonenwechsel', () => {
    const { container } = render(<DecisionTopology />);
    fireEvent.click(screen.getByRole('button', { name: 'Pipeline Tools' }));
    expect(screen.getByRole('button', { name: 'Pipeline Tools' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(container.textContent).toContain('Pipedrive');
    expect(container.textContent).toContain('Topografische Route');
    expect(container.textContent).toContain('Differenzierung LeadPilot');
    fireEvent.click(screen.getByRole('button', { name: 'Enterprise Suites' }));
    expect(container.textContent).toContain('Salesforce');
  });
});
