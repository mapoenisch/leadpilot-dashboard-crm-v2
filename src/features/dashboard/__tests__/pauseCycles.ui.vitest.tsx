// Auftrag 159 (P10a §2.6 Nr. 20): Pause und Fortsetzen erzeugen keinen zusätzlichen
// Live-Feed-Kanal und keine verwaisten Abos — Zähltest mit 24 Kacheln und 10 Pausenzyklen.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { useTimeControlledData } from '../time/useTimeControlledData';
import { TimeControlProvider, useTimeControl } from '../time/TimeControlProvider';
import { createFakeAdapter } from '@/services/liveKpi/__tests__/fakes';
import { createLiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({ session: null, isLoading: false }),
}));

const LIVE_IDS = ['live.arr', 'live.mrr', 'live.pipeline_coverage'] as const;
const TILE_COUNT = 24;

function tile(index: number): DashboardTileConfig {
  return {
    tileId: `tile-${index}`,
    catalogId: LIVE_IDS[index % LIVE_IDS.length]!,
    view: 'zahl',
    size: 'klein',
    filterMode: 'dashboard',
  };
}

function PauseHarness() {
  const control = useTimeControl();
  return (
    <button
      type="button"
      data-testid="toggle"
      onClick={() => (control.state.mode === 'pausiert' ? control.resume() : control.pause())}
    >
      umschalten
    </button>
  );
}

describe('Pausenzeiten und Live-Abos (Zähltest)', () => {
  it('24 Kacheln über 10 Pausenzyklen halten genau einen Feed-Kanal und schließen ihn beim Unmount', () => {
    const { adapter, controls } = createFakeAdapter();
    const store = createLiveKpiStreamStore(adapter);
    const useData: TileDataHook = (config, filters, options) =>
      useTimeControlledData(config, filters, { ...options, store });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <TimeControlProvider>
          <PauseHarness />
          {Array.from({ length: TILE_COUNT }, (_, index) => (
            <TileConsumer key={index} index={index} useData={useData} />
          ))}
        </TimeControlProvider>
      </QueryClientProvider>,
    );

    expect(controls.feedSubscribeCalls).toBe(1);

    for (let cycle = 0; cycle < 10; cycle++) {
      fireEvent.click(screen.getByTestId('toggle'));
    }
    expect(controls.feedSubscribeCalls).toBe(1);
    expect(controls.feed?.unsubscribeCalls).toBe(0);

    unmount();
    expect(controls.feed?.unsubscribeCalls).toBe(1);
  });
});

function TileConsumer({ index, useData }: { index: number; useData: TileDataHook }) {
  useData(tile(index), undefined, { enabled: true });
  return null;
}
