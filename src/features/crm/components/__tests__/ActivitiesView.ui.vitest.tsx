import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

function envelopeWithActivities(): CrmReadModelEnvelope {
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    sourceId: 'simulated-crm',
    sourceKind: 'synthetic',
    status: 'healthy',
    fetchedAt: '2026-09-17T10:00:00.000Z',
    contentHash: 'abc123',
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
      activities: [
        {
          id: 'a1',
          companyId: 'c1',
          type: 'NOTE',
          channel: 'simulated',
          timestamp: '2026-09-01T10:00:00.000Z',
          description: 'Envelope-Notiz zur Acme',
          performedBy: 'system',
          status: 'completed',
        },
        {
          id: 'a2',
          companyId: 'c1',
          type: 'CALL',
          channel: 'simulated',
          timestamp: '2026-09-02T11:00:00.000Z',
          description: 'Envelope-Anruf zur Acme',
          performedBy: 'sales',
          status: 'completed',
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

describe('ActivitiesView (G47 Envelope)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOrg.mockReturnValue({
      session: { userId: 'u-demo', organizationId: DEMO_ORGANIZATION_ID, role: 'viewer' },
      isLoading: false,
    });
  });

  it('zeigt ausschließlich Envelope-Aktivitäten mit Provenienz', async () => {
    mockedLoad.mockResolvedValue(envelopeWithActivities());
    const { container } = render(<ActivitiesView />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getAllByText('Envelope-Notiz zur Acme').length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText('Envelope-Anruf zur Acme').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acme GmbH').length).toBeGreaterThan(0);
    expect(container.textContent).toContain('simulated-crm');
    // Kein statischer Bestand, kein Simulations-Mix.
    expect(container.textContent).not.toContain('Auto Vogel');
    expect(container.textContent).not.toContain('LeadPilot Connect');
    expect(container.textContent).not.toContain('Simulation Engine');
    expect(container.textContent).not.toContain('System / Event Log');
  });

  it('unavailable zeigt Fehler statt statischer Ersatzliste', async () => {
    const base = envelopeWithActivities();
    mockedLoad.mockResolvedValue({
      ...base,
      status: 'unavailable',
      data: { ...base.data, activities: [] },
      errorCode: 'FETCH_FAILED',
    });
    const { container } = render(<ActivitiesView />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('management-chart-error')).toBeTruthy());
    expect(container.textContent).not.toContain('Auto Vogel');
    expect(container.textContent).not.toContain('Envelope-Notiz');
  });
});
