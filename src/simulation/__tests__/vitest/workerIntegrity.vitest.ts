// Vitest-Wrapper: 004 - Worker Integrity
// G31: Vier-Schritte-Verfahren. Original-Harness (workerIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runWorkerTest } from '../workerIntegrity.test';

describe('004 - Worker Integrity', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runWorkerTest();
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
