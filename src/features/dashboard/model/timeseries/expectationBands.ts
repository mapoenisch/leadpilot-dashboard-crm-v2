// Auftrag 170 (P14b, Entscheidung Marc 18.11.2026, Auftrag §8): Erwartungsband aus dem 10. und
// 90. Perzentil der gleichen Position in den letzten 8 vollständigen Vorperioden. Keine Prognose,
// keine Alarme auf das Band. Eine Periode mit Lücke zählt nicht.
import type { TimeSeriesPoint, TimeSeriesResolution } from '../../data/dashboardData';
import { berlinDayKey, berlinHour, dayNumber, weekdayIndex } from './berlinDate';
import type { ExpectationBandPoint, ExpectationBandsResult } from './types';

export type { ExpectationBandPoint, ExpectationBandsResult } from './types';

export const BAND_MIN_PERIODS = 8;

/**
 * Natürliche Positionen je Periode für die Kalenderzuordnung. Nur bei diesen Längen werden
 * Perioden nach Berliner Kalender geschnitten; andere Längen (Test-/Sonderfälle) bleiben indexbasiert.
 */
const CALENDAR_SLOTS: Partial<Record<TimeSeriesResolution, number>> = {
  stunde: 24,
  tag: 7,
};

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

/** Position innerhalb der Periode: Stunde des Berliner Tages bzw. Wochentag (Mo = 0). */
function slotOf(at: string, resolution: TimeSeriesResolution): number | null {
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return null;
  if (resolution === 'stunde') {
    const hour = berlinHour(at);
    return Number.isNaN(hour) ? null : hour;
  }
  if (resolution === 'tag') {
    return weekdayIndex(dayNumber(berlinDayKey(at)));
  }
  return null;
}

/** Schlüssel der Periode: Berliner Kalendertag bzw. Montag der Kalenderwoche. */
function periodKeyOf(at: string, resolution: TimeSeriesResolution): number | null {
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return null;
  const day = dayNumber(berlinDayKey(at));
  if (resolution === 'stunde') return day;
  if (resolution === 'tag') return day - weekdayIndex(day);
  return null;
}

/**
 * Schneidet die Vorperioden nach Berliner Kalender (Stunden je Tag, Tage je Woche) statt nach
 * Punktindex. So bleiben die Positionen auch über eine Zeitumstellung hinweg richtig, und eine
 * 23- oder 25-Stunden-Periode zählt nicht als vollständiger Kalendertag.
 * Liefert `null`, wenn die Kalenderzuordnung nicht anwendbar ist (andere Periodenlänge oder
 * nicht lesbare Zeitstempel); dann bleibt die indexbasierte Aufteilung.
 */
function calendarPeriods(
  priorPoints: readonly TimeSeriesPoint[],
  resolution: TimeSeriesResolution,
  periodLength: number,
  minPeriods: number,
): number[][] | null {
  if (CALENDAR_SLOTS[resolution] !== periodLength) return null;

  const groups = new Map<number, { values: (number | null)[]; count: number }>();
  for (const pt of priorPoints) {
    const key = periodKeyOf(pt.at, resolution);
    const slot = slotOf(pt.at, resolution);
    if (key === null || slot === null) return null;
    let group = groups.get(key);
    if (!group) {
      group = { values: new Array<number | null>(periodLength).fill(null), count: 0 };
      groups.set(key, group);
    }
    group.values[slot] =
      pt.status === 'belegt' && pt.value !== null && Number.isFinite(pt.value) ? pt.value : null;
    group.count += 1;
  }

  const complete: number[][] = [];
  for (const key of [...groups.keys()].sort((a, b) => b - a)) {
    const group = groups.get(key)!;
    // Doppelte Position (25-Stunden-Tag) oder fehlende Position (23-Stunden-Tag) ist unvollständig.
    if (group.count !== periodLength) continue;
    if (group.values.some((value) => value === null)) continue;
    complete.push(group.values as number[]);
    if (complete.length === minPeriods) break;
  }
  return complete;
}

/** Indexbasierte Aufteilung als Rückfallebene für synthetische oder unlesbare Zeitstempel. */
function indexPeriods(
  priorPoints: readonly TimeSeriesPoint[],
  periodLength: number,
  minPeriods: number,
): number[][] {
  const complete: number[][] = [];
  for (let end = priorPoints.length; end - periodLength >= 0; end -= periodLength) {
    const period = priorPoints.slice(end - periodLength, end);
    if (isComplete(period)) complete.push(period.map((pt) => pt.value as number));
    if (complete.length === minPeriods) break;
  }
  return complete;
}

export function bandTooFewReason(minPeriods = BAND_MIN_PERIODS): string {
  return `Zu wenig Daten für ein Erwartungsband (mind. ${minPeriods} Perioden)`;
}

export function calculateExpectationBands(input: ExpectationBandsInput): ExpectationBandsResult {
  const {
    priorPoints,
    periodLength,
    resolution,
    minPeriods = BAND_MIN_PERIODS,
    periodLabel = 'Wochen',
  } = input;
  const tooFew: ExpectationBandsResult = { hasBand: false, reason: bandTooFewReason(minPeriods) };

  if (!Number.isInteger(periodLength) || periodLength <= 0) return tooFew;

  // Perioden vom Fensterbeginn rückwärts schneiden, damit Position i zur Anzeigeposition passt.
  const complete =
    calendarPeriods(priorPoints, resolution, periodLength, minPeriods) ??
    indexPeriods(priorPoints, periodLength, minPeriods);
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

/**
 * Band je Anzeigepunkt. Mit Zeitstempeln und Auflösung wird jede Anzeige über ihre Kalenderposition
 * zugeordnet (Stunde des Tages bzw. Wochentag); ohne diese Angaben bleibt es beim Index modulo
 * Periodenlänge.
 */
export function bandsForDisplay(
  result: ExpectationBandsResult,
  pointCount: number,
  points?: readonly TimeSeriesPoint[],
  resolution?: TimeSeriesResolution,
): ExpectationBandsResult {
  if (!result.hasBand || !result.bands || result.bands.length === 0) return result;
  const length = result.bands.length;
  const useCalendar = Boolean(
    points && resolution && CALENDAR_SLOTS[resolution] === length && points.length >= pointCount,
  );
  const bands: ExpectationBandPoint[] = [];
  for (let i = 0; i < pointCount; i++) {
    let position = i % length;
    if (useCalendar) {
      const slot = slotOf(points![i]!.at, resolution!);
      if (slot !== null && slot < length) position = slot;
    }
    const band = result.bands[position]!;
    bands.push({ index: i, lower: band.lower, upper: band.upper });
  }
  return { ...result, bands };
}
