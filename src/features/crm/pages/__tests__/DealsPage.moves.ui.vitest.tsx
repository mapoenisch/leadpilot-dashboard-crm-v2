/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
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

function renderDealsPage(
  role: 'admin' | 'manager' | 'viewer' = 'admin',
  items = [DEAL],
  total = items.length,
  refetch: () => unknown = vi.fn(),
) {
  mockedOrg.mockReturnValue({
    session: { role, userId: 'usr-1', organizationId: 'org-1' },
    isLoading: false,
  } as unknown as ReturnType<typeof useOrganization>);
  mockedQuery.mockReturnValue({
    data: { items, total },
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
    error: null,
    refetch,
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

  it('sperrt weitere Verschiebungen bis zum Abschluss der laufenden RPC', async () => {
    let finish!: () => void;
    mockedMove.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ dealId: 'deal-1', stage: 'Verhandlung', stageEnteredAt: null });
        }),
    );
    renderDealsPage('admin', [DEAL, { ...DEAL, id: 'deal-2', dealName: 'Zweiter Deal' }]);
    moveViaMenu('Verhandlung');
    await waitFor(() => expect(mockedMove).toHaveBeenCalledOnce());
    expect(screen.getByTestId('deal-card-deal-2')).toHaveAttribute('draggable', 'false');
    expect(screen.queryByLabelText('Zweiter Deal: Phase ändern')).not.toBeInTheDocument();
    await act(async () => finish());
    await waitFor(() =>
      expect(screen.getByTestId('deal-card-deal-2')).toHaveAttribute('draggable', 'true'),
    );
  });

  it('lädt nach einem Konflikt auch zusätzliche Kanban-Seiten neu', async () => {
    const extra = { ...DEAL, id: 'extra', dealName: 'Nachgeladener Deal' };
    const firstPage = Array.from({ length: 100 }, (_, i) => ({ ...DEAL, id: `first-${i}` }));
    const fetchList = vi.mocked(crmListService.fetchCrmList);
    fetchList.mockResolvedValueOnce({
      items: [extra],
      total: 101,
      page: 2,
      pageSize: 100,
      resource: 'deals',
    });
    fetchList.mockResolvedValueOnce({
      items: [{ ...extra, stage: 'Deal gewonnen', stageRaw: 'WON' }],
      total: 101,
      page: 2,
      pageSize: 100,
      resource: 'deals',
    });
    mockedMove
      .mockRejectedValueOnce(new MoveDealStageError('conflict'))
      .mockResolvedValueOnce({ dealId: 'extra', stage: 'Verhandlung', stageEnteredAt: null });
    renderDealsPage('admin', firstPage, 101);
    fireEvent.click(screen.getByRole('button', { name: /Weitere Deals nachladen/ }));
    await screen.findByTestId('deal-card-extra');
    fireEvent.click(screen.getByLabelText('Nachgeladener Deal: Phase ändern'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Verhandlung/ }));
    await waitFor(() => expect(fetchList).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId('deal-card-extra').closest('[data-stage]')).toHaveAttribute(
        'data-stage',
        'Deal gewonnen',
      ),
    );
    fireEvent.click(screen.getByLabelText('Nachgeladener Deal: Phase ändern'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Verhandlung/ }));
    await waitFor(() =>
      expect(mockedMove).toHaveBeenLastCalledWith({
        dealId: 'extra',
        expectedStage: 'WON',
        newStage: 'Verhandlung',
      }),
    );
  });

  it('hält die sichtbare Sperre bis zum Ende des Nachladens nach der RPC', async () => {
    let resolveRefetch!: () => void;
    const pendingRefetch = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefetch = resolve;
        }),
    );
    mockedMove.mockResolvedValue({
      dealId: 'deal-1',
      stage: 'Verhandlung',
      stageEnteredAt: '2026-11-09T10:00:00.000Z',
    });
    renderDealsPage(
      'admin',
      [DEAL, { ...DEAL, id: 'deal-2', dealName: 'Zweiter Deal' }],
      2,
      pendingRefetch,
    );

    moveViaMenu('Verhandlung');

    // RPC ist beendet (Erfolgsmeldung da), aber refetch läuft noch:
    // Die Sperre darf nicht bereits aufgehoben sein.
    await waitFor(() => {
      expect(screen.getByTestId('deal-stage-announcement')).toHaveTextContent(
        'Enterprise Paket nach Verhandlung verschoben.',
      );
    });
    expect(screen.getByTestId('deal-card-deal-1')).toHaveAttribute('data-locked', 'true');
    expect(screen.queryByLabelText('Zweiter Deal: Phase ändern')).not.toBeInTheDocument();
    expect(screen.getByTestId('deal-card-deal-2')).toHaveAttribute('draggable', 'false');

    await act(async () => resolveRefetch());
    await waitFor(() => {
      expect(screen.getByTestId('deal-card-deal-1')).not.toHaveAttribute('data-locked');
    });
    await waitFor(() => {
      expect(screen.getByTestId('deal-card-deal-2')).toHaveAttribute('draggable', 'true');
    });
  });

  it('sperrt das Nachladen weiterer Seiten während des Phasenwechsels', async () => {
    let resolveRefetch!: () => void;
    const pendingRefetch = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefetch = resolve;
        }),
    );
    const fetchList = vi.mocked(crmListService.fetchCrmList);
    fetchList.mockResolvedValue({
      items: [],
      total: 300,
      page: 2,
      pageSize: 100,
      resource: 'deals',
    });
    mockedMove.mockResolvedValue({
      dealId: 'deal-1',
      stage: 'Verhandlung',
      stageEnteredAt: '2026-11-09T10:00:00.000Z',
    });
    renderDealsPage('admin', [DEAL], 300, pendingRefetch);

    moveViaMenu('Verhandlung');
    await waitFor(() => {
      expect(screen.getByTestId('deal-stage-announcement')).toHaveTextContent('verschoben');
    });

    // Während refetch/Nachladen läuft: Kein weiterer Seitenabruf.
    const loadMoreBtn = screen.getByTestId('kanban-load-more-btn');
    expect(loadMoreBtn).toBeDisabled();
    fireEvent.click(loadMoreBtn);
    expect(fetchList).not.toHaveBeenCalled();

    await act(async () => resolveRefetch());
    await waitFor(() => expect(loadMoreBtn).not.toBeDisabled());
    fireEvent.click(loadMoreBtn);
    await waitFor(() => expect(fetchList).toHaveBeenCalledTimes(1));
  });

  it('blockiert Phasenwechsel während eines laufenden Seitenabrufs', async () => {
    let resolveList!: (val: crmListService.CrmPageResult<ImportedFunnelDeal>) => void;
    vi.mocked(crmListService.fetchCrmList).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );
    renderDealsPage('admin', [DEAL, { ...DEAL, id: 'deal-2', dealName: 'Zweiter Deal' }], 300);

    fireEvent.click(screen.getByTestId('kanban-load-more-btn'));
    await waitFor(() => expect(screen.getByTestId('kanban-load-more-btn')).toBeDisabled());

    // Während des Seitenabrufs ist die Verschiebe-Bedienung deaktiviert.
    expect(screen.queryByLabelText('Enterprise Paket: Phase ändern')).not.toBeInTheDocument();
    expect(screen.getByTestId('deal-card-deal-1')).toHaveAttribute('draggable', 'false');

    await act(async () =>
      resolveList({ items: [], total: 300, page: 2, pageSize: 100, resource: 'deals' }),
    );
    await waitFor(() => {
      expect(screen.getByTestId('deal-card-deal-1')).toHaveAttribute('draggable', 'true');
    });
    expect(mockedMove).not.toHaveBeenCalled();
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

  it('lädt nach Seitenüberschneidung die nächste freie Seite statt einer Wiederholung', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({ ...DEAL, id: `first-${i}` }));
    const page2Items = Array.from({ length: 100 }, (_, i) => ({
      ...DEAL,
      id: `p2-${i}`,
      dealName: `Seite2-${i}`,
    }));
    // Seite 3 überlappt um einen Deal mit Seite 2 → nur 99 neue IDs.
    const page3Items = [
      { ...DEAL, id: 'p2-0', dealName: 'Seite2-0' },
      ...Array.from({ length: 99 }, (_, i) => ({
        ...DEAL,
        id: `p3-${i}`,
        dealName: `Seite3-${i}`,
      })),
    ];
    const fetchList = vi.mocked(crmListService.fetchCrmList);
    fetchList.mockImplementation(async (params) => ({
      items: params.page === 2 ? page2Items : params.page === 3 ? page3Items : [],
      total: 400,
      page: params.page ?? 1,
      pageSize: 100,
      resource: 'deals',
    }));
    renderDealsPage('admin', firstPage, 400);

    const loadMoreBtn = () => screen.getByTestId('kanban-load-more-btn');
    const clickAndWait = async (calls: number) => {
      fireEvent.click(loadMoreBtn());
      await waitFor(() => expect(fetchList).toHaveBeenCalledTimes(calls));
      await waitFor(() => expect(loadMoreBtn()).not.toBeDisabled());
    };

    await clickAndWait(1); // Seite 2
    await clickAndWait(2); // Seite 3 (99 neue + 1 Duplikat)
    fireEvent.click(loadMoreBtn());

    // Ohne getrennte Seitennummer würde hier erneut Seite 3 angefragt.
    await waitFor(() =>
      expect(fetchList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 4 })),
    );
  });

  it('dedupliziert Deals nach ID beim Nachladen und verhindert doppelte Karten', async () => {
    const overlappingDeal = { ...DEAL, id: 'deal-overlap', dealName: 'Überlappender Deal' };
    const firstPage = [
      overlappingDeal,
      ...Array.from({ length: 99 }, (_, i) => ({ ...DEAL, id: `first-${i}` })),
    ];
    const fetchList = vi.mocked(crmListService.fetchCrmList);
    fetchList.mockResolvedValueOnce({
      items: [overlappingDeal, { ...DEAL, id: 'extra-unique', dealName: 'Einzigartiger Deal' }],
      total: 101,
      page: 2,
      pageSize: 100,
      resource: 'deals',
    });
    renderDealsPage('admin', firstPage, 101);
    fireEvent.click(screen.getByRole('button', { name: /Weitere Deals nachladen/ }));
    await screen.findByTestId('deal-card-extra-unique');

    // Der überlappende Deal existiert trotz Rückgabe in Seite 2 nur exakt einmal im DOM
    const matchingCards = screen.getAllByTestId('deal-card-deal-overlap');
    expect(matchingCards).toHaveLength(1);
  });
});
