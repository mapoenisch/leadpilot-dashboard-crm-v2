// Vitest-Wrapper: 005 - Monte Carlo Integrity
// G31: Vier-Schritte-Verfahren. Original-Harness (monteCarloIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runMonteCarloTest } from '../monteCarloIntegrity.test';

describe('005 - Monte Carlo Integrity', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runMonteCarloTest();
    if (!result.success) {
      const failures = result.log.filter((l) => l.includes('\u274c'));
      throw new Error(
        'Integrity-Suite fehlgeschlagen:\n' +
          (failures.join('\n') || result.log.slice(-5).join('\n')),
      );
    }
    expect(result.success).toBe(true);
  }, 60_000);
});
