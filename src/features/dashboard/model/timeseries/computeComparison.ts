// Auftrag 170 (P14b): Abweichung zum Vergleichszeitraum. Prozent nur bei Vergleichswert ≠ 0;
// bei Kennzahlen mit Einheit % wird die Differenz in Prozentpunkten (Pp.) ausgewiesen.
import type { ComparisonResult } from './types';
import { formatBerlinDate } from './berlinDate';

export type { ComparisonResult } from './types';

export interface ComputeComparisonInput {
  baseValue: number | null;
  compareValue: number | null;
  unit: string;
  historyStartAt?: string | null;
  compareBucketStart: string;
}

export const NOT_COMPUTABLE = 'nicht berechenbar';

/** Datenstand-Hinweis für unvollständige Vergleiche (Masterplan §4.C: nie zurückrechnen). */
export function partialCompareNotice(historyStartAt: string | null | undefined): string {
  return historyStartAt
    ? `Vergleich unvollständig: Daten ab ${formatBerlinDate(historyStartAt)}`
    : 'Vergleich unvollständig: keine Historie vorhanden';
}

function formatSigned(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits).replace('.', ',')}`;
}

export function computeComparison(input: ComputeComparisonInput): ComparisonResult {
  const { baseValue, compareValue, unit, historyStartAt, compareBucketStart } = input;
  const unitLabel = unit.trim() === '%' ? 'Pp.' : unit;

  const isPartial = Boolean(
    historyStartAt && Date.parse(compareBucketStart) < Date.parse(historyStartAt),
  );
  const partialNotice = isPartial ? partialCompareNotice(historyStartAt) : undefined;
  const base = { unitLabel, isPartial, partialNotice };

  if (
    baseValue === null ||
    compareValue === null ||
    !Number.isFinite(baseValue) ||
    !Number.isFinite(compareValue)
  ) {
    return {
      ...base,
      deltaAbsolute: null,
      deltaPercent: null,
      isComputable: false,
      labelPercent: NOT_COMPUTABLE,
    };
  }

  const deltaAbsolute = baseValue - compareValue;
  if (compareValue === 0) {
    return {
      ...base,
      deltaAbsolute,
      deltaPercent: null,
      isComputable: false,
      labelPercent: NOT_COMPUTABLE,
    };
  }

  const deltaPercent = (deltaAbsolute / Math.abs(compareValue)) * 100;
  return {
    ...base,
    deltaAbsolute,
    deltaPercent,
    isComputable: true,
    labelPercent: `${formatSigned(deltaPercent)} %`,
  };
}

/** „+20,0 EUR (+20,0 %)“ bzw. „+5,0 Pp. (+25,0 %)“ oder „… (nicht berechenbar)“. */
export function formatComparisonDelta(res: ComparisonResult): string {
  if (res.deltaAbsolute === null) return `– (${res.labelPercent})`;
  return `${formatSigned(res.deltaAbsolute)} ${res.unitLabel} (${res.labelPercent})`.trim();
}
