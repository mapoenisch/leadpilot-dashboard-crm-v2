// Auftrag 129 / Codex-Review Runde 11: Client-Auswertung läuft auf der vollständigen Datenbasis
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DealsPage } from '../DealsPage';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import * as crmListService from '@/services/crm/crmListService';
import type { ImportedFunnelDeal } from '@/types/crm';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
vi.mock('@/hooks/queries/useCrmListQuery', () => ({ useCrmListQuery: vi.fn() }));
vi.mock('@/services/crm/crmExportService', () => ({
  fetchCrmExportBlob: vi.fn(),
  CrmServiceError: class extends Error {},
}));
vi.mock('@/services/crm/crmListService', () => ({ fetchCrmList: vi.fn() }));

const mockedOrg = vi.mocked(useOrganization);
const mockedQuery = vi.mocked(useCrmListQuery);
const mockedList = vi.mocked(crmListService.fetchCrmList);

const STORAGE_KEY = 'leadpilot_crm_deal_stage_overrides_org-1_usr-1';

const makeDeal = (id: string, stage: string): ImportedFunnelDeal => ({
  id,
  dealName: `Deal ${id}`,
  stage,
  amount: 1000,
  closeDate: '2026-12-31',
  pipeline: 'Enterprise SaaS',
});

function renderPage(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  window.history.replaceState(null, '', url);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <DealsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DealsPage – vollständige Datenbasis bei lokalen Phasenwechseln', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedOrg.mockReturnValue({
      session: { role: 'admin', userId: 'usr-1', organizationId: 'org-1' },
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);
  });

  it('lädt weitere Serverseiten nach und findet verschobene Deals von Seite 2', async () => {
    // d-149 liegt auf Seite 2 und wurde lokal nach "Verhandlung" verschoben
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ 'd-149': 'Verhandlung' }));
    const page1 = Array.from({ length: 100 }, (_, i) => makeDeal(`d-${i}`, 'Lead eingegangen'));
    mockedQuery.mockReturnValue({
      data: { items: page1, total: 150 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCrmListQuery>);
    const page2 = Array.from({ length: 50 }, (_, i) =>
      makeDeal(`d-${100 + i}`, 'Lead eingegangen'),
    );
    mockedList.mockResolvedValue({ items: page2, total: 150 } as Awaited<
      ReturnType<typeof crmListService.fetchCrmList>
    >);

    renderPage('/crm/deals?stufe=Verhandlung');

    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(1));
    expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 100 }));
    expect(await screen.findByText('1 Deal gefunden')).toBeInTheDocument();
  });

  it('lädt nichts nach, solange kein Client-Filter aktiv ist', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ 'd-1': 'Verhandlung' }));
    mockedQuery.mockReturnValue({
      data: { items: [makeDeal('d-1', 'Lead eingegangen')], total: 1 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCrmListQuery>);

    renderPage('/crm/deals');
    await screen.findByText('1 Deal gefunden');
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('behandelt Nachladefehler nicht als vollständige Datenbasis und bietet Retry an', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ 'd-1': 'Verhandlung' }));
    const page1 = Array.from({ length: 100 }, (_, i) => makeDeal(`d-${i}`, 'Lead eingegangen'));
    mockedQuery.mockReturnValue({
      data: { items: page1, total: 150 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCrmListQuery>);

    // Erst schlägt das Nachladen fehl
    mockedList.mockRejectedValueOnce(new Error('Network offline'));

    renderPage('/crm/deals?stufe=Verhandlung');

    // Darf NICHT "0 Deals gefunden" als fertiges Ergebnis anzeigen, sondern Fehlerzustand
    expect(
      await screen.findByText('Fehler beim Nachladen der vollständigen Deal-Pipeline.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('0 Deals gefunden')).not.toBeInTheDocument();

    // Retry anbieten und nach Klick erfolgreich nachladen
    const page2 = Array.from({ length: 50 }, (_, i) =>
      makeDeal(`d-${100 + i}`, 'Lead eingegangen'),
    );
    mockedList.mockResolvedValueOnce({ items: page2, total: 150 } as Awaited<
      ReturnType<typeof crmListService.fetchCrmList>
    >);

    const retryBtn = screen.getByRole('button', { name: /erneut versuchen/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('1 Deal gefunden')).toBeInTheDocument();
  });

  it('setzt Zusatzseiten bei Parameterwechsel synchron zurück und fordert Seite 2 an', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ 'd-1': 'Verhandlung' }));
    const page1 = Array.from({ length: 100 }, (_, i) => makeDeal(`d-${i}`, 'Lead eingegangen'));
    mockedQuery.mockReturnValue({
      data: { items: page1, total: 250 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCrmListQuery>);

    // Erste Antwort für Seite 2
    mockedList.mockResolvedValueOnce({
      items: Array.from({ length: 100 }, (_, i) => makeDeal(`d-${100 + i}`, 'Lead eingegangen')),
      total: 250,
    } as Awaited<ReturnType<typeof crmListService.fetchCrmList>>);

    renderPage('/crm/deals?stufe=Verhandlung');

    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );

    // Jetzt ändert sich der Suchbegriff über das Inputfeld:
    mockedList.mockClear();
    mockedList.mockResolvedValueOnce({
      items: [makeDeal('d-101', 'Lead eingegangen')],
      total: 250,
    } as Awaited<ReturnType<typeof crmListService.fetchCrmList>>);

    const searchInput = screen.getByLabelText('Deals suchen');
    fireEvent.change(searchInput, { target: { value: 'Pilot' } });

    // Nach dem synchronen Reset muss zwingend wieder Seite 2 angefordert werden, nicht Seite 3
    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
  });
});
