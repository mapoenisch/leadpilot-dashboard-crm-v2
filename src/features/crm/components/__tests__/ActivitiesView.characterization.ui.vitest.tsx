import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ActivitiesView } from '../ActivitiesView';
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

function envelope(): CrmReadModelEnvelope {
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    sourceId: 'simulated-crm',
    sourceKind: 'synthetic',
    status: 'healthy',
    fetchedAt: '2026-09-17T10:00:00.000Z',
    contentHash: 'char123',
    data: {
      companies: [
        { id: 'c1', name: 'Acme GmbH', industry: 'Software', city: 'Berlin', employeeCount: 5 },
      ],
      contacts: [],
      deals: [],
      activities: [
        {
          id: 'a1',
          companyId: 'c1',
          type: 'NOTE',
          channel: 'E-Mail',
          timestamp: '2026-09-01T10:00:00.000Z',
          description: 'Charakterisierungs-Notiz zur Acme',
          performedBy: 'anna.vertrieb',
          status: 'COMPLETED',
        },
        {
          id: 'a2',
          companyId: 'c1',
          type: 'CALL',
          channel: 'Telefon',
          timestamp: '2026-09-02T11:00:00.000Z',
          description: 'Charakterisierungs-Anruf zur Acme',
          performedBy: 'bert.sales',
          status: 'COMPLETED',
        },
        {
          id: 'a3',
          companyId: 'c1',
          type: 'MEETING',
          channel: 'Vor-Ort',
          timestamp: '2026-09-03T12:00:00.000Z',
          description: 'Charakterisierungs-Termin zur Acme',
          performedBy: 'anna.vertrieb',
          status: 'OPEN',
        },
      ],
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
  };
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('ActivitiesView (characterization: Filter)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOrg.mockReturnValue({
      session: { userId: 'u-demo', organizationId: DEMO_ORGANIZATION_ID, role: 'viewer' },
      isLoading: false,
    });
    mockedLoad.mockResolvedValue(envelope());
  });

  it('rendert alle Envelope-Aktivitäten mit Zähler', async () => {
    render(<ActivitiesView />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByText('Charakterisierungs-Notiz zur Acme')).toBeInTheDocument(),
    );
    expect(screen.getByText('Charakterisierungs-Anruf zur Acme')).toBeInTheDocument();
    expect(screen.getByText('Charakterisierungs-Termin zur Acme')).toBeInTheDocument();
    expect(screen.getByText('3 von 3 Aktivitäten')).toBeInTheDocument();
  });

  it('filtert per Suche über Details und Bearbeiter', async () => {
    const user = userEvent.setup();
    render(<ActivitiesView />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByText('Charakterisierungs-Anruf zur Acme')).toBeInTheDocument(),
    );
    await user.type(screen.getByRole('searchbox', { name: 'Aktivitäten suchen' }), 'bert.sales');
    expect(screen.getByText('1 von 3 Aktivitäten')).toBeInTheDocument();
    expect(screen.getByText('Charakterisierungs-Anruf zur Acme')).toBeInTheDocument();
    expect(screen.queryByText('Charakterisierungs-Notiz zur Acme')).not.toBeInTheDocument();
  });

  it('filtert per Typ-Select über die Combobox', async () => {
    const user = userEvent.setup();
    render(<ActivitiesView />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByText('Charakterisierungs-Notiz zur Acme')).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'CALL' }));
    expect(screen.getByText('1 von 3 Aktivitäten')).toBeInTheDocument();
    expect(screen.getByText('Charakterisierungs-Anruf zur Acme')).toBeInTheDocument();
    expect(screen.queryByText('Charakterisierungs-Termin zur Acme')).not.toBeInTheDocument();
  });

  it('zeigt leeren Envelope mit Leertext', async () => {
    const base = envelope();
    mockedLoad.mockResolvedValue({
      ...base,
      status: 'empty',
      data: { ...base.data, activities: [] },
    });
    render(<ActivitiesView />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('0 von 0 Aktivitäten')).toBeInTheDocument());
    expect(screen.getByText('Keine Einträge vorhanden')).toBeInTheDocument();
  });
});
