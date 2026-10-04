// Executive Dashboard, Teilauftrag 2 (Auftrag 071): Stammdaten-Auflösung (synchron).
// Löst Werte und Reihen aus den belegten Stammdaten-Quellen ohne Schätzwerte auf.
import * as execDataModule from '@/domain/execData';
import * as cockpitDataModule from '@/domain/executiveCockpitData';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { EffectiveTileFilter } from '../model/dashboardFilters';
import type { ResolvedTileData } from './dashboardData';

function getBaselineExport(exportName: string): unknown {
  const exec = execDataModule as Record<string, unknown>;
  if (exportName in exec) return exec[exportName];
  const cockpit = cockpitDataModule as Record<string, unknown>;
  if (exportName in cockpit) return cockpit[exportName];
  return undefined;
}

/**
 * Parst einen formatierten Zahlen-String aus den Stammdaten exakt nach Regel:
 * Einheit und Leerzeichen entfernen, `.` ist Tausendertrenner, `,` Dezimaltrenner,
 * `−` (U+2212) und `-` am Anfang bedeuten negativ.
 * Ein String, der danach keine endliche Zahl ergibt, liefert null (Fehler).
 */
export function parseFormattedBaselineNumber(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;

  let isNegative = false;
  if (s.startsWith('−') || s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1).trim();
  }

  // Einheit und Leerzeichen entfernen
  s = s.replace(/[\s€]/g, '').replace(/FTE/gi, '');
  if (!s || !/\d/.test(s)) return null;

  // Wenn noch unerwartete Zeichen/Buchstaben enthalten sind -> ungültig
  if (/[^\d.,]/.test(s)) {
    return null;
  }

  // Tausendertrenner '.' entfernen
  s = s.replace(/\./g, '');

  // Dezimaltrenner ',' durch '.' ersetzen; höchstens ein Komma zulässig
  const commaCount = (s.match(/,/g) || []).length;
  if (commaCount > 1) return null;
  s = s.replace(',', '.');

  const num = Number(s);
  if (!Number.isFinite(num)) {
    return null;
  }
  return isNegative ? -num : num;
}

function resolvePath(obj: unknown, path?: readonly (string | number)[]): unknown {
  if (!path || path.length === 0) return obj;
  let current: unknown = obj;
  for (const segment of path) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

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

  // 2. Zeitreihen / Anteile aus Datasets
  const path = entry.source.path;
  const isDatasetData =
    path &&
    path.length >= 3 &&
    path[path.length - 3] === 'datasets' &&
    path[path.length - 1] === 'data';

  if (isDatasetData) {
    const exportObj = getBaselineExport(entry.source.exportName) as
      | {
          labels?: string[];
          datasets?: Array<{ data?: number[] }>;
        }
      | undefined;

    if (!exportObj) {
      return {
        ...baseResult,
        state: 'fehler',
        value: null,
        series: null,
        overview: null,
        message: `Export "${entry.source.exportName}" in Stammdaten nicht gefunden`,
      };
    }

    const labels = exportObj.labels;
    const datasetIndex =
      typeof path[path.length - 2] === 'number' ? (path[path.length - 2] as number) : 0;
    const data = exportObj.datasets?.[datasetIndex]?.data;

    if (!Array.isArray(labels) || !Array.isArray(data) || labels.length !== data.length) {
      return {
        ...baseResult,
        state: 'fehler',
        value: null,
        series: null,
        overview: null,
        message: 'Beschriftungen und Datenpunkte stimmen nicht überein',
      };
    }

    if (!data.every(Number.isFinite)) {
      return {
        ...baseResult,
        state: 'fehler',
        value: null,
        series: null,
        overview: null,
        message: 'Werte enthalten keine gültige endliche Zahl',
      };
    }

    const series = labels.map((label, i) => ({
      label,
      value: data[i] as number,
    }));

    return {
      ...baseResult,
      state: 'bereit',
      value: null,
      series,
      overview: null,
    };
  }

  // 3. Einzelwerte (z. B. EXEC_KPIS_1/EXEC_KPIS_2)
  const exportTarget = getBaselineExport(entry.source.exportName);
  if (exportTarget === undefined) {
    return {
      ...baseResult,
      state: 'fehler',
      value: null,
      series: null,
      overview: null,
      message: `Export "${entry.source.exportName}" in Stammdaten nicht gefunden`,
    };
  }

  const rawValue = resolvePath(exportTarget, entry.source.path);
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
