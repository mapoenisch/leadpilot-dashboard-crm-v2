// Vitest-Wrapper: 015 - Internal Resources
// G31: Vier-Schritte-Verfahren. Original-Harness (resourceInfrastructureIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runResourceInfrastructureIntegrityTest } from '../resourceInfrastructureIntegrity.test';

describe('015 - Internal Resources', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runResourceInfrastructureIntegrityTest();
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
