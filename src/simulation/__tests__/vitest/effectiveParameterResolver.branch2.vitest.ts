// Branch2-Tests: EffectiveParameterResolver Restkanten. Der Resolver wird
// sonst nur mittelbar genutzt (simQueues-Charakterisierung, Tick-Loops); eine
// dedizierte Konflikt-/Validierungs-Suite fehlte. Hier: SET_AND_RELATIVE in
// beiden Reihenfolgen und mit multiply, delta+delta ohne Konflikt,
// nicht-überlappende set+set ohne Konflikt, MULTIPLE_SET-Positivfall,
// channelMix-No-op, unbekannter Modus (Fallthrough), durationTicks <= 0 und
// Ramp-Interpolation. Rein/deterministisch, keine Seiteneffekte.
import { describe, it, expect } from 'vitest';
import { EffectiveParameterResolver } from '../../effectiveParameterResolver';
import { DEFAULT_BASE_2026_PARAMETERS } from '../../scenarioRepository';
import { MeasureError, type Measure } from '../../../types/measure';

function measure(
  id: string,
  startTick: number,
  changes: Measure['changes'],
  extra: Partial<Measure> = {},
): Measure {
  return {
    id,
    name: `Maßnahme ${id}`,
    startTick,
    changes,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

const base = () => JSON.parse(JSON.stringify(DEFAULT_BASE_2026_PARAMETERS));

describe('effectiveParameterResolver.branch2', () => {
  it('set überlappt delta → SET_AND_RELATIVE', () => {
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [{ parameter: 'salesRepCount', mode: 'set', value: 5 }]),
      measure('m2', 0, [{ parameter: 'salesRepCount', mode: 'delta', value: 1 }]),
    ]);
    const conflicts = r.detectConflicts().filter((c) => c.parameter === 'salesRepCount');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.kind).toBe('SET_AND_RELATIVE');
    expect(conflicts[0]?.measureIds).toEqual(['m1', 'm2']);
  });

  it('delta vor set (Reihenfolge gespiegelt) → SET_AND_RELATIVE', () => {
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [{ parameter: 'salesRepCount', mode: 'delta', value: 1 }]),
      measure('m2', 0, [{ parameter: 'salesRepCount', mode: 'set', value: 5 }]),
    ]);
    const conflicts = r.detectConflicts().filter((c) => c.parameter === 'salesRepCount');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.kind).toBe('SET_AND_RELATIVE');
  });

  it('set überlappt multiply → SET_AND_RELATIVE', () => {
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [{ parameter: 'salesRepCount', mode: 'multiply', value: 1.5 }]),
      measure('m2', 2, [{ parameter: 'salesRepCount', mode: 'set', value: 6 }]),
    ]);
    const conflicts = r.detectConflicts().filter((c) => c.parameter === 'salesRepCount');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.kind).toBe('SET_AND_RELATIVE');
  });

  it('delta überlappt delta → kein Konflikt', () => {
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [{ parameter: 'salesRepCount', mode: 'delta', value: 1 }]),
      measure('m2', 0, [{ parameter: 'salesRepCount', mode: 'delta', value: 2 }]),
    ]);
    expect(r.detectConflicts().filter((c) => c.parameter === 'salesRepCount')).toEqual([]);
  });

  it('zeitlich getrennte set-Maßnahmen (Duration) → kein Konflikt', () => {
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [{ parameter: 'salesRepCount', mode: 'set', value: 5 }], {
        durationTicks: 5,
      }),
      measure('m2', 10, [{ parameter: 'salesRepCount', mode: 'set', value: 6 }], {
        durationTicks: 5,
      }),
    ]);
    expect(r.detectConflicts().filter((c) => c.parameter === 'salesRepCount')).toEqual([]);
  });

  it('zwei überlappende set → MULTIPLE_SET', () => {
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [{ parameter: 'salesRepCount', mode: 'set', value: 5 }]),
      measure('m2', 3, [{ parameter: 'salesRepCount', mode: 'set', value: 6 }]),
    ]);
    const conflicts = r.detectConflicts().filter((c) => c.parameter === 'salesRepCount');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.kind).toBe('MULTIPLE_SET');
  });

  it('Maßnahmen auf verschiedenen Parametern kollidieren nicht', () => {
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [{ parameter: 'salesRepCount', mode: 'set', value: 5 }]),
      measure('m2', 0, [{ parameter: 'marketingBudgetYearly', mode: 'set', value: 90000 }]),
    ]);
    expect(r.detectConflicts()).toEqual([]);
  });

  it('channelMix-Change ist ein No-op (V1-Direktsetzung)', () => {
    const before = base().channelMix;
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [
        { parameter: 'channelMix', mode: 'set', value: 1 } as unknown as Measure['changes'][number],
      ]),
    ]);
    expect(r.at(5).channelMix).toEqual(before);
  });

  it('unbekannter Modus lässt den Wert unverändert', () => {
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [
        {
          parameter: 'salesRepCount',
          mode: 'add',
          value: 10,
        } as unknown as Measure['changes'][number],
      ]),
    ]);
    expect(r.at(4).salesRepCount).toBe(base().salesRepCount);
  });

  it('durationTicks 0 oder negativ wirft INVALID_TIMING', () => {
    for (const durationTicks of [0, -3]) {
      try {
        new EffectiveParameterResolver(base(), [
          measure('m1', 0, [{ parameter: 'salesRepCount', mode: 'delta', value: 1 }], {
            durationTicks,
          }),
        ]);
        throw new Error('kein Wurf');
      } catch (e) {
        expect((e as MeasureError).code).toBe('INVALID_TIMING');
      }
    }
  });

  it('Ramp interpoliert linear bis zum vollen Faktor', () => {
    const baseVal = base().salesRepCount;
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 4, [{ parameter: 'salesRepCount', mode: 'set', value: baseVal + 4 }], {
        rampUpTicks: 4,
      }),
    ]);
    expect(r.at(2).salesRepCount).toBe(baseVal);
    expect(r.at(6).salesRepCount).toBe(baseVal + 2);
    expect(r.at(8).salesRepCount).toBe(baseVal + 4);
    expect(r.at(100).salesRepCount).toBe(baseVal + 4);
  });

  it('abgelaufene Duration revertiert auf den Basiswert', () => {
    const baseVal = base().salesRepCount;
    const r = new EffectiveParameterResolver(base(), [
      measure('m1', 0, [{ parameter: 'salesRepCount', mode: 'delta', value: 3 }], {
        durationTicks: 2,
      }),
    ]);
    expect(r.at(1).salesRepCount).toBe(baseVal + 3);
    expect(r.at(2).salesRepCount).toBe(baseVal);
  });
});
