// Charakterisierung: reine Simulations-Basics (PRNG, SystemContext, KPIs, Zielwerte).
import { describe, it, expect } from 'vitest';
import { DeterministicRNG } from '../../prng';
import { systemContext } from '../../systemContext';
import { KPIRegistry } from '../../kpiRegistry';
import { GoalTargetEvaluator } from '../../goalTargetEvaluator';

describe('DeterministicRNG', () => {
  it('gleicher Seed liefert gleiche Sequenz', () => {
    const a = new DeterministicRNG(42);
    const b = new DeterministicRNG(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('next() bleibt in [0, 1), Seed/State sind lesbar', () => {
    const rng = new DeterministicRNG(7);
    expect(rng.getSeed()).toBe(7);
    for (let i = 0; i < 200; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(rng.getState()).not.toBe(7);
  });

  it('nextInt bleibt in den Schranken (inklusive)', () => {
    const rng = new DeterministicRNG(99);
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('pick wirft bei leerem Array, sonst deterministisch', () => {
    expect(() => new DeterministicRNG(1).pick([])).toThrow('Cannot pick from empty array');
    const a = new DeterministicRNG(5).pick(['x', 'y', 'z']);
    const b = new DeterministicRNG(5).pick(['x', 'y', 'z']);
    expect(a).toBe(b);
  });

  it('nextBoolean respektiert 0 und 1 als Ränder', () => {
    const rng = new DeterministicRNG(3);
    expect(Array.from({ length: 20 }, () => rng.nextBoolean(0)).every((v) => v === false)).toBe(
      true,
    );
    expect(Array.from({ length: 20 }, () => rng.nextBoolean(1)).every((v) => v === true)).toBe(
      true,
    );
  });
});

describe('systemContext', () => {
  it('Override/Reset funktioniert deterministisch', () => {
    systemContext.__overrideForTest({
      now: () => '2026-01-01T00:00:00.000Z',
      nextScenarioId: () => 'scen-test',
      nextRunId: (seed, v) => `run-s${seed}-v${v}-t`,
      nextCorrelationId: () => 'corr-test',
      newRunSeed: () => 123456,
    });
    try {
      expect(systemContext.now()).toBe('2026-01-01T00:00:00.000Z');
      expect(systemContext.nextScenarioId()).toBe('scen-test');
      expect(systemContext.nextRunId(7, 2)).toBe('run-s7-v2-t');
      expect(systemContext.nextCorrelationId()).toBe('corr-test');
      expect(systemContext.newRunSeed()).toBe(123456);
    } finally {
      systemContext.__resetForTest();
    }
  });

  it('Echt-Implementierung liefert formatierte IDs und Seed im Bereich', () => {
    expect(systemContext.now()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(systemContext.nextScenarioId()).toMatch(/^scen-\d+$/);
    expect(systemContext.nextRunId(1, 1)).toMatch(/^run-s1-v1-\d+$/);
    expect(systemContext.nextCorrelationId()).toMatch(/^corr-\d+$/);
    const seed = systemContext.newRunSeed();
    expect(seed).toBeGreaterThanOrEqual(100000);
    expect(seed).toBeLessThanOrEqual(999999);
  });
});

describe('KPIRegistry', () => {
  it('bekannte KPIs tragen Richtung und Einheit', () => {
    expect(KPIRegistry.getKPI('liveARR').direction).toBe('HIGHER_IS_BETTER');
    expect(KPIRegistry.getKPI('cac').direction).toBe('LOWER_IS_BETTER');
    expect(KPIRegistry.getKPI('cac').unit).toBe('€');
  });

  it('unbekannte KPI liefert Fallback-Definition statt zu werfen', () => {
    const def = KPIRegistry.getKPI('custom_xyz');
    expect(def.id).toBe('custom_xyz');
    expect(def.direction).toBe('HIGHER_IS_BETTER');
  });

  it('Katalog enthält alle Kern-KPIs', () => {
    const ids = new Set(KPIRegistry.getAllKPIs().map((k) => k.id));
    for (const id of ['liveARR', 'liveMRR', 'liveCustomers', 'ebitda', 'cac', 'csQueueTime']) {
      expect(ids.has(id)).toBe(true);
    }
    expect(KPIRegistry.getAllKPIs().length).toBeGreaterThanOrEqual(17);
  });
});

describe('GoalTargetEvaluator', () => {
  it('HIGHER_IS_BETTER: erreicht / gefährdet / verfehlt', () => {
    expect(
      GoalTargetEvaluator.evaluateGoalTarget('liveARR', 120, { kpiId: 'liveARR', targetValue: 100 })
        .status,
    ).toBe('ACHIEVED');
    expect(
      GoalTargetEvaluator.evaluateGoalTarget('liveARR', 85, { kpiId: 'liveARR', targetValue: 100 })
        .status,
    ).toBe('AT_RISK');
    expect(
      GoalTargetEvaluator.evaluateGoalTarget('liveARR', 50, { kpiId: 'liveARR', targetValue: 100 })
        .status,
    ).toBe('MISSED');
  });

  it('ohne Zielwert: NO_TARGET ohne künstliche Prozente', () => {
    const res = GoalTargetEvaluator.evaluateGoalTarget('liveARR', 50);
    expect(res.status).toBe('NO_TARGET');
    expect(res.achievementPercent).toBeUndefined();
    expect(res.evaluatedAtTick).toBe(0);
  });

  it('Zielwert 0 führt nicht zu NaN', () => {
    const res = GoalTargetEvaluator.evaluateGoalTarget('liveARR', 50, {
      kpiId: 'liveARR',
      targetValue: 0,
    });
    expect(res.status).toBe('ACHIEVED');
    expect(Number.isNaN(res.achievementPercent)).toBe(false);
  });

  it('LOWER_IS_BETTER: unter Ziel erreicht, leicht drüber gefährdet, deutlich drüber verfehlt', () => {
    expect(
      GoalTargetEvaluator.evaluateGoalTarget('cac', 80, { kpiId: 'cac', targetValue: 100 }).status,
    ).toBe('ACHIEVED');
    expect(
      GoalTargetEvaluator.evaluateGoalTarget('cac', 110, { kpiId: 'cac', targetValue: 100 }).status,
    ).toBe('AT_RISK');
    expect(
      GoalTargetEvaluator.evaluateGoalTarget('cac', 200, { kpiId: 'cac', targetValue: 100 }).status,
    ).toBe('MISSED');
  });

  it('Baseline-Vergleich schützt vor Division durch 0', () => {
    expect(GoalTargetEvaluator.computeBaselineComparison('liveARR', 0, 0).percentChange).toBe(0);
    expect(GoalTargetEvaluator.computeBaselineComparison('liveARR', 50, 0).percentChange).toBe(100);
    const better = GoalTargetEvaluator.computeBaselineComparison('liveARR', 120, 100);
    expect(better.absoluteDelta).toBe(20);
    expect(better.isPositiveChange).toBe(true);
    const cheaperIsBetter = GoalTargetEvaluator.computeBaselineComparison('cac', 80, 100);
    expect(cheaperIsBetter.isPositiveChange).toBe(true);
  });
});
