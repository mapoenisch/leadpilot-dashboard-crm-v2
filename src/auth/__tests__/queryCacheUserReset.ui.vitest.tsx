// Auftrag 084: Keine Query-Daten eines vorherigen Benutzers nach Abmeldung oder Wechsel, auch nicht
// bei einer gemounteten Seite mit aktivem Observer (Codex PR #69).
import { describe, it, expect } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth, type AuthContextValue } from '../AuthContext';
import type { AuthAdapter, User } from '../authAdapter';

function createAdapter(initial: User | null): AuthAdapter & { current: () => User | null } {
  let current = initial;
  return {
    current: () => current,
    getSession: () => current,
    login: async (email: string) => {
      current = { id: `id-${email}`, email };
      return current;
    },
    logout: async () => {
      current = null;
    },
  } as AuthAdapter & { current: () => User | null };
}

function setup(initial: User | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const adapter = createAdapter(initial);
  const seen: string[] = [];
  let auth!: AuthContextValue;

  // Wie useCrmListQuery: Key ohne Benutzer, placeholderData aus dem vorherigen Ergebnis.
  function CrmProbe() {
    auth = useAuth();
    const { data } = useQuery({
      queryKey: ['crm', 'list', 'deals', { page: 1 }],
      queryFn: async () => `Deals von ${adapter.current()?.email ?? 'niemand'}`,
      placeholderData: (previous) => previous,
      staleTime: 60_000,
    });
    const text = data ?? 'lädt';
    seen.push(text);
    return <div data-testid="crm">{text}</div>;
  }

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider adapter={adapter} onUserChange={() => void queryClient.resetQueries()}>
        <CrmProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { queryClient, seen, getAuth: () => auth };
}

describe('Benutzerwechsel setzt Query-Daten zurück (AuthProvider.onUserChange)', () => {
  it('zeigt nach Wechsel A → B bei gemounteter Seite nie wieder Daten von A', async () => {
    const { seen, getAuth } = setup({ id: 'id-a@x.de', email: 'a@x.de' });
    await waitFor(() => expect(screen.getByTestId('crm')).toHaveTextContent('Deals von a@x.de'));
    const before = seen.length;

    await act(async () => {
      await getAuth().login('b@x.de', 'pw');
    });

    await waitFor(() => expect(screen.getByTestId('crm')).toHaveTextContent('Deals von b@x.de'));
    expect(seen.slice(before)).not.toContain('Deals von a@x.de');
  });

  it('verwirft die Daten bei Abmeldung', async () => {
    const { queryClient, seen, getAuth } = setup({ id: 'id-a@x.de', email: 'a@x.de' });
    await waitFor(() => expect(screen.getByTestId('crm')).toHaveTextContent('Deals von a@x.de'));
    const before = seen.length;

    await act(() => getAuth().logout());

    expect(seen.slice(before)[0]).not.toBe('Deals von a@x.de');
    await waitFor(() =>
      expect(queryClient.getQueryData(['crm', 'list', 'deals', { page: 1 }])).not.toBe(
        'Deals von a@x.de',
      ),
    );
  });

  it('setzt bei der ersten Anmeldung ohne vorherigen Benutzer nichts zurück', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['crm', 'x'], 'bleibt');
    const adapter = createAdapter(null);
    let auth!: AuthContextValue;
    function Capture() {
      auth = useAuth();
      return null;
    }
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider adapter={adapter} onUserChange={() => void queryClient.resetQueries()}>
          <Capture />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await act(async () => {
      await auth.login('a@x.de', 'pw');
    });
    expect(queryClient.getQueryData(['crm', 'x'])).toBe('bleibt');
  });
});
