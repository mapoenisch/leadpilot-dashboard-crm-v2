import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationsHub } from '../OperationsHub';
import { FUNKTION } from '@/domain/produktData';

describe('OperationsHub (branch)', () => {
  it('rendert alle vier Module mit Vertriebsbezug', () => {
    render(<OperationsHub />);
    for (const m of FUNKTION.modules) {
      expect(screen.getByText(m.name)).toBeInTheDocument();
    }
    expect(screen.getAllByText('Vertriebsbezug').length).toBe(4);
    expect(screen.getByText(/Inbound-Erfassung/)).toBeInTheDocument();
    expect(screen.getByText(/Priorisierung/)).toBeInTheDocument();
  });

  it('rendert Zentrum mit allen Pipeline-Stufen', () => {
    render(<OperationsHub />);
    expect(screen.getByTestId('hub-center')).toBeInTheDocument();
    for (const stage of ['New', 'MQL', 'SQL', 'Hot', 'Won', 'Lost']) {
      expect(screen.getByText(stage)).toBeInTheDocument();
    }
    expect(screen.getByText('Zentraler Knotenpunkt')).toBeInTheDocument();
  });

  it('rendert gerichtete Verbinder oben und unten', () => {
    render(<OperationsHub />);
    expect(screen.getByTestId('hub-connector-top')).toBeInTheDocument();
    expect(screen.getByTestId('hub-connector-bottom')).toBeInTheDocument();
    expect(screen.getByText('Inbound-Leads erfassen')).toBeInTheDocument();
    expect(screen.getByText('Outreach- & Follow-up-Reihen')).toBeInTheDocument();
  });

  it('blendet die Modulübersicht per Toggle ein und aus', async () => {
    const user = userEvent.setup();
    render(<OperationsHub />);
    const toggle = screen.getByRole('button', { name: 'Modulübersicht anzeigen' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByText('Vollständige Modulübersicht aus der Produkt-Konfiguration:'),
    ).toBeNull();

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Modulübersicht verbergen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(
      screen.getByText('Vollständige Modulübersicht aus der Produkt-Konfiguration:'),
    ).toBeInTheDocument();
    expect(document.getElementById('operations-hub-table')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Modulübersicht verbergen' }));
    expect(
      screen.queryByText('Vollständige Modulübersicht aus der Produkt-Konfiguration:'),
    ).toBeNull();
  });
});
