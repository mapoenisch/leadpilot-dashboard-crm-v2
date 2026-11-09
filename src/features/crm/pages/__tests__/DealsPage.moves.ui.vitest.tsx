/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DealsPage } from '../DealsPage';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import * as crmExportService from '@/services/crm/crmExportService';
import * as crmListService from '@/services/crm/crmListService';
import { MoveDealStageError, moveDealStage } from '../../services/dealStageService';
import type { ImportedFunnelDeal } from '@/types/crm';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
vi.mock('@/hooks/queries/useCrmListQuery', () => ({ useCrmListQuery: vi.fn() }));
vi.mock('@/services/crm/crmExportService', () => ({
  fetchCrmExportBlob: vi.fn(),
  CrmServiceError: class extends Error {},
}));
vi.mock('@/services/crm/crmListService', () => ({ fetchCrmList: vi.fn() }));
vi.mock('../../services/dealStageService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/dealStageService')>();
  return { ...actual, moveDealStage: vi.fn() };
});

const mockedOrg = vi.mocked(useOrganization);
const mockedQuery = vi.mocked(useCrmListQuery);
const mockedMove = vi.mocked(moveDealStage);

const DEAL: ImportedFunnelDeal = {
  id: 'deal-1',
  dealName: 'Enterprise Paket',
  stage: 'Angebot erstellt',
  stageRaw: 'PROPOSAL',
  amount: 45000,
  closeDate: '2026-11-30',
  pipeline: 'default',
};

function renderDealsPage(role: 'admin' | 'manager' | 'viewer' = 'admin') {
  mockedOrg.mockReturnValue({
    session: { role, userId: 'usr-1', organizationId: 'org-1' },
    isLoading: false,
  } as unknown as ReturnType<typeof useOrganization>);
  mockedQuery.mockReturnValue({
    data: { items: [DEAL], total: 1 },
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
    error: null,
    refetch: vi.fn(),
  } as never);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const url = '/crm/deals?ansicht=kanban';
  window.history.replaceState(null, '', url);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <DealsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function moveViaMenu(newStage: string) {
  fireEvent.click(screen.getByLabelText('Enterprise Paket: Phase ändern'));
  fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(newStage) }));
}

describe('DealsPage – serverseitige Phasenwechsel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedMove.mockReset();
    vi.mocked(crmListService.fetchCrmList).mockReset();
    vi.mocked(crmExportService.fetchCrmExportBlob).mockReset();
  });

  it('bietet Viewern keine Verschiebe-Bedienung und ruft keine Mutation auf', () => {
    renderDealsPage('viewer');

    expect(screen.queryByLabelText('Enterprise Paket: Phase ändern')).not.toBeInTheDocument();
    expect(screen.getByTestId('deal-card-deal-1')).toHaveAttribute('draggable', 'false');
    expect(mockedMove).not.toHaveBeenCalled();
  });

  it('sendet beim Verschieben den gespeicherten Rohwert als erwartete Phase', async () => {
    let resolveMove!: (value: { dealId: string; stage: string; stageEnteredAt: string }) => void;
    mockedMove.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMove = resolve;
        }),
    );
    renderDealsPage('admin');

    moveViaMenu('Verhandlung');

    // Während der Mutation ist die Karte gesperrt.
    await waitFor(() => {
      expect(screen.getByTestId('deal-card-deal-1')).toHaveAttribute('data-locked', 'true');
    });

    expect(mockedMove).toHaveBeenCalledWith({
      dealId: 'deal-1',
      expectedStage: 'PROPOSAL',
      newStage: 'Verhandlung',
    });

    resolveMove({
      dealId: 'deal-1',
      stage: 'Verhandlung',
      stageEnteredAt: '2026-11-09T10:00:00.000Z',
    });

    // Erfolg wird höflich angesagt.
    await waitFor(() => {
      expect(screen.getByTestId('deal-stage-announcement')).toHaveTextContent(
        'Enterprise Paket nach Verhandlung verschoben.',
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('deal-card-deal-1')).not.toHaveAttribute('data-locked');
    });
  });

  it('zeigt den Konflikt an, wenn der Server den Deal inzwischen geändert hat', async () => {
    mockedMove.mockRejectedValue(new MoveDealStageError('conflict'));
    renderDealsPage('admin');

    moveViaMenu('Verhandlung');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Dieser Deal wurde inzwischen geändert. Die aktuelle Phase wird angezeigt.',
      );
    });
  });

  it('zeigt bei Netzfehlern die feste Meldung und nicht die Rohmeldung', async () => {
    mockedMove.mockRejectedValue(new MoveDealStageError('network'));
    renderDealsPage('admin');

    moveViaMenu('Bedarfsanalyse');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Die Phase konnte nicht gespeichert werden.',
      );
    });
    expect(screen.getByRole('alert')).not.toHaveTextContent('offline');
  });
});
