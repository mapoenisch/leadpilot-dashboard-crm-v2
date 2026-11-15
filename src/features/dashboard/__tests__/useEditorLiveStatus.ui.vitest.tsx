// Auftrag 159 (P10a): drei getrennte Live-Angaben, keine erfundenen Werte, Drossel.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import type { LiveKpiStreamState, LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import { createPreviewLiveStore } from '../preview/previewLiveStore';
import { TimeControlProvider } from '../time/TimeControlProvider';
import { useEditorLiveStatus } from '../time/useEditorLiveStatus';

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
});
