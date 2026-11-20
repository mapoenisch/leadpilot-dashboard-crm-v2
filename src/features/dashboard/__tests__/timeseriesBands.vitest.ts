import { describe, it, expect } from 'vitest';
import {
  bandsForDisplay,
  calculateExpectationBands,
  type ExpectationBandsInput,
} from '../model/timeseries/expectationBands';
import type { TimeSeriesPoint } from '../data/dashboardData';
import bandsCases from '../model/timeseries/bandsReferenceCases.json';

describe('Auftrag 170 (P14b / §8) - calculateExpectationBands & Referenzfälle', () => {
  it('hat mindestens 20 dokumentierte Referenzfälle', () => {
    expect(bandsCases.length).toBeGreaterThanOrEqual(20);
  });

  const p = (at: string, value: number | null): TimeSeriesPoint => ({
    at,
    value,
    status: value !== null ? 'belegt' : 'luecke',
    measuredAt: at,
  });

  it('liefert KEIN Band bei genau 7 Perioden (mindestens 8 erforderlich, §8)', () => {
    // 7 Perioden à 24 Stunden = 168 Punkte
    const priorPoints: TimeSeriesPoint[] = [];
    for (let i = 0; i < 7 * 24; i++) {
      priorPoints.push(
        p(`2026-01-01T${String(i % 24).padStart(2, '0')}:00:00+01:00`, 100 + (i % 24)),
      );
    }

    const res = calculateExpectationBands({
      priorPoints,
      periodLength: 24,
      resolution: 'stunde',
    });

    expect(res.hasBand).toBe(false);
    expect(res.reason).toBe('Zu wenig Daten für ein Erwartungsband (mind. 8 Perioden)');
  });

  it('liefert Band bei 8 vollständigen Perioden mit 10. und 90. Perzentil (§8)', () => {
    // 8 Perioden à 24 Stunden = 192 Punkte
    const priorPoints: TimeSeriesPoint[] = [];
    for (let period = 0; period < 8; period++) {
      for (let h = 0; h < 24; h++) {
        priorPoints.push(
          p(`2026-01-0${period + 1}T${String(h).padStart(2, '0')}:00:00+01:00`, 50 + period * 10),
        );
      }
    }

    const res = calculateExpectationBands({
      priorPoints,
      periodLength: 24,
      resolution: 'stunde',
    });

    expect(res.hasBand).toBe(true);
    expect(res.bands).toHaveLength(24);
    expect(res.explanation).toBe('Üblicher Bereich der letzten 8 Wochen (10.–90. Perzentil)');
    // 10. Perzentil ist kleiner oder gleich 90. Perzentil
    for (const band of res.bands!) {
      expect(band.lower).toBeLessThanOrEqual(band.upper);
    }
  });

  it('zählt eine Periode mit Lücke nicht als vollständig (§8)', () => {
    // 8 Perioden, aber in einer Periode fehlt ein Wert
    const priorPoints: TimeSeriesPoint[] = [];
    for (let period = 0; period < 8; period++) {
      for (let h = 0; h < 24; h++) {
        const val = period === 2 && h === 5 ? null : 100;
        priorPoints.push(
          p(`2026-01-0${period + 1}T${String(h).padStart(2, '0')}:00:00+01:00`, val),
        );
      }
    }

    const res = calculateExpectationBands({
      priorPoints,
      periodLength: 24,
      resolution: 'stunde',
    });

    // Da Periode 2 unvollständig ist, sind es nur 7 vollständige Perioden -> kein Band!
    expect(res.hasBand).toBe(false);
    expect(res.reason).toBe('Zu wenig Daten für ein Erwartungsband (mind. 8 Perioden)');
  });

  it('behandelt alle 20 Referenzfälle deterministisch', () => {
    for (const testCase of bandsCases) {
      const res = calculateExpectationBands(testCase.input as unknown as ExpectationBandsInput);
      expect(res.hasBand).toBe(testCase.expectedHasBand);
      if (testCase.expectedHasBand) {
        expect(res.bands?.length).toBe(testCase.expectedBandCount);
      } else {
        expect(res.reason).toBe(testCase.expectedReason);
      }
    }
  });

  it('ordnet Stunden über die Zeitumstellung nach Berliner Kalenderstunden zu', () => {
    // Zwölf Tage vor dem 31.03.2026; der 29.03. hat durch die Umstellung nur 23 Stunden.
    const priorPoints: TimeSeriesPoint[] = [];
    const days = [
      '2026-03-19',
      '2026-03-20',
      '2026-03-21',
      '2026-03-22',
      '2026-03-23',
      '2026-03-24',
      '2026-03-25',
      '2026-03-26',
      '2026-03-27',
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
    ];
    for (const day of days) {
      for (let hour = 0; hour < 24; hour++) {
        // Am 29.03. springt die Uhr von 02:00 auf 03:00.
        if (day === '2026-03-29' && hour === 2) continue;
        const offset =
          day < '2026-03-29' || (day === '2026-03-29' && hour < 2) ? '+01:00' : '+02:00';
        priorPoints.push(p(`${day}T${String(hour).padStart(2, '0')}:00:00${offset}`, hour));
      }
    }

    const res = calculateExpectationBands({
      priorPoints,
      periodLength: 24,
      resolution: 'stunde',
    });

    expect(res.hasBand).toBe(true);
    // Jede vollständige Periode liefert an Position 0 den Wert 0 (nicht 16,1 durch Verschiebung).
    expect(res.bands![0]).toEqual({ index: 0, lower: 0, upper: 0 });
    expect(res.bands![23]).toEqual({ index: 23, lower: 23, upper: 23 });
  });

  it('ordnet Anzeigepunkte nach ihrer Stundenposition statt nach dem Index zu', () => {
    const priorPoints: TimeSeriesPoint[] = [];
    for (let day = 19; day <= 30; day++) {
      for (let hour = 0; hour < 24; hour++) {
        if (day === 29 && hour === 2) continue;
        const offset = day < 29 || (day === 29 && hour < 2) ? '+01:00' : '+02:00';
        priorPoints.push(
          p(
            `2026-03-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00${offset}`,
            hour,
          ),
        );
      }
    }
    const res = calculateExpectationBands({
      priorPoints,
      periodLength: 24,
      resolution: 'stunde',
    });

    // Anzeige am Umstellungstag: 01:00 (Index 1) und 03:00 (Index 2).
    const display = [p('2026-03-29T01:00:00+01:00', 1), p('2026-03-29T03:00:00+02:00', 3)];
    const shown = bandsForDisplay(res, display.length, display, 'stunde');
    expect(shown.bands!.map((b) => b.lower)).toEqual([1, 3]);
  });
});
