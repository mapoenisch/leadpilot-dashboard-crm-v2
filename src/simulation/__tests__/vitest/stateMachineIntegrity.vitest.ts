// Vitest-Wrapper: 012 - State Machine
// G31: Vier-Schritte-Verfahren. Original-Harness (stateMachineIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runStateMachineIntegrityTest } from '../stateMachineIntegrity.test';

describe('012 - State Machine', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runStateMachineIntegrityTest();
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
