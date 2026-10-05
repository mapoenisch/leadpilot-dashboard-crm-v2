// Auftrag 074 (Dashboard Teilauftrag 5): sichtbarkeitsgesteuerte Aktivierung und Lazy-Kachel.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LazyDashboardTile, type TileDataHook } from '../components/LazyDashboardTile';
import { useTileActivation } from '../hooks/useTileActivation';
import type { ResolvedTileData } from '../data/dashboardData';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';

class MockObserver {
  static instances: MockObserver[] = [];
  observed: Element[] = [];
  disconnected = false;
  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    MockObserver.instances.push(this);
  }
  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  trigger(isIntersecting: boolean) {
    act(() => {
      this.callback(
        [{ isIntersecting, target: this.observed[0] } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    });
  }
}

beforeEach(() => {
  MockObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockObserver);
});
afterEach(() => vi.unstubAllGlobals());

function Probe() {
  const { ref, near, active } = useTileActivation();
  return (
    <div ref={ref} data-testid="probe" data-near={String(near)} data-active={String(active)} />
  );
}

describe('useTileActivation', () => {
  it('beobachtet mit 300 px Vorlauf und ist zunächst nicht aktiv', () => {
    render(<Probe />);
    const observer = MockObserver.instances[0]!;
    expect(observer.options?.rootMargin).toBe('300px');
    expect(screen.getByTestId('probe')).toHaveAttribute('data-active', 'false');
  });

  it('aktiviert beim ersten Beobachterereignis im Bereich und bleibt danach aktiv', () => {
    render(<Probe />);
    const observer = MockObserver.instances[0]!;
    observer.trigger(true);
    expect(screen.getByTestId('probe')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('probe')).toHaveAttribute('data-near', 'true');
    observer.trigger(false);
    expect(screen.getByTestId('probe')).toHaveAttribute('data-near', 'false');
    expect(screen.getByTestId('probe')).toHaveAttribute('data-active', 'true');
  });

  it('aktiviert nicht, solange die Kachel außerhalb von Bereich und Vorlauf liegt', () => {
    render(<Probe />);
    MockObserver.instances[0]!.trigger(false);
    expect(screen.getByTestId('probe')).toHaveAttribute('data-active', 'false');
  });

  it('trennt den Beobachter beim Aushängen', () => {
    const { unmount } = render(<Probe />);
    const observer = MockObserver.instances[0]!;
    unmount();
    expect(observer.disconnected).toBe(true);
  });

  it('aktiviert ohne IntersectionObserver alle Kacheln', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('probe')).toHaveAttribute('data-near', 'true');
  });
});

const TILE: DashboardTileConfig = {
  tileId: 'kachel1',
  catalogId: 'crm.pipeline_deals',
  view: 'zahl',
  size: 'klein',
  filterMode: 'dashboard',
};

function data(state: ResolvedTileData['state'], pipeline: string | null): ResolvedTileData {
  return {
    catalogId: 'crm.pipeline_deals',
    state,
    value: state === 'bereit' ? 42 : null,
    series: null,
    overview: null,
    unit: 'Deals',
    timeBasis: 'Aktueller Stand',
    asOf: null,
    origin: { layer: 'crm', module: 'src/domain/x.ts', exportName: 'X' },
    scope: 'organisation',
    effectiveFilter: { mode: 'dashboard', period: null, pipeline },
  };
}

/** Ersatz für den Datenhook: eine „Abfrage“ je neuem Filterschlüssel, nur wenn aktiviert. */
function makeData() {
  const seen = new Set<string>();
  const calls: { enabled: boolean | undefined; pipeline: string | null }[] = [];
  const shown: { pipeline: string | null; state: string }[] = [];
  let queries = 0;
  const useData: TileDataHook = (_tile, filters, options) => {
    const pipeline = filters?.pipeline ?? null;
    calls.push({ enabled: options?.enabled, pipeline });
    if (!options?.enabled) return data('laden', pipeline);
    if (!seen.has(String(pipeline))) {
      seen.add(String(pipeline));
      queries += 1;
      return data('laden', pipeline);
    }
    shown.push({ pipeline, state: 'bereit' });
    return data('bereit', pipeline);
  };
  return { useData, calls, shown, queries: () => queries };
}

function renderTile(
  filters: DashboardFilters | undefined,
  useData: TileDataHook,
  extra: Partial<React.ComponentProps<typeof LazyDashboardTile>> = {},
) {
  const ui = (f: DashboardFilters | undefined) => (
    <LazyDashboardTile
      tile={TILE}
      filters={f}
      useData={useData}
      onShowDetails={() => undefined}
      {...extra}
    />
  );
  const view = render(ui(filters));
  return { ...view, setFilters: (f: DashboardFilters | undefined) => view.rerender(ui(f)) };
}

describe('LazyDashboardTile', () => {
  it('zeigt die Kachel im Ladezustand, bis sie aktiviert wird; Aktivierung ruft den Datenhook frei', () => {
    const { useData, calls } = makeData();
    const onActivated = vi.fn();
    renderTile(undefined, useData, { onActivated });
    expect(screen.getByTestId('dashboard-tile')).toHaveAttribute('data-state', 'laden');
    expect(calls.every((call) => call.enabled === false)).toBe(true);
    expect(onActivated).not.toHaveBeenCalled();
    MockObserver.instances[0]!.trigger(true);
    expect(calls[calls.length - 1]?.enabled).toBe(true);
    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(onActivated).toHaveBeenCalledWith('kachel1');
  });

  it('aktiviert bei Fokus, damit Tastaturnutzer nie vor einem toten Platzhalter stehen', () => {
    const { useData } = makeData();
    renderTile(undefined, useData);
    fireEvent.focus(screen.getByRole('status', { name: /wird geladen/ }));
    expect(screen.getByTestId('lazy-tile')).toHaveAttribute('data-active', 'true');
  });

  it('startet bei einem Filterwechsel außerhalb des Bereichs keine Abfrage', () => {
    const { useData, queries } = makeData();
    const { setFilters } = renderTile({ pipeline: 'Direkt' }, useData);
    const observer = MockObserver.instances[0]!;
    observer.trigger(true);
    expect(queries()).toBe(1);
    observer.trigger(false);
    setFilters({ pipeline: 'Partner' });
    setFilters({ pipeline: 'Partner ' });
    expect(queries()).toBe(1);
    observer.trigger(true);
    expect(queries()).toBe(2);
  });

  it('zeigt bei der Annäherung den Ladezustand statt alter Daten unter neuem Filter', () => {
    const { useData, shown } = makeData();
    const { setFilters } = renderTile({ pipeline: 'Direkt' }, useData);
    const observer = MockObserver.instances[0]!;
    observer.trigger(true);
    observer.trigger(false);
    setFilters({ pipeline: 'Partner' });
    observer.trigger(true);
    // Der neue Filter war nie als Ergebnis zu sehen, bevor seine „Abfrage“ lief.
    expect(shown.filter((item) => item.pipeline === 'Partner')).toHaveLength(0);
    expect(screen.getByTestId('dashboard-tile')).toHaveAttribute('data-state', 'laden');
  });

  it('bleibt mit `suspended` ohne Abfrage, auch nach Aktivierung', () => {
    const { useData, calls } = makeData();
    renderTile(undefined, useData, { suspended: true });
    MockObserver.instances[0]!.trigger(true);
    expect(calls.every((call) => call.enabled === false)).toBe(true);
  });

  it('reicht die Zentralfilter an die Kachel weiter', () => {
    const { useData } = makeData();
    renderTile({ pipeline: 'Direkt' }, useData);
    MockObserver.instances[0]!.trigger(true);
    expect(screen.getByTestId('dashboard-tile')).toBeInTheDocument();
  });
});
