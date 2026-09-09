// Vitest-Wrapper: 002 - Scenario Run Integrity
// G31: Vier-Schritte-Verfahren. Original-Harness (scenarioRunIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runScenarioRunTest } from '../scenarioRunIntegrity.test';

describe('002 - Scenario Run Integrity', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runScenarioRunTest();
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
