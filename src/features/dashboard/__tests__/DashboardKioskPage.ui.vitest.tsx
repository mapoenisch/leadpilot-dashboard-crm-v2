// Auftrag 171 (P15a §2.1 Nr. 1/4): Kiosk-Seite — nur angemeldet, Sitzungsablauf stoppt Abrufe.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TileData } from '../data/dashboardData';
import type { SessionSourceEvent } from '../hooks/useSessionGuard';
import { createPreviewThresholdsConfig } from '../preview/previewThresholds';

const auth = {
  user: { id: 'user-1', email: 'a@e2e.local' } as { id: string; email: string } | null,
  isAuthenticated: true,
  isHydrated: true,
  logout: vi.fn(async () => {}),
};
let orgSession: { role: string; organizationId: string; userId: string } | null = {
  role: 'viewer',
  organizationId: 'org-1',
  userId: 'user-1',
};
let orgLoading = false;
let emitAuth: ((e: SessionSourceEvent, at: number | null) => void) | null = null;
const dataCalls = { count: 0 };
const resetLive = vi.fn();

vi.mock('@/auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({ session: orgSession, isLoading: orgLoading }),
}));
vi.mock('@/services/liveKpi/liveKpiStreamStore', () => ({
  liveKpiStreamStore: {
    reset: () => resetLive(),
    subscribeFeedConnection: () => () => {},
    getFeedConnectionState: () => 'live',
    getState: () => ({ snapshot: null, history: [], status: 'idle', error: null }),
  },
}));
vi.mock('../hooks/supabaseSessionSource', () => ({
  createSupabaseSessionSource: () => ({
    read: async () => Date.now() + 3_600_000,
    subscribe: (l: (e: SessionSourceEvent, at: number | null) => void) => {
      emitAuth = l;
      return () => {
        emitAuth = null;
      };
    },
  }),
}));
vi.mock('../time/useEditorLiveStatus', () => ({
  useEditorLiveStatus: () => ({
    connection: 'verbunden',
    lastEventAt: null,
    dataAsOf: '2026-11-21T07:58:00.000Z',
    pausedSince: null,
  }),
}));
vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: () => ({ rules: [], workerStatus: null }),
}));
vi.mock('../hooks/useUnreadAlarmCount', () => ({
  useUnreadAlarmCount: () => ({ display: '2', ariaLabel: '2 ungelesene Alarme', hasUnread: true }),
}));

const config = { ...createPreviewThresholdsConfig(), id: 'd1', title: 'Vertrieb Live' };
const access = vi.hoisted(() => ({ list: vi.fn(), load: vi.fn() }));
vi.mock('../hooks/dashboardV2Access', () => ({
  fetchAccessibleDashboards: () => access.list(),
  fetchDashboardById: (id: string) => access.load(id),
}));
vi.mock('../time/useTimeControlledData', async (orig) => {
  const actual = await orig<typeof import('../time/useTimeControlledData')>();
  return {
    ...actual,
    useTimeControlledData: (tile: { catalogId: string }): TileData => {
      dataCalls.count += 1;
      return {
        catalogId: tile.catalogId,
        state: 'bereit',
        value: 1,
        series: null,
        overview: null,
        unit: 'EUR',
        timeBasis: 'live',
        asOf: '2026-11-21T07:58:00.000Z',
        origin: { layer: 'live', module: 'm', exportName: 'e' },
        scope: 'organisation',
        effectiveFilter: {} as never,
      };
    },
  };
});

import { DashboardKioskPage } from '../pages/DashboardKioskPage';

function renderPage(client = new QueryClient(), search = '?ids=d1&intervall=60') {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/dashboard/kiosk${search}`]}>
        <Routes>
          <Route path="/dashboard/kiosk" element={<DashboardKioskPage />} />
          <Route path="/login" element={<p data-testid="login-page">Login</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

describe('DashboardKioskPage (Auftrag 171)', () => {
  beforeEach(() => {
    auth.isAuthenticated = true;
    auth.user = { id: 'user-1', email: 'a@e2e.local' };
    orgSession = { role: 'viewer', organizationId: 'org-1', userId: 'user-1' };
    orgLoading = false;
    dataCalls.count = 0;
    resetLive.mockClear();
    access.list.mockReset().mockResolvedValue({
      ok: true,
      value: [
        {
          id: 'd1',
          title: 'Vertrieb Live',
          scope: 'team',
          revision: 1,
          tileCount: config.tiles.length,
          sectionCount: 0,
          updatedAt: '2026-11-21T07:00:00Z',
          teamId: 't1',
          teamName: 'Nord',
          canWrite: false,
        },
      ],
    });
    access.load.mockReset().mockResolvedValue({
      ok: true,
      value: {
        id: 'd1',
        title: 'Vertrieb Live',
        scope: 'team',
        revision: 1,
        config,
        updatedAt: '2026-11-21T07:00:00Z',
        teamId: 't1',
        teamName: 'Nord',
        canWrite: false,
      },
    });
  });
  afterEach(() => vi.useRealTimers());

  it('leitet ohne Anmeldung auf /login um (kein öffentlicher Zugang)', async () => {
    auth.isAuthenticated = false;
    orgSession = null;
    renderPage();
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    expect(access.list).not.toHaveBeenCalled();
  });

  it('zeigt angemeldet das Dashboard mit Alarmzähler, aber ohne Quittier-Link', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Vertrieb Live' })).toBeInTheDocument();
    expect(screen.getByTestId('kiosk-alarm-count')).toHaveTextContent('2');
    expect(screen.getByTestId('kiosk-alarm-indicator').closest('a')).toBeNull();
    expect(screen.queryByTestId('save-button')).toBeNull();
    expect(screen.getAllByTestId('dashboard-tile').length).toBeGreaterThan(0);
  });

  it('Sitzungsablauf: Kacheln weg, Hinweis mit Datenstand, Cache leer, keine weiteren Abrufe', async () => {
    const client = new QueryClient();
    client.setQueryData(['dashboard', 'org-1', 'crm', 'crmOverview', 'user-1', null], { x: 1 });
    renderPage(client);
    await screen.findByRole('heading', { name: 'Vertrieb Live' });
    const listCalls = access.list.mock.calls.length;
    const loadCalls = access.load.mock.calls.length;
    // Codex-Befund (PR #212): reset() darf erst laufen, wenn keine Kachel mehr Abos hält.
    let tilesAtReset = -1;
    resetLive.mockImplementation(() => {
      tilesAtReset = document.querySelectorAll('[data-testid="dashboard-tile"]').length;
    });

    act(() => emitAuth?.('abgemeldet', null));

    expect(screen.getByTestId('kiosk-session-expired')).toHaveTextContent(
      'Sitzung abgelaufen – bitte neu anmelden',
    );
    expect(screen.getByTestId('kiosk-last-valid-data')).toHaveTextContent(/\d\d:\d\d Uhr/);
    expect(screen.queryAllByTestId('dashboard-tile')).toHaveLength(0);
    expect(screen.queryByText('Vertrieb Live')).toBeNull();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(resetLive).toHaveBeenCalledTimes(1);
    expect(tilesAtReset).toBe(0);

    const callsAfter = dataCalls.count;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(dataCalls.count).toBe(callsAfter);
    expect(access.list.mock.calls.length).toBe(listCalls);
    expect(access.load.mock.calls.length).toBe(loadCalls);
  });

  it('Abmeldung im Auth-Kontext führt zum Hinweis statt zur stillen Umleitung', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Vertrieb Live' });
    auth.isAuthenticated = false;
    auth.user = null;
    orgSession = null;
    act(() => emitAuth?.('angemeldet', Date.now() + 1000)); // Re-Render anstoßen
    expect(await screen.findByTestId('kiosk-session-expired')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).toBeNull();
  });

  it('Benutzerwechsel ohne Abmeldung: alte Konfiguration verschwindet sofort (Codex PR #212)', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Vertrieb Live' });
    const loads = access.load.mock.calls.length;
    auth.user = { id: 'user-2', email: 'b@e2e.local' }; // Org-Kontext gehört noch zu user-1
    act(() => emitAuth?.('angemeldet', Date.now() + 3_600_000));
    expect(screen.queryAllByTestId('dashboard-tile')).toHaveLength(0);
    expect(screen.queryByText('Vertrieb Live')).toBeNull();

    orgSession = { role: 'viewer', organizationId: 'org-1', userId: 'user-2' };
    act(() => emitAuth?.('angemeldet', Date.now() + 3_600_000));
    expect(await screen.findByRole('heading', { name: 'Vertrieb Live' })).toBeInTheDocument();
    expect(access.load.mock.calls.length).toBeGreaterThan(loads); // frisch geladen, nicht übernommen
  });

  it('Token-Erneuerung: Hülle bleibt samt Pause und Rotation montiert (Codex PR #212)', async () => {
    // Zwei Dashboards, damit die Rotation überhaupt läuft und die Pause prüfbar ist.
    access.list.mockResolvedValue({
      ok: true,
      value: [
        {
          id: 'd1',
          title: 'Vertrieb Live',
          scope: 'team',
          revision: 1,
          tileCount: config.tiles.length,
          sectionCount: 0,
          updatedAt: '2026-11-21T07:00:00Z',
          teamId: 't1',
          teamName: 'Nord',
          canWrite: false,
        },
        {
          id: 'd2',
          title: 'Team Nord',
          scope: 'team',
          revision: 1,
          tileCount: config.tiles.length,
          sectionCount: 0,
          updatedAt: '2026-11-21T07:00:00Z',
          teamId: 't1',
          teamName: 'Nord',
          canWrite: false,
        },
      ],
    });
    access.load.mockImplementation(async (id: string) => ({
      ok: true as const,
      value: {
        id,
        title: id === 'd1' ? 'Vertrieb Live' : 'Team Nord',
        scope: 'team',
        revision: 1,
        config: { ...config, id, title: id === 'd1' ? 'Vertrieb Live' : 'Team Nord' },
        updatedAt: '2026-11-21T07:00:00Z',
        teamId: 't1',
        teamName: 'Nord',
        canWrite: false,
      },
    }));
    renderPage(new QueryClient(), '?ids=d1,d2&intervall=60');
    await screen.findByRole('heading', { name: 'Vertrieb Live' });
    fireEvent.click(screen.getByTestId('kiosk-pause-button'));
    expect(screen.getByTestId('kiosk-root')).toHaveAttribute('data-paused', 'true');
    const loads = access.load.mock.calls.length;

    // Supabase erneuert das Token: neues User-Objekt, OrganizationProvider prüft erneut.
    orgLoading = true;
    act(() => emitAuth?.('erneuert', Date.now() + 3_600_000));

    expect(screen.getByTestId('kiosk-root')).toHaveAttribute('data-paused', 'true');
    expect(screen.getByRole('heading', { name: 'Vertrieb Live' })).toBeInTheDocument();
    expect(access.load.mock.calls.length).toBe(loads); // keine Neumontage, kein Neuladen

    orgLoading = false;
    act(() => emitAuth?.('erneuert', Date.now() + 3_600_000));
    expect(screen.getByTestId('kiosk-root')).toHaveAttribute('data-paused', 'true');
  });
});
