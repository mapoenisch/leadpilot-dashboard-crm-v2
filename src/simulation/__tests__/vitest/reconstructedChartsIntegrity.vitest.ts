// Vitest-Wrapper: 016 - Reconstructed Charts
// G31: Vier-Schritte-Verfahren. Original-Harness (reconstructedChartsIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runReconstructedChartsIntegrityTest } from '../reconstructedChartsIntegrity.test';

describe('016 - Reconstructed Charts', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runReconstructedChartsIntegrityTest();
    if (!result.success) {
      const failures = result.log.filter((l) => l.includes('\u274c'));
      throw new Error(
        'Integrity-Suite fehlgeschlagen:\n' +
          (failures.join('\n') || result.log.slice(-5).join('\n'))
      );
    }
    expect(result.success).toBe(true);
  }, 60_000);
});
