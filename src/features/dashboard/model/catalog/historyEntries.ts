// Auftrag 160 (P10b-1): Zwei neue CRM-Flusskennzahlen mit belegter Phasen-Historie.
// Gelesen aus deal_stage_events über den RPC public.dashboard_time_series.
import type { ActiveCatalogEntry } from '../dashboardCatalog';

export const CRM_TIME_SERIES_ACCESS =
  'Tabelle deal_stage_events, RLS deal_stage_events_select_own_org: nur aktive Mitglieder der aktuellen Organisation.';

export const HISTORY_ENTRIES: readonly ActiveCatalogEntry[] = [
  {
    id: 'crm.phaseneintritte_verlauf',
    name: 'Phaseneintritte je Woche',
    category: 'vertrieb_crm',
    kind: 'kpi',
    status: 'aktiv',
    definition: 'Zählung aller Phaseneintritte je Kalenderwoche aus deal_stage_events.',
    unit: 'Eintritte',
    shape: 'zeitreihe',
    aggregation: 'fluss',
    timeMode: 'aktuell',
    timeBasis: 'Letzte 12 Wochen (wöchentlich)',
    views: ['linie', 'saeulen', 'tabelle', 'heatmap'],
    defaultView: 'linie',
    minSize: 'mittel',
    groupings: [],
    filters: ['pipeline'],
    history: {
      kind: 'ereignisse',
      source: 'deal_stage_events',
      reconstructable: 'nur_fluesse',
      note: 'Phaseneintritte aus deal_stage_events ab Aufzeichnungsbeginn (reine Flussgröße, keine Beträge).',
      defaultWindow: { resolution: 'woche', count: 12 },
    },
    source: {
      layer: 'crm',
      module: 'src/features/dashboard/data/resolveTimeSeries.ts',
      exportName: 'fetchTimeSeries',
    },
    detailRouteId: 's-deals',
    access: CRM_TIME_SERIES_ACCESS,
  },
  {
    id: 'crm.gewonnen_verlauf',
    name: 'Gewonnene Deals je Woche (Anzahl)',
    category: 'vertrieb_crm',
    kind: 'kpi',
    status: 'aktiv',
    definition: 'Anzahl der in die Phase Deal gewonnen gewechselten Deals je Kalenderwoche.',
    unit: 'Deals',
    shape: 'zeitreihe',
    aggregation: 'fluss',
    timeMode: 'aktuell',
    timeBasis: 'Letzte 12 Wochen (wöchentlich)',
    views: ['linie', 'saeulen', 'tabelle', 'heatmap'],
    defaultView: 'linie',
    minSize: 'mittel',
    groupings: [],
    filters: ['pipeline'],
    history: {
      kind: 'ereignisse',
      source: 'deal_stage_events',
      reconstructable: 'nur_fluesse',
      note: 'Gewonnene Deals aus deal_stage_events ab Aufzeichnungsbeginn (reine Zählung, keine Beträge).',
      defaultWindow: { resolution: 'woche', count: 12 },
    },
    source: {
      layer: 'crm',
      module: 'src/features/dashboard/data/resolveTimeSeries.ts',
      exportName: 'fetchTimeSeries',
    },
    detailRouteId: 's-deals',
    access: CRM_TIME_SERIES_ACCESS,
  },
];
