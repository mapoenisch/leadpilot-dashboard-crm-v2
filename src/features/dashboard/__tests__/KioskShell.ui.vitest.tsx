// Auftrag 171 (P15a §2.3 Nr. 11): Kiosk-Hülle — lesbare Rotation, Pause, Offline, Dauerlauf 12 h.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KioskShell, type KioskDashboardSource } from '../components/kiosk/KioskShell';
import type { TileDataHook } from '../components/LazyDashboardTile';
import type { TileData } from '../data/dashboardData';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type {
  AccessibleDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';
import { createPreviewThresholdsConfig } from '../preview/previewThresholds';
import type { LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import type { OnlineStatus } from '../hooks/useOnlineStatus';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { role: 'viewer', organizationId: 'org-1', userId: 'user-1' },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: () => ({ rules: [], workerStatus: null }),
}));

/** Zählt aktive „Abos“ der Kacheln: jede aktivierte Kachel hält genau eines. */
const subscriptions = { active: 0, opened: 0 };

const useFakeData: TileDataHook = (tile, _filters, options) => {
  const enabled = options?.enabled !== false;
  useEffect(() => {
    if (!enabled) return;
    subscriptions.active += 1;
    subscriptions.opened += 1;
    return () => {
      subscriptions.active -= 1;
    };
  }, [enabled]);
  const data: TileData = {
    catalogId: tile.catalogId,
    state: 'bereit',
    value: 1234,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'live',
    asOf: '2026-11-21T07:55:00.000Z',
    origin: { layer: 'live', module: 'm', exportName: 'e', liveKpiId: 'k' },
    scope: 'organisation',
    effectiveFilter: {} as never,
  };
  return data;
};

const feedListeners = new Set<() => void>();
const liveStore = {
  subscribeFeedConnection: (l: () => void) => {
    feedListeners.add(l);
    return () => feedListeners.delete(l);
  },
  getFeedConnectionState: () => 'live',
  getState: () => ({ snapshot: null, history: [], status: 'idle', error: null }),
} as unknown as LiveKpiStreamStore;

function dashboard(id: string, title: string): StoredDashboardV2Row {
  const base = createPreviewThresholdsConfig();
  const config: DashboardConfigV2 = { ...base, id, title, tiles: base.tiles.slice(0, 3) };
  return { id, title, scope: 'personal', revision: 1, config, updatedAt: '2026-11-21T07:00:00Z' };
}

const DASHBOARDS = new Map([
  ['eigen', dashboard('eigen', 'Mein Vertrieb')],
  ['team', dashboard('team', 'Team Nord')],
]);

function listItem(row: StoredDashboardV2Row): AccessibleDashboardListItemV2 {
  return {
    id: row.id,
    title: row.title,
    scope: row.scope,
    revision: 1,
    tileCount: row.config.tiles.length,
    sectionCount: 0,
    updatedAt: row.updatedAt,
    teamId: null,
    teamName: null,
    canWrite: false,
  };
}

function makeSource(): KioskDashboardSource & { load: ReturnType<typeof vi.fn> } {
  return {
    list: vi.fn(async () => ({
      ok: true as const,
      value: Array.from(DASHBOARDS.values()).map(listItem),
    })),
    load: vi.fn(async (id: string) => {
      const row = DASHBOARDS.get(id);
      return row
        ? { ok: true as const, value: row }
        : { ok: false as const, error: { kind: 'nicht_gefunden' as const } };
    }),
  };
}

const ONLINE: OnlineStatus = { online: true, offlineSince: null };

function renderShell(
  props: Partial<Omit<React.ComponentProps<typeof KioskShell>, 'source'>> & {
    ids?: string[];
    source?: ReturnType<typeof makeSource>;
  } = {},
) {
  const client = new QueryClient();
  const source = props.source ?? makeSource();
  const element = (over: Partial<React.ComponentProps<typeof KioskShell>> = {}) => (
    <QueryClientProvider client={client}>
      <KioskShell
        requestedIds={props.ids ?? ['eigen', 'team']}
        intervalSec={60}
        source={source}
        useData={useFakeData}
        online={ONLINE}
        liveStore={liveStore}
        liveConfigured
        theme="dark"
        onToggleTheme={() => {}}
        exitHref="/dashboard"
        onExit={() => {}}
        {...props}
        {...over}
      />
    </QueryClientProvider>
  );
  const view = render(element());
  return {
    ...view,
    source,
    rerenderWith: (over: Partial<React.ComponentProps<typeof KioskShell>>) =>
      view.rerender(element(over)),
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('KioskShell (Auftrag 171)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse('2026-11-21T08:00:00.000Z'));
    subscriptions.active = 0;
    subscriptions.opened = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('zeigt nur lesbare Dashboards und überspringt fremde IDs mit Hinweis', async () => {
    const { source } = renderShell({ ids: ['fremd', 'team'] });
    await flush();
    expect(screen.getByTestId('kiosk-title')).toHaveTextContent('Team Nord');
    expect(screen.getByTestId('kiosk-skipped-notice')).toHaveTextContent('1 Dashboard');
    expect(source.load).not.toHaveBeenCalledWith('fremd');
    expect(screen.queryByTestId('kiosk-pause-button')).toBeNull(); // nur eines → keine Rotation
  });

  it('rotiert im Intervall und pausiert per Leertaste', async () => {
    renderShell();
    await flush();
    expect(screen.getByTestId('kiosk-title')).toHaveTextContent('Mein Vertrieb');
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await flush();
    expect(screen.getByTestId('kiosk-title')).toHaveTextContent('Team Nord');

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(screen.getByTestId('kiosk-root')).toHaveAttribute('data-paused', 'true');
    expect(screen.getByTestId('kiosk-pause-button')).toHaveTextContent('Weiter');
    await act(async () => {
      vi.advanceTimersByTime(10 * 60_000);
    });
    expect(screen.getByTestId('kiosk-title')).toHaveTextContent('Team Nord');
    fireEvent.click(screen.getByTestId('kiosk-pause-button'));
    expect(screen.getByTestId('kiosk-root')).toHaveAttribute('data-paused', 'false');
  });

  it('pausiert bei Bedienung mit dem Zeiger', async () => {
    renderShell();
    await flush();
    fireEvent.pointerDown(screen.getByTestId('kiosk-root'));
    expect(screen.getByTestId('kiosk-rotation-state')).toHaveTextContent('pausiert (Bedienung)');
    await act(async () => {
      vi.advanceTimersByTime(59_000);
    });
    expect(screen.getByTestId('kiosk-title')).toHaveTextContent('Mein Vertrieb');
  });

  it('pausiert bei Tastaturfokus auf ein Bedienelement (Codex PR #212)', async () => {
    renderShell();
    await flush();
    act(() => screen.getByTestId('kiosk-pause-button').focus());
    expect(screen.getByTestId('kiosk-rotation-state')).toHaveTextContent('pausiert (Bedienung)');
    await act(async () => {
      vi.advanceTimersByTime(59_000);
    });
    expect(screen.getByTestId('kiosk-title')).toHaveTextContent('Mein Vertrieb');
  });

  it('wechselt nicht, solange das nächste Dashboard noch lädt', async () => {
    const source = makeSource();
    let release: (() => void) | null = null;
    source.load.mockImplementation(async (id: string) => {
      if (id === 'team') await new Promise<void>((r) => (release = r));
      return { ok: true as const, value: DASHBOARDS.get(id) as StoredDashboardV2Row };
    });
    renderShell({ source });
    await flush();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByTestId('kiosk-rotation-state')).toHaveTextContent('wartet (lädt)');
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(source.load).toHaveBeenCalledTimes(2);
    await act(async () => release?.());
    await flush();
    expect(screen.getByTestId('kiosk-title')).toHaveTextContent('Team Nord');
  });

  it('zeigt offline den letzten Stand als veraltet mit deutlichem Hinweis', async () => {
    const { rerenderWith, source } = renderShell();
    await flush();
    const calls = source.load.mock.calls.length;
    rerenderWith({ online: { online: false, offlineSince: '2026-11-21T08:00:00.000Z' } });
    await flush();
    const banner = screen.getByTestId('kiosk-offline-banner');
    expect(banner.textContent).toMatch(
      /^Offline seit \d\d:\d\d – Daten werden nicht aktualisiert$/,
    );
    const tiles = screen.getAllByTestId('dashboard-tile');
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) expect(tile).toHaveAttribute('data-state', 'veraltet');
    // Rotation offline: keine Konfigurationsabrufe
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(source.load.mock.calls.length).toBe(calls);

    const onReconnect = vi.fn();
    rerenderWith({ online: ONLINE, onReconnect });
    await flush();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('kiosk-offline-banner')).toBeNull();
  });

  it('pausiert die Rotation offline und behält den letzten Stand (Codex PR #212)', async () => {
    const { rerenderWith } = renderShell();
    await flush();
    rerenderWith({ online: { online: false, offlineSince: '2026-11-21T08:00:00.000Z' } });
    await flush();
    expect(screen.getByTestId('kiosk-rotation-state')).toHaveTextContent('pausiert (offline)');
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    await flush();
    expect(screen.getByTestId('kiosk-title')).toHaveTextContent('Mein Vertrieb');
    expect(screen.queryByTestId('kiosk-placeholder')).toBeNull();
    expect(screen.getAllByTestId('dashboard-tile').length).toBeGreaterThan(0);
  });

  it('bietet nach technischem Ladefehler einen erneuten Versuch an (Codex PR #212)', async () => {
    const source = makeSource();
    source.load.mockResolvedValueOnce({
      ok: false as const,
      error: { kind: 'nicht_verfuegbar' as const },
    });
    renderShell({ ids: ['eigen'], source });
    await flush();
    expect(screen.getByTestId('kiosk-placeholder')).toHaveTextContent(
      'Das Dashboard konnte nicht geladen werden.',
    );
    fireEvent.click(screen.getByTestId('kiosk-retry'));
    await flush();
    expect(source.load).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('kiosk-title')).toHaveTextContent('Mein Vertrieb');
  });

  it('Dauerlauf 12 h: Abos und Fenster-Listener bleiben konstant', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    renderShell();
    await flush();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await flush();
    const baselineActive = subscriptions.active;
    const baselineListeners = add.mock.calls.length - remove.mock.calls.length;
    const baselineFeed = feedListeners.size;
    expect(baselineActive).toBeGreaterThan(0);

    for (let minute = 0; minute < 12 * 60; minute += 1) {
      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });
      await flush();
    }

    expect(subscriptions.active).toBe(baselineActive);
    expect(add.mock.calls.length - remove.mock.calls.length).toBe(baselineListeners);
    expect(feedListeners.size).toBe(baselineFeed);
    // 720 Wechsel haben Abos geöffnet und wieder geschlossen, nicht angehäuft
    expect(subscriptions.opened).toBeGreaterThan(720);
    add.mockRestore();
    remove.mockRestore();
  }, 60_000);
});
