import type { ActiveCatalogEntry, DashboardView } from './dashboardCatalog';

export type AllowedAggregation = 'letzter_stand' | 'summe' | 'verhaeltnis';

export interface TileQueryCapabilities {
  metricId: string;
  allowedAggregations: readonly AllowedAggregation[];
  defaultAggregation?: AllowedAggregation;
  allowedFilters: readonly 'pipeline'[];
  supportsPipelineFilter: boolean;
  allowedGroupings: readonly 'stage'[];
  supportsStageGrouping: boolean;
  allowedTimeframes: readonly ('fest' | 'aktuell' | 'live')[];
  allowedPresentations: readonly DashboardView[];
}

/**
 * Leitet aus den statischen Feldern des aktiven Katalogeintrags ab,
 * welche Abfrageoptionen, Aggregationen, Filter, Gruppierungen und
 * Darstellungen fachlich zulässig sind (Auftrag 154 §2.2).
 */
export function getQueryCapabilities(entry: ActiveCatalogEntry): TileQueryCapabilities {
  let allowedAggregations: AllowedAggregation[];
  switch (entry.aggregation) {
    case 'bestand':
      allowedAggregations = ['letzter_stand'];
      break;
    case 'fluss':
      allowedAggregations = ['summe'];
      break;
    case 'verhaeltnis':
      allowedAggregations = ['verhaeltnis'];
      break;
    case 'keine':
    default:
      allowedAggregations = [];
      break;
  }

  const supportsPipelineFilter = entry.filters.includes('pipeline');
  const allowedFilters: 'pipeline'[] = supportsPipelineFilter ? ['pipeline'] : [];

  const supportsStageGrouping =
    entry.groupings.includes('stufe') || entry.groupings.includes('stage');
  const allowedGroupings: 'stage'[] = supportsStageGrouping ? ['stage'] : [];

  const allowedTimeframes: ('fest' | 'aktuell' | 'live')[] = [entry.timeMode];

  return {
    metricId: entry.id,
    allowedAggregations,
    defaultAggregation: allowedAggregations[0],
    allowedFilters,
    supportsPipelineFilter,
    allowedGroupings,
    supportsStageGrouping,
    allowedTimeframes,
    allowedPresentations: entry.views,
  };
}
