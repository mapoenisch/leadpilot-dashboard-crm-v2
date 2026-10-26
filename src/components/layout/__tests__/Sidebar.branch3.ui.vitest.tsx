import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { NAV_CATEGORIES } from '../../../domain/navData';

afterEach(() => {
  vi.clearAllMocks();
});

function renderDesktop(path = '/dashboard', onClose?: () => void) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar isMobile={false} onCloseMobileDrawer={onClose} />
    </MemoryRouter>,
  );
}

function renderMobileDrawer(onClose?: () => void) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Sidebar isMobile isMobileDrawerOpen onCloseMobileDrawer={onClose} />
    </MemoryRouter>,
  );
}

describe('Sidebar (branch3)', () => {
  it('Focus-Trap: Shift+Tab vom ersten zum letzten, Tab vom letzten zum ersten', () => {
    renderMobileDrawer();
    const drawer = screen.getByRole('dialog', { name: 'Hauptnavigation' });
    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      ),
    );
    expect(focusable.length).toBeGreaterThan(1);
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    first.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(window, { key: 'a' });
    expect(document.activeElement).toBe(first);
  });

  describe('Fokusführung des mobilen Drawers', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <MemoryRouter initialEntries={['/dashboard']}>
          <button id="mobile-menu-trigger" type="button" onClick={() => setOpen(true)}>
            Menü öffnen
          </button>
          <Sidebar isMobile isMobileDrawerOpen={open} onCloseMobileDrawer={() => setOpen(false)} />
        </MemoryRouter>
      );
    }

    async function openDrawer() {
      const user = userEvent.setup();
      render(<Harness />);
      const trigger = screen.getByText('Menü öffnen');
      trigger.focus();
      await user.click(trigger);
      const drawer = await screen.findByRole('dialog', { name: 'Hauptnavigation' });
      return { user, trigger, drawer };
    }

    it('setzt den Fokus beim Öffnen in den Drawer', async () => {
      const { drawer } = await openDrawer();
      await waitFor(() => expect(document.activeElement).toBe(drawer));
    });

    it('Escape schließt und gibt den Fokus an den Auslöser zurück', async () => {
      const { trigger } = await openDrawer();
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(document.activeElement).toBe(trigger);
    });

    it('Schließen per X gibt den Fokus an den Auslöser zurück', async () => {
      const { user, trigger } = await openDrawer();
      await user.click(screen.getByRole('button', { name: 'Menü schließen' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(document.activeElement).toBe(trigger);
    });

    it('Klick auf den Hintergrund gibt den Fokus an den Auslöser zurück', async () => {
      const { user, trigger } = await openDrawer();
      await user.click(screen.getByRole('button', { name: 'Menü schließen (Hintergrund)' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('mobiler Drawer ohne Handler zeigt kein X und übersteht Nav-Klicks', async () => {
    const user = userEvent.setup();
    renderMobileDrawer(undefined);
    expect(screen.queryByRole('button', { name: 'Menü schließen' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Menü schließen (Hintergrund)' }),
    ).toBeInTheDocument();
    await user.click(screen.getByText('Executive Dashboard'));
    expect(screen.getByRole('dialog', { name: 'Hauptnavigation' })).toBeInTheDocument();
  });

  it('unbekannte Kategorie nutzt Icon-Fallback und Dashboard-Fallbackroute', async () => {
    const user = userEvent.setup();
    NAV_CATEGORIES.push({
      id: 'sonderkategorie',
      label: 'Sonderkategorie',
      items: [{ id: 'phantom-ansicht', label: 'Phantom-Ansicht' }],
    } as never);
    try {
      renderDesktop();
      const toggle = screen.getByRole('button', { name: /Sonderkategorie/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const link = screen.getByText('Phantom-Ansicht').closest('a');
      expect(link?.getAttribute('href')).toBe('/dashboard');
    } finally {
      NAV_CATEGORIES.pop();
    }
  });

  it('Desktop-Nav-Klick ruft den mobilen Close-Handler nicht auf', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDesktop('/dashboard', onClose);
    await user.click(screen.getByText('Executive Dashboard'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Klicks im Drawer stoppen die Ausbreitung und schließen nicht', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderMobileDrawer(onClose);
    await user.click(screen.getByRole('button', { name: /^CRM/ }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Hauptnavigation' })).toBeInTheDocument();
  });
});
