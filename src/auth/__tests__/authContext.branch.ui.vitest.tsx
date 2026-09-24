// Branch-Tests: AuthProvider mit Fake-Adapter (kein Supabase, kein Netz).
// Kanten: Adapter ohne initialize (synchron hydriert), async initialize
// (Hydration wartet), login/logout-Delegation, useAuth ohne Provider wirft.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import type { AuthAdapter, User } from '../authAdapter';

function fakeAdapter(over: Partial<AuthAdapter> = {}): AuthAdapter & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    getSession: () => null,
    login: async (email: string) => {
      calls.push(`login:${email}`);
      return { id: 'u-login', email };
    },
    logout: async () => {
      calls.push('logout');
    },
    ...over,
  };
}

function Probe() {
  const { user, isAuthenticated, isHydrated } = useAuth();
  return (
    <div>
      <div data-testid="hydrated">{isHydrated ? 'yes' : 'no'}</div>
      <div data-testid="auth">{isAuthenticated ? 'auth' : 'anon'}</div>
      <div data-testid="user">{user ? `${user.id}|${user.email}` : 'none'}</div>
    </div>
  );
}

describe('authContext.branch.ui', () => {
  it('Adapter ohne initialize: synchron hydriert mit getSession-Stand', () => {
    const adapter = fakeAdapter({ getSession: () => ({ id: 'u-0', email: 'a@b.de' }) });
    render(
      <AuthProvider adapter={adapter}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('hydrated').textContent).toBe('yes');
    expect(screen.getByTestId('auth').textContent).toBe('auth');
    expect(screen.getByTestId('user').textContent).toBe('u-0|a@b.de');
  });

  it('async initialize: wartet Hydration ab, übernimmt Sitzung', async () => {
    let notify: ((u: User | null) => void) | null = null;
    const adapter = fakeAdapter({
      getSession: () => null,
      initialize: (onChange) => {
        notify = onChange;
        return () => undefined;
      },
    });
    render(
      <AuthProvider adapter={adapter}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('hydrated').textContent).toBe('no');
    act(() => {
      notify!({ id: 'u-async', email: 'async@x.de' });
    });
    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));
    expect(screen.getByTestId('user').textContent).toBe('u-async|async@x.de');
  });

  it('login/logout delegieren an Adapter und spiegeln den User', async () => {
    const adapter = fakeAdapter();
    let api: {
      login: (e: string, p: string) => Promise<User>;
      logout: () => Promise<void>;
    } | null = null;
    function Grab() {
      const { login, logout } = useAuth();
      api = { login, logout };
      return <Probe />;
    }
    render(
      <AuthProvider adapter={adapter}>
        <Grab />
      </AuthProvider>,
    );
    await act(async () => {
      await api!.login('neu@x.de', 'pw');
    });
    expect(screen.getByTestId('user').textContent).toBe('u-login|neu@x.de');
    await act(async () => {
      await api!.logout();
    });
    expect(screen.getByTestId('auth').textContent).toBe('anon');
    expect(adapter.calls).toEqual(['login:neu@x.de', 'logout']);
  });

  it('login-Fehler propagiert ohne User zu setzen', async () => {
    const adapter = fakeAdapter({
      login: async () => {
        throw new Error('nope');
      },
    });
    let api: { login: (e: string, p: string) => Promise<User> } | null = null;
    function Grab() {
      const { login } = useAuth();
      api = { login };
      return <Probe />;
    }
    render(
      <AuthProvider adapter={adapter}>
        <Grab />
      </AuthProvider>,
    );
    await expect(api!.login('a@b.de', 'pw')).rejects.toThrow('nope');
    expect(screen.getByTestId('auth').textContent).toBe('anon');
  });

  it('useAuth ohne Provider wirft', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => render(<Probe />)).toThrow(/innerhalb eines AuthProviders/);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
