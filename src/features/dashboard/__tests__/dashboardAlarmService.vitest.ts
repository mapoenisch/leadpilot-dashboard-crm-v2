import { describe, it, expect, beforeEach } from 'vitest';
import {
  inMemoryAlarmStore,
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
  fetchAlarmWorkerStatus,
  fetchOrganizationAlarmRules,
  fetchDashboardRetentionInfo,
} from '../services/dashboardAlarmService';
import {
  setupPreviewAlarmsScenario,
  createPreviewAlarmsConfig,
  PREVIEW_ALARMS_DASHBOARD_ID,
} from '../preview/previewAlarms';

describe('dashboardAlarmService & inMemoryAlarmStore Unit Tests', () => {
  beforeEach(() => {
    inMemoryAlarmStore.rules.clear();
    inMemoryAlarmStore.events = [];
    inMemoryAlarmStore.workerStatus = null;
  });

  describe('setupPreviewAlarmsScenario & createPreviewAlarmsConfig', () => {
    it('initialisiert das Vorschau-Szenario vollständig', () => {
      setupPreviewAlarmsScenario();
      expect(inMemoryAlarmStore.rules.size).toBe(3);
      expect(inMemoryAlarmStore.events.length).toBe(2);
      expect(inMemoryAlarmStore.workerStatus?.status).toBe('ueberfaellig');

      const config = createPreviewAlarmsConfig();
      expect(config.tiles.length).toBe(3);
      expect(config.tiles.some((t) => t.id === 'tile-alarm-active')).toBe(true);
      expect(config.tiles.some((t) => t.id === 'tile-alarm-paused')).toBe(true);
      expect(config.tiles.some((t) => t.id === 'tile-alarm-orphaned')).toBe(true);
    });
  });

  describe('inMemoryAlarmStore CRUD & Edge Cases', () => {
    it('erstellt Regeln mit Standardwerten und liest sie gefiltert aus', () => {
      const ruleId = inMemoryAlarmStore.createRule({
        dashboardId: 'dash-1',
        tileId: 'tile-1',
        catalogId: 'cat-1',
        ruleConfig: { enabled: true, warnung: 5 },
      });

      expect(ruleId).toBeDefined();
      const rulesDash1 = inMemoryAlarmStore.getRulesForDashboard('dash-1');
      expect(rulesDash1).toHaveLength(1);
      expect(rulesDash1[0]?.mindestdauerLaeufe).toBe(2);
      expect(rulesDash1[0]?.abklingzeitSekunden).toBe(3600);
      expect(rulesDash1[0]?.status).toBe('aktiv');

      const rulesOther = inMemoryAlarmStore.getRulesForDashboard('dash-other');
      expect(rulesOther).toHaveLength(0);
    });

    it('erstellt Regeln mit expliziten Parametern und aktualisiert sie', () => {
      const ruleId = inMemoryAlarmStore.createRule({
        dashboardId: 'dash-2',
        tileId: 'tile-2',
        catalogId: 'cat-2',
        pipeline: 'pipe-a',
        ruleConfig: { enabled: true },
        mindestdauerLaeufe: 5,
        abklingzeitSekunden: 7200,
      });

      inMemoryAlarmStore.updateRule({
        ruleId,
        ruleConfig: { enabled: true, warnung: 10 },
        mindestdauerLaeufe: 3,
        abklingzeitSekunden: 1800,
      });

      const updated = inMemoryAlarmStore.rules.get(ruleId);
      expect(updated?.mindestdauerLaeufe).toBe(3);
      expect(updated?.abklingzeitSekunden).toBe(1800);
      expect(updated?.ruleConfig).toEqual({ enabled: true, warnung: 10 });

      // Non-existent rule update does not throw
      inMemoryAlarmStore.updateRule({
        ruleId: 'unknown-rule',
        ruleConfig: {},
      });
    });

    it('pausiert, reaktiviert und löscht Regeln sicher', () => {
      const ruleId = inMemoryAlarmStore.createRule({
        dashboardId: 'dash-3',
        tileId: 'tile-3',
        catalogId: 'cat-3',
        ruleConfig: {},
      });

      inMemoryAlarmStore.pauseRule(ruleId);
      expect(inMemoryAlarmStore.rules.get(ruleId)?.status).toBe('pausiert');

      inMemoryAlarmStore.resumeRule(ruleId);
      expect(inMemoryAlarmStore.rules.get(ruleId)?.status).toBe('aktiv');

      inMemoryAlarmStore.deleteRule(ruleId);
      expect(inMemoryAlarmStore.rules.has(ruleId)).toBe(false);

      // Edge cases: non-existent id
      inMemoryAlarmStore.pauseRule('unknown');
      inMemoryAlarmStore.resumeRule('unknown');
    });

    it('verwaltet Alarmereignisse mit Filtern, Paging und Lesemarkierung', () => {
      inMemoryAlarmStore.events = [
        {
          id: 'ev-1',
          ruleId: 'r-1',
          dashboardId: 'd-1',
          dashboardTitle: 'T1',
          tileId: 'tile-1',
          catalogId: 'c-1',
          alterZustand: 'normal',
          neuerZustand: 'warnung',
          messwert: 12,
          einheit: 'Stück',
          grenze: 10,
          meldung: 'Warnung',
          createdAt: new Date().toISOString(),
          gelesen: false,
          quittiertVon: [],
        },
        {
          id: 'ev-2',
          ruleId: 'r-2',
          dashboardId: 'd-1',
          dashboardTitle: 'T1',
          tileId: 'tile-2',
          catalogId: 'c-2',
          alterZustand: 'warnung',
          neuerZustand: 'normal',
          messwert: 5,
          einheit: 'Stück',
          grenze: 10,
          meldung: 'Entwarnung',
          createdAt: new Date().toISOString(),
          gelesen: false,
          quittiertVon: [],
        },
        {
          id: 'ev-3',
          ruleId: 'r-3',
          dashboardId: 'd-2',
          dashboardTitle: 'T2',
          tileId: 'tile-3',
          catalogId: 'c-3',
          alterZustand: 'normal',
          neuerZustand: 'kritisch',
          messwert: 99,
          einheit: 'Stück',
          grenze: 50,
          meldung: 'Kritisch',
          createdAt: new Date().toISOString(),
          gelesen: true,
          quittiertVon: [],
        },
      ];

      // Filter by dashboard
      const dash1Events = inMemoryAlarmStore.getEvents({ dashboardId: 'd-1' });
      expect(dash1Events).toHaveLength(2);

      // Filter by nurUngelesen
      const unreadEvents = inMemoryAlarmStore.getEvents({ nurUngelesen: true });
      expect(unreadEvents).toHaveLength(2);

      // Filter by nurWarnungKritisch
      const warnKritEvents = inMemoryAlarmStore.getEvents({ nurWarnungKritisch: true });
      expect(warnKritEvents).toHaveLength(2);

      // Pagination
      const page1 = inMemoryAlarmStore.getEvents({ limit: 1, offset: 0 });
      expect(page1).toHaveLength(1);
      expect(page1[0]?.id).toBe('ev-1');

      // markRead
      const readCount = inMemoryAlarmStore.markRead(['ev-1', 'ev-nonexistent']);
      expect(readCount).toBe(1);
      expect(inMemoryAlarmStore.events.find((e) => e.id === 'ev-1')?.gelesen).toBe(true);

      // markAllRead with nurWarnungKritisch filters out 'normal' (ev-2 is normal)
      const filteredReadCount = inMemoryAlarmStore.markAllRead({ dashboardId: 'd-1', nurWarnungKritisch: true });
      expect(filteredReadCount).toBe(0);
      expect(inMemoryAlarmStore.events.find((e) => e.id === 'ev-2')?.gelesen).toBe(false);

      // markAllRead without filter marks ev-2
      const allReadCount = inMemoryAlarmStore.markAllRead('d-1');
      expect(allReadCount).toBe(1); // ev-2
      expect(inMemoryAlarmStore.events.find((e) => e.id === 'ev-2')?.gelesen).toBe(true);
    });

    it('quittiert Ereignisse und übernimmt verwaiste Regeln', () => {
      inMemoryAlarmStore.events = [
        {
          id: 'ev-ack',
          ruleId: 'r-ack',
          dashboardId: 'd-ack',
          dashboardTitle: 'T',
          tileId: 'tile-ack',
          catalogId: 'c-ack',
          alterZustand: 'normal',
          neuerZustand: 'warnung',
          messwert: 15,
          einheit: null,
          grenze: null,
          meldung: 'Warnung',
          createdAt: new Date().toISOString(),
          gelesen: false,
          quittiertVon: [],
        },
      ];

      inMemoryAlarmStore.acknowledge({
        eventId: 'ev-ack',
        comment: 'In Bearbeitung',
      });

      const ev = inMemoryAlarmStore.events[0];
      expect(ev?.gelesen).toBe(true);
      expect(ev?.quittiertVon).toHaveLength(1);
      expect(ev?.quittiertVon?.[0]?.kommentar).toBe('In Bearbeitung');

      // Non-existent acknowledge
      inMemoryAlarmStore.acknowledge({ eventId: 'unknown' });

      // Takeover rule
      const ruleId = inMemoryAlarmStore.createRule({
        dashboardId: 'd-ack',
        tileId: 'tile-orphan',
        catalogId: 'cat-orphan',
        ruleConfig: {},
      });
      const rule = inMemoryAlarmStore.rules.get(ruleId)!;
      rule.status = 'verantwortlicher_ohne_rechte';
      rule.responsibleUserId = 'former-user';

      inMemoryAlarmStore.takeoverRule(ruleId);
      expect(rule.status).toBe('aktiv');
      expect(rule.responsibleUserId).toBe('current-admin-user');

      // Non-existent takeover
      inMemoryAlarmStore.takeoverRule('unknown');

      // getOrgRules mapping
      const orgRules = inMemoryAlarmStore.getOrgRules();
      expect(orgRules).toHaveLength(1);
      expect(orgRules[0]?.id).toBe(ruleId);
      expect(orgRules[0]?.status).toBe('aktiv');
    });
  });

  describe('dashboardAlarmService API', () => {
    it('behandelt fetchDashboardAlarmRules Validierung und Fallback', async () => {
      const invalid = await fetchDashboardAlarmRules('');
      expect(invalid.ok).toBe(false);
      expect(invalid.error).toBe('Keine Dashboard-ID angegeben');

      const res = await fetchDashboardAlarmRules('some-dash');
      expect(res.ok).toBe(true);
      expect(res.data).toEqual([]);
    });

    it('führt CRUD-Operationen über Service-Funktionen aus', async () => {
      const created = await createDashboardAlarmRule({
        dashboardId: 'd-api',
        tileId: 'tile-api',
        catalogId: 'cat-api',
        ruleConfig: { enabled: true },
      });
      expect(created.ok).toBe(true);
      expect(created.ruleId).toBeDefined();

      const ruleId = created.ruleId!;

      const updated = await updateDashboardAlarmRule({
        ruleId,
        ruleConfig: { enabled: false },
      });
      expect(updated.ok).toBe(true);

      const paused = await pauseDashboardAlarmRule(ruleId);
      expect(paused.ok).toBe(true);

      const resumed = await resumeDashboardAlarmRule(ruleId);
      expect(resumed.ok).toBe(true);

      const takeover = await takeoverAlarmRule(ruleId);
      expect(takeover.ok).toBe(true);

      const deleted = await deleteDashboardAlarmRule(ruleId);
      expect(deleted.ok).toBe(true);
    });

    it('ruft Ereignisse und ungelesene Zähler ab', async () => {
      setupPreviewAlarmsScenario();

      const eventsRes = await fetchDashboardAlarmEvents({
        dashboardId: PREVIEW_ALARMS_DASHBOARD_ID,
      });
      expect(eventsRes.ok).toBe(true);
      expect(eventsRes.data?.length).toBeGreaterThan(0);

      const count = await fetchUnreadAlarmCount();
      expect(count).toBeGreaterThan(0);

      const markReadRes = await markAlarmEventsRead(['preview-event-1']);
      expect(markReadRes).toBe(1);

      const markAllRes = await markAllAlarmEventsRead(PREVIEW_ALARMS_DASHBOARD_ID);
      expect(typeof markAllRes).toBe('number');
    });

    it('validiert Quittierungs-Kommentarlänge in acknowledgeAlarmEvent', async () => {
      const tooLong = await acknowledgeAlarmEvent({
        eventId: 'preview-event-1',
        comment: 'x'.repeat(281),
      });
      expect(tooLong.ok).toBe(false);
      expect(tooLong.error).toContain('280 Zeichen');

      const okRes = await acknowledgeAlarmEvent({
        eventId: 'preview-event-1',
        comment: 'Gesehen',
      });
      expect(okRes.ok).toBe(true);
    });

    it('liefert Admin- und Worker-Statusfunktionen', async () => {
      setupPreviewAlarmsScenario();

      const workerStatus = await fetchAlarmWorkerStatus();
      expect(workerStatus.status).toBe('ueberfaellig');

      const orgRules = await fetchOrganizationAlarmRules();
      expect(orgRules.ok).toBe(true);
      expect(orgRules.data?.length).toBe(3);

      const retention = await fetchDashboardRetentionInfo('preview-dashboard');
      expect(retention.entfernt).toBe(false);
      expect(retention.letzteBereinigung).toBeNull();
    });
  });
});
