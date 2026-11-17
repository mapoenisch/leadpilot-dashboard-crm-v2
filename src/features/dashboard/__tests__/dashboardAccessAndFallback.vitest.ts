import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  fetchAccessibleDashboards,
  resolveInitialOrActiveDashboard,
  mapPersonalToAccessible,
} from '../hooks/dashboardV2Access';
import * as dbClient from '@/services/db/supabaseClient';
import * as sharingService from '../services/dashboardSharingV2';
import * as storageService from '../services/dashboardStorageV2';
import * as selectionService from '../services/dashboardSelectionV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('dashboardV2Access (Auftrag 163 T3)', () => {
  const dummyConfig: DashboardConfigV2 = {
    version: 2,
    id: 'dash-init',
    title: 'Executive Dashboard',
    scope: 'personal',
    ownerUserId: 'u1',
    organizationId: 'org1',
    globalTimeframe: 'aktuell',
    sections: [],
    tiles: [],
    metadata: {},
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('bildet persönliche Listeneinträge auf AccessibleDashboardListItemV2 ab', () => {
    const personalItems = [
      {
        id: 'p-1',
        title: 'Persönlich',
        scope: 'personal' as const,
        revision: 1,
        tileCount: 2,
        sectionCount: 1,
        updatedAt: '2026-11-17T12:00:00Z',
      },
    ];
    const accessible = mapPersonalToAccessible(personalItems);
    expect(accessible).toEqual([
      {
        id: 'p-1',
        title: 'Persönlich',
        scope: 'personal',
        revision: 1,
        tileCount: 2,
        sectionCount: 1,
        updatedAt: '2026-11-17T12:00:00Z',
        teamId: null,
        teamName: null,
        canWrite: true,
      },
    ]);
  });

  it('lädt ohne Supabase persönliche Dashboards als Accessible-Einträge', async () => {
    vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(false);
    vi.spyOn(selectionService, 'listPersonalDashboardsV2').mockResolvedValue({
      ok: true,
      value: [
        {
          id: 'p-1',
          title: 'Demo Dashboard',
          scope: 'personal',
          revision: 1,
          tileCount: 3,
          sectionCount: 1,
          updatedAt: '2026-11-17T12:00:00Z',
        },
      ],
    });

    const res = await fetchAccessibleDashboards();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value[0]).toMatchObject({
        id: 'p-1',
        teamId: null,
        canWrite: true,
      });
    }
  });

  it('fällt bei fehlender Serverfunktion (server_funktion_fehlt) auf den persönlichen Pfad zurück', async () => {
    vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    // @ts-expect-error Mock supabase
    vi.spyOn(dbClient, 'supabase', 'get').mockReturnValue({});

    vi.spyOn(sharingService, 'listAccessibleDashboardsV2').mockResolvedValue({
      ok: false,
      error: { kind: 'server_funktion_fehlt' },
    });

    vi.spyOn(selectionService, 'listPersonalDashboardsV2').mockResolvedValue({
      ok: true,
      value: [
        {
          id: 'p-fallback',
          title: 'Fallback Dashboard',
          scope: 'personal',
          revision: 2,
          tileCount: 1,
          sectionCount: 1,
          updatedAt: '2026-11-17T13:00:00Z',
        },
      ],
    });

    const res = await fetchAccessibleDashboards();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0]?.id).toBe('p-fallback');
      expect(res.value[0]?.canWrite).toBe(true);
    }
  });

  it('fällt bei nicht mehr lesbarem gemerkten Dashboard auf das persönliche Standard-Dashboard zurück', async () => {
    vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    // @ts-expect-error Mock supabase
    vi.spyOn(dbClient, 'supabase', 'get').mockReturnValue({});

    // Target Dashboard liefert team_zugriff_entzogen
    vi.spyOn(sharingService, 'loadDashboardV2').mockResolvedValue({
      ok: false,
      error: { kind: 'team_zugriff_entzogen' },
    });

    vi.spyOn(storageService, 'getOrCreatePersonalDashboardV2').mockResolvedValue({
      ok: true,
      value: {
        id: 'p-safe',
        title: 'Executive Dashboard',
        scope: 'personal',
        revision: 1,
        config: dummyConfig,
        updatedAt: '2026-11-17T14:00:00Z',
      },
    });

    const res = await resolveInitialOrActiveDashboard({
      explicitDashboardId: 'team-dash-revoked',
      orgId: 'org1',
      userId: 'u1',
      initialV2Config: dummyConfig,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.dashboard.id).toBe('p-safe');
      expect(res.value.fallbackNotice).toBe(
        'Das zuletzt geöffnete Team-Dashboard ist nicht mehr verfügbar.',
      );
    }
  });
});
