import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type { AccessibleDashboardListItemV2 } from '../services/dashboardStorageV2Types';

export const PREVIEW_THRESHOLDS_DASHBOARD_ID = 'preview_thresholds_dashboard';

export function createPreviewThresholdsConfig(): DashboardConfigV2 {
  const now = '2026-11-18T12:00:00.000Z';
  return {
    version: 2,
    id: PREVIEW_THRESHOLDS_DASHBOARD_ID,
    title: 'Schwellenwerte & Alarme (Vorschau)',
    scope: 'personal',
    ownerUserId: 'demo-user-preview',
    organizationId: 'demo-org-preview',
    globalTimeframe: 'letzte_30_tage',
    metadata: {
      user_edited: false,
    },
    createdAt: now,
    updatedAt: now,
    tiles: [
      // 1. Normal (Wert 1234 < 2000)
      {
        id: 'preview_tile_normal',
        catalogId: 'baseline.arr',
        title: 'ARR (Normalbereich)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 0, y: 0, w: 4, h: 4 },
          mobile: { x: 0, y: 0, w: 1, h: 2 },
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'hoch_ist_schlecht',
          einheit: 'EUR',
          warnung: 2000,
          kritisch: 3000,
        },
      },
      // 2. Warnung (Wert 1234 >= 1000 < 2000)
      {
        id: 'preview_tile_warnung',
        catalogId: 'baseline.umsatz',
        title: 'Umsatzerlöse (Warnung)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 4, y: 0, w: 4, h: 4 },
          mobile: { x: 0, y: 2, w: 1, h: 2 },
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'hoch_ist_schlecht',
          einheit: 'EUR',
          warnung: 1000,
          kritisch: 2000,
        },
      },
      // 3. Kritisch (Wert 1234 >= 1000)
      {
        id: 'preview_tile_kritisch',
        catalogId: 'baseline.ebitda',
        title: 'EBITDA (Kritisch)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 8, y: 0, w: 4, h: 4 },
          mobile: { x: 0, y: 4, w: 1, h: 2 },
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'hoch_ist_schlecht',
          einheit: 'EUR',
          warnung: 500,
          kritisch: 1000,
        },
      },
      // 4. Keine Daten (Wert null)
      {
        id: 'preview_tile_keine_daten',
        catalogId: 'live.pipeline_leads',
        title: 'Pipeline Leads (Keine Daten)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 0, y: 4, w: 4, h: 4 },
          mobile: { x: 0, y: 6, w: 1, h: 2 },
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'hoch_ist_schlecht',
          einheit: 'count',
          warnung: 50,
        },
      },
      // 5. Nicht bewertet (Zustand veraltet)
      {
        id: 'preview_tile_nicht_bewertet',
        catalogId: 'live.pipeline_offers',
        title: 'Angebote (Nicht bewertet / veraltet)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 4, y: 4, w: 4, h: 4 },
          mobile: { x: 0, y: 8, w: 1, h: 2 },
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'hoch_ist_schlecht',
          einheit: 'count',
          warnung: 10,
        },
      },
      // 6. Altregel gte (übernommen)
      {
        id: 'preview_tile_alt_gte',
        catalogId: 'baseline.kunden_aktiv',
        title: 'Aktive Kunden (Altregel gte)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 8, y: 4, w: 4, h: 4 },
          mobile: { x: 0, y: 10, w: 1, h: 2 },
        },
        threshold: {
          enabled: true,
          operator: 'gte',
          warningValue: 1000,
          criticalValue: 2000,
        },
      },
      // 7. Altregel between (regel_ungueltig)
      {
        id: 'preview_tile_alt_between',
        catalogId: 'baseline.headcount',
        title: 'Teamgröße (Altregel between)',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 0, y: 8, w: 4, h: 4 },
          mobile: { x: 0, y: 12, w: 1, h: 2 },
        },
        threshold: {
          enabled: true,
          operator: 'between',
          warningValue: 500,
          criticalValue: 1500,
        },
      },
      // 8. Zeitreihe (ausgeschlossen: Tab gesperrt)
      {
        id: 'preview_tile_zeitreihe',
        catalogId: 'baseline.arr_verlauf',
        title: 'ARR-Verlauf (Zeitreihe)',
        presentation: 'linie',
        layouts: {
          desktop: { x: 4, y: 8, w: 4, h: 4 },
          mobile: { x: 0, y: 14, w: 1, h: 2 },
        },
      },
    ],
  };
}

export function createPreviewThresholdsListItem(canWrite = true): AccessibleDashboardListItemV2 {
  return {
    id: PREVIEW_THRESHOLDS_DASHBOARD_ID,
    title: 'Schwellenwerte & Alarme (Vorschau)',
    scope: 'personal',
    revision: 1,
    tileCount: 8,
    sectionCount: 0,
    updatedAt: '2026-11-18T12:00:00.000Z',
    teamId: null,
    teamName: null,
    canWrite,
  };
}
