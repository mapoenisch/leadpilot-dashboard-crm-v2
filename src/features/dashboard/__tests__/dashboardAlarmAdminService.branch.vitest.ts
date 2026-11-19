// Auftrag 168 / P13c: Zweigtests der Admin-Dienstfunktionen (aus dashboardAlarmService.branch
// ausgelagert, um die Dateigrößengrenze von 400 Zeilen einzuhalten).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as supabaseClientModule from '@/services/db/supabaseClient';
import {
  fetchAlarmWorkerStatus,
  fetchOrganizationAlarmRules,
  fetchDashboardRetentionInfo,
} from '../services/dashboardAlarmService';

describe('dashboardAlarmAdminService branches (Supabase RPC)', () => {
  let mockRpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRpc = vi.fn();
    const mockSupabase = { rpc: mockRpc };
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      mockSupabase as unknown as typeof supabaseClientModule.supabase,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('admin service branches', () => {
    it('fetchAlarmWorkerStatus Array und Objekt Rückgabe', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            status: 'ok',
            letzter_lauf: '2026-11-19T10:00:00Z',
            minuten_seit_letztem_lauf: 2,
            auswertung_aktiv: true,
            ueberfaellig: false,
          },
        ],
        error: null,
      });
      const s1 = await fetchAlarmWorkerStatus();
      expect(s1.status).toBe('ok');

      // Fehler dürfen keinen gesunden Worker vortäuschen, sondern werden weitergereicht.
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      await expect(fetchAlarmWorkerStatus()).rejects.toThrow('err');

      mockRpc.mockResolvedValueOnce({ data: null, error: null });
      await expect(fetchAlarmWorkerStatus()).rejects.toThrow('Worker-Status ohne Daten');

      mockRpc.mockRejectedValueOnce(new Error('netz'));
      await expect(fetchAlarmWorkerStatus()).rejects.toThrow('netz');

      mockRpc.mockResolvedValueOnce({
        data: {
          status: 'ueberfaellig',
          letzterLaufAm: '2026-11-19T10:00:00Z',
          letzterErfolgAm: '2026-11-19T09:00:00Z',
          auswertungAktiv: false,
          aktiveRegeln: 5,
        },
        error: null,
      });
      const s4 = await fetchAlarmWorkerStatus();
      expect(s4.status).toBe('ueberfaellig');
      expect(s4.ueberfaellig).toBe(true);
      expect(s4.auswertungAktiv).toBe(false);

      mockRpc.mockResolvedValueOnce({
        data: {
          status: 'pausiert',
          letzter_lauf: '2026-11-19T09:00:00Z',
          letzter_erfolg_am: '2026-11-19T09:00:00Z',
          auswertung_aktiv: false,
        },
        error: null,
      });
      const s5 = await fetchAlarmWorkerStatus();
      expect(s5.status).toBe('pausiert');
      expect(s5.ueberfaellig).toBe(false);
      expect(s5.auswertungAktiv).toBe(false);
    });

    it('fetchOrganizationAlarmRules Mapping und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            id: 'r-org',
            dashboard_id: 'd-1',
            dashboard_title: 'Title',
            tile_id: 't-1',
            catalog_id: 'c-1',
            rule_config: {},
            mindestdauer_laeufe: 2,
            abklingzeit_sekunden: 60,
            status: 'aktiv',
            responsible_user_id: 'u-1',
            responsible_email: 'u1@test.de',
            beobachtete_stufe: 'warnung',
            bestaetigte_stufe: null,
            letzter_messwert: 10,
            letzte_auswertung: null,
            created_at: '2026-11-19T00:00:00Z',
            updated_at: '2026-11-19T01:00:00Z',
          },
        ],
        error: null,
      });
      const res = await fetchOrganizationAlarmRules();
      expect(res.ok).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0]?.responsibleEmail).toBe('u1@test.de');

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      expect((await fetchOrganizationAlarmRules()).ok).toBe(false);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      expect((await fetchOrganizationAlarmRules()).ok).toBe(false);
    });

    it('fetchDashboardRetentionInfo mit Supabase', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ entfernt: true, letzte_bereinigung: '2026-11-19T00:00:00Z' }],
        error: null,
      });
      const r1 = await fetchDashboardRetentionInfo('dash-1');
      expect(r1.entfernt).toBe(true);
      expect(r1.letzteBereinigung).toBe('2026-11-19T00:00:00Z');

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      const r2 = await fetchDashboardRetentionInfo('dash-1');
      expect(r2.entfernt).toBe(false);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      const r3 = await fetchDashboardRetentionInfo('dash-1');
      expect(r3.entfernt).toBe(false);
    });
  });
});
