// Executive Dashboard V2 (Auftrag 170 / P14b): Vorschau-Szenario für Vergleich, Verknüpfung,
// Heatmap und Erwartungsband (?bereich=editor_v2&vergleich=1). Alle Werte sind Testdaten.
import type { DashboardConfigV2, DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import type { AccessibleDashboardListItemV2 } from '../services/dashboardStorageV2Types';
import {
  PREVIEW_TRANSFORMATIONS_DASHBOARD_ID,
  createPreviewTransformationsConfig,
  createPreviewTransformationsListItem,
} from './previewTransformations';

export const PREVIEW_COMPARE_DASHBOARD_ID = 'preview_compare_dashboard';
const TITLE = 'Vergleich & Verknüpfung (Vorschau)';

function tile(
  id: string,
  catalogId: string,
  title: string,
  presentation: string,
  position: { x: number; y: number },
  query: Partial<NonNullable<DashboardTileConfigV2['query']>> = {},
): DashboardTileConfigV2 {
  const index = Number(id.slice(-1));
  return {
    id,
    catalogId,
    title,
    presentation,
    layouts: {
      desktop: { x: position.x, y: position.y, w: 6, h: 5 },
      mobile: { x: 0, y: index * 5, w: 1, h: 5 },
    },
    query: { metricId: catalogId, ...query },
  };
}

export function createPreviewCompareConfig(): DashboardConfigV2 {
  const now = '2026-11-20T10:00:00.000Z';
  return {
    version: 2,
    id: PREVIEW_COMPARE_DASHBOARD_ID,
    title: TITLE,
    scope: 'personal',
    ownerUserId: 'demo-user-preview',
    organizationId: 'demo-org-preview',
    globalTimeframe: 'aktuell',
    metadata: { user_edited: false },
    createdAt: now,
    updatedAt: now,
    tiles: [
      tile(
        'preview_compare_1',
        'live.arr.verlauf',
        'ARR mit Vorperiode',
        'linie',
        { x: 0, y: 0 },
        {
          compare: 'vorperiode',
        },
      ),
      tile(
        'preview_compare_2',
        'crm.gewonnen_verlauf',
        'Gewonnene Deals mit Vorjahr',
        'linie',
        { x: 6, y: 0 },
        {
          compare: 'vorjahr',
        },
      ),
      tile(
        'preview_compare_3',
        'live.arr.verlauf',
        'ARR und Pipeline-Abdeckung',
        'linie',
        { x: 0, y: 5 },
        {
          join: { metricId: 'live.pipeline_coverage.verlauf', typ: 'links' },
        },
      ),
      tile(
        'preview_compare_4',
        'live.mrr.verlauf',
        'MRR mit Erwartungsband',
        'linie',
        { x: 6, y: 5 },
        {
          bands: { type: 'percentile_10_90', periodCount: 8 },
        },
      ),
      tile(
        'preview_compare_5',
        'crm.phaseneintritte_verlauf',
        'Phaseneintritte je Woche',
        'heatmap',
        { x: 0, y: 10 },
      ),
      tile('preview_compare_6', 'live.pipeline_leads.verlauf', 'Leads je Wochentag', 'heatmap', {
        x: 6,
        y: 10,
      }),
      tile(
        'preview_compare_7',
        'crm.phaseneintritte_verlauf',
        'Phaseneintritte mit Band',
        'linie',
        { x: 0, y: 15 },
        {
          bands: { type: 'percentile_10_90', periodCount: 8 },
        },
      ),
    ],
  };
}

export function createPreviewCompareListItem(): AccessibleDashboardListItemV2 {
  return {
    id: PREVIEW_COMPARE_DASHBOARD_ID,
    title: TITLE,
    scope: 'personal',
    revision: 1,
    tileCount: 7,
    sectionCount: 0,
    updatedAt: '2026-11-20T10:00:00.000Z',
    teamId: null,
    teamName: null,
    canWrite: true,
  };
}

/** Start-Dashboard der Szenarien `vergleich=1` (Auftrag 170) und `transformationen=1` (Auftrag 169). */
export function previewScenarioDashboard(params: {
  vergleich?: boolean;
  transformationen?: boolean;
}): { id: string; listItem: AccessibleDashboardListItemV2; config: DashboardConfigV2 } | null {
  if (params.vergleich) {
    return {
      id: PREVIEW_COMPARE_DASHBOARD_ID,
      listItem: createPreviewCompareListItem(),
      config: createPreviewCompareConfig(),
    };
  }
  if (params.transformationen) {
    return {
      id: PREVIEW_TRANSFORMATIONS_DASHBOARD_ID,
      listItem: createPreviewTransformationsListItem(),
      config: createPreviewTransformationsConfig(),
    };
  }
  return null;
}
