import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { version as appVersion } from '../../../../package.json';

function renderDesktop(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar isMobile={false} />
    </MemoryRouter>,
  );
}

describe('Sidebar (branch2)', () => {
  it('mobil geschlossen rendert nichts', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile isMobileDrawerOpen={false} />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('mobiler Drawer: Dialog mit Schließen per X, Backdrop und Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile isMobileDrawerOpen onCloseMobileDrawer={onClose} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('dialog', { name: 'Hauptnavigation' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Menü schließen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Menü schließen (Hintergrund)' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('mobiler Nav-Klick ruft Close-Handler (bereits abgedeckt: Desktop ruft ihn nicht)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={['/crm/leads']}>
        <Sidebar isMobile isMobileDrawerOpen onCloseMobileDrawer={onClose} />
      </MemoryRouter>,
    );
    await user.click(screen.getByTestId('nav-item-s-leads'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Logo-Fehler blendet Bild aus, Footer zeigt Version', () => {
    renderDesktop();
    const logo = screen.getByAltText('LeadPilot Logo');
    fireEvent.error(logo);
    expect(logo).toHaveStyle({ display: 'none' });
    expect(screen.getByText('LeadPilot GmbH © 2026')).toBeInTheDocument();
    expect(screen.getByText(`LeadPilot v${appVersion}`)).toBeInTheDocument();
  });

  it('Leads-Nav trägt Zähler-Badge, aktive Kategorie in Primärfarbe', () => {
    renderDesktop('/crm/leads');
    const leads = screen.getByTestId('nav-item-s-leads');
    expect(leads.textContent).toContain('0');
    expect(screen.getByRole('button', { name: /^CRM/ })).toHaveClass('text-primary');
  });

  it('Kategorie-Pfeil wechselt Auf/Zu, nicht-aktive Kategorie gedimmt', async () => {
    const user = userEvent.setup();
    renderDesktop();
    const finanzen = screen.getByRole('button', { name: /Finanzen/ });
    expect(finanzen.textContent).toContain('▼');
    expect(finanzen).not.toHaveClass('text-primary');
    await user.click(finanzen);
    expect(finanzen.textContent).toContain('▲');
  });

  it('unbekannte Route fällt auf Dashboard zurück ohne Crash', () => {
    renderDesktop('/route-gibt-es-nicht-xyz');
    expect(screen.getByText('LeadPilot GmbH © 2026')).toBeInTheDocument();
  });
});
