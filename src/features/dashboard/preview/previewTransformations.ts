// Executive Dashboard V2 (Auftrag 169 / P14a):
// Vorschau-Szenario für Transformationen je Kachel (?bereich=editor_v2&transformationen=1).
// Zeigt:
// 1. Kachel mit umbenennen
// 2. Kachel mit einheit_umrechnen (EUR -> Tsd. EUR)
// 3. Kachel mit gleitender_durchschnitt
// 4. Kachel mit pausiertem Alarm nach Transformation.

import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type { AccessibleDashboardListItemV2 } from '../services/dashboardStorageV2Types';

export const PREVIEW_TRANSFORMATIONS_DASHBOARD_ID = 'preview_transformations_dashboard';

export function createPreviewTransformationsConfig(): DashboardConfigV2 {
  const now = '2026-11-19T20:00:00.000Z';
  return {
    version: 2,
    id: PREVIEW_TRANSFORMATIONS_DASHBOARD_ID,
    title: 'Kachel-Transformationen (Vorschau)',
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
      // 1. Kachel mit umbenennen
      {
        id: 'preview_trans_tile_rename',
        catalogId: 'baseline.arr',
        title: 'ARR',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 0, y: 0, w: 4, h: 4 },
          mobile: { x: 0, y: 0, w: 1, h: 2 },
        },
        query: {
          transformations: [
            {
              art: 'umbenennen',
              name: 'Jahresumsatz (ARR)',
            },
          ],
        },
      },
      // 2. Kachel mit einheit_umrechnen (EUR -> Tsd. EUR)
      {
        id: 'preview_trans_tile_unit',
        catalogId: 'baseline.umsatz',
        title: 'Umsatzerlöse',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 4, y: 0, w: 4, h: 4 },
          mobile: { x: 0, y: 2, w: 1, h: 2 },
        },
        query: {
          transformations: [
            {
              art: 'einheit_umrechnen',
              von: 'EUR',
              zu: 'Tsd. EUR',
            },
          ],
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'niedrig_ist_schlecht',
          warnung: 1000,
          kritisch: 500,
          einheit: 'Tsd. EUR',
        },
      },
      // 3. Kachel mit gleitender_durchschnitt
      {
        id: 'preview_trans_tile_ma',
        catalogId: 'crm.phaseneintritte_verlauf',
        title: 'Phaseneintritte (Gleitender Durchschnitt)',
        presentation: 'linie',
        layouts: {
          desktop: { x: 8, y: 0, w: 4, h: 4 },
          mobile: { x: 0, y: 4, w: 1, h: 2 },
        },
        query: {
          transformations: [
            {
              art: 'gleitender_durchschnitt',
              fenster: 7,
            },
          ],
        },
      },
      // 4. Kachel mit pausiertem Alarm nach nicht-alarmfähiger Transformation
      {
        id: 'preview_trans_tile_paused_alarm',
        catalogId: 'crm.gewonnen_verlauf',
        title: 'Gewonnene Deals (Pausierter Alarm)',
        presentation: 'linie',
        layouts: {
          desktop: { x: 0, y: 4, w: 6, h: 4 },
          mobile: { x: 0, y: 6, w: 1, h: 2 },
        },
        threshold: {
          formatVersion: 2,
          enabled: true,
          art: 'hoch_ist_schlecht',
          warnung: 10,
          kritisch: 5,
          einheit: 'Deals',
        },
        alarm: {
          status: 'pausiert',
          reason: 'kennzahl_nicht_alarmfaehig',
        },
        query: {
          transformations: [
            {
              art: 'gleitender_durchschnitt',
              fenster: 5,
            },
          ],
        },
      },
    ],
  };
}

export function createPreviewTransformationsListItem(
  canWrite = true,
): AccessibleDashboardListItemV2 {
  return {
    id: PREVIEW_TRANSFORMATIONS_DASHBOARD_ID,
    title: 'Kachel-Transformationen (Vorschau)',
    scope: 'personal',
    revision: 1,
    tileCount: 4,
    sectionCount: 0,
    updatedAt: '2026-11-19T20:00:00.000Z',
    teamId: null,
    teamName: null,
    canWrite,
  };
}
