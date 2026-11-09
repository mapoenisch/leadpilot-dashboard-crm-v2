import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LeadsPage } from '../LeadsPage';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
vi.mock('@/hooks/queries/useCrmListQuery', () => ({ useCrmListQuery: vi.fn() }));
vi.mock('@/services/db/supabaseClient', () => {
  const builder: Record<string, unknown> = {};
  const empty = { data: null, error: null };
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.not = vi.fn(() => Promise.resolve({ data: [], error: null }));
  builder.maybeSingle = vi.fn(() => Promise.resolve(empty));
  builder.upsert = vi.fn(() => Promise.resolve({ error: null }));
  builder.insert = vi.fn(() => Promise.resolve({ error: null }));
  builder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve);
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: () => builder,
      rpc: vi.fn().mockResolvedValue({
        data: {
          id: 'd-conv-test',
          deal_name: 'Test Deal',
          stage: 'Erstgespräch geführt',
          amount: 30000,
          close_date: '2026-12-31',
          pipeline: 'Enterprise SaaS',
          organization_id: 'org-1',
          created_at: '2026-11-09T00:00:00Z',
        },
        error: null,
      }),
    },
  };
});
vi.mock('@/services/crm/crmExportService', () => ({
  downloadCrmExport: vi.fn(),
  CrmServiceError: class extends Error {},
}));

const mockedOrg = vi.mocked(useOrganization);
const mockedQuery = vi.mocked(useCrmListQuery);

const SAMPLE_CONTACTS = [
  {
    id: 'contact-hot',
    firstName: 'Maximilian',
    lastName: 'Mustermann',
    email: 'm.mustermann@acme-cloud.de',
    jobTitle: 'Chief Executive Officer (CEO)',
    companyId: 'comp-1',
    companyName: 'Acme Cloud Solutions GmbH',
    city: 'München, Deutschland',
    employeeCount: 65,
    industry: 'IT / Software',
  },
  {
    id: 'contact-warm',
    firstName: 'Sabine',
    lastName: 'Vertrieb',
    email: 's.vertrieb@mittelstand.at',
    jobTitle: 'Sales Team Lead',
    companyId: 'comp-2',
    companyName: 'Mittelstand Industrie AG',
    city: 'Wien',
    employeeCount: 15,
    industry: 'Gesundheitswesen',
  },
  {
    id: 'contact-cold',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@unknown-corp.us',
    jobTitle: 'Werkstudent',
    companyId: 'comp-3',
    companyName: 'Global Corp LLC',
    city: 'Austin, USA',
    employeeCount: 5,
    industry: 'Einzelhandel',
  },
];

function renderLeadsPage(initialUrl = '/crm/leads?tab=contacts') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  window.history.replaceState(null, '', initialUrl);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <LeadsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LeadsPage – Lead Scoring & Qualifizierungs-Cockpit (Auftrag 130)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedOrg.mockReturnValue({
      session: { role: 'admin', userId: 'usr-1', organizationId: 'org-1' },
      isLoading: false,
    } as unknown as ReturnType<typeof useOrganization>);

    mockedQuery.mockReturnValue({
      data: { items: SAMPLE_CONTACTS, total: 3 },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it('rendert Lead-Score Badges in der Kontaktliste mit korrekter Punkteberechnung', () => {
    renderLeadsPage();

    // Hot Lead (100%)
    expect(screen.getByText('100%')).toBeInTheDocument();
    // Warm Lead (67%)
    expect(screen.getByText('67%')).toBeInTheDocument();
    // Cold Lead (35%)
    expect(screen.getByText('35%')).toBeInTheDocument();

    // Namen müssen gerendert sein
    expect(screen.getByText('Maximilian Mustermann')).toBeInTheDocument();
    expect(screen.getByText('Sabine Vertrieb')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('öffnet den Qualifizierungs-Drawer beim Klick auf einen Score-Badge oder Qualifizieren-Button', () => {
    renderLeadsPage();

    const qualifyButtons = screen.getAllByRole('button', { name: /qualifizieren/i });
    fireEvent.click(qualifyButtons[0]!);

    // Drawer sollte geöffnet sein
    expect(screen.getByText('Lead-Qualifizierung')).toBeInTheDocument();
    expect(
      screen.getByText(/ICP-Fit-Analyse und Qualifizierungsworkflow für Maximilian Mustermann/i),
    ).toBeInTheDocument();
    expect(screen.getByText('ICP-Kriterien Aufschlüsselung')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /BANT-Qualifizierung/i })).toBeInTheDocument();

    // Button "Zu Deal konvertieren" vorhanden
    expect(screen.getByRole('button', { name: /zu deal konvertieren/i })).toBeInTheDocument();
  });

  it('öffnet das Konvertierungs-Modal aus dem Drawer und legt einen neuen Deal an', async () => {
    renderLeadsPage();

    const qualifyButtons = screen.getAllByRole('button', { name: /qualifizieren/i });
    fireEvent.click(qualifyButtons[0]!);

    const convertBtn = screen.getByRole('button', { name: /zu deal konvertieren/i });
    fireEvent.click(convertBtn);

    // Modal geöffnet
    expect(screen.getByText('Lead in Deal umwandeln')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Acme Cloud Solutions GmbH – LeadPilot Enterprise'),
    ).toBeInTheDocument();

    // Deal erstellen
    const submitBtn = screen.getByRole('button', { name: 'Deal jetzt anlegen' });
    fireEvent.click(submitBtn);

    // Erfolgsmeldung
    await waitFor(() => {
      expect(
        screen.getByText(/erfolgreich.*in Phase „Erstgespräch geführt“ angelegt!/i),
      ).toBeInTheDocument();
    });
  });

  it('rendert den Score-Tooltip außerhalb des Scrollcontainers und schließt ihn beim Scrollen', () => {
    renderLeadsPage();

    const badge = screen.getAllByRole('button', { name: /Lead-Qualität/i })[0]!;
    fireEvent.mouseEnter(badge);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.parentElement).toBe(document.body);
    expect(badge).toHaveAttribute('aria-describedby', tooltip.id);

    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('öffnet den Score-Tooltip auch per Tastaturfokus', () => {
    renderLeadsPage();

    const badge = screen.getAllByRole('button', { name: /Lead-Qualität/i })[0]!;
    fireEvent.focus(badge);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.blur(badge);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('zeigt im Deals-Tab genau die Serverliste samt Servertrefferzahl', () => {
    window.sessionStorage.setItem(
      'leadpilot_crm_converted_deals_org-1',
      JSON.stringify([{ id: 'alt-lokal', dealName: 'Lokale Altlast', stage: 'Bedarfsanalyse' }]),
    );
    mockedQuery.mockReturnValue({
      data: {
        items: [{ id: 'server-1', dealName: 'Server Deal', stage: 'Verhandlung', amount: 1000 }],
        total: 41,
        page: 2,
        pageSize: 20,
        resource: 'deals',
      },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderLeadsPage('/crm/leads?tab=funnel_deals&seite=2');

    expect(screen.getAllByText('Server Deal').length).toBeGreaterThan(0);
    expect(screen.queryByText('Lokale Altlast')).not.toBeInTheDocument();
    expect(screen.getByText('41 Einträge')).toBeInTheDocument();
  });

  it('filtert Kontakte nach Lead-Qualität über URL-Parameter', () => {
    // Nur Hot Leads anzeigen
    renderLeadsPage('/crm/leads?tab=contacts&qualitaet=hot');

    // Nur Maximilian Mustermann (Hot) sichtbar
    expect(screen.getByText('Maximilian Mustermann')).toBeInTheDocument();
    expect(screen.queryByText('Sabine Vertrieb')).not.toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });
});
