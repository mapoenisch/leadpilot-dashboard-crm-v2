// Vitest-Wrapper: 010 - CS Health Model
// G31: Vier-Schritte-Verfahren. Original-Harness (csHealthIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runCSHealthIntegrityTest } from '../csHealthIntegrity.test';

describe('010 - CS Health Model', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runCSHealthIntegrityTest();
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
