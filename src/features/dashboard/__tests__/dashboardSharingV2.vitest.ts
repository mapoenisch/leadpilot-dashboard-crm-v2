import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const flags = { configured: true };

vi.mock('@/services/db/supabaseClient', () => ({
  get supabase() {
    return flags.configured ? { rpc } : null;
  },
  get isSupabaseConfigured() {
    return flags.configured;
  },
}));

import {
  copyDashboardV2,
  deleteTeamDashboardV2,
  listAccessibleDashboardsV2,
  loadDashboardV2,
} from '../services/dashboardSharingV2';

beforeEach(() => {
  vi.clearAllMocks();
  flags.configured = true;
});

const validConfig = {
  version: 2,
  id: 'dash-1',
  title: 'Team Dashboard',
  scope: 'team',
  teamId: 'team-1',
  ownerUserId: 'usr-1',
  organizationId: 'org-1',
  globalTimeframe: 'letzte_30_tage',
  tiles: [],
};

describe('dashboardSharingV2', () => {
  describe('Demo-Modus / Nicht konfiguriert', () => {
    beforeEach(() => {
      flags.configured = false;
    });

    it('liefert nicht_verfuegbar für listAccessibleDashboardsV2', async () => {
      const res = await listAccessibleDashboardsV2();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
        if (res.error.kind === 'nicht_verfuegbar') {
          expect(res.error.message).toBe('Team-Freigaben brauchen eine Server-Verbindung');
        }
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it('liefert nicht_verfuegbar für loadDashboardV2', async () => {
      const res = await loadDashboardV2('d1');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it('liefert nicht_verfuegbar für deleteTeamDashboardV2', async () => {
      const res = await deleteTeamDashboardV2('d1', 1);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it('liefert nicht_verfuegbar für copyDashboardV2', async () => {
      const res = await copyDashboardV2({
        sourceId: 's1',
        targetScope: 'personal',
        title: 'Kopie',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
      expect(rpc).not.toHaveBeenCalled();
    });
  });

  describe('listAccessibleDashboardsV2', () => {
    it('ruft list_accessible_dashboards_v2 auf und mappt die Spalten', async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'd-personal',
            title: 'Mein Dashboard',
            scope: 'personal',
            revision: 3,
            tile_count: 5,
            section_count: 2,
            updated_at: '2026-11-22T10:00:00Z',
            team_id: null,
            team_name: null,
            can_write: true,
          },
          {
            id: 'd-team',
            title: 'Vertriebs-Übersicht',
            scope: 'team',
            revision: 1,
            tile_count: 8,
            section_count: 3,
            updated_at: '2026-11-22T12:00:00Z',
            team_id: 't-1',
            team_name: 'Vertrieb',
            can_write: false,
          },
        ],
        error: null,
      });

      const res = await listAccessibleDashboardsV2();
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('list_accessible_dashboards_v2');
      if (res.ok) {
        expect(res.value).toHaveLength(2);
        expect(res.value[0]).toEqual({
          id: 'd-personal',
          title: 'Mein Dashboard',
          scope: 'personal',
          revision: 3,
          tileCount: 5,
          sectionCount: 2,
          updatedAt: '2026-11-22T10:00:00Z',
          teamId: null,
          teamName: null,
          canWrite: true,
        });
        expect(res.value[1]).toEqual({
          id: 'd-team',
          title: 'Vertriebs-Übersicht',
          scope: 'team',
          revision: 1,
          tileCount: 8,
          sectionCount: 3,
          updatedAt: '2026-11-22T12:00:00Z',
          teamId: 't-1',
          teamName: 'Vertrieb',
          canWrite: false,
        });
      }
    });

    it('behandelt technischer Fehler', async () => {
      rpc.mockRejectedValueOnce(new Error('Network error'));

      const res = await listAccessibleDashboardsV2();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('technisch');
      }
    });
  });

  describe('loadDashboardV2', () => {
    it('lädt ein Dashboard und validiert die Config erfolgreich', async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'd-1',
            title: 'Team Dashboard',
            scope: 'team',
            team_id: 't-1',
            revision: 4,
            config: validConfig,
            updated_at: '2026-11-22T14:00:00Z',
            can_write: true,
          },
        ],
        error: null,
      });

      const res = await loadDashboardV2('d-1');
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('load_dashboard_v2', {
        p_dashboard_id: 'd-1',
      });
      if (res.ok) {
        expect(res.value.id).toBe('d-1');
        expect(res.value.canWrite).toBe(true);
        expect(res.value.revision).toBe(4);
        expect(res.value.config).toEqual(validConfig);
      }
    });

    it('gibt ungueltig zurück bei korrupter Config', async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'd-1',
            title: 'Kaputt',
            scope: 'team',
            team_id: 't-1',
            revision: 1,
            config: { version: 'ungueltig' },
            updated_at: '2026-11-22T14:00:00Z',
            can_write: true,
          },
        ],
        error: null,
      });

      const res = await loadDashboardV2('d-1');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('ungueltig');
      }
    });

    it('klassifiziert LP_DASHBOARD_NOT_FOUND als nicht_gefunden', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_DASHBOARD_NOT_FOUND' },
      });

      const res = await loadDashboardV2('non-existent');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_gefunden');
      }
    });

    it('klassifiziert LP_TEAM_ACCESS_REVOKED als team_zugriff_entzogen', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_TEAM_ACCESS_REVOKED' },
      });

      const res = await loadDashboardV2('d-revoked');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('team_zugriff_entzogen');
      }
    });
  });

  describe('deleteTeamDashboardV2', () => {
    it('ruft delete_team_dashboard_v2 mit exakten Parametern auf', async () => {
      rpc.mockResolvedValueOnce({
        data: [{ deleted_id: 'd-1' }],
        error: null,
      });

      const res = await deleteTeamDashboardV2('d-1', 3);
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('delete_team_dashboard_v2', {
        p_dashboard_id: 'd-1',
        p_expected_revision: 3,
      });
      if (res.ok) {
        expect(res.value.deletedId).toBe('d-1');
      }
    });

    it('behandelt LP_DASHBOARD_CONFLICT', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_DASHBOARD_CONFLICT', details: 'Revision veraltet' },
      });

      const res = await deleteTeamDashboardV2('d-1', 2);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('konflikt');
      }
    });

    it('behandelt LP_TEAM_ACCESS_REVOKED', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_TEAM_ACCESS_REVOKED' },
      });

      const res = await deleteTeamDashboardV2('d-1', 2);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('team_zugriff_entzogen');
      }
    });
  });

  describe('copyDashboardV2', () => {
    it('ruft copy_dashboard_v2 mit exakten Parametern auf', async () => {
      rpc.mockResolvedValueOnce({
        data: [{ dashboard_id: 'd-copy', revision: 1, created_at: '2026-11-22T15:00:00Z' }],
        error: null,
      });

      const res = await copyDashboardV2({
        sourceId: 'd-source',
        targetScope: 'team',
        targetTeamId: 't-target',
        title: 'Kopie von Vertrieb',
      });

      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('copy_dashboard_v2', {
        p_source_id: 'd-source',
        p_target_scope: 'team',
        p_target_team_id: 't-target',
        p_title: 'Kopie von Vertrieb',
      });
      if (res.ok) {
        expect(res.value.dashboardId).toBe('d-copy');
        expect(res.value.revision).toBe(1);
        expect(res.value.createdAt).toBe('2026-11-22T15:00:00Z');
      }
    });

    it('behandelt LP_TEAM_DASHBOARD_LIMIT', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_TEAM_DASHBOARD_LIMIT' },
      });

      const res = await copyDashboardV2({
        sourceId: 'd-source',
        targetScope: 'team',
        targetTeamId: 't-target',
        title: 'Kopie',
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('team_grenze');
      }
    });

    it('behandelt LP_DASHBOARD_LIMIT für persönliche Dashboards', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_DASHBOARD_LIMIT' },
      });

      const res = await copyDashboardV2({
        sourceId: 'd-source',
        targetScope: 'personal',
        title: 'Persönliche Kopie',
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('obergrenze_erreicht');
      }
    });
  });
});
