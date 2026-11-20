// @vitest-environment jsdom
// Auftrag 170 (P14b): Datenhook lädt Vergleich, zweite Reihe, Band und Heatmap nach.
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import { useDashboardData } from '../hooks/useDashboardData';
import * as resolveTimeSeriesModule from '../data/resolveTimeSeries';
import * as compareModule from '../data/resolveTimeSeriesCompare';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { TileTimeSeriesData, TimeSeriesPoint } from '../data/dashboardData';
import { readCrmQueryMeta } from '../time/useTimeControlledData';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));

const hour = (h: number, value: number | null): TimeSeriesPoint => ({
  at: `2026-11-15T${String(h).padStart(2, '0')}:00:00+01:00`,
  value,
  status: value === null ? 'luecke' : 'belegt',
  measuredAt: null,
});

const BASE: TileTimeSeriesData = {
  source: 'live_kpi_events',
  resolution: 'stunde',
  from: '2026-11-15T00:00:00+01:00',
  to: '2026-11-15T03:00:00+01:00',
  historyStartAt: '2026-11-01T00:00:00+01:00',
  points: [hour(0, 10), hour(1, 20), hour(2, 30)],
};

function Probe({ tile }: { tile: DashboardTileConfig }) {
  const data = useDashboardData(tile, undefined, { enabled: true });
  const extras = data.state === 'bereit' ? data.timeSeriesExtras : undefined;
  return (
    <div>
      <span data-testid="state">{data.state}</span>
      <span data-testid="compare">
        {extras?.compare?.points.map((p) => p.value).join(',') ?? '-'}
      </span>
      <span data-testid="second">
        {extras?.second?.points.map((p) => p.value).join(',') ?? '-'}
      </span>
      <span data-testid="bands">
        {extras?.bands ? (extras.bands.reason ?? extras.bands.explanation) : '-'}
      </span>
      <span data-testid="heatmap">
        {extras?.heatmap ? `${extras.heatmap.mode}:${extras.heatmap.points.length}` : '-'}
      </span>
      <span data-testid="meta">{readCrmQueryMeta(data) ? 'ja' : 'nein'}</span>
      <span data-testid="notices">{extras?.notices.join('|') ?? '-'}</span>
    </div>
  );
}

function renderTile(tile: DashboardTileConfig) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Probe tile={tile} />
    </QueryClientProvider>,
  );
}

const tile = (patch: Partial<DashboardTileConfig>): DashboardTileConfig => ({
  tileId: 't',
  catalogId: 'live.arr.verlauf',
  view: 'linie',
  size: 'mittel',
  filterMode: 'dashboard',
  ...patch,
});

describe('Auftrag 170 – useTimeSeriesExtras', () => {
  let fetchSpy: MockInstance<typeof resolveTimeSeriesModule.fetchTimeSeries>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(useOrganization).mockReturnValue({
      session: { userId: 'u-1', organizationId: 'org-a', role: 'admin' },
      isLoading: false,
    } as never);
    fetchSpy = vi
      .spyOn(resolveTimeSeriesModule, 'fetchTimeSeries')
      .mockImplementation(async (params) => {
        if (params.metric === 'mrr') return { ...BASE, points: [hour(0, 1), hour(2, 3)] };
        if (params.to === BASE.from && params.resolution === 'stunde') {
          return {
            ...BASE,
            points: Array.from({ length: 288 }, (_, i) => ({
              ...hour(0, 5 + (i % 3)),
              at: `p${i}`,
            })),
          };
        }
        if (params.resolution === 'tag')
          return { ...BASE, resolution: 'tag', points: [hour(0, 4)] };
        return BASE;
      });
  });

  it('ohne Zusatzangaben bleibt die Kachel unverändert (keine weiteren Abrufe)', async () => {
    renderTile(tile({}));
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('bereit'));
    expect(screen.getByTestId('compare').textContent).toBe('-');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('lädt Vergleich, zweite Reihe und Band und hängt sie an', async () => {
    const compareSpy = vi.spyOn(compareModule, 'fetchTimeSeriesCompare').mockResolvedValue({
      compare: 'vorperiode',
      resolution: 'stunde',
      compareFrom: 'a',
      compareTo: 'b',
      datenstandAb: BASE.historyStartAt,
      isPartial: false,
      partialNotice: null,
      basePoints: BASE.points,
      comparePoints: [hour(0, 9), hour(1, null), hour(2, 11)],
    });
    renderTile(
      tile({
        query: {
          metricId: 'live.arr.verlauf',
          compare: 'vorperiode',
          join: { metricId: 'live.mrr.verlauf', typ: 'links' },
          bands: { type: 'percentile_10_90', periodCount: 8 },
        },
      }),
    );
    await waitFor(() => expect(screen.getByTestId('compare').textContent).toBe('9,,11'));
    await waitFor(() => expect(screen.getByTestId('second').textContent).toBe('1,,3'));
    await waitFor(() =>
      expect(screen.getByTestId('bands').textContent).toContain('letzten 8 Tage'),
    );
    expect(compareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'live_kpi',
        metric: 'arr',
        compare: 'vorperiode',
        from: BASE.from,
      }),
    );
  });

  it('meldet Ladefehler des Vergleichs sichtbar, die Basis bleibt bereit', async () => {
    vi.spyOn(compareModule, 'fetchTimeSeriesCompare').mockRejectedValue(new Error('Netz weg'));
    renderTile(tile({ query: { metricId: 'live.arr.verlauf', compare: 'vorjahr' } }));
    await waitFor(() =>
      expect(screen.getByTestId('notices').textContent).toBe('Vergleich: Netz weg'),
    );
    expect(screen.getByTestId('state').textContent).toBe('bereit');
  });

  it('Heatmap wartet auf Tageswerte und lädt bei Phaseneintritten die Phasen-RPC', async () => {
    renderTile(tile({ view: 'heatmap' }));
    await waitFor(() =>
      expect(screen.getByTestId('heatmap').textContent).toBe('woche_wochentag:1'),
    );
    expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({ resolution: 'tag' }));

    const phasesSpy = vi.spyOn(compareModule, 'fetchTimeSeriesPhases').mockResolvedValue({
      resolution: 'woche',
      from: 'a',
      to: 'b',
      phases: [{ phase: 'Verhandlung', points: [hour(0, 1)] }],
    });
    fetchSpy.mockResolvedValue({ ...BASE, source: 'deal_stage_events', resolution: 'woche' });
    renderTile(tile({ tileId: 'p', view: 'heatmap', catalogId: 'crm.phaseneintritte_verlauf' }));
    await waitFor(() =>
      expect(screen.getAllByTestId('heatmap')[1]!.textContent).toBe('phase_woche:0'),
    );
    expect(phasesSpy).toHaveBeenCalledWith(expect.objectContaining({ resolution: 'woche' }));
  });

  it('Heatmap-Ladefehler wird als Kachelfehler gezeigt', async () => {
    fetchSpy.mockImplementation(async (params: resolveTimeSeriesModule.FetchTimeSeriesParams) => {
      if (params.resolution === 'tag') throw new Error('kaputt');
      return BASE;
    });
    renderTile(tile({ view: 'heatmap' }));
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('fehler'));
  });
});
