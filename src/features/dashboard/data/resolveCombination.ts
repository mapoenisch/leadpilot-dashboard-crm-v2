// Executive Dashboard, Teilauftrag 6 (Auftrag 076): Kombinationskachel auflösen.
// Löst beide Operanden über den vorhandenen Stammdaten-Resolver und rechnet nach der Regel.
// Keine neuen Abfragen; nur historische Quellen (die Strukturprüfung schließt Live und CRM aus).
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import {
  computeCombination,
  getCombinationRule,
  type CombinationOperand,
  type OperandValue,
} from '../model/dashboardCombinations';
import type { EffectiveTileFilter } from '../model/dashboardFilters';
import type { ResolvedTileData } from './dashboardData';
import { resolveBaseline } from './resolveBaseline';

/** Rest eines Anteils im Ring, falls die Regel keinen eigenen Namen nennt. */
export const SHARE_REST_LABEL = 'Übrige';

function operandValue(
  operand: CombinationOperand,
  filter: EffectiveTileFilter,
): OperandValue | null {
  const entry = getCatalogEntry(operand.catalogId);
  if (!entry || !isActiveEntry(entry) || entry.source.layer !== 'baseline') return null;
  const resolved = resolveBaseline(entry, filter);
  const base = { unit: entry.unit, timeBasis: entry.timeBasis };
  if (resolved.state !== 'bereit') return { ...base, value: null };
  if (operand.element !== undefined) {
    const row = resolved.series?.find((item) => item.label === operand.element);
    return { ...base, value: row ? row.value : null };
  }
  if (operand.sum) {
    const series = resolved.series ?? [];
    if (series.length === 0 || series.some((row) => !Number.isFinite(row.value)))
      return { ...base, value: null };
    return { ...base, value: series.reduce((sum, row) => sum + row.value, 0) };
  }
  return { ...base, value: resolved.value };
}

export function resolveCombination(
  entry: ActiveCatalogEntry,
  effectiveFilter: EffectiveTileFilter,
): ResolvedTileData {
  const base: Omit<ResolvedTileData, 'state' | 'value' | 'series'> = {
    catalogId: entry.id,
    overview: null,
    unit: entry.unit,
    timeBasis: entry.timeBasis,
    asOf: null,
    origin: {
      layer: 'kombination',
      module: entry.source.module,
      exportName: entry.source.exportName,
    },
    scope: 'stammdaten',
    effectiveFilter,
  };
  const rule = getCombinationRule(entry.id);
  if (!rule) {
    return {
      ...base,
      state: 'nicht_berechenbar',
      value: null,
      series: null,
      message: 'Für diese Kombination liegt keine freigegebene Regel vor.',
    };
  }
  const result = computeCombination(
    rule,
    operandValue(rule.numerator, effectiveFilter),
    operandValue(rule.denominator, effectiveFilter),
  );
  const combination = { formula: result.formula, operands: result.operands };
  if (result.state === 'nicht_berechenbar') {
    return {
      ...base,
      state: 'nicht_berechenbar',
      value: null,
      series: null,
      message: result.reason,
      combination,
    };
  }
  // Ein Anteil zeigt im Ring und in der Tabelle Teil und Rest; ein Verhältnis ist ein Einzelwert.
  const series =
    rule.operation === 'anteil'
      ? [
          { label: rule.numerator.label, value: result.value },
          { label: rule.restLabel ?? SHARE_REST_LABEL, value: 100 - result.value },
        ]
      : null;
  return { ...base, state: 'bereit', value: result.value, series, combination };
}
