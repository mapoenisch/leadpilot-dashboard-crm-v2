import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { version as appVersion } from '../../../../package.json';

function renderDesktop(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar isMobile={false} />
    </MemoryRouter>,
  );
}

function GoToFinanzen() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/finance/p-and-l')}>
      gehe zu finanzen
    </button>
  );
}

describe('Sidebar (branch)', () => {
  it('öffnet eine geschlossene Kategorie und zeigt ihre Einträge', async () => {
    const user = userEvent.setup();
    renderDesktop();
    expect(screen.queryByText('Gewinn- und Verlustrechnung')).toBeNull();
    const finanzen = screen.getByRole('button', { name: /Finanzen/ });
    expect(finanzen).toHaveAttribute('aria-expanded', 'false');
    await user.click(finanzen);
    expect(finanzen).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Gewinn- und Verlustrechnung')).toBeInTheDocument();
  });

  it('schließt eine offene Kategorie und versteckt ihre Einträge', async () => {
    const user = userEvent.setup();
    renderDesktop();
    expect(screen.getByText('Leads & Kontakte')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^CRM/ }));
    expect(screen.queryByText('Leads & Kontakte')).toBeNull();
  });

  it('markiert den aktiven Eintrag zur aktuellen Route', () => {
    renderDesktop('/crm/leads');
    expect(screen.getByTestId('nav-item-s-leads')).toHaveAttribute('aria-current', 'page');
  });

  it('öffnet die Routen-Kategorie bei Navigation automatisch', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile={false} />
        <GoToFinanzen />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Finanzen/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await user.click(screen.getByRole('button', { name: 'gehe zu finanzen' }));
    expect(screen.getByRole('button', { name: /Finanzen/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Gewinn- und Verlustrechnung')).toBeInTheDocument();
  });

  it('ruft mobil beim Klick auf einen Nav-Link den Close-Handler', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile isMobileDrawerOpen onCloseMobileDrawer={handleClose} />
      </MemoryRouter>,
    );
    await user.click(screen.getByText('Executive Dashboard'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('schließt mobil per Hintergrund-Button', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile isMobileDrawerOpen onCloseMobileDrawer={handleClose} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Menü schließen (Hintergrund)' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('rendert desktop als aside mit Footer, mobil als Dialog', () => {
    const { unmount } = renderDesktop();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('LeadPilot GmbH © 2026')).toBeInTheDocument();
    expect(screen.getByText(`LeadPilot v${appVersion}`)).toBeInTheDocument();
    unmount();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile isMobileDrawerOpen />
      </MemoryRouter>,
    );
    expect(screen.getByRole('dialog', { name: 'Hauptnavigation' })).toBeInTheDocument();
  });
});
