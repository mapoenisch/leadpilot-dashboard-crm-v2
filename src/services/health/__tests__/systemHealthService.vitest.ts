// G62 (Auftrag 067P, Nacharbeit P1): Unit-Tests fuer systemHealthService.
// Prueft alle 5 Subsystem-Checks, Sync-Frische anhand letzter Synchronisation,
// Overall-Status-Ableitung und Zero-Secret-Kontrakt.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------- Mocks
vi.mock('@/services/db/supabaseClient', () => {
  const mockFrom = vi.fn();
  const mockAuth = { getSession: vi.fn() };

  return {
    isSupabaseConfigured: true,
    supabase: { auth: mockAuth, from: mockFrom },
    _mocks: { mockFrom, mockAuth },
  };
});

import { getSystemHealth } from '../systemHealthService';

// ---------------------------------------------------------------- Hilfsfunktionen
interface ContactRow {
  created_at: string;
}

function mockDb(options: {
  session?: unknown;
  sessionError?: unknown;
  contacts?: { data: ContactRow[]; count: number; error?: { message: string } | null };
  ingress?: { count: number; error?: { message: string } | null };
  organizations?: { count: number; error?: { message: string } | null };
}) {
  return async () => {
    const { supabase: db } = await import('@/services/db/supabaseClient');
    (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: options.session ?? { user: { id: 'u1' } } },
      error: options.sessionError ?? null,
    });

    (db!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'contacts') {
        const c = options.contacts ?? {
          data: [{ created_at: new Date().toISOString() }],
          count: 5,
          error: null,
        };
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: c.data, count: c.count, error: c.error }),
            }),
          }),
        };
      }
      const preset =
        table === 'ingress_nonces'
          ? (options.ingress ?? { count: 5, error: null })
          : (options.organizations ?? { count: 2, error: null });
      return {
        select: vi.fn().mockResolvedValue({ count: preset.count, error: preset.error }),
      };
    });
  };
}

// ---------------------------------------------------------------- Tests
describe('systemHealthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gibt Snapshot mit allen 5 Subsystemen zurueck', async () => {
    await mockDb({})();

    const snapshot = await getSystemHealth();

    expect(snapshot).toHaveProperty('overallStatus');
    expect(snapshot).toHaveProperty('subsystems');
    expect(snapshot).toHaveProperty('snapshotAt');
    expect(Object.keys(snapshot.subsystems)).toEqual(
      expect.arrayContaining(['auth', 'database', 'ingress', 'sync', 'worker']),
    );
  });

  it('setzt overallStatus auf error wenn ein Subsystem error hat', async () => {
    const { supabase: db } = await import('@/services/db/supabaseClient');
    (db!.auth.getSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network'));
    (db!.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('DB down');
    });

    const snapshot = await getSystemHealth();
    expect(snapshot.overallStatus).toBe('error');
  });

  it('setzt overallStatus auf ok bei frischem Sync', async () => {
    const prevWorker = (globalThis as Record<string, unknown>)['Worker'];
    (globalThis as Record<string, unknown>)['Worker'] = class {};
    try {
      await mockDb({})();

      const snapshot = await getSystemHealth();
      expect(snapshot.overallStatus).toBe('ok');
      expect(snapshot.subsystems['sync']?.status).toBe('ok');
    } finally {
      if (prevWorker === undefined) {
        delete (globalThis as Record<string, unknown>)['Worker'];
      } else {
        (globalThis as Record<string, unknown>)['Worker'] = prevWorker;
      }
    }
  });

  it('meldet Sync als degraded wenn letzter Sync veraltet ist', async () => {
    await mockDb({
      contacts: {
        data: [{ created_at: '2020-01-01T00:00:00Z' }],
        count: 5,
        error: null,
      },
    })();

    const snapshot = await getSystemHealth();
    expect(snapshot.subsystems['sync']?.status).toBe('degraded');
    expect(snapshot.subsystems['sync']?.message).toMatch(/Letzter CRM-Sync/);
  });

  it('meldet Sync als degraded ohne Importbestand', async () => {
    await mockDb({ contacts: { data: [], count: 0, error: null } })();

    const snapshot = await getSystemHealth();
    expect(snapshot.subsystems['sync']?.status).toBe('degraded');
    expect(snapshot.subsystems['sync']?.message).toMatch(/kein CRM-Import/);
  });

  it('nennt in der Sync-Meldung Bestand und Alter des letzten Syncs', async () => {
    await mockDb({})();

    const snapshot = await getSystemHealth();
    expect(snapshot.subsystems['sync']?.message).toMatch(/Bestand: 5/);
    expect(snapshot.subsystems['sync']?.message).toMatch(/letzter Sync/);
  });

  it('enthaelt keine sensiblen Schluessel-Namen in Subsystem-Messages', async () => {
    await mockDb({})();

    const snapshot = await getSystemHealth();
    const allMessages = Object.values(snapshot.subsystems)
      .map((s) => s.message.toLowerCase())
      .join(' ');

    // Prüfe auf tatsächliche Credential-Muster (nicht allgemeine Wörter)
    const forbidden = ['jwt', 'bearer', 'api_key', 'service_role', 'eyj'];
    for (const word of forbidden) {
      expect(allMessages).not.toContain(word);
    }
  });

  it('worker-Subsystem hat immer einen Status (kein async)', async () => {
    await mockDb({ session: null })();

    const snapshot = await getSystemHealth();
    expect(snapshot.subsystems['worker']).toBeDefined();
    expect(['ok', 'error', 'degraded', 'unknown']).toContain(snapshot.subsystems['worker']?.status);
  });

  it('jedes Subsystem hat checkedAt als ISO-String', async () => {
    await mockDb({})();

    const snapshot = await getSystemHealth();
    for (const sub of Object.values(snapshot.subsystems)) {
      expect(sub.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});
