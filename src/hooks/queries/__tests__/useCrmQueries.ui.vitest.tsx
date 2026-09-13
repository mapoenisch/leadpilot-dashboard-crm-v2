import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCrmCompanies, useCrmContacts, useCrmDeals, useCrmAuditSummary } from '../useCrmQueries';
import { CRMRepository } from '@/services/db/crmRepository';

vi.mock('@/services/db/crmRepository', () => ({
  CRMRepository: {
    getCompanies: vi
      .fn()
      .mockResolvedValue([
        { id: 'comp-1', name: 'Alpha GmbH', industry: 'Tech', city: 'Berlin', employeeCount: 20 },
      ]),
    getContacts: vi.fn().mockResolvedValue([
      {
        id: 'cont-1',
        companyId: 'comp-1',
        email: 'a@alpha.de',
        firstName: 'A',
        lastName: 'L',
        jobTitle: 'Dev',
      },
    ]),
    getImportedFunnelDeals: vi.fn().mockResolvedValue([
      {
        id: 'deal-1',
        dealName: 'Deal 1',
        stage: 'Won',
        amount: 50000,
        closeDate: '2026-06-01',
        pipeline: 'Sales',
      },
    ]),
    getAuditSummary: vi.fn().mockResolvedValue({
      companiesLoaded: 1,
      companiesValid: 1,
      companiesErrors: 0,
      contactsLoaded: 1,
      contactsValid: 1,
      contactsMatched: 1,
      contactsErrors: 0,
      dealsLoaded: 1,
      dealsValid: 1,
      dealsErrors: 0,
    }),
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
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCrmQueries', () => {
  it('useCrmCompanies ruft CRMRepository.getCompanies auf und liefert Daten', async () => {
    const { result } = renderHook(() => useCrmCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.name).toBe('Alpha GmbH');
    expect(CRMRepository.getCompanies).toHaveBeenCalled();
  });

  it('useCrmContacts ruft CRMRepository.getContacts auf und liefert Daten', async () => {
    const { result } = renderHook(() => useCrmContacts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.email).toBe('a@alpha.de');
    expect(CRMRepository.getContacts).toHaveBeenCalled();
  });

  it('useCrmDeals ruft CRMRepository.getImportedFunnelDeals auf und liefert Daten', async () => {
    const { result } = renderHook(() => useCrmDeals(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.dealName).toBe('Deal 1');
    expect(CRMRepository.getImportedFunnelDeals).toHaveBeenCalled();
  });

  it('useCrmAuditSummary ruft CRMRepository.getAuditSummary auf und liefert Daten', async () => {
    const { result } = renderHook(() => useCrmAuditSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.companiesValid).toBe(1);
    expect(CRMRepository.getAuditSummary).toHaveBeenCalled();
  });
});
