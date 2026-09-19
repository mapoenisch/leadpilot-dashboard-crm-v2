// Vitest-Wrapper: 014 - Scenario Comparison
// G31: Vier-Schritte-Verfahren. Original-Harness (scenarioComparisonIntegrity.test.ts) unverändert.
//
// ISOLATIONS-SETUP: TEST AB erwartet dass DEFAULT_BASE_2026_VERSION_ID bereits Runs hat
// (damit hasRunsA=true, hasRunsB=false fuer frisches ver2, und summaryExplanation
// enthaelt 'Simulation ausstehend'). Im Legacy-Harness liefert Suite 002 diesen State.

import { beforeAll, describe, it, expect } from 'vitest';
import { scenarioService } from '../../scenarioService';
import { DEFAULT_BASE_2026_VERSION_ID } from '../../scenarioRepository';
import { runScenarioComparisonIntegrityTest } from '../scenarioComparisonIntegrity.test';

beforeAll(async () => {
  const existingRuns = scenarioService.getRunsForVersion(DEFAULT_BASE_2026_VERSION_ID);
  if (existingRuns.length === 0) {
    await scenarioService.runScenarioVersion(DEFAULT_BASE_2026_VERSION_ID, 42, 10);
  }
}, 30_000);

describe('014 - Scenario Comparison', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runScenarioComparisonIntegrityTest();
    if (!result.success) {
      const failures = result.log.filter((l) => l.includes('❌'));
      throw new Error(
        'Integrity-Suite fehlgeschlagen:\n' +
          (failures.join('\n') || result.log.slice(-5).join('\n')),
      );
    }
    expect(result.success).toBe(true);
  }, 60_000);
});
