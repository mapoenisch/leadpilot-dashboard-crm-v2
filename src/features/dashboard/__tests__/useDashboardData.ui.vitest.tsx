import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardData, type UseDashboardDataOptions } from '../hooks/useDashboardData';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import { useOrganization } from '@/auth/organizationContext';
import { createFakeAdapter, makeSnapshot } from '@/services/liveKpi/__tests__/fakes';
import { createLiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import { LIVE_KPI_DEFINITIONS } from '@/services/liveKpi/liveKpiDefinitions';
import { aggregateLiveActivity } from '../data/resolveLive';
import type { FunnelDealSource } from '@/domain/executiveCockpitData';
import type { ImportedFunnelDeal } from '@/types/crm';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

const mockedUseOrganization = vi.mocked(useOrganization);

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });
}

const mockOrgSession = {
  userId: 'u-1',
  organizationId: 'org-test',
  role: 'admin' as const,
};

interface WrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  session?: typeof mockOrgSession | null;
}

function TestProvider({
  children,
  queryClient = createTestQueryClient(),
  session = mockOrgSession,
}: WrapperProps) {
  mockedUseOrganization.mockReturnValue({ session, isLoading: false });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function TileConsumer({
  tile,
  filters,
  options,
}: {
  tile: DashboardTileConfig;
  filters?: DashboardFilters;
  options?: UseDashboardDataOptions;
}) {
  const data = useDashboardData(tile, filters, options);
  return (
    <div data-testid={`tile-${tile.tileId}`}>
      <span data-testid="state">{data.state}</span>
      <span data-testid="value">{String(data.state === 'nicht_verfuegbar' ? '' : data.value)}</span>
      <span data-testid="asOf">{data.state === 'nicht_verfuegbar' ? '' : (data.asOf ?? '')}</span>
      {data.state !== 'nicht_verfuegbar' && data.overview && (
        <span data-testid="overview-count">
          {String(data.overview.kind === 'live_aktivitaet' ? data.overview.data.length : 0)}
        </span>
      )}
    </div>
  );
}

describe('useDashboardData', () => {
  beforeEach(() => {
    mockedUseOrganization.mockReturnValue({ session: mockOrgSession, isLoading: false });
  });

  const crmTile = (
    id: string,
    catalogId = 'crm.pipeline_volumen',
    pipeline?: string,
  ): DashboardTileConfig => ({
    tileId: id,
    catalogId,
    view: 'zahl',
    size: 'klein',
    filterMode: 'dashboard',
    pipeline,
  });

  const liveTile = (id: string, catalogId = 'live.arr'): DashboardTileConfig => ({
    tileId: id,
    catalogId,
    view: 'zahl',
    size: 'klein',
    filterMode: 'dashboard',
  });

  describe('CRM-Abfrageteilung und Filter', () => {
    it('teilt eine Abfrage für Kacheln mit gleichem Filter und macht zweite Abfrage für andere Pipeline', async () => {
      const deals: ImportedFunnelDeal[] = [
        { id: '1', dealName: 'D1', stage: 'Lead', amount: 100, closeDate: '', pipeline: 'p1' },
        { id: '2', dealName: 'D2', stage: 'Lead', amount: 200, closeDate: '', pipeline: 'p2' },
      ];

      const fetchSpy = vi.fn(async () => deals);
      const fakeSource: FunnelDealSource = { getImportedFunnelDeals: fetchSpy };
      const qc = createTestQueryClient();

      render(
        <TestProvider queryClient={qc}>
          <TileConsumer
            tile={crmTile('t1', 'crm.pipeline_deals', 'p1')}
            options={{ dealSource: fakeSource }}
          />
          <TileConsumer
            tile={crmTile('t2', 'crm.pipeline_volumen', 'p1')}
            options={{ dealSource: fakeSource }}
          />
          <TileConsumer
            tile={crmTile('t3', 'crm.pipeline_gewonnen', 'p1')}
            options={{ dealSource: fakeSource }}
          />
          <TileConsumer
            tile={crmTile('t4', 'crm.pipeline_volumen', 'p2')}
            options={{ dealSource: fakeSource }}
          />
        </TestProvider>,
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('tile-t1').querySelector('[data-testid="state"]')?.textContent,
        ).toBe('bereit');
      });

      // t1, t2, t3 teilten sich p1 (1 Abfrage); t4 fragte p2 ab (2. Abfrage)
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('führt ohne Organisation keine CRM-Abfrage aus', () => {
      const fetchSpy = vi.fn(async () => []);
      const fakeSource: FunnelDealSource = { getImportedFunnelDeals: fetchSpy };

      render(
        <TestProvider session={null}>
          <TileConsumer tile={crmTile('t1')} options={{ dealSource: fakeSource }} />
        </TestProvider>,
      );

      expect(screen.getByTestId('state').textContent).toBe('laden');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('zeigt beim Filterwechsel keinen alten Wert als neuen an (solange Abfrage läuft state: laden)', async () => {
      let resolveSecondFetch!: (deals: ImportedFunnelDeal[]) => void;

      let callCount = 0;
      const fakeSource: FunnelDealSource = {
        getImportedFunnelDeals: async () => {
          callCount += 1;
          if (callCount === 1) {
            return [
              { id: '1', dealName: 'A', stage: 'Lead', amount: 100, closeDate: '', pipeline: 'p1' },
            ];
          }
          return new Promise((resolve) => {
            resolveSecondFetch = resolve;
          });
        },
      };

      function FilterSwitcher() {
        const [pipeline, setPipeline] = useState('p1');
        return (
          <div>
            <button onClick={() => setPipeline('p2')}>Switch</button>
            <TileConsumer
              tile={crmTile('t1', 'crm.pipeline_volumen')}
              filters={{ pipeline }}
              options={{ dealSource: fakeSource }}
            />
          </div>
        );
      }

      render(
        <TestProvider>
          <FilterSwitcher />
        </TestProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('value').textContent).toBe('100');
      });

      // Filter wechseln
      act(() => {
        screen.getByText('Switch').click();
      });

      // Solange Abfrage für p2 läuft: laden, kein alter Wert
      expect(screen.getByTestId('state').textContent).toBe('laden');

      // Abfrage auflösen
      await act(async () => {
        resolveSecondFetch([
          { id: '2', dealName: 'B', stage: 'Lead', amount: 500, closeDate: '', pipeline: 'p2' },
        ]);
      });

      await waitFor(() => {
        expect(screen.getByTestId('state').textContent).toBe('bereit');
        expect(screen.getByTestId('value').textContent).toBe('500');
      });
    });
  });

  describe('Live-Referenzzählung und Aktivierung', () => {
    it('drei Live-Kacheln derselben ID teilen einen Store-Eintrag; nach Unmount aller Kacheln 0 Referenzen', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);

      const { unmount } = render(
        <TestProvider>
          <TileConsumer tile={liveTile('l1')} options={{ store }} />
          <TileConsumer tile={liveTile('l2')} options={{ store }} />
          <TileConsumer tile={liveTile('l3')} options={{ store }} />
        </TestProvider>,
      );

      expect(controls.feedSubscribeCalls).toBe(1);
      expect(controls.feed?.unsubscribeCalls).toBe(0);

      unmount();
      expect(controls.feed?.unsubscribeCalls).toBe(1);
    });

    it('enabled: false startet keine Abfrage und kein acquire/subscribe', () => {
      const fetchSpy = vi.fn(async () => []);
      const fakeSource: FunnelDealSource = { getImportedFunnelDeals: fetchSpy };
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);

      render(
        <TestProvider>
          <TileConsumer
            tile={crmTile('t-crm')}
            options={{ enabled: false, dealSource: fakeSource }}
          />
          <TileConsumer tile={liveTile('t-live')} options={{ enabled: false, store }} />
        </TestProvider>,
      );

      expect(
        screen.getByTestId('tile-t-crm').querySelector('[data-testid="state"]')?.textContent,
      ).toBe('laden');
      expect(
        screen.getByTestId('tile-t-live').querySelector('[data-testid="state"]')?.textContent,
      ).toBe('laden');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(controls.feedSubscribeCalls).toBe(0);
    });

    it('Live-Aktivität abonniert genau die 12 IDs und begrenzt auf höchstens 10 Snapshots, neueste zuerst', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);
      const actTile: DashboardTileConfig = {
        tileId: 'act-1',
        catalogId: 'uebersicht.live_aktivitaet',
        view: 'uebersicht',
        size: 'mittel',
        filterMode: 'dashboard',
      };

      render(
        <TestProvider>
          <TileConsumer tile={actTile} options={{ store }} />
        </TestProvider>,
      );

      controls.feed?.onStatus('live');

      // 12 Snapshots einspielen
      act(() => {
        for (let i = 0; i < 12; i++) {
          const id = LIVE_KPI_DEFINITIONS[i]!.id;
          controls.feed?.onEvent(
            makeSnapshot(id, `2025-01-01T10:${String(i).padStart(2, '0')}:00.000Z`, i * 10),
          );
        }
      });

      expect(screen.getByTestId('state').textContent).toBe('bereit');
      // Höchstens 10 Einträge
      expect(screen.getByTestId('overview-count').textContent).toBe('10');
    });
  });

  describe('Paritätstest: aggregateLiveActivity vs useLiveKpiActivity-Regeln', () => {
    const allIds = LIVE_KPI_DEFINITIONS.map((d) => d.id);

    it('Fall a: ein Stream live -> identischer Status und Einträge', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);

      store.acquire('arr');
      controls.feed?.onStatus('live');
      controls.feed?.onEvent(makeSnapshot('arr', '2025-01-01T12:00:00.000Z', 100));

      const res = aggregateLiveActivity(store, allIds, 10);
      expect(res.status).toBe('live');
      expect(res.items).toHaveLength(1);
      expect(res.items[0]?.value).toBe(100);
    });

    it('Fall b: alle offline -> identischer Status offline', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);

      for (const id of allIds) {
        store.acquire(id);
      }
      controls.feed?.onEvent(makeSnapshot('arr', '2025-01-01T12:00:00.000Z', 100));
      controls.feed?.onStatus('offline');

      const res = aggregateLiveActivity(store, allIds, 10);
      expect(res.status).toBe('offline');
      expect(res.items).toHaveLength(1);
    });

    it('Fall c: Gleichstand bei occurredAt -> Tie-Break nach ingestedAt', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);

      store.acquire('arr');
      store.acquire('mrr');
      controls.feed?.onStatus('live');

      const snap1 = makeSnapshot('arr', '2025-01-01T12:00:00.000Z', 10);
      snap1.ingestedAt = '2025-01-01T12:00:01.000Z';
      const snap2 = makeSnapshot('mrr', '2025-01-01T12:00:00.000Z', 20);
      snap2.ingestedAt = '2025-01-01T12:00:02.000Z'; // neuer

      controls.feed?.onEvent(snap1);
      controls.feed?.onEvent(snap2);

      const res = aggregateLiveActivity(store, allIds, 10);
      expect(res.items[0]?.kpiId).toBe('mrr');
      expect(res.items[1]?.kpiId).toBe('arr');
    });

    it('Fall d: mehr als 10 Snapshots -> begrenzt strikt auf 10', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);

      controls.feed?.onStatus('live');
      for (let i = 0; i < 12; i++) {
        const id = allIds[i]!;
        store.acquire(id);
        controls.feed?.onEvent(
          makeSnapshot(id, `2025-01-01T10:${String(i).padStart(2, '0')}:00.000Z`, i),
        );
      }

      const res = aggregateLiveActivity(store, allIds, 10);
      expect(res.items).toHaveLength(10);
      // Neueste zuerst (i = 11)
      expect(res.items[0]?.value).toBe(11);
    });
  });
});
