// Vitest-Wrapper: 017 - Region Split
// G31: Vier-Schritte-Verfahren. Original-Harness (regionSplitIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runRegionSplitIntegrityTest } from '../regionSplitIntegrity.test';

describe('017 - Region Split', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runRegionSplitIntegrityTest();
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
