// Executive Dashboard, Teilauftrag 2 (Auftrag 071): Stammdaten-Auflösung (synchron).
// Löst Werte und Reihen aus den belegten Stammdaten-Quellen ohne Schätzwerte auf.
import * as cockpitDataModule from '@/domain/executiveCockpitData';
import { HISTORIE } from '@/domain/unternehmenData';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { EffectiveTileFilter } from '../model/dashboardFilters';
import {
  getBaselineExport,
  isDatasetPath,
  parseFormattedBaselineNumber,
  readDatasetSeries,
  readTableSeries,
  resolvePath,
} from './baselineSources';
import type { ResolvedTileData } from './dashboardData';

export { parseFormattedBaselineNumber };

/**
 * Synchroner Auflöser für aktive Stammdaten-Einträge.
 */
export function resolveBaseline(
  entry: ActiveCatalogEntry,
  effectiveFilter: EffectiveTileFilter,
): ResolvedTileData {
  const baseResult: Omit<ResolvedTileData, 'state' | 'value' | 'series' | 'overview'> = {
    catalogId: entry.id,
    unit: entry.unit,
    timeBasis: entry.timeBasis,
    asOf: null,
    origin: {
      layer: 'baseline',
      module: entry.source.module,
      exportName: entry.source.exportName,
    },
    scope: 'stammdaten',
    effectiveFilter,
  };

  // 1. Übersichtskacheln
  if (entry.id === 'uebersicht.team_hr') {
    return {
      ...baseResult,
      state: 'bereit',
      value: null,
      series: null,
      overview: {
        kind: 'team_hr',
        data: cockpitDataModule.getTeamHrSnapshot(),
      },
    };
  }

  if (entry.id === 'uebersicht.roadmap') {
    return {
      ...baseResult,
      state: 'bereit',
      value: null,
      series: null,
      overview: {
        kind: 'roadmap',
        data: cockpitDataModule.getRoadmapSnapshot(),
      },
    };
  }

  if (entry.id === 'uebersicht.meilensteine') {
    return {
      ...baseResult,
      state: 'bereit',
      value: null,
      series: null,
      overview: { kind: 'meilensteine', data: HISTORIE.events },
    };
  }

  // 2. Zeitreihen, Kategorien und Anteile aus Datensätzen oder Zeilentabellen
  const fail = (message: string): ResolvedTileData => ({
    ...baseResult,
    state: 'fehler',
    value: null,
    series: null,
    overview: null,
    message,
  });
  const exportTarget = getBaselineExport(entry.source.module, entry.source.exportName);
  if (exportTarget === undefined)
    return fail(`Export "${entry.source.exportName}" in Stammdaten nicht gefunden`);

  const path = entry.source.path;
  if (entry.source.table || isDatasetPath(path)) {
    const result = entry.source.table
      ? readTableSeries(resolvePath(exportTarget, path), entry.source.table)
      : readDatasetSeries(exportTarget, path ?? []);
    if (!result.ok) return fail(result.message);
    return { ...baseResult, state: 'bereit', value: null, series: result.series, overview: null };
  }

  // 3. Einzelwerte (z. B. EXEC_KPIS_1/EXEC_KPIS_2)
  const rawValue = resolvePath(exportTarget, path);
  if (rawValue === undefined || rawValue === null) {
    return {
      ...baseResult,
      state: 'keine_daten',
      value: null,
      series: null,
      overview: null,
      message: 'Kein Wert an angegebenem Quellpfad gefunden',
    };
  }

  if (typeof rawValue === 'number') {
    if (!Number.isFinite(rawValue)) {
      return {
        ...baseResult,
        state: 'fehler',
        value: null,
        series: null,
        overview: null,
        message: 'Wert ist keine endliche Zahl',
      };
    }
    return {
      ...baseResult,
      state: 'bereit',
      value: rawValue,
      series: null,
      overview: null,
    };
  }

  if (typeof rawValue === 'string') {
    const parsed = parseFormattedBaselineNumber(rawValue);
    if (parsed === null) {
      return {
        ...baseResult,
        state: 'fehler',
        value: null,
        series: null,
        overview: null,
        message: `Wert "${rawValue}" konnte nicht als Zahl interpretiert werden`,
      };
    }
    return {
      ...baseResult,
      state: 'bereit',
      value: parsed,
      series: null,
      overview: null,
    };
  }

  return {
    ...baseResult,
    state: 'fehler',
    value: null,
    series: null,
    overview: null,
    message: 'Unerwarteter Datentyp in Stammdaten',
  };
}
