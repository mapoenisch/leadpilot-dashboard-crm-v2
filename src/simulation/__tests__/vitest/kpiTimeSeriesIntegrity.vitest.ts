// Vitest-Wrapper: 023 - KPI Time Series
// G31: Vier-Schritte-Verfahren. Original-Harness (kpiTimeSeriesIntegrity.test.ts) unverändert.
// Rückgabe: Promise<boolean>.
import { describe, it, expect } from 'vitest';
import { runKpiTimeSeriesTest } from '../kpiTimeSeriesIntegrity.test';

describe('023 - KPI Time Series', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runKpiTimeSeriesTest();
    expect(result).toBe(true);
  }, 60_000);
});
