// Auftrag 170 (P14b, Entscheidung Marc 18.11.2026, Auftrag §8): Erwartungsband aus dem 10. und
// 90. Perzentil der gleichen Position in den letzten 8 vollständigen Vorperioden. Keine Prognose,
// keine Alarme auf das Band. Eine Periode mit Lücke zählt nicht.
import type { TimeSeriesPoint, TimeSeriesResolution } from '../../data/dashboardData';
import type { ExpectationBandPoint, ExpectationBandsResult } from './types';

export type { ExpectationBandPoint, ExpectationBandsResult } from './types';

export const BAND_MIN_PERIODS = 8;

export interface ExpectationBandsInput {
  /** Abschnitte direkt vor dem Anzeigefenster, aufsteigend; der letzte endet am Fensterbeginn. */
  priorPoints: readonly TimeSeriesPoint[];
  /** Abschnitte je Periode (z. B. 24 Stunden je Tag, 7 Tage je Woche, 1 Woche je Woche). */
  periodLength: number;
  resolution: TimeSeriesResolution;
  minPeriods?: number;
  /** Plural der Periode im Erklärsatz, Standard „Wochen“. */
  periodLabel?: string;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  return sorted[low]! + (rank - low) * (sorted[high]! - sorted[low]!);
}

function isComplete(period: readonly TimeSeriesPoint[]): boolean {
  return period.every(
    (pt) => pt.status === 'belegt' && pt.value !== null && Number.isFinite(pt.value),
  );
}

export function bandTooFewReason(minPeriods = BAND_MIN_PERIODS): string {
  return `Zu wenig Daten für ein Erwartungsband (mind. ${minPeriods} Perioden)`;
}

export function calculateExpectationBands(input: ExpectationBandsInput): ExpectationBandsResult {
  const {
    priorPoints,
    periodLength,
    minPeriods = BAND_MIN_PERIODS,
    periodLabel = 'Wochen',
  } = input;
  const tooFew: ExpectationBandsResult = { hasBand: false, reason: bandTooFewReason(minPeriods) };

  if (!Number.isInteger(periodLength) || periodLength <= 0) return tooFew;

  // Perioden vom Fensterbeginn rückwärts schneiden, damit Position i zur Anzeigeposition passt.
  const complete: number[][] = [];
  for (let end = priorPoints.length; end - periodLength >= 0; end -= periodLength) {
    const period = priorPoints.slice(end - periodLength, end);
    if (isComplete(period)) complete.push(period.map((pt) => pt.value as number));
    if (complete.length === minPeriods) break;
  }
  if (complete.length < minPeriods) return tooFew;

  const bands: ExpectationBandPoint[] = [];
  for (let pos = 0; pos < periodLength; pos++) {
    const values = complete.map((period) => period[pos]!).sort((a, b) => a - b);
    bands.push({
      index: pos,
      lower: Math.round(percentile(values, 10) * 100) / 100,
      upper: Math.round(percentile(values, 90) * 100) / 100,
    });
  }

  return {
    hasBand: true,
    bands,
    explanation: `Üblicher Bereich der letzten ${minPeriods} ${periodLabel} (10.–90. Perzentil)`,
  };
}

/** Band je Anzeigepunkt: Position = Index modulo Periodenlänge. */
export function bandsForDisplay(
  result: ExpectationBandsResult,
  pointCount: number,
): ExpectationBandsResult {
  if (!result.hasBand || !result.bands || result.bands.length === 0) return result;
  const length = result.bands.length;
  const bands: ExpectationBandPoint[] = [];
  for (let i = 0; i < pointCount; i++) {
    const band = result.bands[i % length]!;
    bands.push({ index: i, lower: band.lower, upper: band.upper });
  }
  return { ...result, bands };
}
