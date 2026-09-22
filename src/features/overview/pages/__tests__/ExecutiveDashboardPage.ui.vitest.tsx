import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExecutiveDashboardPage } from '../ExecutiveDashboardPage';
import { useOrganization } from '@/auth/organizationContext';
import { loadCrmReadModel, DEMO_ORGANIZATION_ID } from '@/services/data/crmReadModelService';
import type { CrmReadModelEnvelope } from '@/types/dataSource';

vi.mock('@/services/data/crmReadModelService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/data/crmReadModelService')>();
  return { ...actual, loadCrmReadModel: vi.fn() };
});

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

// Mock Recharts & heavy canvas components to avoid jsdom layout errors
vi.mock('@/components/liveKpi/StreamingAreaChart', () => ({
  StreamingAreaChart: () => <div data-testid="mock-streaming-area-chart" />,
}));
vi.mock('@/components/liveKpi/LiveArrMixDonut', () => ({
  LiveArrMixDonut: () => <div data-testid="mock-live-arr-mix-donut" />,
}));
vi.mock('@/components/liveKpi/LiveFunnelBarChart', () => ({
  LiveFunnelBarChart: () => <div data-testid="mock-live-funnel-bar-chart" />,
}));
vi.mock('@/components/executiveCockpit', () => ({
  ExecutiveCockpit: () => <div data-testid="mock-executive-cockpit" />,
}));

const mockedLoad = vi.mocked(loadCrmReadModel);
const mockedOrg = vi.mocked(useOrganization);

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ExecutiveDashboardPage (067O Provenienz & Frische)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOrg.mockReturnValue({
      session: { userId: 'u-admin', organizationId: DEMO_ORGANIZATION_ID, role: 'admin' },
      isLoading: false,
    });
  });

  it('renders ExecutiveDashboardPage with DataSourceStatus badges and banner', async () => {
    const mockEnvelope: CrmReadModelEnvelope = {
      organizationId: DEMO_ORGANIZATION_ID,
      sourceId: 'supabase',
      sourceKind: 'supabase',
      status: 'healthy',
      fetchedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 min ago
      contentHash: 'hash-exec',
      data: {
        companies: [],
        contacts: [],
        deals: [],
        activities: [],
        audit: {
          companiesLoaded: 10,
          companiesValid: 10,
          companiesErrors: 0,
          contactsLoaded: 20,
          contactsValid: 20,
          contactsMatched: 20,
          contactsErrors: 0,
          dealsLoaded: 5,
          dealsValid: 5,
          dealsErrors: 0,
        },
      },
    };

    mockedLoad.mockResolvedValue(mockEnvelope);

    renderWithClient(<ExecutiveDashboardPage />);

    expect(screen.getByText('Executive Cockpit V2')).toBeDefined();
    // At least one status element exists
    const statusElements = screen.getAllByTestId('data-source-status');
    expect(statusElements.length).toBeGreaterThanOrEqual(1);
  });
});
