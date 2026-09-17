import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { DataBasisPage } from '../DataBasisPage';
import { loadCrmReadModel, DEMO_ORGANIZATION_ID } from '@/services/data/crmReadModelService';
import { useOrganization } from '@/auth/organizationContext';
import type { CrmReadModelEnvelope } from '@/types/dataSource';

vi.mock('@/services/data/crmReadModelService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/data/crmReadModelService')>();
  return { ...actual, loadCrmReadModel: vi.fn() };
});

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

const mockedLoad = vi.mocked(loadCrmReadModel);
const mockedOrg = vi.mocked(useOrganization);

function envelopeWith(
  status: CrmReadModelEnvelope['status'],
  errorCode?: string,
): CrmReadModelEnvelope {
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    sourceId: 'simulated-crm',
    sourceKind: 'synthetic',
    status,
    fetchedAt: '2026-09-17T10:00:00.000Z',
    contentHash: 'deadbeefcafe1234',
    data: {
      companies: [
        {
          id: 'c1',
          name: 'Acme GmbH',
          industry: 'Software',
          city: 'Berlin',
          employeeCount: 5,
        },
      ],
      contacts: [],
      deals: [],
      activities: [],
      audit: {
        companiesLoaded: 1,
        companiesValid: 1,
        companiesErrors: 0,
        contactsLoaded: 0,
        contactsValid: 0,
        contactsMatched: 0,
        contactsErrors: 0,
        dealsLoaded: 0,
        dealsValid: 0,
        dealsErrors: 0,
      },
    },
    ...(errorCode ? { errorCode } : {}),
  };
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('DataBasisPage (G47 Provenienz)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOrg.mockReturnValue({
      session: { userId: 'u-demo', organizationId: DEMO_ORGANIZATION_ID, role: 'viewer' },
      isLoading: false,
    });
  });

  it('zeigt Quelle, Modus, Abrufzeit, Alter und Status', async () => {
    mockedLoad.mockResolvedValue(envelopeWith('healthy'));
    render(<DataBasisPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('data-basis-page')).toBeTruthy());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Datenbasis');
    const provenance = screen.getByTestId('data-basis-provenance');
    expect(provenance.textContent).toContain('simulated-crm');
    expect(provenance.textContent).toContain('synthetic');
    expect(provenance.textContent).toContain('2026-09-17T10:00:00.000Z');
    expect(provenance.textContent).toContain('deadbeefcafe1234');
    expect(provenance.textContent).toContain(DEMO_ORGANIZATION_ID);
    expect(screen.getByText('Gesund')).toBeTruthy();
    expect(screen.getByTestId('data-basis-counts').textContent).toContain('Unternehmen');
  });

  it('unavailable zeigt Fehler statt Ersatzdaten', async () => {
    mockedLoad.mockResolvedValue(envelopeWith('unavailable', 'FETCH_FAILED'));
    render(<DataBasisPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('management-chart-error')).toBeTruthy());
    expect(screen.queryByTestId('data-basis-provenance')).toBeNull();
    expect(screen.queryByTestId('data-basis-counts')).toBeNull();
  });

  it('empty ist gültig und wird so benannt', async () => {
    const empty = envelopeWith('empty');
    empty.data = {
      ...empty.data,
      companies: [],
    };
    mockedLoad.mockResolvedValue(empty);
    render(<DataBasisPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText('Leer (gültig)')).toBeTruthy());
    expect(screen.getByText(/gültiges Ergebnis/)).toBeTruthy();
  });
});
