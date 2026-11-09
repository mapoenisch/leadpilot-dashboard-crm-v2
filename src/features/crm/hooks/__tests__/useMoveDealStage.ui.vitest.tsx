/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { crmKeys } from '@/services/query/queryKeys';
import type { CrmPageResult } from '@/services/crm/crmListService';
import type { ImportedFunnelDeal } from '@/types/crm';
import { useMoveDealStage } from '../useMoveDealStage';
import { MoveDealStageError, moveDealStage } from '../../services/dealStageService';

vi.mock('../../services/dealStageService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/dealStageService')>();
  return { ...actual, moveDealStage: vi.fn() };
});

const mockedMove = vi.mocked(moveDealStage);
const LIST_KEY = crmKeys.list('deals', { resource: 'deals', page: 1, pageSize: 100 });

function makePage(stage = 'Angebot erstellt'): CrmPageResult<ImportedFunnelDeal> {
  return {
    items: [
      {
        id: 'deal-1',
        dealName: 'Enterprise Paket',
        stage,
        stageRaw: 'PROPOSAL',
        amount: 45000,
        closeDate: '2026-11-30',
        pipeline: 'default',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 100,
    resource: 'deals',
  };
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(LIST_KEY, makePage());
  queryClient.setQueryData(crmKeys.pipelineOverview(), { total: 1 });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useMoveDealStage('org-1'), { wrapper });
  return { queryClient, hook };
}

describe('useMoveDealStage', () => {
  beforeEach(() => {
    mockedMove.mockReset();
  });

  it('aktualisiert die Deal-Liste optimistisch, bevor der Server antwortet', async () => {
    let resolveMove!: (value: { dealId: string; stage: string; stageEnteredAt: string }) => void;
    mockedMove.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMove = resolve;
        }),
    );

    const { queryClient, hook } = setup();

    act(() => {
      hook.result.current.mutate({
        dealId: 'deal-1',
        expectedStage: 'PROPOSAL',
        newStage: 'Verhandlung',
      });
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<CrmPageResult<ImportedFunnelDeal>>(LIST_KEY)?.items[0],
      ).toMatchObject({ stage: 'Verhandlung', stageRaw: 'Verhandlung' });
    });
    expect(hook.result.current.isPending).toBe(true);
    expect(hook.result.current.variables?.dealId).toBe('deal-1');

    await act(async () => {
      resolveMove({
        dealId: 'deal-1',
        stage: 'Verhandlung',
        stageEnteredAt: '2026-11-09T10:00:00.000Z',
      });
    });
    await waitFor(() => expect(hook.result.current.isPending).toBe(false));
  });

  it('springt bei einem Konflikt auf den vorherigen Stand zurück und invalidiert die Listen', async () => {
    mockedMove.mockRejectedValue(new MoveDealStageError('conflict'));
    const { queryClient, hook } = setup();

    await act(async () => {
      await hook.result.current
        .mutateAsync({ dealId: 'deal-1', expectedStage: 'PROPOSAL', newStage: 'Verhandlung' })
        .catch(() => undefined);
    });

    await waitFor(() => {
      const page = queryClient.getQueryData<CrmPageResult<ImportedFunnelDeal>>(LIST_KEY);
      expect(page?.items[0]).toMatchObject({ stage: 'Angebot erstellt', stageRaw: 'PROPOSAL' });
    });
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(crmKeys.pipelineOverview())?.isInvalidated).toBe(true);
    expect(mockedMove).toHaveBeenCalledWith({
      dealId: 'deal-1',
      expectedStage: 'PROPOSAL',
      newStage: 'Verhandlung',
    });
  });

  it.each([false, true])(
    'behandelt Array- und Seiten-Caches gemeinsam (Fehler: %s)',
    async (fails) => {
      const { queryClient, hook } = setup();
      const arrayKey = crmKeys.list('deals', { resource: 'deals', pageSize: 500 });
      queryClient.setQueryData(arrayKey, makePage().items);
      mockedMove.mockImplementation(async () => {
        expect(queryClient.getQueryData<ImportedFunnelDeal[]>(arrayKey)?.[0]?.stage).toBe(
          'Verhandlung',
        );
        if (fails) throw new MoveDealStageError('conflict');
        return { dealId: 'deal-1', stage: 'Verhandlung', stageEnteredAt: null };
      });
      await act(async () => {
        await hook.result.current
          .mutateAsync({ dealId: 'deal-1', expectedStage: 'PROPOSAL', newStage: 'Verhandlung' })
          .catch(() => undefined);
      });
      expect(mockedMove).toHaveBeenCalledOnce();
      expect(queryClient.getQueryData<ImportedFunnelDeal[]>(arrayKey)?.[0]?.stage).toBe(
        fails ? 'Angebot erstellt' : 'Verhandlung',
      );
      expect(queryClient.getQueryState(arrayKey)?.isInvalidated).toBe(true);
    },
  );

  it('meldet ohne Organisation einen Netzfehler, ohne die Datenbank aufzurufen', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMoveDealStage(undefined), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ dealId: 'deal-1', expectedStage: 'PROPOSAL', newStage: 'Verhandlung' })
        .catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.error?.code).toBe('network');
    });
    expect(mockedMove).not.toHaveBeenCalled();
  });
});
