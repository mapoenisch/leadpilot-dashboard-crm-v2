// Auftrag 084 / F12: Laden, Fehler, leer und Erfolg sind getrennt sichtbar.
// Fehler erscheinen nicht als geschäftliche 0, Export ist ohne Datenbasis
// gesperrt, „Erneut versuchen“ wiederholt nur die betroffene Abfrage.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { DealsPage } from '../DealsPage';
import { CompaniesPage } from '../CompaniesPage';
import { LeadsPage } from '../LeadsPage';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
vi.mock('@/hooks/queries/useCrmListQuery', () => ({ useCrmListQuery: vi.fn() }));

const mockedOrg = vi.mocked(useOrganization);
const mockedQuery = vi.mocked(useCrmListQuery);

type QueryState = 'error' | 'loading' | 'empty' | 'success';

function mockQuery(state: QueryState, refetch = vi.fn()) {
  const base = { refetch, isLoading: false, isError: false, error: null, data: undefined };
  const byState = {
    error: {
      ...base,
      isError: true,
      error: new Error('Ein interner Serverfehler ist aufgetreten.'),
    },
    loading: { ...base, isLoading: true },
    empty: { ...base, data: { items: [], total: 0 } },
    success: { ...base, data: { items: [], total: 7 } },
  } as const;
  mockedQuery.mockReturnValue(byState[state] as never);
  return refetch;
}

function renderPage(Page: ComponentType) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PAGES: Array<[string, ComponentType, string]> = [
  ['DealsPage', DealsPage, '/crm/deals'],
  ['CompaniesPage', CompaniesPage, '/crm/companies'],
  ['LeadsPage', LeadsPage, '/crm/leads'],
];

describe.each(PAGES)('%s – Zustände (Auftrag 084)', (_name, Page, path) => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', path);
    mockedOrg.mockReturnValue({
      session: { role: 'admin', userId: 'usr-1', organizationId: 'org-1' },
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);
  });

  it('zeigt bei Fehler „Nicht verfügbar“ statt 0 und sperrt den Export', () => {
    mockQuery('error');
    renderPage(Page);
    expect(screen.getAllByText(/Nicht verfügbar/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^0 /)).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
    const exportBtn = screen.getByRole('button', { name: 'CSV Export' });
    expect(exportBtn).toBeDisabled();
    // Sperrgrund sichtbar und dem deaktivierten Button zugeordnet (nicht nur als title).
    const hint = screen.getByText('Export gesperrt: Datenbasis nicht verfügbar');
    expect(hint).toBeVisible();
    expect(exportBtn).toHaveAttribute('aria-describedby', hint.id);
    expect(exportBtn).toHaveAccessibleDescription('Export gesperrt: Datenbasis nicht verfügbar');
  });

  it('„Erneut versuchen“ ruft refetch der betroffenen Abfrage auf', () => {
    const refetch = mockQuery('error');
    renderPage(Page);
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('zeigt beim Laden keine 0 und sperrt den Export', () => {
    mockQuery('loading');
    renderPage(Page);
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.getByRole('button', { name: 'CSV Export' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).toBeNull();
  });

  it('zeigt bei bestätigt leerer Antwort weiterhin 0 und erlaubt Export', () => {
    mockQuery('empty');
    renderPage(Page);
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'CSV Export' })).toBeEnabled();
  });

  it('zeigt bei Erfolg die Anzahl', () => {
    mockQuery('success');
    renderPage(Page);
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'CSV Export' })).toBeEnabled();
  });
});
