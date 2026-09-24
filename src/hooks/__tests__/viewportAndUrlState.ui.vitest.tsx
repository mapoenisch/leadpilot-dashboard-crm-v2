import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useIsMobileViewport } from '../useIsMobileViewport';
import { useUrlSyncedState } from '../useUrlSyncedState';

function matchMediaMatches(matches: boolean, legacy = false) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql: Record<string, unknown> = {
    matches,
    removeListener: vi.fn(),
    dispatch: (next: boolean) => {
      for (const cb of listeners) cb({ matches: next });
    },
  };
  if (legacy) {
    mql['addListener'] = vi.fn((cb: (e: { matches: boolean }) => void) => {
      listeners.add(cb);
    });
  } else {
    mql['removeEventListener'] = vi.fn();
    mql['addEventListener'] = vi.fn((_t: string, cb: (e: { matches: boolean }) => void) => {
      listeners.add(cb);
    });
    mql['addListener'] = vi.fn();
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  );
  return mql as {
    matches: boolean;
    addEventListener?: (...args: unknown[]) => void;
    removeEventListener: (...args: unknown[]) => void;
    addListener?: (...args: unknown[]) => void;
    removeListener: (...args: unknown[]) => void;
    dispatch: (next: boolean) => void;
  };
}

function ProbeViewport() {
  const isMobile = useIsMobileViewport();
  return <span data-testid="vp">{isMobile ? 'mobil' : 'desktop'}</span>;
}

function ProbeUrl({ storageKey, initial }: { storageKey: string; initial: string }) {
  const [value, setValue] = useUrlSyncedState(storageKey, initial);
  return (
    <div>
      <span data-testid="val">{value}</span>
      <button type="button" onClick={() => setValue('b')}>
        set-b
      </button>
      <button type="button" onClick={() => setValue(initial)}>
        reset
      </button>
    </div>
  );
}

describe('067K useIsMobileViewport', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('meldet mobil bei matchendem Media-Query', () => {
    matchMediaMatches(true);
    render(<ProbeViewport />);
    expect(screen.getByTestId('vp').textContent).toBe('mobil');
  });

  it('meldet desktop ohne Match und folgt Wechseln', () => {
    const mql = matchMediaMatches(false);
    const { unmount } = render(<ProbeViewport />);
    expect(screen.getByTestId('vp').textContent).toBe('desktop');
    act(() => {
      mql.dispatch(true);
    });
    expect(screen.getByTestId('vp').textContent).toBe('mobil');
    unmount();
  });

  it('nutzt Legacy-Listener ohne addEventListener', () => {
    const mql = matchMediaMatches(false, true);
    const { unmount } = render(<ProbeViewport />);
    expect(screen.getByTestId('vp').textContent).toBe('desktop');
    act(() => {
      mql.dispatch(true);
    });
    expect(screen.getByTestId('vp').textContent).toBe('mobil');
    unmount();
  });
});

describe('067K useUrlSyncedState', () => {
  it('startet mit Initialwert und schreibt Query-Param', () => {
    render(
      <MemoryRouter initialEntries={['/crm/deals']}>
        <ProbeUrl storageKey="stufe" initial="ALL" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('val').textContent).toBe('ALL');
    act(() => {
      screen.getByText('set-b').click();
    });
    expect(screen.getByTestId('val').textContent).toBe('b');
    expect(window.location.search).toContain('stufe=b');
    act(() => {
      screen.getByText('reset').click();
    });
    expect(screen.getByTestId('val').textContent).toBe('ALL');
    expect(window.location.search).not.toContain('stufe=');
  });

  it('liest Startwert aus der URL', () => {
    window.history.replaceState(null, '', '/crm/deals?stufe=gewonnen');
    render(
      <MemoryRouter initialEntries={['/crm/deals?stufe=gewonnen']}>
        <ProbeUrl storageKey="stufe" initial="ALL" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('val').textContent).toBe('gewonnen');
    window.history.replaceState(null, '', '/crm/deals');
  });

  it('fällt ohne Router auf useState zurück', () => {
    render(<ProbeUrl storageKey="stufe" initial="ALL" />);
    expect(screen.getByTestId('val').textContent).toBe('ALL');
    act(() => {
      screen.getByText('set-b').click();
    });
    expect(screen.getByTestId('val').textContent).toBe('b');
  });
});
