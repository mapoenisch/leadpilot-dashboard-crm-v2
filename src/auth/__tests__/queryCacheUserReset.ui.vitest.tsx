// Auftrag 084: kein CRM-Cache eines vorherigen Benutzers nach Abmeldung oder Wechsel.
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth, type AuthContextValue } from '../AuthContext';
import { QueryCacheUserReset } from '../QueryCacheUserReset';
import type { AuthAdapter, User } from '../authAdapter';

function createAdapter(initial: User | null): AuthAdapter {
  let current = initial;
  return {
    getSession: () => current,
    login: async (email: string) => {
      current = { id: `id-${email}`, email };
      return current;
    },
    logout: async () => {
      current = null;
    },
  } as AuthAdapter;
}

const CRM_KEY = ['crm', 'list', 'deals', { page: 1 }];

function setup(initial: User | null) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(CRM_KEY, { items: [{ id: 'a-1' }], total: 1 });
  let auth!: AuthContextValue;
  function Capture() {
    auth = useAuth();
    return null;
  }
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider adapter={createAdapter(initial)}>
        <QueryCacheUserReset />
        <Capture />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { queryClient, getAuth: () => auth };
}

describe('QueryCacheUserReset', () => {
  it('behält den Cache, solange derselbe Benutzer angemeldet bleibt', () => {
    const { queryClient } = setup({ id: 'id-a', email: 'a@x.de' });
    expect(queryClient.getQueryData(CRM_KEY)).toBeDefined();
  });

  it('leert den Cache bei Abmeldung', async () => {
    const { queryClient, getAuth } = setup({ id: 'id-a', email: 'a@x.de' });
    await act(() => getAuth().logout());
    expect(queryClient.getQueryData(CRM_KEY)).toBeUndefined();
  });

  it('leert den Cache beim Wechsel auf einen anderen Benutzer', async () => {
    const { queryClient, getAuth } = setup({ id: 'id-a', email: 'a@x.de' });
    await act(async () => {
      await getAuth().login('b@x.de', 'pw');
    });
    expect(queryClient.getQueryData(CRM_KEY)).toBeUndefined();
  });

  it('leert nichts bei der ersten Anmeldung ohne vorherigen Benutzer', async () => {
    const { queryClient, getAuth } = setup(null);
    await act(async () => {
      await getAuth().login('a@x.de', 'pw');
    });
    expect(queryClient.getQueryData(CRM_KEY)).toBeDefined();
  });
});
