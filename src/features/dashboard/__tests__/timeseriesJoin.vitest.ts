import { describe, it, expect } from 'vitest';
import { alignSeries, type AlignSeriesOptions } from '../model/timeseries/alignSeries';
import type { TimeSeriesPoint } from '../data/dashboardData';
import joinCases from '../model/timeseries/joinReferenceCases.json';

describe('Auftrag 170 (P14b) - alignSeries (Zeitbezogener Join) & Referenzfälle', () => {
  it('hat mindestens 20 dokumentierte Referenzfälle', () => {
    expect(joinCases.length).toBeGreaterThanOrEqual(20);
  });

  const p = (at: string, value: number | null): TimeSeriesPoint => ({
    at,
    value,
    status: value !== null ? 'belegt' : 'luecke',
    measuredAt: at,
  });

  it('lehnt ungleiche Auflösung strikt ab (§2.1 Nr. 3)', () => {
    const seriesA = [p('2026-06-01T00:00:00+02:00', 10)];
    const seriesB = [p('2026-06-01T00:00:00+02:00', 20)];
    expect(() =>
      alignSeries(seriesA, seriesB, {
        resolutionA: 'stunde',
        resolutionB: 'tag',
        typ: 'inner',
      }),
    ).toThrowError(/ungleiche Auflösung/i);
  });

  it('begrenzt Ergebnis auf maximal 500 Buckets (§2.1 Nr. 3)', () => {
    const seriesA: TimeSeriesPoint[] = [];
    const seriesB: TimeSeriesPoint[] = [];
    for (let i = 0; i < 505; i++) {
      const at = new Date(Date.UTC(2026, 0, 1, i)).toISOString();
      seriesA.push(p(at, i));
      seriesB.push(p(at, i * 2));
    }
    expect(() =>
      alignSeries(seriesA, seriesB, {
        resolutionA: 'stunde',
        resolutionB: 'stunde',
        typ: 'inner',
      }),
    ).toThrowError(/maximal 500/i);
  });

  it('führt Inner-Join korrekt aus (nur gemeinsame Zeitpunkte)', () => {
    const seriesA = [
      p('2026-06-01T00:00:00+02:00', 10),
      p('2026-06-02T00:00:00+02:00', 15),
      p('2026-06-03T00:00:00+02:00', 20),
    ];
    const seriesB = [
      p('2026-06-02T00:00:00+02:00', 50),
      p('2026-06-03T00:00:00+02:00', 60),
      p('2026-06-04T00:00:00+02:00', 70),
    ];

    const result = alignSeries(seriesA, seriesB, {
      resolutionA: 'tag',
      resolutionB: 'tag',
      typ: 'inner',
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.at).toBe('2026-06-02T00:00:00+02:00');
    expect(result.rows[0]?.valueA).toBe(15);
    expect(result.rows[0]?.valueB).toBe(50);
    expect(result.rows[1]?.at).toBe('2026-06-03T00:00:00+02:00');
    expect(result.rows[1]?.valueA).toBe(20);
    expect(result.rows[1]?.valueB).toBe(60);
  });

  it('führt Links-Join korrekt aus (alle Zeitpunkte aus Reihe A, Lücke bei fehlendem B)', () => {
    const seriesA = [
      p('2026-06-01T00:00:00+02:00', 10),
      p('2026-06-02T00:00:00+02:00', 15),
      p('2026-06-03T00:00:00+02:00', 20),
    ];
    const seriesB = [p('2026-06-02T00:00:00+02:00', 50)];

    const result = alignSeries(seriesA, seriesB, {
      resolutionA: 'tag',
      resolutionB: 'tag',
      typ: 'links',
    });

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]?.valueA).toBe(10);
    expect(result.rows[0]?.valueB).toBeNull();
    expect(result.rows[0]?.statusB).toBe('luecke');

    expect(result.rows[1]?.valueA).toBe(15);
    expect(result.rows[1]?.valueB).toBe(50);
    expect(result.rows[1]?.statusB).toBe('belegt');

    expect(result.rows[2]?.valueA).toBe(20);
    expect(result.rows[2]?.valueB).toBeNull();
    expect(result.rows[2]?.statusB).toBe('luecke');
  });

  it('behandelt alle 20 Referenzfälle deterministisch', () => {
    for (const testCase of joinCases) {
      if (testCase.shouldThrow) {
        expect(() =>
          alignSeries(
            testCase.seriesA as TimeSeriesPoint[],
            testCase.seriesB as TimeSeriesPoint[],
            testCase.options as AlignSeriesOptions,
          ),
        ).toThrow();
      } else {
        const res = alignSeries(
          testCase.seriesA as TimeSeriesPoint[],
          testCase.seriesB as TimeSeriesPoint[],
          testCase.options as AlignSeriesOptions,
        );
        expect(res.rows.length).toBe(testCase.expectedRowCount);
      }
    }
  });
});
