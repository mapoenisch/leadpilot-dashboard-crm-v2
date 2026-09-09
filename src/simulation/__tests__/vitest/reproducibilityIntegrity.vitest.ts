// Vitest-Wrapper: 019 - Reproducibility
// G31: Vier-Schritte-Verfahren. Original-Harness (reproducibilityIntegrity.test.ts) unverändert.
//
// HAERTUNG: Mutations-Beweis zeigte, dass der Original-Harness eine veraenderte PRNG-Konstante
// ueberlebt (Reproduzierbarkeit bleibt erhalten, absoluter Wert nicht geprueft).
// Zusaetzlicher Golden-Value-Test faengt PRNG-Algo-Aenderungen ab.

import { describe, it, expect } from 'vitest';
import { DeterministicRNG } from '../../prng';
import { runReproducibilityTest } from '../reproducibilityIntegrity.test';

describe('019 - Reproducibility', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runReproducibilityTest();
    if (!result.success) {
      const failures = result.log.filter((l) => l.includes('❌'));
      throw new Error(
        'Integrity-Suite fehlgeschlagen:\n' +
          (failures.join('\n') || result.log.slice(-5).join('\n'))
      );
    }
    expect(result.success).toBe(true);
  }, 60_000);

  it('PRNG Mulberry32 Golden Value — Seed 42 erste drei Werte', () => {
    // Goldwerte fuer Mulberry32 mit Seed 42 und Konstante 0x6d2b79f5.
    // Schlaegt fehl wenn PRNG-Konstante oder Algorithmus veraendert wird.
    const rng = new DeterministicRNG(42);
    const v1 = rng.next();
    const v2 = rng.next();
    const v3 = rng.next();
    expect(v1).toBeCloseTo(0.6011, 3);
    expect(v2).toBeCloseTo(0.4483, 3);
    expect(v3).toBeCloseTo(0.8525, 3);
  });
});
