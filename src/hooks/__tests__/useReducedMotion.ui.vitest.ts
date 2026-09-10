// G32-Charakterisierung: useReducedMotion (jsdom, kein Store-Bezug).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '../useReducedMotion';

type ChangeListener = (event: { matches: boolean }) => void;

interface FakeMql {
  matches: boolean;
  listeners: Set<ChangeListener>;
  withModernApi: boolean;
}

function installMatchMedia(initialMatches: boolean, withModernApi = true): FakeMql {
  const fake: FakeMql = { matches: initialMatches, listeners: new Set(), withModernApi };
  const mql = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    dispatchEvent: () => false,
    addEventListener: withModernApi
      ? vi.fn((_type: string, cb: ChangeListener) => {
          fake.listeners.add(cb);
        })
      : undefined,
    removeEventListener: withModernApi
      ? vi.fn((_type: string, cb: ChangeListener) => {
          fake.listeners.delete(cb);
        })
      : undefined,
    addListener: !withModernApi
      ? vi.fn((cb: ChangeListener) => {
          fake.listeners.add(cb);
        })
      : undefined,
    removeListener: !withModernApi
      ? vi.fn((cb: ChangeListener) => {
          fake.listeners.delete(cb);
        })
      : undefined,
  };
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn(() => mql),
    writable: true,
    configurable: true,
  });
  return fake;
}

function fireChange(fake: FakeMql, matches: boolean): void {
  act(() => {
    for (const cb of fake.listeners) cb({ matches });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useReducedMotion', () => {
  it('liest Initialwert aus matchMedia (true und false)', () => {
    installMatchMedia(true);
    const t = renderHook(() => useReducedMotion());
    expect(t.result.current).toBe(true);
    t.unmount();

    installMatchMedia(false);
    const f = renderHook(() => useReducedMotion());
    expect(f.result.current).toBe(false);
    f.unmount();
  });

  it('Media-Query-Change aktualisiert den Hook', () => {
    const fake = installMatchMedia(false);
    const { result, unmount } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    fireChange(fake, true);
    expect(result.current).toBe(true);
    fireChange(fake, false);
    expect(result.current).toBe(false);
    unmount();
  });

  it('Legacy-Pfad ohne addEventListener nutzt addListener/removeListener', () => {
    installMatchMedia(false, false);
    const { unmount } = renderHook(() => useReducedMotion());
    const mql = (window.matchMedia as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value as { removeListener: ReturnType<typeof vi.fn> };
    unmount();
    expect(mql.removeListener).toHaveBeenCalledTimes(1);
  });

  it('Cleanup entfernt Change-Listener bei Unmount', () => {
    const fake = installMatchMedia(false);
    const { unmount } = renderHook(() => useReducedMotion());
    expect(fake.listeners.size).toBe(1);
    unmount();
    expect(fake.listeners.size).toBe(0);
  });
});
