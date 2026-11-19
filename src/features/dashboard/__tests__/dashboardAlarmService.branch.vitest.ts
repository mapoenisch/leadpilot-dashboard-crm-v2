import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as supabaseClientModule from '@/services/db/supabaseClient';
import {
  fetchDashboardAlarmRules,
  createDashboardAlarmRule,
  updateDashboardAlarmRule,
  pauseDashboardAlarmRule,
  resumeDashboardAlarmRule,
  deleteDashboardAlarmRule,
  fetchDashboardAlarmEvents,
  markAlarmEventsRead,
  markAllAlarmEventsRead,
  acknowledgeAlarmEvent,
  takeoverAlarmRule,
  fetchUnreadAlarmCount,
} from '../services/dashboardAlarmService';

describe('dashboardAlarmService & admin branches (Supabase RPC)', () => {
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

  describe('fetchDashboardAlarmRules branches', () => {
    it('erfolgreiche Liste mit vollständigen und minimalen Feldern', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            id: 'r-1',
            tile_id: 't-1',
            catalog_id: 'cat-1',
            pipeline: 'pipe-1',
            rule_config: { enabled: true },
            mindestdauer_laeufe: 3,
            abklingzeit_sekunden: 1200,
            status: 'aktiv',
            beobachtete_stufe: 'warnung',
            bestaetigte_stufe: 'normal',
            letzter_messwert: 42,
            letzte_auswertung: '2026-11-19T10:00:00Z',
            letztes_ereignis_am: '2026-11-19T09:00:00Z',
            responsible_user_id: 'u-1',
            created_at: '2026-11-19T08:00:00Z',
          },
          {
            id: 'r-2',
            tile_id: 't-2',
            catalog_id: 'cat-2',
            pipeline: null,
            rule_config: null,
            status: 'pausiert',
            mindestdauer_laeufe: null,
            abklingzeit_sekunden: null,
            beobachtete_stufe: null,
            bestaetigte_stufe: null,
            letzter_messwert: null,
            letzte_auswertung: null,
            letztes_ereignis_am: null,
            responsible_user_id: null,
            created_at: null,
          },
        ],
        error: null,
      });

      const res = await fetchDashboardAlarmRules('dash-real');
      expect(res.ok).toBe(true);
      expect(res.data).toHaveLength(2);
      expect(res.data?.[0]?.pipeline).toBe('pipe-1');
      expect(res.data?.[1]?.pipeline).toBeNull();
      expect(res.data?.[1]?.mindestdauerLaeufe).toBe(1);
    });

    it('behandelt RPC-Fehler und Exceptions', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
      const errRes = await fetchDashboardAlarmRules('dash-real');
      expect(errRes.ok).toBe(false);
      expect(errRes.error).toBe('db error');

      mockRpc.mockRejectedValueOnce(new Error('network failure'));
      const excRes = await fetchDashboardAlarmRules('dash-real');
      expect(excRes.ok).toBe(false);
      expect(excRes.error).toBe('network failure');
    });
  });

  describe('createDashboardAlarmRule branches', () => {
    it('erfolgreiche Erstellung und Fehlerpfade', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'new-rule-id', error: null });
      const okRes = await createDashboardAlarmRule({
        dashboardId: 'd-1',
        tileId: 't-1',
        catalogId: 'c-1',
        ruleConfig: {},
      });
      expect(okRes.ok).toBe(true);
      expect(okRes.ruleId).toBe('new-rule-id');

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'cannot create' } });
      const errRes = await createDashboardAlarmRule({
        dashboardId: 'd-1',
        tileId: 't-1',
        catalogId: 'c-1',
        ruleConfig: {},
      });
      expect(errRes.ok).toBe(false);
      expect(errRes.error).toBe('cannot create');

      mockRpc.mockRejectedValueOnce(new Error('timeout'));
      const excRes = await createDashboardAlarmRule({
        dashboardId: 'd-1',
        tileId: 't-1',
        catalogId: 'c-1',
        ruleConfig: {},
      });
      expect(excRes.ok).toBe(false);
    });
  });

  describe('update, pause, resume, delete branches', () => {
    it('updateDashboardAlarmRule Erfolg und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });
      expect((await updateDashboardAlarmRule({ ruleId: 'r-1', ruleConfig: {} })).ok).toBe(true);

      mockRpc.mockResolvedValueOnce({ error: { message: 'not found' } });
      expect((await updateDashboardAlarmRule({ ruleId: 'r-1', ruleConfig: {} })).ok).toBe(false);

      mockRpc.mockRejectedValueOnce('fail');
      expect((await updateDashboardAlarmRule({ ruleId: 'r-1', ruleConfig: {} })).ok).toBe(false);
    });

    it('pauseDashboardAlarmRule Erfolg und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });
      expect((await pauseDashboardAlarmRule('r-1')).ok).toBe(true);

      mockRpc.mockResolvedValueOnce({ error: { message: 'failed' } });
      expect((await pauseDashboardAlarmRule('r-1')).ok).toBe(false);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      expect((await pauseDashboardAlarmRule('r-1')).ok).toBe(false);
    });

    it('resumeDashboardAlarmRule Erfolg und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });
      expect((await resumeDashboardAlarmRule('r-1')).ok).toBe(true);

      mockRpc.mockResolvedValueOnce({ error: { message: 'failed' } });
      expect((await resumeDashboardAlarmRule('r-1')).ok).toBe(false);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      expect((await resumeDashboardAlarmRule('r-1')).ok).toBe(false);
    });

    it('deleteDashboardAlarmRule Erfolg und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });
      expect((await deleteDashboardAlarmRule('r-1')).ok).toBe(true);

      mockRpc.mockResolvedValueOnce({ error: { message: 'failed' } });
      expect((await deleteDashboardAlarmRule('r-1')).ok).toBe(false);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      expect((await deleteDashboardAlarmRule('r-1')).ok).toBe(false);
    });

    it('takeoverAlarmRule Erfolg und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });
      expect((await takeoverAlarmRule('r-1')).ok).toBe(true);

      mockRpc.mockResolvedValueOnce({ error: { message: 'denied' } });
      expect((await takeoverAlarmRule('r-1')).ok).toBe(false);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      expect((await takeoverAlarmRule('r-1')).ok).toBe(false);
    });
  });

  describe('fetchDashboardAlarmEvents branches', () => {
    it('erfolgreiche Liste mit Quittierungen und Fehlerpfade', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            id: 'ev-1',
            rule_id: 'r-1',
            dashboard_id: 'd-1',
            dashboard_title: 'Title',
            tile_id: 't-1',
            catalog_id: 'c-1',
            alter_zustand: 'normal',
            neuer_zustand: 'warnung',
            messwert: 50,
            einheit: 'ms',
            grenze: 40,
            meldung: 'High latency',
            created_at: '2026-11-19T10:00:00Z',
            gelesen: true,
            quittiert_von: [
              {
                user_id: 'u-1',
                email: 'u1@test.de',
                quittiert_at: '2026-11-19T10:05:00Z',
                kommentar: 'Checked',
              },
            ],
          },
          {
            id: 'ev-2',
            rule_id: 'r-2',
            dashboard_id: 'd-1',
            dashboard_title: null,
            tile_id: 't-2',
            catalog_id: 'c-2',
            alter_zustand: 'warnung',
            neuer_zustand: 'normal',
            messwert: null,
            einheit: null,
            grenze: null,
            meldung: null,
            created_at: '2026-11-19T11:00:00Z',
            gelesen: false,
            quittiert_von: null,
          },
        ],
        error: null,
      });

      const res = await fetchDashboardAlarmEvents({ dashboardId: 'd-1' });
      expect(res.ok).toBe(true);
      expect(res.data).toHaveLength(2);
      expect(res.data?.[0]?.quittiertVon).toHaveLength(1);
      expect(res.data?.[1]?.quittiertVon).toEqual([]);

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      expect((await fetchDashboardAlarmEvents()).ok).toBe(false);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      expect((await fetchDashboardAlarmEvents()).ok).toBe(false);
    });
  });

  describe('mark read & unread count branches', () => {
    it('markAlarmEventsRead Erfolg und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({ data: 3, error: null });
      expect(await markAlarmEventsRead(['ev-1'])).toBe(3);

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      expect(await markAlarmEventsRead(['ev-1'])).toBe(0);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      expect(await markAlarmEventsRead(['ev-1'])).toBe(0);
    });

    it('markAllAlarmEventsRead Erfolg und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({ data: 5, error: null });
      expect(await markAllAlarmEventsRead({ dashboardId: 'd-1', nurWarnungKritisch: true })).toBe(
        5,
      );

      mockRpc.mockResolvedValueOnce({ data: 3, error: null });
      expect(await markAllAlarmEventsRead('d-1')).toBe(3);

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      expect(await markAllAlarmEventsRead()).toBe(0);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      expect(await markAllAlarmEventsRead()).toBe(0);
    });

    it('acknowledgeAlarmEvent Erfolg und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });
      expect((await acknowledgeAlarmEvent({ eventId: 'ev-1' })).ok).toBe(true);

      mockRpc.mockResolvedValueOnce({ error: { message: 'denied' } });
      expect((await acknowledgeAlarmEvent({ eventId: 'ev-1' })).ok).toBe(false);

      mockRpc.mockRejectedValueOnce(new Error('err'));
      expect((await acknowledgeAlarmEvent({ eventId: 'ev-1' })).ok).toBe(false);
    });

    it('fetchUnreadAlarmCount Erfolg und Fehler', async () => {
      mockRpc.mockResolvedValueOnce({ data: 7, error: null });
      expect(await fetchUnreadAlarmCount()).toBe(7);

      // Fehler dürfen den Zähler nicht auf 0 setzen, sondern werden weitergereicht.
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      await expect(fetchUnreadAlarmCount()).rejects.toThrow('err');

      mockRpc.mockRejectedValueOnce(new Error('netz'));
      await expect(fetchUnreadAlarmCount()).rejects.toThrow('netz');
    });
  });
});
