// Vitest-Wrapper: 009 - Sales Queue Model
// G31: Vier-Schritte-Verfahren. Original-Harness (salesQueueIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runSalesQueueIntegrityTest } from '../salesQueueIntegrity.test';

describe('009 - Sales Queue Model', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runSalesQueueIntegrityTest();
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
