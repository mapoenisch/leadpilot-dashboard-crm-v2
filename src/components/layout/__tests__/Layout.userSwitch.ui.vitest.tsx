import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../Layout';

const authState = vi.hoisted(() => ({ user: { id: 'u1' } as { id: string } | null }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, logout: vi.fn() }),
}));
vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({ session: null, isLoading: false }),
}));

const trigger = () => screen.getByRole('button', { name: 'Hauptmenü umschalten', hidden: true });

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Layout />
    </MemoryRouter>,
  );
}

describe('Layout: mobiles Menü bei Benutzerwechsel', () => {
  beforeEach(() => {
    authState.user = { id: 'u1' };
    window.innerWidth = 500;
  });

  it('schließt das offene Menü, wenn ein anderer Benutzer angemeldet ist', async () => {
    const user = userEvent.setup();
    const view = renderLayout();
    await user.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');

    authState.user = { id: 'u2' };
    act(() => {
      view.rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Layout />
        </MemoryRouter>,
      );
    });

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('lässt das Menü offen, solange derselbe Benutzer angemeldet bleibt', async () => {
    const user = userEvent.setup();
    const view = renderLayout();
    await user.click(trigger());
    act(() => {
      view.rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Layout />
        </MemoryRouter>,
      );
    });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });
});
