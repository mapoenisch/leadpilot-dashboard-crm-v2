// Vitest-Wrapper: 007 - UI Integrity
// G31: Vier-Schritte-Verfahren. Original-Harness (uiIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runUiIntegrityTest } from '../uiIntegrity.test';

describe('007 - UI Integrity', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runUiIntegrityTest();
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
