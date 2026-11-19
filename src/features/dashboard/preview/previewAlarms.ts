// Executive Dashboard V2 (Auftrag 168 / P13c §2.3 Nr. 20):
// Vorbereitete Testdaten für das Vorschau-Szenario ?bereich=editor_v2&alarme=1.

import { inMemoryAlarmStore, type DashboardAlarmRule } from '../services/dashboardAlarmService';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

export const PREVIEW_ALARMS_DASHBOARD_ID = 'preview_alarms_dashboard';

export function setupPreviewAlarmsScenario(): void {
  // 1. Alarmregeln aufbauen
  inMemoryAlarmStore.rules.clear();

  const ruleActive: DashboardAlarmRule = {
    id: 'preview-rule-active',
    tileId: 'tile-alarm-active',
    catalogId: 'crm.pipeline_deals',
    ruleConfig: {
      formatVersion: 2,
      enabled: true,
      art: 'hoch_ist_schlecht',
      warnung: 10,
      kritisch: 20,
      einheit: 'Stück',
    },
    mindestdauerLaeufe: 2,
    abklingzeitSekunden: 3600,
    status: 'aktiv',
    responsibleUserId: 'demo-user-1',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    beobachteteStufe: 'warnung',
    bestaetigteStufe: 'warnung',
    letzterMesswert: 14,
    letzteAuswertung: new Date().toISOString(),
    dashboardId: PREVIEW_ALARMS_DASHBOARD_ID,
  };
  inMemoryAlarmStore.rules.set(ruleActive.id, ruleActive);

  const rulePaused: DashboardAlarmRule = {
    id: 'preview-rule-paused',
    tileId: 'tile-alarm-paused',
    catalogId: 'baseline.arr',
    ruleConfig: {
      formatVersion: 2,
      enabled: true,
      art: 'niedrig_ist_schlecht',
      warnung: 50000,
      kritisch: 20000,
      einheit: 'EUR',
    },
    mindestdauerLaeufe: 2,
    abklingzeitSekunden: 3600,
    status: 'pausiert',
    responsibleUserId: 'demo-user-1',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    beobachteteStufe: 'normal',
    bestaetigteStufe: 'normal',
    letzterMesswert: 65000,
    letzteAuswertung: new Date().toISOString(),
    dashboardId: PREVIEW_ALARMS_DASHBOARD_ID,
  };
  inMemoryAlarmStore.rules.set(rulePaused.id, rulePaused);

  const ruleOrphaned: DashboardAlarmRule = {
    id: 'preview-rule-orphaned',
    tileId: 'tile-alarm-orphaned',
    catalogId: 'live.requests',
    ruleConfig: {
      formatVersion: 2,
      enabled: true,
      art: 'hoch_ist_schlecht',
      warnung: 1000,
      kritisch: 2000,
      einheit: 'Anfragen/s',
    },
    mindestdauerLaeufe: 1,
    abklingzeitSekunden: 1800,
    status: 'verantwortlicher_ohne_rechte',
    responsibleUserId: 'former-colleague',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    beobachteteStufe: 'kritisch',
    bestaetigteStufe: 'kritisch',
    letzterMesswert: 2200,
    letzteAuswertung: new Date(Date.now() - 300000).toISOString(),
    dashboardId: PREVIEW_ALARMS_DASHBOARD_ID,
    responsibleEmail: 'ausgeschiedener.kollege@firma.de',
    dashboardTitle: 'Schwellenwerte & Alarme (Vorschau)',
  };
  inMemoryAlarmStore.rules.set(ruleOrphaned.id, ruleOrphaned);

  // 2. Alarmereignisse aufbauen
  inMemoryAlarmStore.events = [
    {
      id: 'preview-event-1',
      ruleId: 'preview-rule-active',
      dashboardId: PREVIEW_ALARMS_DASHBOARD_ID,
      dashboardTitle: 'Schwellenwerte & Alarme (Vorschau)',
      tileId: 'tile-alarm-active',
      catalogId: 'crm.pipeline_deals',
      alterZustand: 'normal',
      neuerZustand: 'warnung',
      messwert: 14,
      einheit: 'Stück',
      grenze: 10,
      meldung: 'Warnschwelle überschritten (14 Stück >= 10)',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      gelesen: false,
      quittiertVon: [],
    },
    {
      id: 'preview-event-2',
      ruleId: 'preview-rule-orphaned',
      dashboardId: PREVIEW_ALARMS_DASHBOARD_ID,
      dashboardTitle: 'Schwellenwerte & Alarme (Vorschau)',
      tileId: 'tile-alarm-orphaned',
      catalogId: 'live.requests',
      alterZustand: 'warnung',
      neuerZustand: 'kritisch',
      messwert: 2200,
      einheit: 'Anfragen/s',
      grenze: 2000,
      meldung: 'Kritische Schwelle überschritten (2200 Anfragen/s >= 2000)',
      createdAt: new Date(Date.now() - 900000).toISOString(),
      gelesen: true,
      quittiertVon: [
        {
          userId: 'colleague-2',
          email: 'admin.support@firma.de',
          quittiertAt: new Date(Date.now() - 600000).toISOString(),
          kommentar: 'Skalierung der Instanzen angestoßen.',
        },
      ],
    },
  ];

  // 3. Worker-Status für Ausfallbanner setzen
  inMemoryAlarmStore.workerStatus = {
    status: 'ueberfaellig',
    letzterLauf: new Date(Date.now() - 15 * 60000).toISOString(),
    minutenSeitLetztemLauf: 15,
    auswertungAktiv: true,
    ueberfaellig: true,
  };
}

export function createPreviewAlarmsListItem(canWrite = true) {
  return {
    id: PREVIEW_ALARMS_DASHBOARD_ID,
    title: 'Schwellenwerte & Alarme (Vorschau)',
    scope: 'personal' as const,
    revision: 1,
    tileCount: 3,
    sectionCount: 0,
    updatedAt: new Date().toISOString(),
    teamId: null,
    teamName: null,
    canWrite,
  };
}

export function createPreviewAlarmsConfig(): DashboardConfigV2 {
  const now = new Date().toISOString();
  return {
    version: 2,
    id: PREVIEW_ALARMS_DASHBOARD_ID,
    title: 'Schwellenwerte & Alarme (Vorschau)',
    scope: 'personal',
    ownerUserId: 'demo-user-1',
    organizationId: 'demo-org-1',
    globalTimeframe: 'letzte_30_tage',
    createdAt: now,
    updatedAt: now,
    tiles: [
      {
        id: 'tile-alarm-active',
        catalogId: 'crm.pipeline_deals',
        title: 'Deals Pipeline (Alarm aktiv)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 0, y: 0, w: 4, h: 4 },
          mobile: { x: 0, y: 0, w: 1, h: 2 },
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'hoch_ist_schlecht',
          einheit: 'Stück',
          warnung: 10,
          kritisch: 20,
        },
        alarm: { status: 'aktiv' },
      },
      {
        id: 'tile-alarm-paused',
        catalogId: 'baseline.arr',
        title: 'ARR (Alarm pausiert)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 4, y: 0, w: 4, h: 4 },
          mobile: { x: 0, y: 2, w: 1, h: 2 },
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'niedrig_ist_schlecht',
          einheit: 'EUR',
          warnung: 50000,
          kritisch: 20000,
        },
        alarm: { status: 'pausiert', reason: 'Manuell pausiert' },
      },
      {
        id: 'tile-alarm-orphaned',
        catalogId: 'live.requests',
        title: 'Requests / s (Rechte verloren)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 8, y: 0, w: 4, h: 4 },
          mobile: { x: 0, y: 4, w: 1, h: 2 },
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'hoch_ist_schlecht',
          einheit: 'Anfragen/s',
          warnung: 1000,
          kritisch: 2000,
        },
        alarm: { status: 'verantwortlicher_ohne_rechte', reason: 'Rechte verloren' },
      },
    ],
  };
}
