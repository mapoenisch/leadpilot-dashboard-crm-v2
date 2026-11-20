import { describe, it, expect } from 'vitest';
import {
  computeComparison,
  formatComparisonDelta,
  type ComputeComparisonInput,
} from '../model/timeseries/computeComparison';
import compareCases from '../model/timeseries/compareReferenceCases.json';

describe('Auftrag 170 (P14b) - computeComparison & Referenzfälle', () => {
  it('hat mindestens 20 dokumentierte Referenzfälle', () => {
    expect(compareCases.length).toBeGreaterThanOrEqual(20);
  });

  it('berechnet absolute und prozentuale Differenz korrekt bei Standardwerten', () => {
    const input: ComputeComparisonInput = {
      baseValue: 120,
      compareValue: 100,
      unit: 'EUR',
      historyStartAt: '2026-01-01T00:00:00+01:00',
      compareBucketStart: '2026-06-01T00:00:00+02:00',
    };
    const res = computeComparison(input);
    expect(res.deltaAbsolute).toBe(20);
    expect(res.deltaPercent).toBe(20);
    expect(res.isComputable).toBe(true);
    expect(res.isPartial).toBe(false);
  });

  it('behandelt 0-Vergleichswert als nicht berechenbar für Prozent (§2.1 Nr. 2)', () => {
    const input: ComputeComparisonInput = {
      baseValue: 50,
      compareValue: 0,
      unit: 'EUR',
      historyStartAt: '2026-01-01T00:00:00+01:00',
      compareBucketStart: '2026-06-01T00:00:00+02:00',
    };
    const res = computeComparison(input);
    expect(res.deltaAbsolute).toBe(50);
    expect(res.deltaPercent).toBeNull();
    expect(res.isComputable).toBe(false);
    expect(res.labelPercent).toBe('nicht berechenbar');
  });

  it('trennt Prozent und Prozentpunkte bei Kennzahlen mit Einheit % (§2.1 Nr. 2)', () => {
    const input: ComputeComparisonInput = {
      baseValue: 25,
      compareValue: 20,
      unit: '%',
      historyStartAt: '2026-01-01T00:00:00+01:00',
      compareBucketStart: '2026-06-01T00:00:00+02:00',
    };
    const res = computeComparison(input);
    expect(res.deltaAbsolute).toBe(5);
    expect(res.unitLabel).toBe('Pp.');
    const formatted = formatComparisonDelta(res);
    expect(formatted).toContain('+5,0 Pp.');
    expect(formatted).not.toContain('+5,0 %');
  });

  it('erkennt unvollständige Historie und liefert genauen Datenstand-Hinweis (§2.1 Nr. 1)', () => {
    const input: ComputeComparisonInput = {
      baseValue: 100,
      compareValue: 80,
      unit: 'EUR',
      historyStartAt: '2026-03-15T00:00:00+01:00',
      compareBucketStart: '2026-02-01T00:00:00+01:00', // liegt vor dem 15.03.2026!
    };
    const res = computeComparison(input);
    expect(res.isPartial).toBe(true);
    expect(res.partialNotice).toBe('Vergleich unvollständig: Daten ab 15.03.2026');
  });

  it('behandelt Lücken im Vergleichszeitraum (compareValue null)', () => {
    const input: ComputeComparisonInput = {
      baseValue: 100,
      compareValue: null,
      unit: 'EUR',
      historyStartAt: '2026-01-01T00:00:00+01:00',
      compareBucketStart: '2026-06-01T00:00:00+02:00',
    };
    const res = computeComparison(input);
    expect(res.deltaAbsolute).toBeNull();
    expect(res.deltaPercent).toBeNull();
    expect(res.isComputable).toBe(false);
  });

  it('behandelt alle 20 Referenzfälle deterministisch', () => {
    for (const testCase of compareCases) {
      const res = computeComparison(testCase.input as ComputeComparisonInput);
      if (testCase.expected.deltaAbsolute === null) {
        expect(res.deltaAbsolute).toBeNull();
      } else {
        expect(res.deltaAbsolute).toBeCloseTo(testCase.expected.deltaAbsolute, 2);
      }
      if (testCase.expected.deltaPercent === null) {
        expect(res.deltaPercent).toBeNull();
        expect(res.labelPercent).toBe('nicht berechenbar');
      } else {
        expect(res.deltaPercent).toBeCloseTo(testCase.expected.deltaPercent, 2);
      }
      expect(res.isPartial).toBe(testCase.expected.isPartial);
      if (testCase.expected.partialNotice) {
        expect(res.partialNotice).toBe(testCase.expected.partialNotice);
      }
    }
  });
});
