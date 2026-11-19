// Executive Dashboard V2 (Auftrag 168 / P13c §2.1 Nr. 7, 11a, 19):
// Integrationstest: Kachel-Rendering im DashboardGrid ordnet Server-Alarmregeln
// den jeweiligen Kacheln zu und reicht den aktiven bzw. pausierten Status durch.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardGrid } from '../components/DashboardGrid';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { TileDataHook } from '../components/LazyDashboardTile';
import {
  type DashboardAlarmRule,
  inMemoryAlarmStore,
} from '../services/dashboardAlarmService';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { organizationId: 'org-test-1', userId: 'user-test-1', role: 'admin' },
  }),
}));

const dummyUseData: TileDataHook = (tile) => ({
  catalogId: tile.catalogId,
  state: 'bereit',
  value: 42,
  series: null,
  overview: null,
  unit: 'Deals',
  timeBasis: 'Aktueller Stand',
  asOf: new Date().toISOString(),
  origin: { layer: 'crm', module: 'test', exportName: 'test' },
  scope: 'organisation',
  effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
});

const testTiles: DashboardTileConfig[] = [
  {
    tileId: 'tile-with-active-alarm',
    catalogId: 'crm.pipeline_deals',
    view: 'zahl',
    size: 'klein',
    filterMode: 'dashboard',
  },
  {
    tileId: 'tile-with-paused-alarm',
    catalogId: 'baseline.umsatz',
    view: 'zahl',
    size: 'klein',
    filterMode: 'dashboard',
  },
  {
    tileId: 'tile-without-alarm',
    catalogId: 'baseline.arr',
    view: 'zahl',
    size: 'klein',
    filterMode: 'dashboard',
  },
];

describe('DashboardGrid Tile Alarm Status Integration (Auftrag 168 / P13c)', () => {
  beforeEach(() => {
    inMemoryAlarmStore.rules.clear();
    inMemoryAlarmStore.events = [];
  });

  it('reicht übergebene alarmRules an LazyDashboardTile durch und zeigt Glocken-Icons mit korrektem Status', () => {
    const mockRules: DashboardAlarmRule[] = [
      {
        id: 'rule-1',
        dashboardId: 'd-1',
        tileId: 'tile-with-active-alarm',
        catalogId: 'crm.pipeline_deals',
        ruleConfig: { formatVersion: 2, enabled: true },
        mindestdauerLaeufe: 1,
        abklingzeitSekunden: 0,
        status: 'aktiv',
        responsibleUserId: 'user-1',
        createdAt: '2026-11-19T10:00:00Z',
        updatedAt: '2026-11-19T10:00:00Z',
      },
      {
        id: 'rule-2',
        dashboardId: 'd-1',
        tileId: 'tile-with-paused-alarm',
        catalogId: 'baseline.umsatz',
        ruleConfig: { formatVersion: 2, enabled: false },
        mindestdauerLaeufe: 1,
        abklingzeitSekunden: 0,
        status: 'pausiert',
        responsibleUserId: 'user-1',
        createdAt: '2026-11-19T10:00:00Z',
        updatedAt: '2026-11-19T10:00:00Z',
      },
    ];

    render(
      <MemoryRouter>
        <DashboardGrid
          tiles={testTiles}
          editing={false}
          locked={false}
          useData={dummyUseData}
          alarmRules={mockRules}
          onShowDetails={vi.fn()}
          onMove={vi.fn()}
          onMoveTo={vi.fn()}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Kachel 1: Aktiver Alarm -> Glocke mit status aktiv
    const activeTileItem = document.querySelector('[data-tile-id="tile-with-active-alarm"]');
    expect(activeTileItem).not.toBeNull();
    const activeBell = within(activeTileItem as HTMLElement).getByTestId('tile-alarm-bell');
    expect(activeBell).toBeDefined();
    expect(activeBell.getAttribute('data-alarm-status')).toBe('aktiv');
    expect(activeBell.getAttribute('aria-label')).toContain('Alarm aktiv');

    // Kachel 2: Pausierter Alarm -> Glocke mit status pausiert
    const pausedTileItem = document.querySelector('[data-tile-id="tile-with-paused-alarm"]');
    expect(pausedTileItem).not.toBeNull();
    const pausedBell = within(pausedTileItem as HTMLElement).getByTestId('tile-alarm-bell');
    expect(pausedBell).toBeDefined();
    expect(pausedBell.getAttribute('data-alarm-status')).toBe('pausiert');
    expect(pausedBell.getAttribute('aria-label')).toContain('Alarm pausiert');

    // Kachel 3: Kein Alarm -> keine Glocke
    const noAlarmTileItem = document.querySelector('[data-tile-id="tile-without-alarm"]');
    expect(noAlarmTileItem).not.toBeNull();
    expect(within(noAlarmTileItem as HTMLElement).queryByTestId('tile-alarm-bell')).toBeNull();
  });

  it('lädt Alarmregeln anhand der dashboardId und zeigt zugeordnete Alarm-Badges auf Kacheln an', async () => {
    // Regel im InMemory Store anlegen
    inMemoryAlarmStore.createRule({
      dashboardId: 'auto-load-dash',
      tileId: 'tile-with-active-alarm',
      catalogId: 'crm.pipeline_deals',
      ruleConfig: { formatVersion: 2, enabled: true },
      mindestdauerLaeufe: 1,
      abklingzeitSekunden: 0,
    });

    render(
      <MemoryRouter>
        <DashboardGrid
          tiles={testTiles}
          dashboardId="auto-load-dash"
          editing={false}
          locked={false}
          useData={dummyUseData}
          onShowDetails={vi.fn()}
          onMove={vi.fn()}
          onMoveTo={vi.fn()}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const activeTileItem = document.querySelector('[data-tile-id="tile-with-active-alarm"]');
      expect(activeTileItem).not.toBeNull();
      const activeBell = within(activeTileItem as HTMLElement).getByTestId('tile-alarm-bell');
      expect(activeBell).toBeDefined();
      expect(activeBell.getAttribute('data-alarm-status')).toBe('aktiv');
    });
  });
});
