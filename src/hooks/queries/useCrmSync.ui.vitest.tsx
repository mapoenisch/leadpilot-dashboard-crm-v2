// Gate G36 (Auftrag 051, Block E): Optimistic-Update-Musterfall.
// seedDatabase + getCompanies gemockt (Fehler/Erfolg/hängend) —
// beweist: onMutate setzt 'syncing', onError rollt auf den gemerkten Wert
// zurück, onSettled invalidiert (Refetch der Reads).
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { crmKeys } from '@/services/query/queryKeys';
import { useCrmCompanies } from './useCrmQueries';
import { useCrmSyncStatus, useSeedDatabaseMutation } from './useCrmSync';

const controls = vi.hoisted(() => ({
  seedImpl: null as null | (() => Promise<unknown>),
  companiesCalls: 0,
}));

vi.mock('@/services/db/crmRepository', () => ({
  CRMRepository: {
    seedDatabase: () => {
      if (!controls.seedImpl) throw new Error('seedDatabase-Mock nicht gesetzt');
      return controls.seedImpl();
    },
    getCompanies: () => {
      controls.companiesCalls += 1;
      return Promise.resolve([]);
    },
  },
}));

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderSyncHooks(client: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => {
      const statusQuery = useCrmSyncStatus();
      const mutation = useSeedDatabaseMutation();
      const companiesQuery = useCrmCompanies();
      return {
        status: statusQuery.data,
        mutate: mutation.mutate,
        isError: mutation.isError,
        companiesFetching: companiesQuery.isFetching,
      };
    },
    { wrapper },
  );
}

describe('useSeedDatabaseMutation (Optimistic Sync-Status)', () => {
  it("setzt 'syncing' und rollt bei Fehler auf den gemerkten Wert zurück", async () => {
    const client = makeClient();
    const gate = deferred<unknown>();
    controls.seedImpl = () => gate.promise;
    const { result } = renderSyncHooks(client);

    await waitFor(() => expect(result.current.status).toBe('idle'));
    act(() => {
      client.setQueryData(crmKeys.syncStatus(), 'success');
    });
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.status).toBe('syncing'));

    act(() => {
      gate.reject(new Error('Seed-Boom'));
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(client.getQueryData(crmKeys.syncStatus())).toBe('success');
  });

  it("setzt 'success' und invalidiert die Reads (Refetch) bei Erfolg", async () => {
    const client = makeClient();
    controls.companiesCalls = 0;
    const gate = deferred<unknown>();
    controls.seedImpl = () => gate.promise;
    const { result } = renderSyncHooks(client);

    await waitFor(() => expect(result.current.status).toBe('idle'));
    await waitFor(() => expect(controls.companiesCalls).toBe(1));

    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.status).toBe('syncing'));

    act(() => {
      gate.resolve({
        success: true,
        companiesInserted: 0,
        contactsInserted: 0,
        dealsInserted: 0,
        message: 'ok',
      });
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    // onSettled-Invalidierung löst einen zweiten Companies-Fetch aus.
    await waitFor(() => expect(controls.companiesCalls).toBe(2));
  });
});
