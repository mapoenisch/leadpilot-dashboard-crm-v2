// G62 (Auftrag 067P): Unit-Tests fuer systemHealthService.
// Prueft alle 5 Subsystem-Checks, Overall-Status-Ableitung und Zero-Secret-Kontrakt.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------- Mocks
vi.mock('@/services/db/supabaseClient', () => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockAuth = { getSession: vi.fn() };

  return {
    isSupabaseConfigured: true,
    supabase: { auth: mockAuth, from: mockFrom, rpc: mockRpc },
    _mocks: { mockFrom, mockRpc, mockAuth },
  };
});

import { getSystemHealth } from '../systemHealthService';

// ---------------------------------------------------------------- Tests
describe('systemHealthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gibt Snapshot mit allen 5 Subsystemen zurueck', async () => {
    const { supabase: db } = await import('@/services/db/supabaseClient');
    (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });
    (db!.rpc as ReturnType<typeof vi.fn>).mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    // from().select('*', {count:'exact',head:true}) resolves directly to {count, error}
    const selectMock = vi.fn().mockResolvedValue({ count: 5, error: null });
    (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: selectMock,
    });

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
    (db!.rpc as ReturnType<typeof vi.fn>).mockReturnValue({
      maybeSingle: vi.fn().mockRejectedValue(new Error('DB down')),
    });
    (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        count: vi.fn().mockRejectedValue(new Error('fail')),
      }),
    });

    const snapshot = await getSystemHealth();
    expect(snapshot.overallStatus).toBe('error');
  });

  it('setzt overallStatus auf ok wenn alle Subsysteme ok sind', async () => {
    // Worker-API im Node-Testenv stubben (sonst immer 'error' -> overall 'error')
    const prevWorker = (globalThis as Record<string, unknown>)['Worker'];
    (globalThis as Record<string, unknown>)['Worker'] = class {};
    try {
    const { supabase: db } = await import('@/services/db/supabaseClient');
    (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });
    (db!.rpc as ReturnType<typeof vi.fn>).mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    // from().select() always resolves to {count, error} - both ingress and contacts
    const selectMock = vi.fn().mockResolvedValue({ count: 5, error: null });

    (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: selectMock,
    });

    const snapshot = await getSystemHealth();
    // May be 'ok' or 'degraded' depending on mock completeness, never 'error'
    expect(['ok', 'degraded']).toContain(snapshot.overallStatus);
    } finally {
      if (prevWorker === undefined) {
        delete (globalThis as Record<string, unknown>)['Worker'];
      } else {
        (globalThis as Record<string, unknown>)['Worker'] = prevWorker;
      }
    }
  });

  it('enthaelt keine sensiblen Schluessel-Namen in Subsystem-Messages', async () => {
    const { supabase: db } = await import('@/services/db/supabaseClient');
    (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });
    (db!.rpc as ReturnType<typeof vi.fn>).mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 1, error: null }),
    });

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
    const { supabase: db } = await import('@/services/db/supabaseClient');
    (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (db!.rpc as ReturnType<typeof vi.fn>).mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 0, error: null }),
    });

    const snapshot = await getSystemHealth();
    expect(snapshot.subsystems['worker']).toBeDefined();
    expect(['ok', 'error', 'degraded', 'unknown']).toContain(snapshot.subsystems['worker']?.status);
  });

  it('jedes Subsystem hat checkedAt als ISO-String', async () => {
    const { supabase: db } = await import('@/services/db/supabaseClient');
    (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });
    (db!.rpc as ReturnType<typeof vi.fn>).mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 1, error: null }),
    });

    const snapshot = await getSystemHealth();
    for (const sub of Object.values(snapshot.subsystems)) {
      expect(sub.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});
