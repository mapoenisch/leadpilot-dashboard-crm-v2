import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LeadsPage } from '../LeadsPage';
import {
  useCrmAuditSummary,
  useCrmCompanies,
  useCrmContacts,
  useCrmDeals,
} from '@/hooks/queries/useCrmQueries';

vi.mock('@/hooks/queries/useCrmQueries', () => ({
  useCrmCompanies: vi.fn(),
  useCrmContacts: vi.fn(),
  useCrmDeals: vi.fn(),
  useCrmAuditSummary: vi.fn(),
}));

const mockedCompanies = vi.mocked(useCrmCompanies);
const mockedContacts = vi.mocked(useCrmContacts);
const mockedDeals = vi.mocked(useCrmDeals);
const mockedAudit = vi.mocked(useCrmAuditSummary);

const companies = [
  {
    id: 'c1',
    name: 'Acme GmbH',
    domain: 'acme.de',
    industry: 'Software',
    city: 'Berlin',
    postalCode: '10115',
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
  mockedCompanies.mockReturnValue({ data: companies, isLoading: false, error: null } as never);
  mockedContacts.mockReturnValue({ data: contacts, isLoading: false, error: null } as never);
  mockedDeals.mockReturnValue({ data: deals, isLoading: false, error: null } as never);
  mockedAudit.mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
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
    expect(screen.getByRole('tab', { name: /Kontakte \(2\)/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
    expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
    expect(screen.getByText('Nicht zugeordnet')).toBeInTheDocument();
  });

  it('schaltet auf den Unternehmen-Tab um', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /Unternehmen \(1\)/ }));
    expect(screen.getByText('Unternehmen und Accounts Übersicht')).toBeInTheDocument();
    expect(screen.getByText('acme.de')).toBeInTheDocument();
    expect(screen.getByText('42 MA')).toBeInTheDocument();
  });

  it('schaltet auf den Funnel-Deals-Tab mit allen Stage-Varianten um', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: /Funnel Deals \(3\)/ }));
    expect(screen.getByText('Funnel Deals Übersicht')).toBeInTheDocument();
    expect(screen.getByText('Deal Gewonnen')).toBeInTheDocument();
    expect(screen.getByText('Deal Verloren')).toBeInTheDocument();
    expect(screen.getByText('Deal Offen')).toBeInTheDocument();
  });

  it('schaltet auf den Audit-Tab mit Persistenz-Zählern um', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Supabase & Import Audit' }));
    expect(screen.getByText(/Supabase PostgreSQL Persistence/)).toBeInTheDocument();
    expect(screen.getByText(/2 Datensätze/)).toBeInTheDocument();
  });

  it('zeigt den Ladezustand bei laufenden Queries', () => {
    mockedCompanies.mockReturnValue({ data: undefined, isLoading: true, error: null } as never);
    mockedContacts.mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
    mockedDeals.mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
    mockedAudit.mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
    renderPage();
    expect(screen.getByText('Lade Daten aus CRM Repository...')).toBeInTheDocument();
  });

  it('zeigt den Fehlerzustand mit Integritätsmeldung', () => {
    mockedCompanies.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('kaputt'),
    } as never);
    mockedContacts.mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
    mockedDeals.mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
    mockedAudit.mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
    renderPage();
    expect(screen.getByText(/Integritätsfehler: kaputt/)).toBeInTheDocument();
  });

  it('zeigt den Leerzustand bei leeren Beständen', () => {
    mockedCompanies.mockReturnValue({ data: [], isLoading: false, error: null } as never);
    mockedContacts.mockReturnValue({ data: [], isLoading: false, error: null } as never);
    mockedDeals.mockReturnValue({ data: [], isLoading: false, error: null } as never);
    mockedAudit.mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
    renderPage();
    expect(screen.getByText('Keine CRM-Daten erfasst')).toBeInTheDocument();
  });

  it('navigiert per Tastatur zwischen Tabs', async () => {
    const user = userEvent.setup();
    renderPage();
    const contactsTab = screen.getByRole('tab', { name: /Kontakte/ });
    contactsTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Unternehmen/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
