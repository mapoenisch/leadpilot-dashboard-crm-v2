import { describe, it, expect } from 'vitest';
import {
  BASELINE_PARAMS,
  PARAM_LIMITS,
  PRESETS,
  clampParameters,
  calculateProjection,
  calculateTornadoSensitivity,
} from '../whatIfModel';

describe('whatIfModel Unit Tests', () => {
  it('liefert bei Baseline-Parametern exakt den Ziel-Plan-ARR 2026', () => {
    const res = calculateProjection(BASELINE_PARAMS);

    // Baseline ARR nach 12 Monaten muss exakt ~620.000 € entsprechen (Plan 2026 Faktenblatt)
    expect(res.baselineArrM12).toBeCloseTo(620000, -3);
    expect(res.targetArr).toBe(res.baselineArrM12);
    expect(res.deltaArr).toBe(0);
    expect(res.deltaArrPercent).toBe(0);

    // Kundenwachstum von 66 auf ca. 100 Kunden
    expect(res.startingCustomers).toBe(66);
    expect(res.finalCustomers).toBeGreaterThanOrEqual(98);
    expect(res.finalCustomers).toBeLessThanOrEqual(102);

    // 12 Monatspunkte vorhanden
    expect(res.monthlyCurve).toHaveLength(12);
    expect(res.monthlyCurve[0]?.month).toBe(1);
    expect(res.monthlyCurve[11]?.month).toBe(12);
  });

  it('begrenzt Parameter innerhalb der zulässigen Min/Max-Grenzen', () => {
    const clamped = clampParameters({
      churnRate: 10.0, // max 4.5
      salesCycleDays: 10, // min 20
      marketingBudget: 200000, // max 150000
      winRate: 2.0, // min 6.0
    });

    expect(clamped.churnRate).toBe(PARAM_LIMITS.churnRate.max);
    expect(clamped.salesCycleDays).toBe(PARAM_LIMITS.salesCycleDays.min);
    expect(clamped.marketingBudget).toBe(PARAM_LIMITS.marketingBudget.max);
    expect(clamped.winRate).toBe(PARAM_LIMITS.winRate.min);
  });

  it('berechnet positive ARR-Deltas bei Wachstums-Offensive', () => {
    const growthParams = PRESETS.growth.params;
    const res = calculateProjection(growthParams);

    expect(res.targetArr).toBeGreaterThan(res.baselineArrM12);
    expect(res.deltaArr).toBeGreaterThan(100000); // spürbarer Zuwachs
    expect(res.deltaArrPercent).toBeGreaterThan(15);
    expect(res.newCustomersTotal).toBeGreaterThan(58);
  });

  it('berechnet positive Effekte bei Effizienz & Retention', () => {
    const efficiencyParams = PRESETS.efficiency.params;
    const res = calculateProjection(efficiencyParams);

    expect(res.targetArr).toBeGreaterThan(res.baselineArrM12);
    expect(res.churnLossTotal).toBeLessThan(res.newArrTotal);
    expect(res.finalCustomers).toBeGreaterThan(res.startingCustomers);
  });

  it('berechnet Dämpfung und negatives Delta bei Stresstest / Krise', () => {
    const stressParams = PRESETS.stress.params;
    const res = calculateProjection(stressParams);

    expect(res.targetArr).toBeLessThan(res.baselineArrM12);
    expect(res.deltaArr).toBeLessThan(0);
    expect(res.deltaArrPercent).toBeLessThan(0);
  });

  it('generiert absteigend sortierte Tornado-Sensitivitätsliste mit 4 Hebeln', () => {
    const tornado = calculateTornadoSensitivity(BASELINE_PARAMS);

    expect(tornado).toHaveLength(4);
    // Sortierung nach Swing absteigend
    for (let i = 0; i < tornado.length - 1; i += 1) {
      const current = tornado[i];
      const next = tornado[i + 1];
      if (current && next) {
        expect(current.swing).toBeGreaterThanOrEqual(next.swing);
      }
    }

    // Prüfen, ob alle 4 Hebel vertreten sind
    const keys = tornado.map((t) => t.key);
    expect(keys).toContain('churnRate');
    expect(keys).toContain('salesCycleDays');
    expect(keys).toContain('marketingBudget');
    expect(keys).toContain('winRate');

    // Favorable sollte immer besseres Delta haben als Unfavorable
    tornado.forEach((item) => {
      expect(item.favorableArrDelta).toBeGreaterThan(item.unfavorableArrDelta);
      expect(item.swing).toBeCloseTo(item.favorableArrDelta - item.unfavorableArrDelta, 1);
    });
  });

  it('berechnet CAC-Payback-Monate plausibel', () => {
    const res = calculateProjection(BASELINE_PARAMS);

    // CAC sollte im Bereich 1.000 € - 1.200 € liegen
    expect(res.cac).toBeGreaterThan(900);
    expect(res.cac).toBeLessThan(1500);

    // Payback-Dauer bei 333 € Deckungsbeitrag/Monat: ca. 3 - 4 Monate
    expect(res.cacPaybackMonths).toBeGreaterThan(2.5);
    expect(res.cacPaybackMonths).toBeLessThan(5.0);
  });
});
