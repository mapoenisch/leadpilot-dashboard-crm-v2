/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadQualificationDrawer } from '../LeadQualificationDrawer';
import { leadQualificationKey } from '../../services/leadQualificationService';
import type { LeadQualification } from '../../services/leadQualificationService';

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

function renderDrawer(
  props: Partial<Parameters<typeof LeadQualificationDrawer>[0]> = {},
  queryClient?: QueryClient,
) {
  const client = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
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

  it('initialisiert beim Remount aus dem Query-Cache (Codex P1)', async () => {
    // Wieder öffnen ohne Remount der Query: savedQualification liegt bereits
    // im Cache und muss die Initialbelegung sein, nicht die Score-Vorschläge.
    const saved: LeadQualification = {
      contactId: 'contact-1',
      budget: false,
      authority: true,
      need: false,
      timeline: true,
      notes: 'Cache-Notiz',
      qualifiedAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(leadQualificationKey('contact-1'), saved);
    // Refetch liefert dieselbe Zeile (snake_case), damit kein Reset folgt.
    dbMock.from.mockReturnValue(
      makeBuilder({
        data: {
          contact_id: 'contact-1',
          budget: false,
          authority: true,
          need: false,
          timeline: true,
          notes: 'Cache-Notiz',
          qualified_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z',
        },
        error: null,
      }),
    );

    renderDrawer({}, queryClient);

    // Synchron nach dem ersten Render: Cache-Werte, nicht Vorschläge
    expect(screen.getByLabelText(/Qualifizierungsnotizen/)).toHaveValue('Cache-Notiz');
    expect(screen.getByRole('button', { name: /Budget vorhanden/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /Zeitplan/ })).toHaveAttribute(
      'aria-pressed',
      'true',
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

  it('sperrt Bearbeitung und Speichern bis zum ersten Laden (Codex P2)', async () => {
    let resolveRead: ((v: BuilderResult) => void) | undefined;
    const builder = makeBuilder({ data: null, error: null });
    builder.maybeSingle = vi.fn(
      () =>
        new Promise<BuilderResult>((resolve) => {
          resolveRead = resolve;
        }),
    );
    dbMock.from.mockReturnValue(builder);

    renderDrawer();

    const saveBtn = await screen.findByTestId('qualification-save-btn');
    expect(saveBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: /Budget vorhanden/ })).toBeDisabled();
    expect(screen.getByLabelText(/Qualifizierungsnotizen/)).toBeDisabled();
    expect(screen.getByText(/Lade gespeicherte Qualifizierung/)).toBeInTheDocument();

    resolveRead?.({ data: null, error: null });
    await waitFor(() => {
      expect(saveBtn).toBeEnabled();
    });
    expect(screen.getByRole('button', { name: /Budget vorhanden/ })).toBeEnabled();
  });

  it('hintergrund_refetch_uerscheibt_nicht_ungespeicherte_eingaben (Codex P2)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const builder = makeBuilder({ data: null, error: null });
    let call = 0;
    builder.maybeSingle = vi.fn(() => {
      call += 1;
      return Promise.resolve(
        call === 1
          ? { data: null, error: null }
          : {
              data: {
                contact_id: 'contact-1',
                budget: true,
                authority: true,
                need: true,
                timeline: true,
                notes: 'Fremde Notiz',
                qualified_at: '2026-11-10T00:00:00Z',
                updated_at: '2026-11-10T00:00:00Z',
              },
              error: null,
            },
      );
    });
    dbMock.from.mockReturnValue(builder);

    renderDrawer({}, client);

    const notes = await screen.findByLabelText(/Qualifizierungsnotizen/);
    const saveBtn = await screen.findByTestId('qualification-save-btn');
    await waitFor(() => expect(saveBtn).toBeEnabled());

    // Ungespeicherter Entwurf: Notiz + BANT-Toggle.
    fireEvent.change(notes, { target: { value: 'Mein ungespeicherter Entwurf' } });
    const budgetBtn = screen.getByRole('button', { name: /Budget vorhanden/ });
    const budgetBefore = budgetBtn.getAttribute('aria-pressed');
    fireEvent.click(budgetBtn);
    const budgetEdited = budgetBtn.getAttribute('aria-pressed');
    expect(budgetEdited).not.toBe(budgetBefore);

    // Hintergrund-Refetch liefert eine andere Sitzung: Serverwerte dürfen
    // den Entwurf nicht zurücksetzen.
    await client.invalidateQueries({ queryKey: leadQualificationKey('contact-1') });
    await waitFor(() => expect(call).toBeGreaterThan(1));

    expect(notes).toHaveValue('Mein ungespeicherter Entwurf');
    expect(budgetBtn.getAttribute('aria-pressed')).toBe(budgetEdited);
    expect(screen.queryByText('Fremde Notiz')).toBeNull();
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
    await waitFor(() => expect(saveBtn).toBeEnabled());
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
    await waitFor(() => expect(saveBtn).toBeEnabled());
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/rls denied/);
    });
  });
});
