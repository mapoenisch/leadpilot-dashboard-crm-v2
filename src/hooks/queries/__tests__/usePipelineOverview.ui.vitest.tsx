import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePipelineOverview } from '../usePipelineOverview';
import { CRMRepository } from '@/services/db/crmRepository';
import { getPipelineOverview } from '@/domain/executiveCockpitData';

vi.mock('@/services/db/crmRepository', () => ({
  CRMRepository: {
    getCompanies: vi.fn(),
    getContacts: vi.fn(),
    getImportedFunnelDeals: vi.fn(),
  },
}));

vi.mock('@/domain/executiveCockpitData', () => ({
  getPipelineOverview: vi.fn().mockResolvedValue({
    totalDeals: 10,
    totalVolume: 500000,
    stages: [],
  }),
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

describe('usePipelineOverview', () => {
  it('ruft getPipelineOverview mit CRMRepository auf und liefert Ergebnis', async () => {
    const { result } = renderHook(() => usePipelineOverview(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalDeals).toBe(10);
    expect(result.current.data?.totalVolume).toBe(500000);
    expect(getPipelineOverview).toHaveBeenCalledWith(CRMRepository);
  });
});
