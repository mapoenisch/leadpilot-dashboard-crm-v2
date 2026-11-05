// Executive Dashboard: Vordefinierte Dashboard-Vorlagen (Presets) für verschiedene Rollen und Schwerpunkte.
import {
  DASHBOARD_CONFIG_VERSION,
  type DashboardConfig,
  type DashboardTileConfig,
} from './dashboardConfig';
import { DEFAULT_DASHBOARD_CONFIG } from './defaultDashboard';

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  category: 'management' | 'vertrieb' | 'finanzen' | 'basis';
  config: DashboardConfig;
}

const fixedNumber = (tileId: string, catalogId: string): DashboardTileConfig => ({
  tileId,
  catalogId,
  view: 'zahl',
  size: 'klein',
  filterMode: 'fester_stand',
});

const crmNumber = (tileId: string, catalogId: string): DashboardTileConfig => ({
  tileId,
  catalogId,
  view: 'zahl',
  size: 'klein',
  filterMode: 'dashboard',
});

export const DASHBOARD_PRESETS: readonly DashboardPreset[] = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description:
      'Die bewährte C-Level-Übersicht mit ARR, Umsatz, EBITDA, Kunden, ARPA, CAC und Übersichten.',
    category: 'management',
    config: DEFAULT_DASHBOARD_CONFIG,
  },
  {
    id: 'sales',
    name: 'Vertrieb & Pipeline',
    description: 'Fokus auf CRM-Pipeline, Deals, gewonnenes Volumen und ARR-Verlauf.',
    category: 'vertrieb',
    config: {
      version: DASHBOARD_CONFIG_VERSION,
      tiles: [
        fixedNumber('preset_sales_arr', 'baseline.arr'),
        crmNumber('preset_sales_deals', 'crm.pipeline_deals'),
        crmNumber('preset_sales_volumen', 'crm.pipeline_volumen'),
        crmNumber('preset_sales_gewonnen', 'crm.pipeline_gewonnen'),
        crmNumber('preset_sales_offen', 'crm.pipeline_offen'),
        fixedNumber('preset_sales_cac', 'baseline.fully_loaded_cac'),
        {
          tileId: 'preset_sales_arr_verlauf',
          catalogId: 'baseline.arr_verlauf',
          view: 'linie',
          size: 'mittel',
          filterMode: 'fester_stand',
        },
        {
          tileId: 'preset_sales_mrr_mix',
          catalogId: 'baseline.mrr_paketmix',
          view: 'ring',
          size: 'mittel',
          filterMode: 'fester_stand',
        },
        {
          tileId: 'preset_sales_pipeline_stufen',
          catalogId: 'crm.pipeline_stufen_volumen',
          view: 'saeulen',
          size: 'gross',
          filterMode: 'dashboard',
        },
      ],
    },
  },
  {
    id: 'finance',
    name: 'Finanzen & Unit Economics',
    description:
      'Vertiefte Finanzkennzahlen, Erlöse, Margen, Customer Acquisition Cost und ARR-Wachstum.',
    category: 'finanzen',
    config: {
      version: DASHBOARD_CONFIG_VERSION,
      tiles: [
        fixedNumber('preset_fin_arr', 'baseline.arr'),
        fixedNumber('preset_fin_umsatz', 'baseline.umsatz'),
        fixedNumber('preset_fin_ebitda', 'baseline.ebitda'),
        fixedNumber('preset_fin_kunden', 'baseline.kunden_aktiv'),
        fixedNumber('preset_fin_arpa', 'baseline.arpa'),
        fixedNumber('preset_fin_m_cac', 'baseline.marketing_cac'),
        fixedNumber('preset_fin_fl_cac', 'baseline.fully_loaded_cac'),
        fixedNumber('preset_fin_headcount', 'baseline.headcount'),
        {
          tileId: 'preset_fin_arr_verlauf',
          catalogId: 'baseline.arr_verlauf',
          view: 'linie',
          size: 'mittel',
          filterMode: 'fester_stand',
        },
        {
          tileId: 'preset_fin_mrr_mix',
          catalogId: 'baseline.mrr_paketmix',
          view: 'ring',
          size: 'mittel',
          filterMode: 'fester_stand',
        },
      ],
    },
  },
  {
    id: 'blank',
    name: 'Leere Vorlage',
    description: 'Leere Arbeitsfläche für eine komplett individuelle Zusammenstellung.',
    category: 'basis',
    config: {
      version: DASHBOARD_CONFIG_VERSION,
      tiles: [],
    },
  },
];

export function getPresetById(id: string): DashboardPreset | undefined {
  return DASHBOARD_PRESETS.find((p) => p.id === id);
}
