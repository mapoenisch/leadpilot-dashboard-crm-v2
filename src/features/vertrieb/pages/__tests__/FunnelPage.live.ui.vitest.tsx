import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { FunnelPage } from '../FunnelPage';
import * as crmListService from '@/services/crm/crmListService';
import { ImportedFunnelDeal, Contact } from '@/types/crm';

vi.mock('@/services/crm/crmListService', () => ({
  fetchCrmList: vi.fn(),
  isSupabaseConfigured: true,
  supabase: {},
  CrmServiceError: class extends Error {},
}));

const mockDeals: ImportedFunnelDeal[] = [
  {
    id: 'd1',
    dealName: 'Acme Cloud Migration',
    stage: 'WON',
    amount: 50000,
    closeDate: '2026-06-30',
    pipeline: 'Core Sales',
  },
  {
    id: 'd2',
    dealName: 'Beta ERP Rollout',
    stage: 'PROPOSAL',
    amount: 30000,
    closeDate: '2026-06-30',
    pipeline: 'Core Sales',
    daysInStage: 28, // Triggert Bottleneck
  } as ImportedFunnelDeal & { daysInStage: number },
  {
    id: 'd3',
    dealName: 'Gamma AI Pilot',
    stage: 'QUALIFIED_LEAD',
    amount: 20000,
    closeDate: '2026-06-30',
    pipeline: 'Core Sales',
  },
  {
    id: 'd4',
    dealName: 'Delta Security Audit',
    stage: 'LEAD',
    amount: 15000,
    closeDate: '2026-06-30',
    pipeline: 'Core Sales',
  },
];

const mockContacts: Contact[] = [
  { id: 'c1', companyId: 'comp1', email: 'c1@test.de', name: 'Max Mustermann' },
  { id: 'c2', companyId: 'comp2', email: 'c2@test.de', name: 'Erika Musterfrau' },
  { id: 'c3', companyId: 'comp3', email: 'c3@test.de', name: 'Hans Meier' },
  { id: 'c4', companyId: 'comp4', email: 'c4@test.de', name: 'Lisa Schmidt' },
  { id: 'c5', companyId: 'comp5', email: 'c5@test.de', name: 'Peter Fox' },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </BrowserRouter>,
  );
}

describe('FunnelPage Live & Vergleich (Auftrag 131)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/vertrieb/funnel');

    vi.mocked(crmListService.fetchCrmList).mockImplementation((params) => {
      if (params.resource === 'deals') {
        return Promise.resolve({
          items: mockDeals,
          total: mockDeals.length,
          page: 1,
          pageSize: 1000,
          resource: 'deals',
        });
      }
      return Promise.resolve({
        items: mockContacts,
        total: mockContacts.length,
        page: 1,
        pageSize: 1000,
        resource: 'contacts',
      });
    });
  });

  it('startet standardmäßig im Plan 2025 Modus', () => {
    renderWithClient(<FunnelPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Sales Funnel 2025' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Plan 2025/i, selected: true })).toBeInTheDocument();
    expect(screen.getAllByText('CRM Funnel 2025').length).toBeGreaterThan(0);
  });

  it('wechselt per Klick in den Live-Pipeline Modus und zeigt Bottlenecks', async () => {
    renderWithClient(<FunnelPage />);

    const liveTab = screen.getByRole('tab', { name: /Live-Pipeline/i });
    fireEvent.click(liveTab);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Live Sales Pipeline' }),
      ).toBeInTheDocument();
    });

    // Bottleneck-Alert muss vorhanden sein
    await waitFor(() => {
      expect(screen.getByTestId('funnel-bottleneck-alert')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Engpass identifiziert/i).length).toBeGreaterThan(0);

    // Tabelle für Live-CRM muss gerendert sein
    expect(screen.getByText('Operative Pipeline-Tabelle (Live-CRM)')).toBeInTheDocument();
    expect(screen.getByText('CRM Bestand')).toBeInTheDocument();
    expect(screen.getByText('Pipeline-Volumen')).toBeInTheDocument();
  });

  it('wechselt in den Vergleichsmodus und zeigt Delta-Pills', async () => {
    renderWithClient(<FunnelPage />);

    const vergleichTab = screen.getByRole('tab', { name: /Vergleich/i });
    fireEvent.click(vergleichTab);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Sales Funnel: Plan vs. Live' }),
      ).toBeInTheDocument();
    });

    // Tabelle mit Plan vs. Live und Deltas
    await waitFor(() => {
      expect(screen.getByText('Gegenüberstellung: Plan FY 2025 vs. Live-CRM')).toBeInTheDocument();
    });
    expect(screen.getByText('Δ Einheiten')).toBeInTheDocument();
    expect(screen.getByText('Δ Quote')).toBeInTheDocument();
  });

  it('unterstützt Tastaturnavigation zwischen den Tabs', () => {
    renderWithClient(<FunnelPage />);

    const planTab = screen.getByRole('tab', { name: /Plan 2025/i });
    planTab.focus();

    // Pfeil nach rechts -> Live
    fireEvent.keyDown(planTab, { key: 'ArrowRight' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Live Sales Pipeline' }),
    ).toBeInTheDocument();

    const liveTab = screen.getByRole('tab', { name: /Live-Pipeline/i });
    // Pfeil nach rechts -> Vergleich
    fireEvent.keyDown(liveTab, { key: 'ArrowRight' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sales Funnel: Plan vs. Live' }),
    ).toBeInTheDocument();

    const vergleichTab = screen.getByRole('tab', { name: /Vergleich/i });
    // Pfeil nach links -> zurück zu Live
    fireEvent.keyDown(vergleichTab, { key: 'ArrowLeft' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Live Sales Pipeline' }),
    ).toBeInTheDocument();
  });

  it('initialisiert den Modus aus dem URL-Parameter (?daten=vergleich)', async () => {
    window.history.pushState({}, '', '/vertrieb/funnel?daten=vergleich');
    renderWithClient(<FunnelPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Sales Funnel: Plan vs. Live' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Vergleich/i, selected: true })).toBeInTheDocument();
  });
});
