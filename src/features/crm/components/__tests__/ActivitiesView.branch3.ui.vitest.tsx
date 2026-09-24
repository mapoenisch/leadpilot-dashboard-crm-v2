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
        type: 'Proposal Won',
        channel: 'E-Mail',
        timestamp: '2026-09-01T10:00:00.000Z',
        description: 'Notiz zum Abschluss',
        performedBy: 'anna.vertrieb',
        status: 'COMPLETED',
      },
      {
        id: 'a2',
        contactId: 'p1',
        type: 'Qualification Call',
        channel: 'Telefon',
        timestamp: '2026-09-02T11:00:00.000Z',
        description: 'Quali-Telefonat',
        performedBy: 'bert.sales',
        status: 'OPEN',
      },
      {
        id: 'a3',
        dealId: 'fremd-deal',
        type: 'NOTE',
        channel: 'E-Mail',
        timestamp: '2026-09-03T12:00:00.000Z',
        description: 'Notiz ohne Status',
        performedBy: 'system',
      },
      {
        id: 'a-ohne-bezug',
        type: 'NOTE',
        channel: 'E-Mail',
        timestamp: '2026-09-04T12:00:00.000Z',
        description: 'Verwaist ohne Bezug',
        performedBy: 'system',
        status: 'OPEN',
      },
      {
        id: 'a-fremd-firma',
        companyId: 'fremde-firma',
        contactId: 'p1',
        type: 'NOTE',
        channel: 'Telefon',
        timestamp: '2026-09-05T12:00:00.000Z',
        description: 'Firma unbekannt, Kontakt bekannt',
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
    contentHash: 'branch3',
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

describe('ActivitiesView (branch3)', () => {
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

  it('alle vier Quellen-Status erscheinen als Badge, unavailable bleibt lesbar', () => {
    for (const status of ['healthy', 'empty', 'degraded', 'unavailable'] as const) {
      mockedEnvelope.mockReturnValue({
        data: envelope(
          status,
          status === 'healthy' ? baseData() : { ...baseData(), activities: [] },
        ),
        isLoading: false,
        isError: false,
        error: null,
      } as never);
      const { unmount } = renderView();
      expect(screen.getByText(status)).toBeInTheDocument();
      unmount();
    }
    mockedEnvelope.mockReturnValue({
      data: envelope('unavailable'),
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    renderView();
    expect(screen.getByText('Notiz zum Abschluss')).toBeInTheDocument();
  });

  it('löst Fallback-Entitäten über Deal-ID, Datensatz-ID und Kontakt-Kette auf', () => {
    renderView();
    expect(screen.getByText('fremd-deal')).toBeInTheDocument();
    expect(screen.getByText('a-ohne-bezug')).toBeInTheDocument();
    // Fremde Firma fällt auf den bekannten Kontakt zurück (zwei Kontakt-Zeilen).
    expect(screen.getAllByText('anna@acme.de').length).toBeGreaterThanOrEqual(2);
  });

  it('Badge-Varianten für Won-, Call- und neutrale Typen sowie fehlenden Status', () => {
    renderView();
    expect(screen.getByText('Proposal Won')).toBeInTheDocument();
    expect(screen.getByText('Qualification Call')).toBeInTheDocument();
    expect(screen.getAllByText('NOTE').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getAllByText('COMPLETED').length).toBeGreaterThanOrEqual(1);
  });

  it('Suche trifft Details und Bearbeiter getrennt', async () => {
    const user = userEvent.setup();
    renderView();
    await user.type(
      screen.getByRole('searchbox', { name: 'Aktivitäten suchen' }),
      'quali-telefonat',
    );
    expect(screen.getByText('1 von 5 Aktivitäten')).toBeInTheDocument();
    expect(screen.getByText('Quali-Telefonat')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Aktivitäten suchen' }));
    await user.type(screen.getByRole('searchbox', { name: 'Aktivitäten suchen' }), 'bert.sales');
    expect(screen.getByText('1 von 5 Aktivitäten')).toBeInTheDocument();
  });

  it('leere Liste zeigt Strich-Kanal und Null-Typen', () => {
    mockedEnvelope.mockReturnValue({
      data: envelope('healthy', { ...baseData(), activities: [] }),
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    renderView();
    expect(screen.getByText('–')).toBeInTheDocument();
    expect(screen.getByText('0 Typen')).toBeInTheDocument();
    expect(screen.getByText('0 von 0 Aktivitäten')).toBeInTheDocument();
  });

  it('Fehler ohne Error-Objekt und fehlender Envelope melden unbekannte Ursache', () => {
    mockedEnvelope.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: 'kaputt',
    } as never);
    const { unmount } = renderView();
    expect(screen.getByText(/unbekannter Fehler/)).toBeInTheDocument();
    unmount();

    mockedEnvelope.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    renderView();
    expect(screen.getByText(/unbekannter Fehler/)).toBeInTheDocument();
  });
});
