import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useCrmCompanies,
  useCrmContacts,
  useCrmDeals,
  useCrmAuditSummary,
  useCrmReadModelEnvelope,
} from '../useCrmQueries';
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

function demoSession() {
  mockedOrg.mockReturnValue({
    session: { userId: 'u-demo', organizationId: DEMO_ORGANIZATION_ID, role: 'viewer' },
    isLoading: false,
  });
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
      companies: [
        { id: 'comp-1', name: 'Alpha GmbH', industry: 'Tech', city: 'Berlin', employeeCount: 20 },
      ],
      contacts: [
        {
          id: 'cont-1',
          companyId: 'comp-1',
          email: 'a@alpha.de',
          firstName: 'A',
          lastName: 'L',
          jobTitle: 'Dev',
        },
      ],
      deals: [
        {
          id: 'deal-1',
          dealName: 'Deal 1',
          stage: 'Won',
          amount: 50000,
          closeDate: '2026-06-01',
          pipeline: 'Sales',
        },
      ],
      activities: [],
      audit: {
        companiesLoaded: 1,
        companiesValid: 1,
        companiesErrors: 0,
        contactsLoaded: 1,
        contactsValid: 1,
        contactsMatched: 1,
        contactsErrors: 0,
        dealsLoaded: 1,
        dealsValid: 1,
        dealsErrors: 0,
      },
    },
  };
}

function unavailableEnvelope(orgId: string, errorCode: string): CrmReadModelEnvelope {
  const base = healthyEnvelope();
  return {
    ...base,
    organizationId: orgId,
    status: 'unavailable',
    data: { ...base.data, companies: [], contacts: [], deals: [] },
    errorCode,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCrmQueries (G47 Envelope)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    demoSession();
    mockedLoad.mockResolvedValue(healthyEnvelope());
  });

  it('useCrmCompanies liefert Slice aus genau einem Envelope', async () => {
    const { result } = renderHook(() => useCrmCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.name).toBe('Alpha GmbH');
    expect(mockedLoad).toHaveBeenCalled();
  });

  it('useCrmContacts liefert Slice aus genau einem Envelope', async () => {
    const { result } = renderHook(() => useCrmContacts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.email).toBe('a@alpha.de');
  });

  it('useCrmDeals liefert Slice aus genau einem Envelope', async () => {
    const { result } = renderHook(() => useCrmDeals(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.dealName).toBe('Deal 1');
  });

  it('useCrmAuditSummary liefert Audit aus genau einem Envelope', async () => {
    const { result } = renderHook(() => useCrmAuditSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.companiesValid).toBe(1);
  });

  it('Envelope nennt Quelle, Modus, Abrufzeit und Status', async () => {
    const { result } = renderHook(() => useCrmReadModelEnvelope(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sourceId).toBe('simulated-crm');
    expect(result.current.data?.sourceKind).toBe('synthetic');
    expect(result.current.data?.status).toBe('healthy');
    expect(result.current.data?.fetchedAt).toBe('2026-09-17T10:00:00.000Z');
  });

  it('unavailable schaltet niemals still auf Demodaten, sondern ist Fehler', async () => {
    mockedLoad.mockResolvedValue(unavailableEnvelope(DEMO_ORGANIZATION_ID, 'FETCH_FAILED'));
    const { result } = renderHook(() => useCrmCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('Gegenfall: realer Mandant ohne Demo-Auswahl bekommt kein Synthetik', async () => {
    mockedOrg.mockReturnValue({
      session: { userId: 'u-real', organizationId: 'org-real-1', role: 'viewer' },
      isLoading: false,
    });
    mockedLoad.mockResolvedValue(unavailableEnvelope('org-real-1', 'SYNTHETIC_NOT_ALLOWED'));
    const { result } = renderHook(() => useCrmCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(mockedLoad).toHaveBeenCalledWith('org-real-1', 'simulated-crm', {
      allowSynthetic: false,
    });
  });

  it('Gegenfall: ohne Sitzung und ohne Auswahl ist INVALID_ORG statt Demo', async () => {
    mockedOrg.mockReturnValue({ session: null, isLoading: false });
    const { result } = renderHook(() => useCrmCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('INVALID_ORG');
    expect(mockedLoad).not.toHaveBeenCalled();
  });
});
