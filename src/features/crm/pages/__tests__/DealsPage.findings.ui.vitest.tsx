import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DealsPage } from '../DealsPage';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import * as crmExportService from '@/services/crm/crmExportService';
import * as crmListService from '@/services/crm/crmListService';
import { readBlobAsText } from '../../utils/crmCsvHelper';
import type { ImportedFunnelDeal } from '@/types/crm';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
vi.mock('@/hooks/queries/useCrmListQuery', () => ({ useCrmListQuery: vi.fn() }));
vi.mock('@/services/crm/crmExportService', () => ({
  fetchCrmExportBlob: vi.fn(),
  CrmServiceError: class extends Error {},
}));
vi.mock('@/services/crm/crmListService', () => ({
  fetchCrmList: vi.fn(),
}));

const mockedOrg = vi.mocked(useOrganization);
const mockedQuery = vi.mocked(useCrmListQuery);
const mockedExport = vi.mocked(crmExportService.fetchCrmExportBlob);
const mockedList = vi.mocked(crmListService.fetchCrmList);

const SAMPLE_DEALS: ImportedFunnelDeal[] = [
  {
    id: 'd-1',
    dealName: 'Cloud Migration Pilot',
    stage: 'Lead eingegangen',
    amount: 25000,
    closeDate: '2026-12-31',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'd-2',
    dealName: 'Security Audit & Compliance',
    stage: 'Verhandlung',
    amount: 15000,
    closeDate: '2026-10-30',
    pipeline: 'Compliance',
  },
];

function renderDealsPage(initialUrl = '/crm/deals') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  window.history.replaceState(null, '', initialUrl);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <DealsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DealsPage – Codex Review Runde 2 Nacharbeit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedOrg.mockReturnValue({
      session: { role: 'admin', userId: 'usr-1', organizationId: 'org-1' },
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);
  });

  it('gleicht Phasenfilter mit lokalen Phasenwechseln aus sessionStorage ab (Befund 3)', () => {
    // d-1 wurde von "Lead eingegangen" nach "Verhandlung" verschoben
    sessionStorage.setItem(
      'leadpilot_crm_deal_stage_overrides',
      JSON.stringify({ 'd-1': 'Verhandlung' }),
    );

    mockedQuery.mockReturnValue({
      data: { items: SAMPLE_DEALS, total: 2 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    // Initialansicht mit Filter auf "Verhandlung"
    renderDealsPage('/crm/deals?stufe=Verhandlung&ansicht=tabelle');

    // Beide Deals sind jetzt in "Verhandlung" (d-1 durch Override, d-2 nativ)
    expect(screen.getByText('Cloud Migration Pilot')).toBeInTheDocument();
    expect(screen.getByText('Security Audit & Compliance')).toBeInTheDocument();

    // Query sollte ohne serverStageFilter aufgerufen werden, damit der Server d-1 nicht vorab wegfiltert
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: undefined,
      }),
    );
  });

  it('verwirft asynchrone Nachlade-Ergebnisse bei zwischenzeitlicher Filter- oder Suchänderung (Befund 2)', async () => {
    mockedQuery.mockReturnValue({
      data: { items: [SAMPLE_DEALS[0]!], total: 100 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    let resolveListPromise!: (val: crmListService.CrmPageResult<ImportedFunnelDeal>) => void;
    mockedList.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveListPromise = resolve;
        }),
    );

    renderDealsPage('/crm/deals?ansicht=kanban');

    // Nachladen auslösen
    const loadMoreBtn = screen.getByTestId('kanban-load-more-btn');
    fireEvent.click(loadMoreBtn);

    // Während Request läuft: Suchbegriff ändern
    const searchInput = screen.getByLabelText('Deals suchen');
    fireEvent.change(searchInput, { target: { value: 'Neuer Suchbegriff' } });

    // Request für die alte Abfrage liefert verspätet ein Ergebnis
    resolveListPromise({
      items: [
        {
          id: 'stale-deal',
          dealName: 'Veralteter Deal aus vorheriger Suche',
          stage: 'Lead eingegangen',
          amount: 5000,
          closeDate: '2026-12-31',
          pipeline: 'Old',
        },
      ],
      total: 100,
      page: 2,
      pageSize: 100,
      resource: 'deals',
    });

    await waitFor(() => {
      // Veralteter Deal darf NICHT im Board gerendert werden
      expect(screen.queryByText('Veralteter Deal aus vorheriger Suche')).not.toBeInTheDocument();
    });
  });

  it('sperrt das Nachladen während der Platzhalterphase (isPlaceholderData = true)', () => {
    // Wenn Query noch alte Platzhalterdaten enthält (z. B. beim Umschalten von Tabelle zu Kanban)
    mockedQuery.mockReturnValue({
      data: { items: [SAMPLE_DEALS[0]!], total: 200 },
      isLoading: false,
      isError: false,
      isPlaceholderData: true, // Platzhalterphase aktiv
      error: null,
      refetch: vi.fn(),
    } as never);

    renderDealsPage('/crm/deals?ansicht=kanban');

    // Nachlade-Button darf während der Platzhalterphase nicht aktiv / gerendert sein
    expect(screen.queryByTestId('kanban-load-more-btn')).not.toBeInTheDocument();
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('exportiert mit CSV-Parser und erhält Quoting bei Deal-Namen mit Kommas (Befund 1)', async () => {
    sessionStorage.setItem(
      'leadpilot_crm_deal_stage_overrides',
      JSON.stringify({ 'd-1': 'Verhandlung' }),
    );

    mockedQuery.mockReturnValue({
      data: { items: SAMPLE_DEALS, total: 2 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    const rawCsv =
      '\uFEFFID,Deal Name,Stage,Betrag,Abschlussdatum,Pipeline\r\n' +
      'd-1,"Beratung, Implementierung",Lead eingegangen,25000,2026-12-31,Enterprise SaaS\r\n';

    mockedExport.mockResolvedValue(new Blob([rawCsv], { type: 'text/csv' }));

    // Mock createObjectURL & revokeObjectURL & anchor click
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderDealsPage('/crm/deals?stufe=Verhandlung');

    const exportBtn = screen.getByRole('button', { name: 'CSV Export' });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockedExport).toHaveBeenCalled();
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    const exportedBlob = createObjectURLMock.mock.calls[0]![0] as Blob;
    const text = await readBlobAsText(exportedBlob);

    // d-1 Stage wurde zu "Verhandlung" in Spalte 2 aktualisiert
    expect(text).toContain('d-1,"Beratung, Implementierung",Verhandlung,25000');
  });

  it('sortiert nach der wirksamen Phase statt der ursprünglichen bei aktiven stageOverrides und sortField=stage', () => {
    // d-1 ("Cloud Migration Pilot", ursprünglich "Lead eingegangen") wird nach "Z-Phase" verschoben
    // d-2 ("Security Audit & Compliance", ursprünglich "Verhandlung") wird nach "A-Phase" verschoben
    sessionStorage.setItem(
      'leadpilot_crm_deal_stage_overrides',
      JSON.stringify({ 'd-1': 'Z-Phase', 'd-2': 'A-Phase' }),
    );

    mockedQuery.mockReturnValue({
      data: { items: SAMPLE_DEALS, total: 2 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    // Aufsteigend nach Phase sortieren -> d-2 (A-Phase) vor d-1 (Z-Phase)
    const { unmount } = renderDealsPage('/crm/deals?sort=stage&order=asc');

    // Beide Deals gerendert mit ihren wirksamen Phasen
    expect(screen.getByText('A-Phase')).toBeInTheDocument();
    expect(screen.getByText('Z-Phase')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    // Zeile 0 ist Header, Zeile 1 muss d-2 ("Security Audit & Compliance" / A-Phase) sein
    expect(rows[1]).toHaveTextContent('Security Audit & Compliance');
    expect(rows[1]).toHaveTextContent('A-Phase');
    // Zeile 2 muss d-1 ("Cloud Migration Pilot" / Z-Phase) sein
    expect(rows[2]).toHaveTextContent('Cloud Migration Pilot');
    expect(rows[2]).toHaveTextContent('Z-Phase');

    unmount();
  });
});
