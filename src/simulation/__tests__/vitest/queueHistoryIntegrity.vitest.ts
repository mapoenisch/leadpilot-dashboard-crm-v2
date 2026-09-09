// Vitest-Wrapper: 020 - Queue History
// G31: Vier-Schritte-Verfahren. Original-Harness (queueHistoryIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runQueueHistoryTest } from '../queueHistoryIntegrity.test';

describe('020 - Queue History', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runQueueHistoryTest();
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
