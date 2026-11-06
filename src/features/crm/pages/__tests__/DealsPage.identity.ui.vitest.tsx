import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DealsPage } from '../DealsPage';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import { getDealStageOverridesStorageKey } from '../../utils/crmStageHelper';
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
    stage: 'Erstgespräch geführt',
    amount: 15000,
    closeDate: '2026-10-30',
    pipeline: 'Compliance',
  },
];

function renderDealsPage(initialUrl = '/crm/deals?ansicht=tabelle') {
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

describe('DealsPage – Benutzer- und Organisationsbindung von Phasenwechseln (Befund 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedQuery.mockReturnValue({
      data: { items: SAMPLE_DEALS, total: 2 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it('trennt Phasenwechsel strikt zwischen unterschiedlichen Benutzern derselben Organisation', () => {
    const keyUserA = getDealStageOverridesStorageKey('org-1', 'usr-A')!;
    const keyUserB = getDealStageOverridesStorageKey('org-1', 'usr-B')!;

    // Benutzer A hat d-1 nach "Verhandlung" verschoben
    sessionStorage.setItem(keyUserA, JSON.stringify({ 'd-1': 'Verhandlung' }));
    // Benutzer B hat d-2 nach "Bedarfsanalyse" verschoben
    sessionStorage.setItem(keyUserB, JSON.stringify({ 'd-2': 'Bedarfsanalyse' }));

    // 1. Sitzung für Benutzer A
    mockedOrg.mockReturnValue({
      session: { role: 'admin', userId: 'usr-A', organizationId: 'org-1' },
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);

    const { unmount: unmountA } = renderDealsPage();

    // Benutzer A sieht seinen eigenen Phasenwechsel für d-1 ("Verhandlung")
    expect(screen.getByText('Verhandlung')).toBeInTheDocument();
    // d-2 ist bei Benutzer A weiterhin auf der ursprünglichen Phase "Erstgespräch geführt"
    expect(screen.getByText('Erstgespräch geführt')).toBeInTheDocument();
    expect(screen.queryByText('Bedarfsanalyse')).not.toBeInTheDocument();
    unmountA();

    // 2. Benutzerwechsel im selben Tab zu Benutzer B (gleiche Organisation)
    mockedOrg.mockReturnValue({
      session: { role: 'admin', userId: 'usr-B', organizationId: 'org-1' },
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);

    const { unmount: unmountB } = renderDealsPage();

    // Benutzer B übernimmt NICHT die Entwurfsänderungen von A: d-1 ist "Lead eingegangen"
    expect(screen.getByText('Lead eingegangen')).toBeInTheDocument();
    expect(screen.queryByText('Verhandlung')).not.toBeInTheDocument();
    // Aber Benutzer B sieht seinen eigenen Phasenwechsel für d-2 ("Bedarfsanalyse")
    expect(screen.getByText('Bedarfsanalyse')).toBeInTheDocument();
    unmountB();
  });

  it('verwirft Overrides und lädt leeren Zustand, wenn keine Sitzung vorhanden ist', () => {
    const keyUserA = getDealStageOverridesStorageKey('org-1', 'usr-A')!;
    sessionStorage.setItem(keyUserA, JSON.stringify({ 'd-1': 'Verhandlung' }));

    // Nicht authentifizierter / abgemeldeter Zustand
    mockedOrg.mockReturnValue({
      session: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);

    const { unmount } = renderDealsPage();

    // Deals erscheinen mit ihren unveränderten Serverphasen
    expect(screen.getByText('Lead eingegangen')).toBeInTheDocument();
    expect(screen.getByText('Erstgespräch geführt')).toBeInTheDocument();
    expect(screen.queryByText('Verhandlung')).not.toBeInTheDocument();
    unmount();
  });
});
