// Executive Dashboard, Teilauftrag 3 (Auftrag 072): Standardansicht und Auslegung einer
// gespeicherten Konfiguration. Ohne gespeicherte Zeile gilt der Standard; beim bloßen Öffnen
// wird nichts angelegt (Plan §6). Kacheln mit unbekannter oder inaktiver KPI bleiben erhalten.
import {
  DASHBOARD_CONFIG_VERSION,
  type DashboardConfig,
  type DashboardTileConfig,
} from './dashboardConfig';
import { validateDashboardConfig, type ValidationIssue } from './dashboardValidation';

/** Kachel-IDs erlauben nur Buchstaben, Ziffern, `_` und `-` (dashboardValidation). */
const stdId = (catalogId: string): string => `std_${catalogId.replace(/\./g, '_')}`;

const fixedNumber = (catalogId: string): DashboardTileConfig => ({
  tileId: stdId(catalogId),
  catalogId,
  view: 'zahl',
  size: 'klein',
  filterMode: 'fester_stand',
});

const currentNumber = (catalogId: string): DashboardTileConfig => ({
  tileId: stdId(catalogId),
  catalogId,
  view: 'zahl',
  size: 'klein',
  filterMode: 'dashboard',
});

/**
 * Standardansicht aus den bisherigen Executive-Inhalten: Kennzahlen des Faktenblatts,
 * ARR-Verlauf, MRR-Paketmix, CRM-Pipeline und die Übersichten Team/HR und Roadmap.
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  version: DASHBOARD_CONFIG_VERSION,
  tiles: [
    ...[
      'baseline.arr',
      'baseline.umsatz',
      'baseline.ebitda',
      'baseline.kunden_aktiv',
      'baseline.arpa',
      'baseline.marketing_cac',
      'baseline.fully_loaded_cac',
      'baseline.headcount',
    ].map(fixedNumber),
    {
      tileId: 'std_baseline_arr_verlauf',
      catalogId: 'baseline.arr_verlauf',
      view: 'linie',
      size: 'mittel',
      filterMode: 'fester_stand',
    },
    {
      tileId: 'std_baseline_mrr_paketmix',
      catalogId: 'baseline.mrr_paketmix',
      view: 'ring',
      size: 'mittel',
      filterMode: 'fester_stand',
    },
    ...[
      'crm.pipeline_deals',
      'crm.pipeline_volumen',
      'crm.pipeline_gewonnen',
      'crm.pipeline_offen',
    ].map(currentNumber),
    {
      tileId: 'std_crm_pipeline_stufen_volumen',
      catalogId: 'crm.pipeline_stufen_volumen',
      view: 'balken',
      size: 'mittel',
      filterMode: 'dashboard',
    },
    {
      tileId: 'std_uebersicht_team_hr',
      catalogId: 'uebersicht.team_hr',
      view: 'uebersicht',
      size: 'mittel',
      filterMode: 'fester_stand',
    },
    {
      tileId: 'std_uebersicht_roadmap',
      catalogId: 'uebersicht.roadmap',
      view: 'uebersicht',
      size: 'mittel',
      filterMode: 'fester_stand',
    },
  ],
};

/** Gespeicherte Zeile, wie sie das Repository liefert. */
export interface StoredPreferencesRow {
  config: unknown;
  schemaVersion: number;
  revision: number;
  updatedAt: string;
}

/** Auslegung der gespeicherten Konfiguration. `revision` ist die erwartete Revision fürs Speichern. */
export type PreferencesState =
  | { kind: 'standard'; config: DashboardConfig; revision: 0; canSave: true }
  | {
      kind: 'gespeichert';
      config: DashboardConfig;
      revision: number;
      /** Kacheln mit unbekannter oder inaktiver KPI; sie bleiben in `config` erhalten. */
      unavailable: ValidationIssue[];
      canSave: true;
    }
  | {
      /** Neuere Formatversion: nicht überschreiben, sichere Standardansicht zeigen (Plan §6). */
      kind: 'zukuenftige_version';
      schemaVersion: number;
      config: DashboardConfig;
      revision: number;
      canSave: false;
    }
  | {
      /** Gespeicherte Form ist ungültig: Standard anzeigen und darauf hinweisen, nicht still ersetzen. */
      kind: 'ungueltig';
      issues: ValidationIssue[];
      config: DashboardConfig;
      revision: number;
      canSave: true;
    };

export function interpretStoredConfig(row: StoredPreferencesRow | null): PreferencesState {
  if (!row)
    return { kind: 'standard', config: DEFAULT_DASHBOARD_CONFIG, revision: 0, canSave: true };
  if (row.schemaVersion > DASHBOARD_CONFIG_VERSION) {
    return {
      kind: 'zukuenftige_version',
      schemaVersion: row.schemaVersion,
      config: DEFAULT_DASHBOARD_CONFIG,
      revision: row.revision,
      canSave: false,
    };
  }
  const result = validateDashboardConfig(row.config);
  if (!result.ok) {
    return {
      kind: 'ungueltig',
      issues: result.issues,
      config: DEFAULT_DASHBOARD_CONFIG,
      revision: row.revision,
      canSave: true,
    };
  }
  return {
    kind: 'gespeichert',
    config: result.config,
    revision: row.revision,
    unavailable: result.unavailable,
    canSave: true,
  };
}
