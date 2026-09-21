import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LeadsPage } from '../LeadsPage';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/hooks/queries/useCrmListQuery', () => ({
  useCrmListQuery: vi.fn(),
}));

const mockedOrg = vi.mocked(useOrganization);
const mockedUseCrmListQuery = vi.mocked(useCrmListQuery);

describe('LeadsPage Provenance & Tab Switch Reactive Tracking (P1-1)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/crm/leads');
    vi.clearAllMocks();
    mockedOrg.mockReturnValue({
      session: { role: 'admin', userId: 'usr-1', organizationId: 'org-1' },
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);

    mockedUseCrmListQuery.mockImplementation(((params: { resource: string }) => {
      if (params.resource === 'deals') {
        return {
          data: { items: [], total: 0 },
          isLoading: false,
          isError: true,
          error: new Error('FORBIDDEN'),
        };
      }
      return {
        data: {
          items: [{ id: 'p1', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com' }],
          total: 1,
        },
        isLoading: false,
        isError: false,
        error: null,
      };
    }) as never);
  });

  it('dynamically switches DataSourceStatus from healthy to unavailable when navigating from healthy Contacts to errored Funnel Deals', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // 1. Contacts query in TanStack Query Cache is healthy
    queryClient.setQueryData(['crm', 'list', 'contacts', { page: 1 }], {
      items: [{ id: 'p1' }],
    });

    // 2. Deals query in TanStack Query Cache is errored (FORBIDDEN)
    const dealsQuery = queryClient.getQueryCache().build(queryClient, {
      queryKey: ['crm', 'list', 'deals', { page: 1 }],
    });
    dealsQuery.setState({
      status: 'error',
      error: new Error('FORBIDDEN'),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/crm/leads']}>
          <LeadsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Initial state on Contacts tab: query succeeds -> DataSourceStatus is healthy
    const statusContainer = screen.getByTestId('data-source-status');
    expect(statusContainer).toHaveTextContent('Supabase CRM');
    expect(statusContainer).toHaveTextContent(/Status: Gesund/i);
    expect(statusContainer).toHaveTextContent(/Frische: Aktuell/i);

    // 2. Click "Funnel Deals" tab
    const dealsTab = screen.getByRole('tab', { name: 'Funnel Deals' });
    fireEvent.click(dealsTab);

    // 3. Negative contract: DataSourceStatus MUST dynamically track the deals resource and switch to unavailable with sanitized error code
    expect(statusContainer).toHaveTextContent(/Status: Nicht verfügbar/i);
    expect(statusContainer).toHaveTextContent(/FORBIDDEN/);

    // 4. Click back to "Kontakte" tab
    const contactsTab = screen.getByRole('tab', { name: 'Kontakte' });
    fireEvent.click(contactsTab);

    // 5. DataSourceStatus immediately recovers to healthy
    expect(statusContainer).toHaveTextContent(/Status: Gesund/i);
    expect(statusContainer).toHaveTextContent('Supabase CRM');
  });
});
