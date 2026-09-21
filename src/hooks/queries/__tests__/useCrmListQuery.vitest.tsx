// @vitest-environment jsdom
// G60 (Auftrag 067N, Step 1): Unit-Tests für useCrmListQuery Hook
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCrmListQuery } from '../useCrmListQuery';
import * as crmListService from '@/services/crm/crmListService';

vi.mock('@/services/crm/crmListService', () => ({
  fetchCrmList: vi.fn(),
  CrmServiceError: class CrmServiceError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCrmListQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lädt CRM-Listendaten über fetchCrmList und liefert paginiertes Ergebnis', async () => {
    const mockData: crmListService.CrmPageResult<{ id: string; name: string }> = {
      items: [{ id: 'c1', name: 'Firma A1' }],
      total: 1,
      page: 1,
      pageSize: 20,
      resource: 'companies',
    };

    vi.mocked(crmListService.fetchCrmList).mockResolvedValueOnce(mockData);

    const { result } = renderHook(
      () =>
        useCrmListQuery({
          resource: 'companies',
          q: 'Firma',
          page: 1,
          pageSize: 20,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(crmListService.fetchCrmList).toHaveBeenCalledWith({
      resource: 'companies',
      q: 'Firma',
      page: 1,
      pageSize: 20,
    });
  });

  it('behandelt Fehler von fetchCrmList und setzt isError', async () => {
    vi.mocked(crmListService.fetchCrmList).mockRejectedValueOnce(
      new crmListService.CrmServiceError('FORBIDDEN', 'Zugriff verweigert'),
    );

    const { result } = renderHook(
      () =>
        useCrmListQuery({
          resource: 'companies',
          page: 1,
          pageSize: 20,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
