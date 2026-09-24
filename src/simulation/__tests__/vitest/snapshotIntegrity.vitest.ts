// Vitest-Wrapper: 006 - Snapshot Integrity
// G31: Vier-Schritte-Verfahren. Original-Harness (snapshotIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runSnapshotTest } from '../snapshotIntegrity.test';

describe('006 - Snapshot Integrity', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runSnapshotTest();
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
