import { ScenarioParameters } from '../types/scenario';
import {
  MEASURE_PARAMETER_KEYS,
  Measure,
  MeasureChange,
  MeasureConflict,
  MeasureError,
  MeasureParameterKey,
} from '../types/measure';
import { V1_PARAMETER_DEFINITIONS } from './parameterRegistry';

/**
 * Pure, deterministic resolver for effective parameters across simulation ticks.
 * ZERO dependencies on Wall-Clock APIs, PRNG, or React.
 */
export class EffectiveParameterResolver {
  private readonly measures: readonly Measure[];

  constructor(
    private readonly base: Readonly<ScenarioParameters>,
    measures: readonly Measure[]
  ) {
    for (const m of measures) {
      this.validate(m);
    }
    // Deterministic ordering: startTick ASC, createdAt ASC, id ASC
    this.measures = [...measures].sort(
      (a, b) =>
        a.startTick - b.startTick ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id)
    );
  }

  /**
   * Computes effective scenario parameters at a given tick (0-based).
   */
  public at(tick: number): ScenarioParameters {
    let p: ScenarioParameters = JSON.parse(JSON.stringify(this.base));
    for (const m of this.measures) {
      const f = this.rampFactor(m, tick);
      if (f === 0) continue;
      for (const c of m.changes) {
        p = this.applyChange(p, c, f);
      }
    }
    return this.clamp(p);
  }

  /**
   * Detects potential measure conflicts on overlapping active periods (Decisions 429–438).
   * Generates informative warnings without automatic preemption.
   */
  public detectConflicts(): MeasureConflict[] {
    const conflicts: MeasureConflict[] = [];
    const seen = new Set<string>();

    for (const paramKey of MEASURE_PARAMETER_KEYS) {
      const affectingMeasures: { measure: Measure; change: MeasureChange }[] = [];
      for (const m of this.measures) {
        const change = m.changes.find((c) => c.parameter === paramKey);
        if (change) {
          affectingMeasures.push({ measure: m, change });
        }
      }

      for (let i = 0; i < affectingMeasures.length; i++) {
        for (let j = i + 1; j < affectingMeasures.length; j++) {
          const m1 = affectingMeasures[i].measure;
          const c1 = affectingMeasures[i].change;
          const m2 = affectingMeasures[j].measure;
          const c2 = affectingMeasures[j].change;

          const start1 = m1.startTick;
          const end1 = m1.durationTicks !== undefined ? start1 + m1.durationTicks : Infinity;
          const start2 = m2.startTick;
          const end2 = m2.durationTicks !== undefined ? start2 + m2.durationTicks : Infinity;

          const overlaps = start1 < end2 && start2 < end1;
          if (overlaps) {
            const pairKey = [m1.id, m2.id].sort().join(':') + `:${paramKey}`;
            if (seen.has(pairKey)) continue;
            seen.add(pairKey);

            if (c1.mode === 'set' && c2.mode === 'set') {
              conflicts.push({
                parameter: paramKey,
                measureIds: [m1.id, m2.id],
                kind: 'MULTIPLE_SET',
                message: `Mehrere Maßnahmen („${m1.name}" und „${m2.name}") setzen gleichzeitig absolute Zielwerte für ${V1_PARAMETER_DEFINITIONS[paramKey]?.label || paramKey}.`,
              });
            } else if (
              (c1.mode === 'set' && (c2.mode === 'delta' || c2.mode === 'multiply')) ||
              (c2.mode === 'set' && (c1.mode === 'delta' || c1.mode === 'multiply'))
            ) {
              conflicts.push({
                parameter: paramKey,
                measureIds: [m1.id, m2.id],
                kind: 'SET_AND_RELATIVE',
                message: `Maßnahme mit absolutem Zielwert („${c1.mode === 'set' ? m1.name : m2.name}") überlappt mit relativer Modifikation („${c1.mode === 'set' ? m2.name : m1.name}") auf ${V1_PARAMETER_DEFINITIONS[paramKey]?.label || paramKey}.`,
              });
            }
          }
        }
      }
    }

    return conflicts;
  }

  // --- Internal calculation helpers ---

  private rampFactor(m: Measure, tick: number): number {
    if (tick < m.startTick) return 0;
    if (m.durationTicks !== undefined && tick >= m.startTick + m.durationTicks) return 0; // Revert after duration
    const ramp = m.rampUpTicks ?? 0;
    if (ramp > 0 && tick < m.startTick + ramp) {
      return (tick - m.startTick) / ramp; // Linear interpolation
    }
    return 1;
  }

  private applyChange(
    p: ScenarioParameters,
    c: MeasureChange,
    f: number
  ): ScenarioParameters {
    if (c.parameter === 'channelMix') {
      // V1: channelMix measures apply direct set
      return p;
    }

    const key = c.parameter as keyof ScenarioParameters;
    const cur = p[key] as number;
    const baseVal = this.base[key] as number;
    let next = cur;

    if (c.mode === 'set') {
      next = baseVal + (c.value - baseVal) * f;
    } else if (c.mode === 'delta') {
      next = cur + c.value * f;
    } else if (c.mode === 'multiply') {
      next = cur * (1 + (c.value - 1) * f);
    }

    (p[key] as number) = next;
    return p;
  }

  private clamp(p: ScenarioParameters): ScenarioParameters {
    for (const key of Object.keys(V1_PARAMETER_DEFINITIONS) as (keyof ScenarioParameters)[]) {
      const def = V1_PARAMETER_DEFINITIONS[key];
      if (typeof p[key] === 'number' && def.min !== undefined && def.max !== undefined) {
        (p[key] as number) = Math.min(def.max, Math.max(def.min, p[key] as number));
      }
    }
    return p;
  }

  private validate(m: Measure): void {
    if (m.startTick < 0) {
      throw new MeasureError('INVALID_TIMING', `Maßnahme "${m.id}": startTick < 0.`);
    }
    if (m.durationTicks !== undefined && m.durationTicks <= 0) {
      throw new MeasureError('INVALID_TIMING', `Maßnahme "${m.id}": durationTicks <= 0.`);
    }
    if (!m.changes?.length) {
      throw new MeasureError('EMPTY_CHANGES', `Maßnahme "${m.id}": keine changes definiert.`);
    }
    for (const c of m.changes) {
      if (!MEASURE_PARAMETER_KEYS.includes(c.parameter)) {
        throw new MeasureError(
          'INVALID_PARAMETER',
          `Maßnahme "${m.id}": Parameter "${c.parameter}" ist nicht im V1-Katalog.`
        );
      }
    }
  }
}
