// Vitest-Wrapper: 013 - Snapshot Pruning
// G31: Vier-Schritte-Verfahren. Original-Harness (snapshotPruningIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runSnapshotPruningIntegrityTest } from '../snapshotPruningIntegrity.test';

describe('013 - Snapshot Pruning', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runSnapshotPruningIntegrityTest();
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
