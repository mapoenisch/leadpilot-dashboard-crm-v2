import { describe, it, expect } from 'vitest';
import { toHeatmapGrid, type HeatmapGridInput } from '../model/timeseries/toHeatmapGrid';
import type { TimeSeriesPoint } from '../data/dashboardData';
import heatmapCases from '../model/timeseries/heatmapReferenceCases.json';

describe('Auftrag 170 (P14b) - toHeatmapGrid & Referenzfälle', () => {
  it('hat mindestens 20 dokumentierte Referenzfälle', () => {
    expect(heatmapCases.length).toBeGreaterThanOrEqual(20);
  });

  const p = (at: string, value: number | null): TimeSeriesPoint => ({
    at,
    value,
    status: value !== null ? 'belegt' : 'luecke',
    measuredAt: at,
  });

  it('aggregiert Flussgrößen als Tagessumme (§2.1 Nr. 4)', () => {
    // 3 Stunden desselben Tages mit Flussgröße (z. B. 2, 3, 5) -> Tagessumme 10
    const points: TimeSeriesPoint[] = [
      p('2026-06-01T08:00:00+02:00', 2),
      p('2026-06-01T12:00:00+02:00', 3),
      p('2026-06-01T16:00:00+02:00', 5),
    ];

    const grid = toHeatmapGrid({
      points,
      sourceResolution: 'stunde',
      aggregationType: 'fluss',
      mode: 'woche_wochentag',
      unit: 'Eintritte',
    });

    const cell = grid.cells.find((c) => c.dateKey === '2026-06-01');
    expect(cell).toBeDefined();
    expect(cell?.value).toBe(10);
    expect(cell?.isNull).toBe(false);
  });

  it('summiert Bestandsgrößen NIEMALS auf, sondern nimmt last_value (§2.1 Nr. 4)', () => {
    // 3 Stunden desselben Tages mit Bestandsgröße (z. B. ARR 100k, 105k, 102k) -> 102k (nicht 307k!)
    const points: TimeSeriesPoint[] = [
      p('2026-06-01T08:00:00+02:00', 100000),
      p('2026-06-01T12:00:00+02:00', 105000),
      p('2026-06-01T16:00:00+02:00', 102000),
    ];

    const grid = toHeatmapGrid({
      points,
      sourceResolution: 'stunde',
      aggregationType: 'bestand',
      mode: 'woche_wochentag',
      unit: 'EUR',
    });

    const cell = grid.cells.find((c) => c.dateKey === '2026-06-01');
    expect(cell).toBeDefined();
    expect(cell?.value).toBe(102000);
    expect(cell?.value).not.toBe(307000);
  });

  it('summiert Ratios / Verhältnisse NIEMALS auf (§2.1 Nr. 4)', () => {
    const points: TimeSeriesPoint[] = [
      p('2026-06-01T08:00:00+02:00', 1.5),
      p('2026-06-01T16:00:00+02:00', 2.0),
    ];

    const grid = toHeatmapGrid({
      points,
      sourceResolution: 'stunde',
      aggregationType: 'verhaeltnis',
      mode: 'woche_wochentag',
      unit: 'x',
    });

    const cell = grid.cells.find((c) => c.dateKey === '2026-06-01');
    expect(cell?.value).toBe(2.0);
  });

  it('markiert leere Zellen eindeutig als keine Daten mit barrierefreiem Text (§2.1 Nr. 4)', () => {
    const points: TimeSeriesPoint[] = [p('2026-06-01T08:00:00+02:00', 10)];

    const grid = toHeatmapGrid({
      points,
      sourceResolution: 'tag',
      aggregationType: 'fluss',
      mode: 'woche_wochentag',
      unit: 'Deals',
    });

    // Dienstag 02.06.2026 hat keine Daten
    const tuesdayCell = grid.cells.find((c) => c.weekdayIndex === 1);
    expect(tuesdayCell).toBeDefined();
    expect(tuesdayCell?.isNull).toBe(true);
    expect(tuesdayCell?.accessibleName).toContain('Keine Daten');
  });

  it('berechnet 52 x 7 Zellen in unter 16 ms (§2.3 Nr. 13)', () => {
    const points: TimeSeriesPoint[] = [];
    const start = new Date(Date.UTC(2025, 0, 1));
    for (let i = 0; i < 52 * 7 * 4; i++) {
      const d = new Date(start.getTime() + i * 6 * 3600_000);
      points.push(p(d.toISOString(), (i % 100) + 1));
    }

    const input = {
      points,
      sourceResolution: 'stunde' as const,
      aggregationType: 'fluss' as const,
      mode: 'woche_wochentag' as const,
      unit: 'Ereignisse',
    };
    // Warmup für JIT/Coverage-Rauschen; gemessen wird der schnellste Lauf.
    toHeatmapGrid(input);
    let grid = toHeatmapGrid(input);
    let best = Infinity;
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      grid = toHeatmapGrid(input);
      best = Math.min(best, performance.now() - t0);
    }

    expect(grid.cells.length).toBeGreaterThanOrEqual(52 * 7);
    expect(best).toBeLessThan(16);
  });

  it('behandelt alle 20 Referenzfälle deterministisch', () => {
    for (const testCase of heatmapCases) {
      const grid = toHeatmapGrid(testCase.input as unknown as HeatmapGridInput);
      expect(grid.cells.length).toBe(testCase.expectedCellCount);
      if (testCase.expectedNullCellCount !== undefined) {
        const nullCount = grid.cells.filter((c) => c.isNull).length;
        expect(nullCount).toBe(testCase.expectedNullCellCount);
      }
    }
  });
});
