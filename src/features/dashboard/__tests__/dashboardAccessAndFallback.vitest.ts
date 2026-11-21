import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  fetchAccessibleDashboards,
  resolveInitialOrActiveDashboard,
  mapPersonalToAccessible,
  fetchDashboardById,
  loadAndActivateAnyDashboardV2,
} from '../hooks/dashboardV2Access';
import * as dbClient from '@/services/db/supabaseClient';
import * as sharingService from '../services/dashboardSharingV2';
import * as storageService from '../services/dashboardStorageV2';
import * as selectionService from '../services/dashboardSelectionV2';
import * as teamsService from '../services/dashboardTeamsV2';
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

  it('reicht technische Fehler beim Laden eines Dashboards unverändert weiter', async () => {
    vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    // @ts-expect-error Mock supabase
    vi.spyOn(dbClient, 'supabase', 'get').mockReturnValue({});

    vi.spyOn(sharingService, 'loadDashboardV2').mockResolvedValue({
      ok: false,
      error: { kind: 'technisch' },
    });

    const res = await resolveInitialOrActiveDashboard({
      explicitDashboardId: 'team-dash-server-err',
      orgId: 'org1',
      userId: 'u1',
      initialV2Config: dummyConfig,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('technisch');
    }
  });

  it('startet nach Abbruch keinen persönlichen Rückfallabruf mehr (Codex PR #212)', async () => {
    vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    // @ts-expect-error Mock supabase
    vi.spyOn(dbClient, 'supabase', 'get').mockReturnValue({});
    const controller = new AbortController();
    vi.spyOn(sharingService, 'listAccessibleDashboardsV2').mockImplementation(async () => {
      // Fehlerantwort trifft erst nach dem Sitzungsablauf ein.
      controller.abort();
      return { ok: false, error: { kind: 'server_funktion_fehlt' } };
    });
    const personalSpy = vi.spyOn(selectionService, 'listPersonalDashboardsV2');

    const res = await fetchAccessibleDashboards(controller.signal);

    expect(personalSpy).not.toHaveBeenCalled();
    expect(res.ok).toBe(false);
  });

  it('listet mit bereits abgebrochenem Signal gar nicht (Codex PR #212)', async () => {
    vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    // @ts-expect-error Mock supabase
    vi.spyOn(dbClient, 'supabase', 'get').mockReturnValue({});
    const accessibleSpy = vi.spyOn(sharingService, 'listAccessibleDashboardsV2');
    const controller = new AbortController();
    controller.abort();

    const res = await fetchAccessibleDashboards(controller.signal);

    expect(accessibleSpy).not.toHaveBeenCalled();
    expect(res.ok).toBe(false);
  });

  describe('fetchDashboardById & loadAndActivateAnyDashboardV2', () => {
    it('lädt Dashboard ohne Supabase oder bei server_funktion_fehlt über loadPersonalDashboardV2', async () => {
      vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(false);
      vi.spyOn(storageService, 'loadPersonalDashboardV2').mockResolvedValue({
        ok: true,
        value: {
          id: 'p-direct',
          title: 'Direct Personal',
          scope: 'personal',
          revision: 1,
          config: dummyConfig,
          updatedAt: '2026-11-17T10:00:00Z',
        },
      });

      const res = await fetchDashboardById('p-direct');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.canWrite).toBe(true);
      }

      // Bei Rückgabe null
      vi.spyOn(storageService, 'loadPersonalDashboardV2').mockResolvedValue({
        ok: true,
        value: null as unknown as storageService.StoredDashboardV2Row,
      });
      const resNull = await fetchDashboardById('p-none');
      expect(resNull.ok).toBe(false);
    });

    it('startet nach Abbruch keinen Team-Folgeabruf mehr (Codex PR #212)', async () => {
      vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      // @ts-expect-error Mock supabase
      vi.spyOn(dbClient, 'supabase', 'get').mockReturnValue({});
      const controller = new AbortController();
      vi.spyOn(sharingService, 'loadDashboardV2').mockImplementation(async () => {
        // Antwort trifft erst ein, nachdem der Kiosk ausgehängt wurde (Sitzungsablauf).
        controller.abort();
        return {
          ok: true,
          value: {
            id: 'team-d1',
            title: 'Team Dashboard',
            scope: 'team',
            revision: 1,
            config: dummyConfig,
            updatedAt: '2026-11-17T10:00:00Z',
            canWrite: false,
            teamId: 'team-1',
          },
        };
      });
      const teamsSpy = vi
        .spyOn(teamsService, 'listDashboardTeamsV2')
        .mockResolvedValue({ ok: true, value: [] });

      const res = await fetchDashboardById('team-d1', controller.signal);

      expect(teamsSpy).not.toHaveBeenCalled();
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.value.teamName).toBeNull();
    });

    it('lädt mit bereits abgebrochenem Signal gar nicht (Codex PR #212)', async () => {
      vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      // @ts-expect-error Mock supabase
      vi.spyOn(dbClient, 'supabase', 'get').mockReturnValue({});
      const loadSpy = vi.spyOn(sharingService, 'loadDashboardV2');
      const controller = new AbortController();
      controller.abort();

      const res = await fetchDashboardById('d-x', controller.signal);

      expect(loadSpy).not.toHaveBeenCalled();
      expect(res.ok).toBe(false);
    });

    it('aktiviert Dashboard und setzt Zustand über loadAndActivateAnyDashboardV2', async () => {
      vi.spyOn(dbClient, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      // @ts-expect-error Mock supabase
      vi.spyOn(dbClient, 'supabase', 'get').mockReturnValue({});

      vi.spyOn(sharingService, 'loadDashboardV2').mockResolvedValue({
        ok: true,
        value: {
          id: 'd-active',
          title: 'Active Dashboard',
          scope: 'personal',
          revision: 1,
          config: dummyConfig,
          updatedAt: '2026-11-17T10:00:00Z',
          canWrite: true,
          teamId: null,
        },
      });

      const setDashboard = vi.fn();
      const res = await loadAndActivateAnyDashboardV2('d-active', 'org1', 'u1', setDashboard);
      expect(res.ok).toBe(true);
      expect(setDashboard).toHaveBeenCalled();
    });
  });
});
