// Auftrag 171 (Codex PR #212, Runde 2): Offline bleibt der letzte vorzeigbare Stand sichtbar,
// auch wenn der Basis-Hook auf einen neuen Abschnitt ohne Cache wechselt (Zustand `laden`).
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { TileData } from '../data/dashboardData';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { createKioskDataHook, KioskConnectivityContext } from '../components/kiosk/kioskData';

function data(state: 'bereit' | 'laden', value: number | null): TileData {
  return {
    catalogId: 'live.kpi',
    state,
    value,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'live',
    asOf: '2026-11-21T07:55:00.000Z',
    origin: { layer: 'live', module: 'm', exportName: 'e', liveKpiId: 'k' },
    scope: 'organisation',
    effectiveFilter: {} as never,
  };
}

describe('createKioskDataHook', () => {
  it('hält offline den letzten Stand als veraltet statt „laden“ zu zeigen', () => {
    let current = data('bereit', 42);
    const base: TileDataHook = () => current;
    const useKiosk = createKioskDataHook(base);
    let offlineSince: string | null = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <KioskConnectivityContext.Provider value={{ offlineSince }}>
        {children}
      </KioskConnectivityContext.Provider>
    );
    const tile = { id: 't', catalogId: 'live.kpi' } as unknown as Parameters<TileDataHook>[0];
    const { result, rerender } = renderHook(() => useKiosk(tile, {} as never), { wrapper });
    expect((result.current as { value: unknown }).value).toBe(42);

    offlineSince = '2026-11-21T08:00:00.000Z';
    current = data('laden', null); // neuer Abschnitt, kein Cache
    rerender();
    expect(result.current.state).toBe('veraltet');
    expect((result.current as { value: unknown }).value).toBe(42);

    offlineSince = null;
    rerender();
    expect(result.current.state).toBe('laden');
  });
});
