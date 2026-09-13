/**
 * Live KPI Definitions Catalog (Gate G24 / Auftrag 040)
 *
 * Zentraler, UI-sicherer Katalog der 12 in V2.1 sichtbaren Ebene-C-KPIs.
 * Enthält ausschließlich display-sichere Metadaten (ID, Label, Einheit, Format, Gruppe).
 * Keine Event-IDs, Korrelationen, Quellreferenzen, Rohkontexte, Credentials oder Werte.
 */

export type LiveKpiFormat = 'currency' | 'ratio' | 'count';
export type LiveKpiGroup = 'core' | 'arr_mix' | 'funnel';

export interface LiveKpiDefinition {
  id: string;
  label: string;
  unit: 'EUR' | 'x' | 'count';
  format: LiveKpiFormat;
  group: LiveKpiGroup;
}

export const LIVE_KPI_DEFINITIONS = [
  { id: 'arr', label: 'Live ARR', unit: 'EUR', format: 'currency', group: 'core' },
  { id: 'mrr', label: 'Live MRR', unit: 'EUR', format: 'currency', group: 'core' },
  {
    id: 'pipeline_coverage',
    label: 'Pipeline Coverage',
    unit: 'x',
    format: 'ratio',
    group: 'core',
  },
  { id: 'arr_direct', label: 'ARR Direct', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'arr_partner', label: 'ARR Partner', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'arr_outbound', label: 'ARR Outbound', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'arr_other', label: 'ARR Sonstige', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  {
    id: 'pipeline_leads',
    label: 'Pipeline Leads',
    unit: 'count',
    format: 'count',
    group: 'funnel',
  },
  { id: 'pipeline_mql', label: 'Pipeline MQL', unit: 'count', format: 'count', group: 'funnel' },
  { id: 'pipeline_sql', label: 'Pipeline SQL', unit: 'count', format: 'count', group: 'funnel' },
  {
    id: 'pipeline_offers',
    label: 'Pipeline Angebote',
    unit: 'count',
    format: 'count',
    group: 'funnel',
  },
  { id: 'pipeline_won', label: 'Pipeline Won', unit: 'count', format: 'count', group: 'funnel' },
] as const satisfies readonly LiveKpiDefinition[];

export type LiveKpiId = (typeof LIVE_KPI_DEFINITIONS)[number]['id'];

export const LIVE_KPI_IDS: ReadonlySet<string> = new Set<string>(
  LIVE_KPI_DEFINITIONS.map(({ id }) => id),
);

export function isSupportedLiveKpiId(id: string): id is LiveKpiId {
  return LIVE_KPI_IDS.has(id);
}

export function getLiveKpiDefinition(id: string): LiveKpiDefinition | undefined {
  return LIVE_KPI_DEFINITIONS.find((definition) => definition.id === id);
}
