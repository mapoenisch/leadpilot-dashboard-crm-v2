import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LeadsPage } from '../LeadsPage';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';

vi.mock('@/hooks/queries/useCrmListQuery', () => ({
  useCrmListQuery: vi.fn(),
}));

const mockedUseCrmListQuery = vi.mocked(useCrmListQuery);

const companies = [
  {
    id: 'c1',
    name: 'Acme GmbH',
    domain: 'acme.de',
    industry: 'Software',
    city: 'Berlin',
    employeeCount: 42,
  },
];
const contacts = [
  {
    id: 'p1',
    firstName: 'Anna',
    lastName: 'Muster',
    email: 'anna@acme.de',
    jobTitle: 'CTO',
    companyId: 'c1',
  },
  {
    id: 'p2',
    firstName: 'Bob',
    lastName: 'Ohnefirma',
    email: 'bob@example.de',
    jobTitle: 'CEO',
    companyId: 'missing-id',
  },
];
const deals = [
  {
    id: 'd1',
    dealName: 'Deal Gewonnen',
    stage: 'gewonnen',
    amount: 10000,
    closeDate: '2026-01-01',
    pipeline: 'Inbound',
  },
  {
    id: 'd2',
    dealName: 'Deal Verloren',
    stage: 'verloren',
    amount: 5000,
    closeDate: '2026-02-01',
    pipeline: 'Outbound',
  },
  {
    id: 'd3',
    dealName: 'Deal Offen',
    stage: 'Qualifizierung',
    amount: 7000,
    closeDate: '2026-03-01',
    pipeline: 'Inbound',
  },
];

function ok() {
  mockedUseCrmListQuery.mockImplementation(((params: { resource: string }) => {
    if (params.resource === 'companies') {
      return {
        data: { items: companies, total: 1 },
        isLoading: false,
        isError: false,
        error: null,
      };
    }
    if (params.resource === 'deals') {
      return { data: { items: deals, total: 3 }, isLoading: false, isError: false, error: null };
    }
    return { data: { items: contacts, total: 2 }, isLoading: false, isError: false, error: null };
  }) as never);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/crm/leads']}>
      <LeadsPage />
    </MemoryRouter>,
  );
}

describe('LeadsPage (branch)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/crm/leads');
    vi.clearAllMocks();
    ok();
  });

  it('startet auf dem Kontakte-Tab mit KPIs und Firmenzuordnung', () => {
    renderPage();
    expect(screen.getByText('Leads & Kontakte')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Kontakte' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
    expect(screen.getByText('anna@acme.de')).toBeInTheDocument();
  });

  it('schaltet auf den Unternehmen-Tab um', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Unternehmen' }));
    expect(screen.getByText('CRM companies Übersicht')).toBeInTheDocument();
    expect(screen.getByText('acme.de')).toBeInTheDocument();
    expect(screen.getByText('42 MA')).toBeInTheDocument();
  });

  it('schaltet auf den Funnel-Deals-Tab mit allen Stage-Varianten um', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Funnel Deals' }));
    expect(screen.getByText('CRM deals Übersicht')).toBeInTheDocument();
    expect(screen.getByText('Deal Gewonnen')).toBeInTheDocument();
    expect(screen.getByText('Deal Verloren')).toBeInTheDocument();
    expect(screen.getByText('Deal Offen')).toBeInTheDocument();
  });

  it('schaltet auf den Audit-Tab mit Persistenz-Zählern um', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Supabase & Import Audit' }));
    expect(screen.getByText(/Supabase PostgreSQL Persistence/)).toBeInTheDocument();
    expect(screen.getByText(/Mandantengebundene Abfragen/)).toBeInTheDocument();
  });

  it('zeigt den Ladezustand bei laufenden Queries', () => {
    mockedUseCrmListQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);
    renderPage();
    expect(screen.getByText('Lade Daten aus CRM Repository...')).toBeInTheDocument();
  });

  it('zeigt den Fehlerzustand mit Integritätsmeldung', () => {
    mockedUseCrmListQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('kaputt'),
    } as never);
    renderPage();
    expect(screen.getByText(/Fehler: kaputt/)).toBeInTheDocument();
  });

  it('zeigt den Leerzustand bei leeren Beständen', () => {
    mockedUseCrmListQuery.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    renderPage();
    expect(screen.getByText('Keine CRM-Daten gefunden')).toBeInTheDocument();
  });

  it('navigiert per Tastatur zwischen Tabs', async () => {
    const user = userEvent.setup();
    renderPage();
    const contactsTab = screen.getByRole('tab', { name: 'Kontakte' });
    contactsTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Unternehmen' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
