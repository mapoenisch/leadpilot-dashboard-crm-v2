// Branch-Tests: supabaseAuthAdapter mit gemocktem Supabase-Client (kein Netz).
// Isolation via vi.doMock auf services/db/supabaseClient (einzige IO-Grenze);
// der Adapter selbst bleibt ungemockt. Unkonfiguriert-Pfad zuerst (Fail-closed),
// dann Erfolgs-/Fehlerkanten im konfigurierten Pfad.
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { AuthAdapter, User } from '../authAdapter';

interface MockAuth {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
}

async function loadAdapter(
  configured: boolean,
  auth: MockAuth | null,
): Promise<{ adapter: AuthAdapter; auth: MockAuth | null }> {
  vi.resetModules();
  const client = auth ? { auth } : null;
  vi.doMock('../../services/db/supabaseClient', () => ({
    isSupabaseConfigured: configured,
    supabase: configured ? client : null,
  }));
  const mod = await import('../supabaseAuthAdapter');
  return { adapter: mod.supabaseAuthAdapter, auth };
}

function makeAuth(over: Partial<Record<keyof MockAuth, unknown>> = {}): MockAuth {
  return {
    signInWithPassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue({}),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    ...(over as object),
  } as MockAuth;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('supabaseAuthAdapter.branch', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../../services/db/supabaseClient');
  });

  it('unconfigured: login wirft ehrlich, kein stiller Fallback', async () => {
    const { adapter } = await loadAdapter(false, null);
    await expect(adapter.login('a@b.de', 'pw')).rejects.toThrow(/nicht konfiguriert/);
    expect(adapter.getSession()).toBeNull();
  });

  it('unconfigured: logout löst auf und initialize meldet null', async () => {
    const { adapter } = await loadAdapter(false, null);
    await expect(adapter.logout()).resolves.toBeUndefined();
    const seen: Array<User | null> = [];
    const cleanup = adapter.initialize!((u) => seen.push(u));
    expect(seen).toEqual([null]);
    expect(() => cleanup()).not.toThrow();
  });

  it('configured: login normalisiert E-Mail und cacht die Sitzung', async () => {
    const auth = makeAuth();
    auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'Foo@Bar.DE' } },
      error: null,
    });
    const { adapter } = await loadAdapter(true, auth);
    const user = await adapter.login('  Foo@Bar.DE  ', 'secret');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'foo@bar.de',
      password: 'secret',
    });
    expect(user).toEqual({ id: 'u-1', email: 'Foo@Bar.DE' });
    expect(adapter.getSession()).toEqual(user);
  });

  it('configured: fehlende E-Mail im Profil wird zu Leerstring', async () => {
    const auth = makeAuth();
    auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u-2', email: undefined } },
      error: null,
    });
    const { adapter } = await loadAdapter(true, auth);
    const user = await adapter.login('x@y.de', 'pw');
    expect(user).toEqual({ id: 'u-2', email: '' });
  });

  it('configured: Supabase-Fehler und fehlender User werfen Anmeldedaten-Fehler', async () => {
    const authErr = makeAuth();
    authErr.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'bad' },
    });
    const { adapter: a1 } = await loadAdapter(true, authErr);
    await expect(a1.login('x@y.de', 'falsch')).rejects.toThrow(/Ungültige Anmeldedaten/);
    expect(a1.getSession()).toBeNull();

    const authNull = makeAuth();
    authNull.signInWithPassword.mockResolvedValue({ data: { user: null }, error: null });
    const { adapter: a2 } = await loadAdapter(true, authNull);
    await expect(a2.login('x@y.de', 'pw')).rejects.toThrow(/Ungültige Anmeldedaten/);
  });

  it('configured: logout ruft signOut und leert den Cache', async () => {
    const auth = makeAuth();
    auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u-3', email: 'u@x.de' } },
      error: null,
    });
    const { adapter } = await loadAdapter(true, auth);
    await adapter.login('u@x.de', 'pw');
    expect(adapter.getSession()).not.toBeNull();
    await adapter.logout();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(adapter.getSession()).toBeNull();
  });

  it('configured: initialize stellt Sitzung her und folgt Auth-Änderungen', async () => {
    let listener: ((event: string, session: unknown) => void) | null = null;
    const unsubscribe = vi.fn();
    const auth = makeAuth({
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'u-9', email: 'n@x.de' } } },
      }),
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        listener = cb;
        return { data: { subscription: { unsubscribe } } };
      }),
    });
    const { adapter } = await loadAdapter(true, auth);
    const seen: Array<User | null> = [];
    const cleanup = adapter.initialize!((u) => seen.push(u));
    await flush();
    expect(seen).toEqual([{ id: 'u-9', email: 'n@x.de' }]);
    expect(adapter.getSession()).toEqual({ id: 'u-9', email: 'n@x.de' });

    listener!('SIGNED_OUT', null);
    expect(seen[seen.length - 1]).toBeNull();
    expect(adapter.getSession()).toBeNull();

    listener!('SIGNED_IN', { user: { id: 'u-10', email: undefined } });
    expect(adapter.getSession()).toEqual({ id: 'u-10', email: '' });

    cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('configured: initialize ohne Sitzung meldet null', async () => {
    const auth = makeAuth();
    const { adapter } = await loadAdapter(true, auth);
    const seen: Array<User | null> = [];
    adapter.initialize!((u) => seen.push(u));
    await flush();
    expect(seen).toEqual([null]);
  });
});
