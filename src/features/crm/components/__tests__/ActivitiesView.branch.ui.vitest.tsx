import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ActivitiesView } from '../ActivitiesView';
import { useCrmReadModelEnvelope } from '@/hooks/queries/useCrmQueries';

vi.mock('@/hooks/queries/useCrmQueries', () => ({
  useCrmReadModelEnvelope: vi.fn(),
}));

const mockedEnvelope = vi.mocked(useCrmReadModelEnvelope);

const audit = {
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
};

function baseData() {
  return {
    companies: [
      { id: 'c1', name: 'Acme GmbH', industry: 'Software', city: 'Berlin', employeeCount: 5 },
    ],
    contacts: [{ id: 'p1', email: 'anna@acme.de' }],
    deals: [{ id: 'd1', dealName: 'Acme-Rollout' }],
    activities: [
      {
        id: 'a1',
        companyId: 'c1',
        type: 'DEAL_WON',
        channel: 'E-Mail',
        timestamp: '2026-09-01T10:00:00.000Z',
        description: 'Abschluss gewonnen',
        performedBy: 'anna.vertrieb',
        status: 'COMPLETED',
      },
      {
        id: 'a2',
        contactId: 'p1',
        type: 'Meeting',
        channel: 'Vor-Ort',
        timestamp: 'kein-datum',
        description: 'Vor-Ort-Termin',
        performedBy: 'bert.sales',
        status: 'OPEN',
      },
      {
        id: 'a3',
        dealId: 'd1',
        type: 'NOTE',
        channel: 'Telefon',
        timestamp: '2026-09-03T12:00:00.000Z',
        description: 'Notiz zum Rollout',
        performedBy: 'anna.vertrieb',
        status: 'OPEN',
      },
      {
        id: 'a4',
        companyId: 'unbekannt-9',
        type: 'NOTE',
        channel: 'E-Mail',
        timestamp: '2026-09-04T12:00:00.000Z',
        description: 'Verwaiste Aktivität',
        performedBy: 'system',
        status: 'OPEN',
      },
    ],
    audit,
  };
}

function envelope(status = 'healthy', data = baseData()) {
  return {
    organizationId: 'demo',
    sourceId: 'simulated-crm',
    sourceKind: 'synthetic',
    status,
    fetchedAt: '2026-09-17T10:00:00.000Z',
    contentHash: 'branch123',
    data,
  };
}

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/crm/activities']}>
      <ActivitiesView />
    </MemoryRouter>,
  );
}

describe('ActivitiesView (branch)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/crm/activities');
    vi.clearAllMocks();
    mockedEnvelope.mockReturnValue({
      data: envelope(),
      isLoading: false,
      isError: false,
      error: null,
    } as never);
  });

  it('zeigt den Ladezustand', () => {
    mockedEnvelope.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);
    renderView();
    expect(screen.getByText('Lade Aktivitäten aus dem CRM-Envelope…')).toBeInTheDocument();
  });

  it('zeigt den Fehlerzustand mit Ursache', () => {
    mockedEnvelope.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    } as never);
    renderView();
    expect(screen.getByText(/Aktivitäten nicht verfügbar: boom/)).toBeInTheDocument();
  });

  it('löst Kontakt-, Deal- und Fallback-Entitäten auf', () => {
    renderView();
    expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
    expect(screen.getByText('anna@acme.de')).toBeInTheDocument();
    expect(screen.getByText('Acme-Rollout')).toBeInTheDocument();
    expect(screen.getByText('unbekannt-9')).toBeInTheDocument();
  });

  it('fällt bei ungültigem Zeitstempel auf den Rohtext zurück', () => {
    renderView();
    expect(screen.getByText('kein-datum')).toBeInTheDocument();
  });

  it('meldet leere und degradierte Quellen als Hinweis, nicht als Fehler', () => {
    mockedEnvelope.mockReturnValue({
      data: envelope('empty', { ...baseData(), activities: [] }),
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    const { unmount } = renderView();
    expect(
      screen.getByText('Die Quelle ist leer — das ist ein gültiges Ergebnis, keine Störung.'),
    ).toBeInTheDocument();
    expect(screen.getByText('0 von 0 Aktivitäten')).toBeInTheDocument();
    unmount();

    mockedEnvelope.mockReturnValue({
      data: envelope('degraded'),
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    renderView();
    expect(screen.getByText(/Die Quelle meldet Importfehler/)).toBeInTheDocument();
  });

  it('kombiniert Suche und Typfilter bis zum Leerzustand', async () => {
    const user = userEvent.setup();
    renderView();
    await user.type(screen.getByRole('searchbox', { name: 'Aktivitäten suchen' }), 'bert.sales');
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'NOTE' }));
    expect(screen.getByText('0 von 4 Aktivitäten')).toBeInTheDocument();
    expect(screen.getByText('Keine Einträge vorhanden')).toBeInTheDocument();
  });

  it('zählt Kanäle und Typen in den KPI-Karten', () => {
    renderView();
    // Top-Kanal: E-Mail kommt zweimal vor
    expect(screen.getByText('E-Mail')).toBeInTheDocument();
    expect(screen.getByText('3 Typen')).toBeInTheDocument();
    expect(screen.getByText('4 von 4 Aktivitäten')).toBeInTheDocument();
  });
});
