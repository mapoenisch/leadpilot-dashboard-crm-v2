// Vitest-Wrapper: 001 - Data Integrity
// G31: Vier-Schritte-Verfahren. Original-Harness (simulationIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runDataIntegrityTest } from '../simulationIntegrity.test';

describe('001 - Data Integrity', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runDataIntegrityTest();
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
