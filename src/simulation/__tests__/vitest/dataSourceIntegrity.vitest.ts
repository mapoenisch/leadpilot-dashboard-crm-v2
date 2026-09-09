// Vitest-Wrapper: 021 - Data Source
// G31: Vier-Schritte-Verfahren. Original-Harness (dataSourceIntegrity.test.ts) unverändert.
import { describe, it, expect } from 'vitest';
import { runDataSourceTest } from '../dataSourceIntegrity.test';

describe('021 - Data Source', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runDataSourceTest();
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
