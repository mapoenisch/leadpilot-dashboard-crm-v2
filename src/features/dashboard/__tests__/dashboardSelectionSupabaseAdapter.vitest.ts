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
  deletePersonalDashboardV2,
  duplicatePersonalDashboardV2,
  listPersonalDashboardsV2,
} from '../services/dashboardSelectionV2';

beforeEach(() => {
  vi.clearAllMocks();
  flags.configured = true;
});

describe('dashboardSelectionV2 (Supabase-Adapter)', () => {
  describe('listPersonalDashboardsV2', () => {
    it('ruft list_personal_dashboards_v2 auf und mappt die Rückgabewerte', async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'd1',
            title: 'Dashboard 1',
            scope: 'personal',
            revision: 2,
            tile_count: 4,
            section_count: 2,
            updated_at: '2026-11-14T10:00:00Z',
          },
        ],
        error: null,
      });

      const res = await listPersonalDashboardsV2();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toHaveLength(1);
        expect(res.value[0]?.id).toBe('d1');
        expect(res.value[0]?.tileCount).toBe(4);
        expect(res.value[0]?.sectionCount).toBe(2);
      }
    });

    it('behandelt RPC-Fehler über Fehlerklassifizierung', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_AUTH_REQUIRED' },
        status: 403,
      });

      const res = await listPersonalDashboardsV2();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('keine_mitgliedschaft');
      }
    });

    it('behandelt technische Fehler', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection timeout' },
        status: 500,
      });

      const res = await listPersonalDashboardsV2();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('technisch');
      }
    });
  });

  describe('deletePersonalDashboardV2', () => {
    it('ruft delete_personal_dashboard_v2 auf und liefert next_dashboard_id', async () => {
      rpc.mockResolvedValueOnce({
        data: [{ deleted_id: 'd1', next_dashboard_id: 'd2' }],
        error: null,
      });

      const res = await deletePersonalDashboardV2({ dashboardId: 'd1', expectedRevision: 2 });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.deletedId).toBe('d1');
        expect(res.value.nextDashboardId).toBe('d2');
      }
    });

    it('klassifiziert LP_LAST_DASHBOARD', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_LAST_DASHBOARD: cannot delete last' },
        status: 400,
      });

      const res = await deletePersonalDashboardV2({ dashboardId: 'd1', expectedRevision: 1 });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('letztes_dashboard');
      }
    });

    it('behandelt technischen Fehler bei Lösch-RPC', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Server down' },
        status: 500,
      });

      const res = await deletePersonalDashboardV2({ dashboardId: 'd1', expectedRevision: 1 });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('technisch');
      }
    });
  });

  describe('duplicatePersonalDashboardV2', () => {
    it('validiert Titellänge vor RPC', async () => {
      const res = await duplicatePersonalDashboardV2({
        dashboardId: 'd1',
        title: '',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('ungueltig');
      }
    });

    it('ruft duplicate_personal_dashboard_v2 auf und liefert Duplikat-Details', async () => {
      rpc.mockResolvedValueOnce({
        data: [{ dashboard_id: 'd2', revision: 1, created_at: '2026-11-14T11:00:00Z' }],
        error: null,
      });

      const res = await duplicatePersonalDashboardV2({
        dashboardId: 'd1',
        title: 'Kopie von D1',
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.dashboardId).toBe('d2');
        expect(res.value.revision).toBe(1);
      }
    });

    it('klassifiziert LP_DASHBOARD_LIMIT', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'LP_DASHBOARD_LIMIT: maximum 20' },
        status: 400,
      });

      const res = await duplicatePersonalDashboardV2({
        dashboardId: 'd1',
        title: 'Kopie 21',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('obergrenze_erreicht');
      }
    });

    it('behandelt technischen Fehler bei Duplizier-RPC', async () => {
      rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
        status: 500,
      });

      const res = await duplicatePersonalDashboardV2({
        dashboardId: 'd1',
        title: 'Kopie',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.kind).toBe('technisch');
      }
    });
  });
});
