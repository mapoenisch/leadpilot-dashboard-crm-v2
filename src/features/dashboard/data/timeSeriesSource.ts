// Auftrag 160/170: Quelle und RPC-Metrik einer Katalog-Zeitreihe.
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';

export function timeSeriesSourceOf(entry: ActiveCatalogEntry): 'live_kpi' | 'deal_stage_events' {
  return entry.history.source === 'live_kpi_events' ? 'live_kpi' : 'deal_stage_events';
}

export function timeSeriesMetricOf(entry: ActiveCatalogEntry): string {
  if (entry.source.layer === 'crm') {
    return entry.id === 'crm.gewonnen_verlauf' ? 'Deal gewonnen' : '*';
  }
  return entry.source.liveKpiId ?? '';
}
