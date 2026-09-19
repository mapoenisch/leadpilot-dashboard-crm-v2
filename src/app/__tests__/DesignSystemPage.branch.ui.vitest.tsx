import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignSystemPage } from '../DesignSystemPage';

describe('DesignSystemPage (branch)', () => {
  it('schaltet das Demo-Theme hell/dunkel um', async () => {
    const user = userEvent.setup();
    document.documentElement.dataset.theme = 'dark';
    render(<DesignSystemPage />);
    await user.click(screen.getByRole('button', { name: 'Helles Design testen' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByText(/hell \(vorläufig/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dunkles Design testen' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('öffnet und schließt den Demo-Dialog', async () => {
    const user = userEvent.setup();
    render(<DesignSystemPage />);
    await user.click(screen.getByRole('button', { name: 'Modal öffnen' }));
    expect(screen.getByText('Demo-Dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dialog schließen' }));
    expect(screen.queryByText('Demo-Dialog')).toBeNull();
  });

  it('wechselt Tabs und rendert Zähler', async () => {
    const user = userEvent.setup();
    render(<DesignSystemPage />);
    expect(screen.getByRole('tab', { name: 'Eins' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: /Zwei/ }));
    expect(screen.getByRole('tab', { name: /Zwei/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('fängt den Demo-Fehler per Error Boundary ab', async () => {
    const user = userEvent.setup();
    render(<DesignSystemPage />);
    await user.click(screen.getByRole('button', { name: 'Fehler auslösen' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Fehler beim Laden der Seite')).toBeInTheDocument();
    expect(screen.getByText('Design-System-Demo-Fehler')).toBeInTheDocument();
  });

  it('wechselt die Select-Auswahl', async () => {
    const user = userEvent.setup();
    render(<DesignSystemPage />);
    const combo = screen.getAllByRole('combobox')[0]!;
    await user.click(combo);
    await user.click(screen.getByRole('option', { name: 'Option B' }));
    expect(combo).toHaveTextContent('Option B');
  });

  it('steuert Checkbox und Stepper', async () => {
    const user = userEvent.setup();
    render(<DesignSystemPage />);
    const checkbox = screen.getByRole('checkbox', { name: 'Aktiv' });
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();

    const stepper = screen.getByLabelText('Menge');
    expect(stepper).toHaveValue(4);
    await user.click(screen.getAllByRole('button', { name: 'Wert erhöhen' })[0]!);
    expect(stepper).toHaveValue(5);
    await user.click(screen.getAllByRole('button', { name: 'Wert verringern' })[0]!);
    expect(stepper).toHaveValue(4);
  });

  it('rendert alle Primitiv-Sektionen', () => {
    render(<DesignSystemPage />);
    for (const title of ['Alert', 'Badge', 'Button', 'Card', 'Charts', 'Table', 'Toolbar']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText('Hinweistext')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
