import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePipelineOverview } from '../usePipelineOverview';
import { loadCrmReadModel, DEMO_ORGANIZATION_ID } from '@/services/data/crmReadModelService';
import { useOrganization } from '@/auth/organizationContext';
import { CRMRepository } from '@/services/db/crmRepository';
import type { CrmReadModelEnvelope } from '@/types/dataSource';

// 067R / G64 (PR-SOURCE-04): Die Pipeline liest den quellenkonsistenten
// CRM-Envelope — kein Repository-Lesepfad mit stillem Demo-Ersatz.
vi.mock('@/services/data/crmReadModelService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/data/crmReadModelService')>();
  return { ...actual, loadCrmReadModel: vi.fn() };
});

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/services/db/crmRepository', () => ({
  CRMRepository: { getImportedFunnelDeals: vi.fn() },
}));

const mockedLoad = vi.mocked(loadCrmReadModel);
const mockedOrg = vi.mocked(useOrganization);

function envelope(
  status: CrmReadModelEnvelope['status'],
  deals: CrmReadModelEnvelope['data']['deals'],
  errorCode?: string,
): CrmReadModelEnvelope {
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    sourceId: 'simulated-crm',
    sourceKind: 'synthetic',
    status,
    fetchedAt: '2026-09-25T10:00:00.000Z',
    contentHash: `hash-${status}`,
    ...(errorCode ? { errorCode } : {}),
    data: {
      companies: [],
      contacts: [],
      deals,
      activities: [],
      audit: {
        companiesLoaded: 0,
        companiesValid: 0,
        companiesErrors: 0,
        contactsLoaded: 0,
        contactsValid: 0,
        contactsMatched: 0,
        contactsErrors: 0,
        dealsLoaded: deals.length,
        dealsValid: deals.length,
        dealsErrors: 0,
      },
    },
  } as CrmReadModelEnvelope;
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePipelineOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOrg.mockReturnValue({
      session: { userId: 'u-demo', organizationId: DEMO_ORGANIZATION_ID, role: 'viewer' },
      isLoading: false,
    });
  });

  it('aggregiert die Deals aus dem CRM-Envelope', async () => {
    mockedLoad.mockResolvedValue(
      envelope('healthy', [
        {
          id: 'd1',
          dealName: 'A',
          stage: 'Gewonnen',
          amount: 300,
          closeDate: '2026-06-01',
          pipeline: 'Sales',
        },
        {
          id: 'd2',
          dealName: 'B',
          stage: 'Angebot',
          amount: 200,
          closeDate: '2026-06-02',
          pipeline: 'Sales',
        },
      ]),
    );
    const { result } = renderHook(() => usePipelineOverview(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toMatchObject({
      totalDeals: 2,
      totalVolume: 500,
      wonVolume: 300,
      openVolume: 200,
    });
    expect(result.current.isError).toBe(false);
    expect(mockedLoad).toHaveBeenCalledWith(DEMO_ORGANIZATION_ID, expect.any(String), {
      allowSynthetic: true,
    });
    expect(CRMRepository.getImportedFunnelDeals).not.toHaveBeenCalled();
  });

  it('meldet eine nicht verfügbare Quelle als Fehler statt Demodaten zu zeigen', async () => {
    mockedLoad.mockResolvedValue(envelope('unavailable', [], 'DATA_SOURCE_UNAVAILABLE'));
    const { result } = renderHook(() => usePipelineOverview(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect((result.current.error as Error).message).toBe('DATA_SOURCE_UNAVAILABLE');
    expect(CRMRepository.getImportedFunnelDeals).not.toHaveBeenCalled();
  });

  it('zeigt eine leere Quelle als leere Pipeline', async () => {
    mockedLoad.mockResolvedValue(envelope('empty', []));
    const { result } = renderHook(() => usePipelineOverview(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.totalDeals).toBe(0);
    expect(result.current.isError).toBe(false);
  });

  it('bleibt im Ladezustand, solange die Organisation lädt', () => {
    mockedOrg.mockReturnValue({ session: null, isLoading: true });
    const { result } = renderHook(() => usePipelineOverview(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(mockedLoad).not.toHaveBeenCalled();
  });
});
