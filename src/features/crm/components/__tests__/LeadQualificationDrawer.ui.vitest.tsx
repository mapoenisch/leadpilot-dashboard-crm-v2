/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadQualificationDrawer } from '../LeadQualificationDrawer';

const dbMock = vi.hoisted(() => ({
  configured: true,
  from: vi.fn(),
}));

vi.mock('@/services/db/supabaseClient', () => ({
  get isSupabaseConfigured() {
    return dbMock.configured;
  },
  get supabase() {
    return dbMock.configured ? { from: dbMock.from } : null;
  },
}));

interface BuilderResult {
  data?: unknown;
  error?: { message?: string } | null;
}

function makeBuilder(readResult: BuilderResult) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.not = vi.fn(() => Promise.resolve(readResult));
  builder.maybeSingle = vi.fn(() => Promise.resolve(readResult));
  builder.upsert = vi.fn(() => Promise.resolve({ error: null }));
  builder.then = (resolve: (v: BuilderResult) => unknown) =>
    Promise.resolve(readResult).then(resolve);
  return builder;
}

const LEAD = {
  id: 'contact-1',
  firstName: 'Maximilian',
  lastName: 'Mustermann',
  email: 'm@acme.de',
  jobTitle: 'Chief Executive Officer (CEO)',
  companyName: 'Acme Cloud GmbH',
  city: 'München',
  employeeCount: 65,
  industry: 'IT / Software',
};

function renderDrawer(props: Partial<Parameters<typeof LeadQualificationDrawer>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LeadQualificationDrawer
        lead={LEAD}
        isOpen
        onClose={vi.fn()}
        onConvertToDeal={vi.fn()}
        organizationId="org-1"
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe('LeadQualificationDrawer (Auftrag 139)', () => {
  beforeEach(() => {
    dbMock.configured = true;
    dbMock.from.mockReset();
    dbMock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
  });

  it('drawer_laedt_gespeicherte_bant_werte: Serverwerte schlagen Score-Vorschläge', async () => {
    dbMock.from.mockReturnValue(
      makeBuilder({
        data: {
          contact_id: 'contact-1',
          budget: false,
          authority: true,
          need: false,
          timeline: true,
          notes: 'Gespeicherte Notiz',
          qualified_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z',
        },
        error: null,
      }),
    );

    renderDrawer();

    // Warten bis die gespeicherte Zeile geladen ist (Notiz ist eindeutig)
    await waitFor(() => {
      expect(screen.getByLabelText(/Qualifizierungsnotizen/)).toHaveValue('Gespeicherte Notiz');
    });
    // Gespeicherte Werte: authority + timeline an, budget + need aus
    expect(screen.getByRole('button', { name: /Entscheidungskompetenz/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Zeitplan/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Budget vorhanden/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /Konkreter Bedarf/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('zeigt Score-Vorschläge, solange keine gespeicherte Zeile existiert', async () => {
    renderDrawer();

    // Warten bis die (leere) Server-Antwort geladen ist
    await waitFor(() => {
      expect(screen.getByLabelText(/Qualifizierungsnotizen/)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.getByText(/BANT-Qualifizierung \(0\/4\)|BANT-Qualifizierung \([1-4]\/4\)/),
      ).toBeInTheDocument();
    });
    // Hot Lead (100%) → Budget-Vorschlag an, Timeline aus
    expect(screen.getByRole('button', { name: /Budget vorhanden/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Zeitplan/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('viewer_kann_nicht_speichern: keine Speichern-/Konvertieren-Buttons, Felder gesperrt', async () => {
    renderDrawer({ isViewer: true });

    await waitFor(() => {
      expect(screen.getByLabelText(/Qualifizierungsnotizen/)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('qualification-save-btn')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /zu deal konvertieren/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Budget vorhanden/ })).toBeDisabled();
    expect(screen.getByLabelText(/Qualifizierungsnotizen/)).toBeDisabled();
  });

  it('doppelklick_einmal_aufgerufen: Speichern ist während des Requests deaktiviert', async () => {
    const resolvers: Array<(v: { error: null }) => void> = [];
    const builder = makeBuilder({ data: null, error: null });
    builder.upsert = vi.fn(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    dbMock.from.mockReturnValue(builder);

    renderDrawer();

    const saveBtn = await screen.findByTestId('qualification-save-btn');
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(builder.upsert).toHaveBeenCalledTimes(1);
    });

    resolvers[0]?.({ error: null });
    await waitFor(() => {
      expect(screen.getByText('Qualifizierung gespeichert.')).toBeInTheDocument();
    });
  });

  it('zeigt einen Fehler, wenn das Speichern fehlschlägt', async () => {
    const builder = makeBuilder({ data: null, error: null });
    builder.upsert = vi.fn(() => Promise.resolve({ error: { message: 'rls denied' } }));
    dbMock.from.mockReturnValue(builder);

    renderDrawer();

    const saveBtn = await screen.findByTestId('qualification-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/rls denied/);
    });
  });
});
