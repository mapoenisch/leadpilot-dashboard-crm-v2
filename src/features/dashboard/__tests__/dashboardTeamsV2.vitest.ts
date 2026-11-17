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
  addDashboardTeamMemberV2,
  createDashboardTeamV2,
  deleteDashboardTeamV2,
  listDashboardTeamMembersV2,
  listDashboardTeamsV2,
  removeDashboardTeamMemberV2,
  updateDashboardTeamV2,
} from '../services/dashboardTeamsV2';

beforeEach(() => {
  vi.clearAllMocks();
  flags.configured = true;
});

describe('dashboardTeamsV2', () => {
  describe('Demo-Modus / Nicht konfiguriert', () => {
    beforeEach(() => {
      flags.configured = false;
    });

    it('liefert nicht_verfuegbar für listDashboardTeamsV2', async () => {
      const res = await listDashboardTeamsV2();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
        if (res.error.kind === 'nicht_verfuegbar') {
          expect(res.error.message).toBe('Team-Freigaben brauchen eine Server-Verbindung');
        }
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it('liefert nicht_verfuegbar für createDashboardTeamV2', async () => {
      const res = await createDashboardTeamV2('Team A');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it('liefert nicht_verfuegbar für updateDashboardTeamV2', async () => {
      const res = await updateDashboardTeamV2('t1', 'Team A');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it('liefert nicht_verfuegbar für deleteDashboardTeamV2', async () => {
      const res = await deleteDashboardTeamV2('t1');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it('liefert nicht_verfuegbar für listDashboardTeamMembersV2', async () => {
      const res = await listDashboardTeamMembersV2('t1');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it('liefert nicht_verfuegbar für addDashboardTeamMemberV2', async () => {
      const res = await addDashboardTeamMemberV2('t1', 'u1');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it('liefert nicht_verfuegbar für removeDashboardTeamMemberV2', async () => {
      const res = await removeDashboardTeamMemberV2('t1', 'u1');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_verfuegbar');
      }
      expect(rpc).not.toHaveBeenCalled();
    });
  });

  describe('listDashboardTeamsV2', () => {
    it('ruft list_dashboard_teams_v2 auf und mappt die Spalten', async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            id: 't-1',
            name: 'Vertrieb',
            description: 'Vertriebsteam',
            member_count: 5,
            dashboard_count: 3,
            can_write: true,
            is_member: true,
          },
        ],
        error: null,
      });

      const res = await listDashboardTeamsV2();
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('list_dashboard_teams_v2');
      if (res.ok) {
        expect(res.value).toHaveLength(1);
        expect(res.value[0]).toEqual({
          id: 't-1',
          name: 'Vertrieb',
          description: 'Vertriebsteam',
          memberCount: 5,
          dashboardCount: 3,
          canWrite: true,
          isMember: true,
        });
      }
    });

    it('klassifiziert LP_FORBIDDEN als nicht_berechtigt', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_FORBIDDEN: Keine Berechtigung' },
        status: 403,
      });

      const res = await listDashboardTeamsV2();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('nicht_berechtigt');
      }
    });
  });

  describe('createDashboardTeamV2', () => {
    it('ruft create_dashboard_team_v2 mit exakten Parametern auf (unterstützt id und team_id)', async () => {
      rpc.mockResolvedValueOnce({
        data: [{ id: 'new-team-id', name: 'Marketing', description: 'Marketing Team', created_at: '2026-11-22T10:00:00Z' }],
        error: null,
      });

      const res = await createDashboardTeamV2('Marketing', 'Marketing Team');
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('create_dashboard_team_v2', {
        p_name: 'Marketing',
        p_description: 'Marketing Team',
      });
      if (res.ok) {
        expect(res.value.teamId).toBe('new-team-id');
        expect(res.value.createdAt).toBe('2026-11-22T10:00:00Z');
      }
    });

    it('behandelt LP_TEAM_NAME_TAKEN', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_TEAM_NAME_TAKEN' },
      });

      const res = await createDashboardTeamV2('BereitsVergeben');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('team_name_vergeben');
      }
    });

    it('behandelt LP_TEAM_LIMIT', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_TEAM_LIMIT' },
      });

      const res = await createDashboardTeamV2('Team 51');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('team_grenze');
      }
    });
  });

  describe('updateDashboardTeamV2', () => {
    it('ruft update_dashboard_team_v2 mit exakten Parametern auf (unterstützt id und team_id)', async () => {
      rpc.mockResolvedValueOnce({
        data: [{ id: 't-1', name: 'Neuer Name', description: null, updated_at: '2026-11-22T11:00:00Z' }],
        error: null,
      });

      const res = await updateDashboardTeamV2('t-1', 'Neuer Name', null);
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('update_dashboard_team_v2', {
        p_team_id: 't-1',
        p_name: 'Neuer Name',
        p_description: null,
      });
      if (res.ok) {
        expect(res.value.teamId).toBe('t-1');
        expect(res.value.updatedAt).toBe('2026-11-22T11:00:00Z');
      }
    });

    it('behandelt LP_TEAM_NOT_FOUND', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_TEAM_NOT_FOUND' },
      });

      const res = await updateDashboardTeamV2('non-existent', 'Name');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('team_nicht_gefunden');
      }
    });
  });

  describe('deleteDashboardTeamV2', () => {
    it('ruft delete_dashboard_team_v2 mit exakten Parametern auf (unterstützt boolesche Skalare)', async () => {
      rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const res = await deleteDashboardTeamV2('t-1');
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('delete_dashboard_team_v2', {
        p_team_id: 't-1',
      });
      if (res.ok) {
        expect(res.value.deletedTeamId).toBe('t-1');
      }
    });

    it('behandelt LP_TEAM_HAS_DASHBOARDS', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_TEAM_HAS_DASHBOARDS' },
      });

      const res = await deleteDashboardTeamV2('t-1');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('team_hat_dashboards');
      }
    });
  });

  describe('listDashboardTeamMembersV2', () => {
    it('ruft list_dashboard_team_members_v2 auf und mappt die Spalten', async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            user_id: 'u-1',
            email: 'user1@example.com',
            org_role: 'member',
            org_status: 'active',
            team_role: 'member',
            created_at: '2026-11-22T09:00:00Z',
          },
        ],
        error: null,
      });

      const res = await listDashboardTeamMembersV2('t-1');
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('list_dashboard_team_members_v2', {
        p_team_id: 't-1',
      });
      if (res.ok) {
        expect(res.value).toHaveLength(1);
        expect(res.value[0]).toEqual({
          userId: 'u-1',
          email: 'user1@example.com',
          orgRole: 'member',
          orgStatus: 'active',
          teamRole: 'member',
          createdAt: '2026-11-22T09:00:00Z',
        });
      }
    });
  });

  describe('addDashboardTeamMemberV2', () => {
    it('ruft add_dashboard_team_member_v2 mit exakten Parametern auf', async () => {
      rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const res = await addDashboardTeamMemberV2('t-1', 'u-1');
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('add_dashboard_team_member_v2', {
        p_team_id: 't-1',
        p_user_id: 'u-1',
      });
      if (res.ok) {
        expect(res.value.teamId).toBe('t-1');
        expect(res.value.userId).toBe('u-1');
      }
    });

    it('behandelt LP_MEMBER_NOT_IN_ORG', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_MEMBER_NOT_IN_ORG' },
      });

      const res = await addDashboardTeamMemberV2('t-1', 'u-foreign');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('mitglied_nicht_in_org');
      }
    });

    it('behandelt LP_TEAM_MEMBER_LIMIT', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_TEAM_MEMBER_LIMIT' },
      });

      const res = await addDashboardTeamMemberV2('t-1', 'u-201');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('team_grenze');
      }
    });
  });

  describe('removeDashboardTeamMemberV2', () => {
    it('ruft remove_dashboard_team_member_v2 mit exakten Parametern auf', async () => {
      rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const res = await removeDashboardTeamMemberV2('t-1', 'u-1');
      expect(res.ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith('remove_dashboard_team_member_v2', {
        p_team_id: 't-1',
        p_user_id: 'u-1',
      });
      if (res.ok) {
        expect(res.value.removed).toBe(true);
      }
    });

    it('behandelt technischen Fehler bei Netzwerkabbruch', async () => {
      rpc.mockRejectedValueOnce(new Error('Network error'));

      const res = await removeDashboardTeamMemberV2('t-1', 'u-1');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('technisch');
      }
    });
  });
});
