// @vitest-environment jsdom
// Auftrag 160 (P10b-1): Tests für Zeitreihen-Kacheln (Weiche, RPC-Zähltest, Pause/Fortsetzen, eingeklappte Sektion).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardData } from '../hooks/useDashboardData';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import { useOrganization } from '@/auth/organizationContext';
import * as resolveTimeSeriesModule from '../data/resolveTimeSeries';
import { invalidateCrmOverviewQueries } from '../time/resumeCrmRefresh';
import type { TileTimeSeriesData } from '../data/dashboardData';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

const mockedUseOrganization = vi.mocked(useOrganization);

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 60_000,
        gcTime: 60_000,
      },
    },
  });
}

const mockOrgSession = {
  userId: 'u-1',
  organizationId: 'org-a',
  role: 'admin' as const,
};

function TileConsumer({
  tile,
  isEnabled = true,
  frozen = false,
}: {
  tile: DashboardTileConfig;
  isEnabled?: boolean;
  frozen?: boolean;
}) {
  const data = useDashboardData(tile, undefined, { enabled: isEnabled, frozen });
  const pointsCount =
    data.state === 'bereit' && data.timeSeries ? data.timeSeries.points.length : 'none';
  const val = data.state === 'bereit' ? String(data.value) : 'null';

  return (
    <div data-testid={`tile-${tile.tileId}`}>
      <span data-testid={`state-${tile.tileId}`}>{data.state}</span>
      <span data-testid={`points-${tile.tileId}`}>{pointsCount}</span>
      <span data-testid={`value-${tile.tileId}`}>{val}</span>
    </div>
  );
}

const sampleTimeSeries: TileTimeSeriesData = {
  source: 'deal_stage_events',
  resolution: 'woche',
  from: '2026-08-24T00:00:00+02:00',
  to: '2026-11-16T00:00:00+01:00',
  historyStartAt: '2026-09-01T00:00:00+02:00',
  points: [
    {
      at: '2026-08-24T00:00:00+02:00',
      value: null,
      status: 'vor_historienbeginn',
      measuredAt: null,
    },
    { at: '2026-08-31T00:00:00+02:00', value: 5, status: 'belegt', measuredAt: null },
    { at: '2026-09-07T00:00:00+02:00', value: 12, status: 'belegt', measuredAt: null },
  ],
};

describe('timeSeriesTiles (Auftrag 160)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseOrganization.mockReturnValue({
      session: mockOrgSession,
      isLoading: false,
    });
    fetchSpy = vi
      .spyOn(resolveTimeSeriesModule, 'fetchTimeSeries')
      .mockResolvedValue(sampleTimeSeries);
  });

  it('Weiche: Verlaufskacheln laden Zeitreihendaten und setzen statusbereit', async () => {
    const queryClient = createTestQueryClient();
    const tile: DashboardTileConfig = {
      tileId: 'tile-verlauf-1',
      catalogId: 'crm.phaseneintritte_verlauf',
      view: 'linie',
      size: 'mittel',
      filterMode: 'dashboard',
    };

    render(
      <QueryClientProvider client={queryClient}>
        <TileConsumer tile={tile} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('state-tile-verlauf-1').textContent).toBe('bereit');
    });

    expect(screen.getByTestId('points-tile-verlauf-1').textContent).toBe('3');
    expect(screen.getByTestId('value-tile-verlauf-1').textContent).toBe('12');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('RPC-Zähltest: 6 Verlaufskacheln derselben Abfrage erzeugen genau 1 RPC-Aufruf (Auftrag 160 §2.6 Nr. 31)', async () => {
    const queryClient = createTestQueryClient();
    const tiles: DashboardTileConfig[] = Array.from({ length: 6 }, (_, i) => ({
      tileId: `tile-dup-${i + 1}`,
      catalogId: 'crm.gewonnen_verlauf',
      view: 'linie',
      size: 'mittel',
      filterMode: 'dashboard',
    }));

    render(
      <QueryClientProvider client={queryClient}>
        {tiles.map((t) => (
          <TileConsumer key={t.tileId} tile={t} />
        ))}
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('state-tile-dup-1').textContent).toBe('bereit');
      expect(screen.getByTestId('state-tile-dup-6').textContent).toBe('bereit');
    });

    // Genau 1 RPC-Aufruf für alle 6 Kacheln
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('Eingeklappte Sektion (157): fragt keine Zeitreihen ab, wenn isEnabled false ist', async () => {
    const queryClient = createTestQueryClient();
    const tile: DashboardTileConfig = {
      tileId: 'tile-collapsed',
      catalogId: 'crm.phaseneintritte_verlauf',
      view: 'linie',
      size: 'mittel',
      filterMode: 'dashboard',
    };

    render(
      <QueryClientProvider client={queryClient}>
        <TileConsumer tile={tile} isEnabled={false} />
      </QueryClientProvider>,
    );

    // Kachel bleibt im Ladezustand und sendet keinen RPC-Aufruf
    expect(screen.getByTestId('state-tile-collapsed').textContent).toBe('laden');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Pause friert Verlaufskachel ein; Fortsetzen invalidiert gezielt die eigene Organisation (Auftrag 160 §2.3 Nr. 20)', async () => {
    const queryClient = createTestQueryClient();
    const tileA: DashboardTileConfig = {
      tileId: 'tile-a',
      catalogId: 'crm.phaseneintritte_verlauf',
      view: 'linie',
      size: 'mittel',
      filterMode: 'dashboard',
    };

    render(
      <QueryClientProvider client={queryClient}>
        <TileConsumer tile={tileA} frozen={true} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('state-tile-a').textContent).toBe('bereit');
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Bei Fortsetzen invalidateCrmOverviewQueries aufrufen
    await act(async () => {
      await invalidateCrmOverviewQueries(queryClient, 'org-a', 'u-1');
    });

    // Nach Fortsetzen wurde genau 1 weiterer Aufruf ausgelöst
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    // Fremde Organisation invalidieren berührt die eigene Kachel nicht
    await act(async () => {
      await invalidateCrmOverviewQueries(queryClient, 'org-b', 'u-other');
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
