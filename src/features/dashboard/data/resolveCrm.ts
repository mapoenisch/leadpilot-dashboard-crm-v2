// Executive Dashboard, Teilauftrag 2 (Auftrag 071): CRM-Auflösung mit Pipeline-Filter.
// Liest Pipeline-Werte aus getPipelineOverview über eine filternde FunnelDealSource.
import {
  getPipelineOverview,
  type FunnelDealSource,
  type PipelineOverview,
} from '@/domain/executiveCockpitData';
import type { ImportedFunnelDeal } from '@/types/crm';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { EffectiveTileFilter } from '../model/dashboardFilters';
import type { ResolvedTileData } from './dashboardData';

/**
 * Filternde FunnelDealSource (Dependency Inversion):
 * Kapselt eine FunnelDealSource und filtert nach der angegebenen Pipeline,
 * bevor getPipelineOverview aggregiert.
 */
export class FilteredFunnelDealSource implements FunnelDealSource {
  constructor(
    private readonly baseSource: FunnelDealSource,
    private readonly pipeline?: string | null,
  ) {}

  async getImportedFunnelDeals(): Promise<ImportedFunnelDeal[]> {
    const deals = await this.baseSource.getImportedFunnelDeals();
    if (!this.pipeline) {
      return deals;
    }
    return deals.filter((deal) => deal.pipeline === this.pipeline);
  }
}

/**
 * Reine Funktion zur Zuordnung eines aggregierten PipelineOverview-Ergebnisses zu TileData.
 * Wird auch von React Query als Selektor geteilt.
 */
export function resolveCrmFromOverview(
  entry: ActiveCatalogEntry,
  overview: PipelineOverview,
  effectiveFilter: EffectiveTileFilter,
): ResolvedTileData {
  const baseResult: Omit<ResolvedTileData, 'state' | 'value' | 'series' | 'overview'> = {
    catalogId: entry.id,
    unit: entry.unit,
    timeBasis: entry.timeBasis,
    asOf: null,
    origin: {
      layer: 'crm',
      module: entry.source.module,
      exportName: entry.source.exportName,
    },
    scope: 'organisation',
    effectiveFilter,
  };

  // Leere Deal-Liste ergibt keine_daten (nicht 0)
  if (overview.totalDeals === 0) {
    return {
      ...baseResult,
      state: 'keine_daten',
      value: null,
      series: null,
      overview: null,
      message: 'Keine Deals in der Pipeline vorhanden',
    };
  }

  // Kategorien / Stufen
  if (entry.shape === 'kategorien') {
    const measure = entry.source.measure === 'count' ? 'count' : 'volume';
    const series = overview.stages.map((stage) => ({
      label: stage.stage,
      value: stage[measure],
    }));

    if (!series.every((item) => Number.isFinite(item.value))) {
      return {
        ...baseResult,
        state: 'fehler',
        value: null,
        series: null,
        overview: null,
        message: 'Stufenwerte enthalten keine gültige endliche Zahl',
      };
    }

    return {
      ...baseResult,
      state: 'bereit',
      value: null,
      series,
      overview: null,
    };
  }

  // Einzelwerte
  const field = entry.source.path?.[0] as keyof PipelineOverview | undefined;
  if (!field || !(field in overview)) {
    return {
      ...baseResult,
      state: 'fehler',
      value: null,
      series: null,
      overview: null,
      message: `Feld "${String(field)}" nicht in PipelineOverview enthalten`,
    };
  }

  const raw = overview[field];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return {
      ...baseResult,
      state: 'fehler',
      value: null,
      series: null,
      overview: null,
      message: `Ungültiger Zahlenwert in CRM-Feld "${String(field)}"`,
    };
  }

  // Echte 0 bleibt bereit
  return {
    ...baseResult,
    state: 'bereit',
    value: raw,
    series: null,
    overview: null,
  };
}

/**
 * Asynchroner CRM-Auflöser: ruft getPipelineOverview mit filternder Source auf.
 * Fängt Fehler aus der Quelle sauber ab.
 */
export async function resolveCrm(
  source: FunnelDealSource,
  entry: ActiveCatalogEntry,
  effectiveFilter: EffectiveTileFilter,
): Promise<ResolvedTileData> {
  const baseResult: Omit<ResolvedTileData, 'state' | 'value' | 'series' | 'overview'> = {
    catalogId: entry.id,
    unit: entry.unit,
    timeBasis: entry.timeBasis,
    asOf: null,
    origin: {
      layer: 'crm',
      module: entry.source.module,
      exportName: entry.source.exportName,
    },
    scope: 'organisation',
    effectiveFilter,
  };

  try {
    const filteredSource = new FilteredFunnelDealSource(source, effectiveFilter.pipeline);
    const overview = await getPipelineOverview(filteredSource);
    return resolveCrmFromOverview(entry, overview, effectiveFilter);
  } catch {
    return {
      ...baseResult,
      state: 'fehler',
      value: null,
      series: null,
      overview: null,
      message: 'CRM-Daten konnten nicht geladen werden',
    };
  }
}
