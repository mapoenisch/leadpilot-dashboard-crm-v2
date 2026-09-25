import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ExecutiveDashboardPage } from '../ExecutiveDashboardPage';
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

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function healthyEnvelope(): CrmReadModelEnvelope {
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    sourceId: 'simulated-crm',
    sourceKind: 'synthetic',
    status: 'healthy',
    fetchedAt: '2026-09-17T10:00:00.000Z',
    contentHash: 'abc123',
    data: {
      companies: [],
      contacts: [],
      deals: [],
      activities: [],
      audit: {
        companiesLoaded: 0,
        companiesValid: 0,
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

describe('ExecutiveDashboardPage (characterization)', () => {
  // 067R / G64 (PR-SOURCE-04): PipelineSnapshot liest seit 067R den
  // CRM-Envelope und braucht daher denselben Sitzungs-/Envelope-Mock wie die
  // übrigen CRM-Ansichten. Keine Assertion geändert.
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOrg.mockReturnValue({
      session: { userId: 'u-demo', organizationId: DEMO_ORGANIZATION_ID, role: 'viewer' },
      isLoading: false,
    });
    mockedLoad.mockResolvedValue(healthyEnvelope());
  });

  it('rendert Cockpit-Titel, Badges und Live-Sektion', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ExecutiveDashboardPage />
      </MemoryRouter>,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('Executive Cockpit V2')).toBeInTheDocument();
    expect(screen.getAllByText('Ebene A Baseline').length).toBeGreaterThan(0);
    expect(screen.getByText('Ebene C Realtime')).toBeInTheDocument();
    expect(screen.getByTestId('live-performance-section')).toBeInTheDocument();
  });

  it('bettet das Executive-Cockpit ein', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ExecutiveDashboardPage />
      </MemoryRouter>,
      { wrapper: createWrapper() },
    );
    expect(screen.getByTestId('executive-cockpit-root')).toBeInTheDocument();
  });
});

describe('DataBasisPage Lücken (characterization)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOrg.mockReturnValue({
      session: { userId: 'u-demo', organizationId: DEMO_ORGANIZATION_ID, role: 'viewer' },
      isLoading: false,
    });
  });

  it('degraded zeigt eingeschränkten Status mit Hinweis', async () => {
    mockedLoad.mockResolvedValue({ ...healthyEnvelope(), status: 'degraded' });
    render(<DataBasisPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText('Eingeschränkt (degraded)')).toBeTruthy());
    expect(screen.getByText(/Importfehler/)).toBeTruthy();
    expect(screen.getByTestId('data-basis-counts')).toBeTruthy();
  });

  it('zeigt Ladezustand mit genau einer h1', async () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));
    render(<DataBasisPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Datenbasis');
    expect(screen.getByText('Lade CRM-Envelope…')).toBeTruthy();
  });
});
