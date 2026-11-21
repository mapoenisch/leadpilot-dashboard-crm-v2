// Auftrag 171 (P15a §2.3 Nr. 11): Sitzungswächter und Rotation (Fake-Timer).
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useSessionGuard,
  type SessionSource,
  type SessionSourceEvent,
} from '../hooks/useSessionGuard';
import { useKioskRotation } from '../hooks/useKioskRotation';

type Listener = (event: SessionSourceEvent, expiresAt: number | null) => void;

function fakeSource(initialExpiresAt: number | null) {
  let listener: Listener | null = null;
  const source: SessionSource = {
    read: vi.fn(async () => initialExpiresAt),
    subscribe: vi.fn((l: Listener) => {
      listener = l;
      return () => {
        listener = null;
      };
    }),
  };
  return {
    source,
    emit: (event: SessionSourceEvent, expiresAt: number | null) => listener?.(event, expiresAt),
    hasListener: () => listener !== null,
  };
}

const T0 = Date.parse('2026-11-21T08:00:00.000Z');
const HOUR = 3_600_000;

describe('useSessionGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('bleibt aktiv und meldet erneuert, wenn das Token rechtzeitig erneuert wird', async () => {
    const { source, emit } = fakeSource(T0 + HOUR);
    const onExpired = vi.fn();
    const { result } = renderHook(() =>
      useSessionGuard({ source, isAuthenticated: true, onExpired }),
    );
    await act(async () => {});
    expect(result.current.status).toBe('aktiv');

    // Supabase erneuert kurz vor Ablauf; danach wieder eine Stunde Laufzeit
    await act(async () => {
      vi.advanceTimersByTime(HOUR - 60_000);
      emit('erneuert', Date.now() + HOUR);
    });
    expect(result.current.status).toBe('erneuert');
    expect(result.current.renewedAt).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(HOUR - 60_000);
    });
    expect(result.current.status).toBe('erneuert');
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('läuft ab, wenn die Erneuerung über Ablauf + Karenz ausbleibt (genau ein onExpired)', async () => {
    const { source } = fakeSource(T0 + HOUR);
    const onExpired = vi.fn();
    const { result } = renderHook(() =>
      useSessionGuard({ source, isAuthenticated: true, onExpired, graceMs: 30_000 }),
    );
    await act(async () => {});
    await act(async () => {
      vi.advanceTimersByTime(HOUR + 29_000);
    });
    expect(result.current.status).toBe('aktiv');
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current.status).toBe('abgelaufen');
    expect(result.current.expiredAt).not.toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(HOUR);
    });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('stellt die Frist direkt nach dem ersten Lesen auf die echte Ablaufzeit', async () => {
    const { source } = fakeSource(T0 + 5_000);
    const { result } = renderHook(() =>
      useSessionGuard({ source, isAuthenticated: true, graceMs: 0 }),
    );
    await act(async () => {});
    await act(async () => {
      vi.advanceTimersByTime(5_500);
    });
    expect(result.current.status).toBe('abgelaufen');
  });

  it('fehlgeschlagene Erneuerung (Abmeldung durch Supabase) wirkt sofort', async () => {
    const { source, emit } = fakeSource(T0 + HOUR);
    const onExpired = vi.fn();
    const { result } = renderHook(() =>
      useSessionGuard({ source, isAuthenticated: true, onExpired }),
    );
    await act(async () => {});
    act(() => emit('abgemeldet', null));
    expect(result.current.status).toBe('abgelaufen');
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('ohne Sitzung beim Start und bei Verlust der Anmeldung abgelaufen', async () => {
    const { source } = fakeSource(null);
    const { result } = renderHook(() => useSessionGuard({ source, isAuthenticated: true }));
    await act(async () => {});
    expect(result.current.status).toBe('abgelaufen');

    const local = renderHook(
      ({ auth }: { auth: boolean }) => useSessionGuard({ source: null, isAuthenticated: auth }),
      { initialProps: { auth: true } },
    );
    expect(local.result.current.status).toBe('aktiv');
    local.rerender({ auth: false });
    expect(local.result.current.status).toBe('abgelaufen');
    local.rerender({ auth: true });
    expect(local.result.current.status).toBe('aktiv');
  });

  it('erholt sich, wenn nach dem Ablauf wieder eine gültige Sitzung gemeldet wird', async () => {
    const { source, emit } = fakeSource(T0 + HOUR);
    const { result } = renderHook(() => useSessionGuard({ source, isAuthenticated: true }));
    await act(async () => {});
    act(() => emit('abgemeldet', null));
    expect(result.current.status).toBe('abgelaufen');
    act(() => emit('angemeldet', Date.now() + HOUR));
    expect(result.current.status).toBe('aktiv');
  });

  it('beendet das Abo beim Aushängen', async () => {
    const fake = fakeSource(T0 + HOUR);
    const { unmount } = renderHook(() =>
      useSessionGuard({ source: fake.source, isAuthenticated: true }),
    );
    await act(async () => {});
    expect(fake.hasListener()).toBe(true);
    unmount();
    expect(fake.hasListener()).toBe(false);
  });
});

describe('useKioskRotation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('wechselt im Intervall und beginnt nach dem letzten wieder vorn', () => {
    const { result } = renderHook(() =>
      useKioskRotation({ count: 3, intervalMs: 60_000, loading: false }),
    );
    expect(result.current.index).toBe(0);
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.index).toBe(1);
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.index).toBe(2);
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.index).toBe(0);
  });

  it('pausiert, solange das Dashboard lädt', () => {
    const { result, rerender } = renderHook(
      ({ loading }: { loading: boolean }) =>
        useKioskRotation({ count: 2, intervalMs: 30_000, loading }),
      { initialProps: { loading: true } },
    );
    act(() => vi.advanceTimersByTime(120_000));
    expect(result.current.index).toBe(0);
    expect(result.current.pauseReason).toBe('laden');
    rerender({ loading: false });
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.index).toBe(1);
  });

  it('pausiert bei Interaktion und läuft nach einem ruhigen Intervall weiter', () => {
    const { result } = renderHook(() =>
      useKioskRotation({ count: 2, intervalMs: 30_000, loading: false }),
    );
    act(() => vi.advanceTimersByTime(20_000));
    act(() => result.current.noteInteraction());
    expect(result.current.pauseReason).toBe('interaktion');
    act(() => vi.advanceTimersByTime(29_000));
    expect(result.current.index).toBe(0);
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.isPaused).toBe(false);
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.index).toBe(1);
  });

  it('manuelle Pause bleibt bis zum erneuten Umschalten', () => {
    const { result } = renderHook(() =>
      useKioskRotation({ count: 2, intervalMs: 30_000, loading: false }),
    );
    act(() => result.current.togglePause());
    act(() => vi.advanceTimersByTime(10 * 60_000));
    expect(result.current.index).toBe(0);
    expect(result.current.pauseReason).toBe('manuell');
    act(() => result.current.togglePause());
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.index).toBe(1);
  });

  it('startet bei nur einem Dashboard keinen Timer', () => {
    const { result } = renderHook(() =>
      useKioskRotation({ count: 1, intervalMs: 30_000, loading: false }),
    );
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.next());
    expect(result.current.index).toBe(0);
  });
});
