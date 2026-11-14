// Auftrag 158 (P09b): V2-Vorlagen für den Dashboard-Editor.
// V2-Pendant zu dashboardPresets.ts mit Sektionen aus Auftrag 157.

import type {
  DashboardConfigV2,
  DashboardSectionV2,
} from './dashboardConfigV2';
import {
  type V1ToV2MigrationContext,
  migrateV1ToV2,
} from './dashboardMigrationV1V2';
import { DASHBOARD_PRESETS } from './dashboardPresets';
import { DEFAULT_DASHBOARD_CONFIG } from './defaultDashboard';
import { normalizeDashboardLayouts } from '../services/dashboardLayoutIntegrity';

export interface DashboardTemplateContext extends V1ToV2MigrationContext {
  timestamp?: string;
}

export interface DashboardTemplateV2 {
  readonly id: 'executive' | 'sales' | 'finance' | 'blank';
  readonly name: string;
  readonly description: string;
  readonly category: 'management' | 'vertrieb' | 'finanzen' | 'basis';
  readonly tileCount: number;
  readonly sectionCount: number;
  readonly build: (context: DashboardTemplateContext) => DashboardConfigV2;
}

function applyTimestamp(
  config: DashboardConfigV2,
  timestamp?: string,
): DashboardConfigV2 {
  if (!timestamp) return config;
  return {
    ...config,
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: config.metadata
      ? {
          ...config.metadata,
          migrated_at: timestamp,
        }
      : undefined,
  };
}

export const DASHBOARD_TEMPLATES_V2: readonly DashboardTemplateV2[] = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description:
      'Die bewährte C-Level-Übersicht mit ARR, Umsatz, EBITDA, Kunden, ARPA, CAC und Übersichten.',
    category: 'management',
    tileCount: 9,
    sectionCount: 0,
    build: (context) => {
      // Bytegleich zur heutigen Erstmigration aus DEFAULT_DASHBOARD_CONFIG
      const base = migrateV1ToV2(DEFAULT_DASHBOARD_CONFIG, context);
      return applyTimestamp(base, context.timestamp);
    },
  },
  {
    id: 'sales',
    name: 'Vertrieb & Pipeline',
    description:
      'Fokus auf CRM-Pipeline, Deals, gewonnenes Volumen und ARR-Verlauf.',
    category: 'vertrieb',
    tileCount: 9,
    sectionCount: 2,
    build: (context) => {
      const preset = DASHBOARD_PRESETS.find((p) => p.id === 'sales')!;
      const base = migrateV1ToV2(preset.config, context);

      const sections: DashboardSectionV2[] = [
        {
          id: 'sec_sales_pipeline',
          title: 'Pipeline',
          collapsed: false,
          tileIds: [
            'preset_sales_deals',
            'preset_sales_volumen',
            'preset_sales_gewonnen',
            'preset_sales_offen',
            'preset_sales_pipeline_stufen',
          ],
        },
        {
          id: 'sec_sales_umsatz',
          title: 'Umsatz & Verlauf',
          collapsed: false,
          tileIds: [
            'preset_sales_arr',
            'preset_sales_cac',
            'preset_sales_arr_verlauf',
            'preset_sales_mrr_mix',
          ],
        },
      ];

      const withSections: DashboardConfigV2 = {
        ...base,
        sections,
      };

      const normalized = normalizeDashboardLayouts(withSections);
      return applyTimestamp(normalized, context.timestamp);
    },
  },
  {
    id: 'finance',
    name: 'Finanzen & Unit Economics',
    description:
      'Vertiefte Finanzkennzahlen, Erlöse, Margen, Customer Acquisition Cost und ARR-Wachstum.',
    category: 'finanzen',
    tileCount: 10,
    sectionCount: 2,
    build: (context) => {
      const preset = DASHBOARD_PRESETS.find((p) => p.id === 'finance')!;
      const base = migrateV1ToV2(preset.config, context);

      const sections: DashboardSectionV2[] = [
        {
          id: 'sec_fin_kennzahlen',
          title: 'Kennzahlen',
          collapsed: false,
          tileIds: [
            'preset_fin_arr',
            'preset_fin_umsatz',
            'preset_fin_ebitda',
            'preset_fin_kunden',
            'preset_fin_arpa',
            'preset_fin_m_cac',
            'preset_fin_fl_cac',
            'preset_fin_headcount',
          ],
        },
        {
          id: 'sec_fin_verlaeufe',
          title: 'Verläufe',
          collapsed: false,
          tileIds: [
            'preset_fin_arr_verlauf',
            'preset_fin_mrr_mix',
          ],
        },
      ];

      const withSections: DashboardConfigV2 = {
        ...base,
        sections,
      };

      const normalized = normalizeDashboardLayouts(withSections);
      return applyTimestamp(normalized, context.timestamp);
    },
  },
  {
    id: 'blank',
    name: 'Leere Vorlage',
    description:
      'Leere Arbeitsfläche für eine komplett individuelle Zusammenstellung.',
    category: 'basis',
    tileCount: 0,
    sectionCount: 0,
    build: (context) => {
      const preset = DASHBOARD_PRESETS.find((p) => p.id === 'blank')!;
      const base = migrateV1ToV2(preset.config, context);
      return applyTimestamp(base, context.timestamp);
    },
  },
];

export function getDashboardTemplateV2ById(
  id: string,
): DashboardTemplateV2 | undefined {
  return DASHBOARD_TEMPLATES_V2.find((t) => t.id === id);
}
