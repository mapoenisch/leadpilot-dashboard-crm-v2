// Vitest-Wrapper: 008 - Time Series Aggregation
// G31: Vier-Schritte-Verfahren. Original-Harness (timeSeriesAggregationIntegrity.test.ts) unverändert.
//
// ISOLATIONS-SETUP: Diese Suite erwartet dass ScenarioService bereits Runs fuer
// ver-base-2026-v1 enthaelt. Im Legacy-Harness liefert Suite 005 diesen State.
// In Vitest (isolierter Prozess) muss der State explizit aufgebaut werden.

import { beforeAll, describe, it, expect } from 'vitest';
import { scenarioService } from '../../scenarioService';
import { DEFAULT_BASE_2026_VERSION_ID } from '../../scenarioRepository';
import { runTimeSeriesAggregationTest } from '../timeSeriesAggregationIntegrity.test';

beforeAll(async () => {
  const existingRuns = scenarioService.getRunsForVersion(DEFAULT_BASE_2026_VERSION_ID);
  if (existingRuns.length === 0) {
    await scenarioService.runScenarioVersion(DEFAULT_BASE_2026_VERSION_ID, 42, 10);
  }
}, 30_000);

describe('008 - Time Series Aggregation', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runTimeSeriesAggregationTest();
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
