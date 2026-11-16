// Auftrag 159 (P10a): drei getrennte Live-Angaben, keine erfundenen Werte, Drossel.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { dashboardQueryKeys } from '../data/dashboardQueryKeys';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import type { LiveKpiStreamState, LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import { createPreviewLiveStore } from '../preview/previewLiveStore';
import {
  TimeControlProvider,
  useTimeControl,
  useOptionalTimeControl,
  type TimeControlValue,
} from '../time/TimeControlProvider';
import { useEditorLiveStatus } from '../time/useEditorLiveStatus';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { organizationId: 'org-test', userId: 'user-test', role: 'admin' },
    isLoading: false,
  }),
}));

function tile(catalogId: string): DashboardTileConfigV2 {
  return {
    id: `tile-${catalogId}`,
    catalogId,
    title: catalogId,
    presentation: 'zahl',
    layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
  };
}

function StatusProbe(props: {
  tiles: DashboardTileConfigV2[];
  store: LiveKpiStreamStore;
  configured?: boolean;
  defaultPipeline?: string;
}) {
  // Der Testlauf hat keine Supabase-Umgebung; für Live-Szenarien wird die Konfiguration
  // deshalb explizit gesetzt.
  const status = useEditorLiveStatus({ ...props, configured: props.configured ?? true });
  return (
    <div>
      <span data-testid="connection">{status.connection}</span>
      <span data-testid="last-event">{status.lastEventAt ?? 'keine'}</span>
      <span data-testid="data-as-of">{status.dataAsOf ?? 'keine'}</span>
      <span data-testid="paused-since">{status.pausedSince ?? 'keine'}</span>
    </div>
  );
}

function storeWithOccurredAt(occurredAt: () => string): LiveKpiStreamStore {
  const base = createPreviewLiveStore('verbunden');
  const state = (): LiveKpiStreamState => ({
    snapshot: {
      id: 's',
      kpiId: 'arr',
      value: 1,
      unit: 'EUR',
      occurredAt: occurredAt(),
      qualityStatus: 'valid',
      sourceSystem: 'test',
      ingestedAt: occurredAt(),
    },
    history: [],
    status: 'live',
    error: null,
  });
  return {
    ...base,
    getState: (kpiId) => (kpiId === 'arr' ? state() : base.getState(kpiId)),
    getFeedConnectionState: () => 'live',
  };
}

describe('useEditorLiveStatus', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('meldet ohne konfigurierten Live-Feed nie „Live“', () => {
    render(
      <TimeControlProvider>
        <StatusProbe
          tiles={[tile('live.arr')]}
          store={createPreviewLiveStore('verbunden')}
          configured={false}
        />
      </TimeControlProvider>,
    );
    expect(screen.getByTestId('connection')).toHaveTextContent('nicht_konfiguriert');
    expect(screen.getByTestId('last-event')).toHaveTextContent('keine');
    expect(screen.getByTestId('data-as-of')).toHaveTextContent('keine');
  });

  it('unterscheidet fehlenden Live-Inhalt von einer echten Verbindung', () => {
    const { rerender } = render(
      <TimeControlProvider>
        <StatusProbe tiles={[tile('baseline.arr')]} store={createPreviewLiveStore('verbunden')} />
      </TimeControlProvider>,
    );
    expect(screen.getByTestId('connection')).toHaveTextContent('kein_live_inhalt');

    rerender(
      <TimeControlProvider>
        <StatusProbe tiles={[tile('live.arr')]} store={createPreviewLiveStore('verbunden')} />
      </TimeControlProvider>,
    );
    expect(screen.getByTestId('connection')).toHaveTextContent('verbunden');
    expect(screen.getByTestId('last-event')).not.toHaveTextContent('keine');
    expect(screen.getByTestId('data-as-of')).not.toHaveTextContent('keine');
  });

  it('zeigt im Live-Modus den Datenstand und in der Pause den Anhaltezeitpunkt', () => {
    const live = render(
      <TimeControlProvider>
        <StatusProbe tiles={[tile('live.arr')]} store={createPreviewLiveStore('verbunden')} />
      </TimeControlProvider>,
    );
    expect(screen.getByTestId('paused-since')).toHaveTextContent('keine');
    expect(screen.getByTestId('data-as-of')).not.toHaveTextContent('keine');
    live.unmount();

    render(
      <TimeControlProvider
        initialState={{ mode: 'pausiert', analysisAt: '2026-11-15T14:32:00.000Z', resumeToken: 0 }}
      >
        <StatusProbe tiles={[tile('live.arr')]} store={createPreviewLiveStore('verbunden')} />
      </TimeControlProvider>,
    );
    expect(screen.getByTestId('paused-since')).toHaveTextContent('2026-11-15T14:32:00.000Z');
    expect(screen.getByTestId('data-as-of')).toHaveTextContent('keine');
  });

  it('drosselt Live-Aktualisierungen auf höchstens einmal pro Sekunde', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T14:32:00.000Z'));
    let seconds = 0;
    const store = storeWithOccurredAt(() =>
      new Date(Date.parse('2026-11-15T14:32:00.000Z') + seconds * 1000).toISOString(),
    );

    render(
      <TimeControlProvider>
        <StatusProbe tiles={[tile('live.arr')]} store={store} />
      </TimeControlProvider>,
    );
    expect(screen.getByTestId('last-event')).toHaveTextContent('2026-11-15T14:32:00.000Z');

    seconds = 5;
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('last-event')).toHaveTextContent('2026-11-15T14:32:00.000Z');

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByTestId('last-event')).toHaveTextContent('2026-11-15T14:32:05.000Z');
  });

  it('deckt weitere Feed-Zustände wie verbindet, wiederverbinden und offline ab', () => {
    // offline
    const offlineStore = createPreviewLiveStore('offline');
    const { rerender } = render(
      <TimeControlProvider>
        <StatusProbe tiles={[tile('live.arr')]} store={offlineStore} />
      </TimeControlProvider>,
    );
    expect(screen.getByTestId('connection')).toHaveTextContent('offline');

    // uebersicht.live_aktivitaet
    rerender(
      <TimeControlProvider>
        <StatusProbe tiles={[tile('uebersicht.live_aktivitaet')]} store={offlineStore} />
      </TimeControlProvider>,
    );
    expect(screen.getByTestId('connection')).toHaveTextContent('offline');
  });
});

describe('TimeControlProvider Context Hooks', () => {
  it('wirft Fehler bei Aufruf von useTimeControl außerhalb des Providers', () => {
    function BrokenProbe() {
      useTimeControl();
      return null;
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BrokenProbe />)).toThrow(
      'useTimeControl muss innerhalb von TimeControlProvider verwendet werden.',
    );
    consoleSpy.mockRestore();

    let optionalValue: TimeControlValue | null | 'not-called' = 'not-called';
    function OptionalProbe() {
      optionalValue = useOptionalTimeControl();
      return null;
    }
    render(<OptionalProbe />);
    expect(optionalValue).toBeNull();
  });

  it('unterstützt pause() mit Date, String und Default-Parameter im Provider', () => {
    let captured: TimeControlValue | null = null;
    function Consumer() {
      captured = useTimeControl();
      return null;
    }

    render(
      <TimeControlProvider>
        <Consumer />
      </TimeControlProvider>,
    );

    expect(captured).not.toBeNull();
    expect(captured!.state.mode).toBe('live');

    act(() => {
      captured!.pause(new Date('2026-11-15T15:00:00.000Z'));
    });
    expect(captured!.state.mode).toBe('pausiert');
    expect(captured!.state.analysisAt).toBe('2026-11-15T15:00:00.000Z');

    act(() => {
      captured!.resume();
    });
    expect(captured!.state.mode).toBe('live');

    act(() => {
      captured!.pause();
    });
    expect(captured!.state.mode).toBe('pausiert');
    expect(typeof captured!.state.analysisAt).toBe('string');
  });

  it('ermittelt bei der Live-Aktivitätsübersicht den jüngsten Zeitstempel als Kachelstand', () => {
    const baseStore = createPreviewLiveStore('verbunden');
    const customStore: LiveKpiStreamStore = {
      ...baseStore,
      getState: (kpiId: string) => {
        if (kpiId === 'arr') {
          return {
            snapshot: {
              id: 'arr',
              kpiId: 'arr',
              value: 100,
              unit: 'EUR',
              occurredAt: '2026-11-15T10:00:00.000Z', // älterer Snapshot
              qualityStatus: 'valid' as const,
              sourceSystem: 'test',
              ingestedAt: '2026-11-15T10:00:00.000Z',
            },
            history: [],
            status: 'live' as const,
            error: null,
          };
        }
        if (kpiId === 'mrr') {
          return {
            snapshot: {
              id: 'mrr',
              kpiId: 'mrr',
              value: 50,
              unit: 'EUR',
              occurredAt: '2026-11-15T15:00:00.000Z', // jüngerer Snapshot
              qualityStatus: 'valid' as const,
              sourceSystem: 'test',
              ingestedAt: '2026-11-15T15:00:00.000Z',
            },
            history: [],
            status: 'live' as const,
            error: null,
          };
        }
        return {
          snapshot: null,
          history: [],
          status: 'live',
          error: null,
        };
      },
    };

    render(
      <TimeControlProvider>
        <StatusProbe
          tiles={[tile('uebersicht.live_aktivitaet')]}
          store={customStore}
          configured={true}
        />
      </TimeControlProvider>,
    );

    // Kachelstand (data-as-of) entspricht dem jüngsten Aktivitätseintrag (15:00), nicht dem ältesten (10:00)
    expect(screen.getByTestId('data-as-of')).toHaveTextContent('2026-11-15T15:00:00.000Z');
    // lastEventAt entspricht ebenfalls dem neuesten Event
    expect(screen.getByTestId('last-event')).toHaveTextContent('2026-11-15T15:00:00.000Z');
  });

  it('verwendet bei CRM-Kacheln mit ererbter Pipeline denselben Pipeline-Schlüssel wie der Datenpfad', () => {
    const queryClient = new QueryClient();
    const crmTile: DashboardTileConfigV2 = {
      id: 'tile-crm-pipeline',
      catalogId: 'crm.pipeline_volumen',
      title: 'Pipeline Volumen',
      presentation: 'zahl',
      layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
      query: { metricId: 'crm.pipeline_volumen', pipelineId: null },
    };

    const targetKey = dashboardQueryKeys.crmOverview('org-test', 'user-test', 'pipe-enterprise');
    queryClient.setQueryData(
      targetKey,
      { kpis: {} },
      { updatedAt: Date.parse('2026-11-15T14:45:00.000Z') },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TimeControlProvider>
          <StatusProbe
            tiles={[crmTile]}
            store={createPreviewLiveStore('verbunden')}
            configured={true}
            defaultPipeline="pipe-enterprise"
          />
        </TimeControlProvider>
      </QueryClientProvider>,
    );

    // Liest den Stand der übergeordneten Pipeline aus dem React-Query-Cache
    expect(screen.getByTestId('data-as-of')).toHaveTextContent('2026-11-15T14:45:00.000Z');
  });

  it('leitet den Datenstand von Live-Verlaufskacheln aus dem Server-Cache ab und meldet kein_live_inhalt (Codex Review)', () => {
    const queryClient = new QueryClient();
    const liveHistoryTile: DashboardTileConfigV2 = {
      id: 'tile-live-arr-history',
      catalogId: 'live.arr.verlauf',
      title: 'ARR Verlauf',
      presentation: 'linie',
      layouts: { desktop: { x: 0, y: 0, w: 6, h: 4 } },
      query: { metricId: 'live.arr.verlauf' },
    };

    const targetKey = [
      ...dashboardQueryKeys.crm('org-test'),
      'timeSeries',
      'user-test',
      'live_kpi',
      'arr',
      'stunde',
      '2026-11-15T00:00:00+01:00',
      '2026-11-16T00:00:00+01:00',
      null,
    ] as const;

    queryClient.setQueryData(
      targetKey,
      { points: [] },
      { updatedAt: Date.parse('2026-11-16T11:30:00.000Z') },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TimeControlProvider>
          <StatusProbe
            tiles={[liveHistoryTile]}
            store={createPreviewLiveStore('offline')}
            configured={true}
          />
        </TimeControlProvider>
      </QueryClientProvider>,
    );

    // Live-Verlaufskacheln sind Server-Zeitreihen: kein Stream-Abo, daher kein_live_inhalt
    expect(screen.getByTestId('connection')).toHaveTextContent('kein_live_inhalt');
    // Stand wird aus der Zeitreihen-Query gelesen
    expect(screen.getByTestId('data-as-of')).toHaveTextContent('2026-11-16T11:30:00.000Z');
  });
});
