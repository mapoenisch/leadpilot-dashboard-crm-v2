// G44 (Auftrag 067A, Block A): Selbsttest des Finding-Baseline-Verifiers.
// Grün — beweist, dass exakt erwartete rote Findings akzeptiert, jede
// zusätzliche, fehlende oder unerwartet grüne Abweichung aber abgewiesen wird.
import { describe, expect, it } from 'vitest';
import {
  compareFindingResults,
  type FindingRunResult,
  type V23FindingContractLike,
} from '../compareFindingResults';

const contracts: readonly V23FindingContractLike[] = [
  {
    id: 'PR-AUTH-01',
    title: 'Browser-/Demo-Auth und manipulierbare LocalStorage-Sitzung',
    severity: 'critical',
    targetGate: 'G45',
    runner: 'vitest',
    expected: 'failing',
  },
  {
    id: 'PR-CLIP-13',
    title: 'internes Clipping auf /resources/materials bei 375 Pixel',
    severity: 'important',
    targetGate: 'G56',
    runner: 'playwright',
    expected: 'failing',
  },
];

function result(
  id: string,
  runner: 'vitest' | 'playwright',
  actual: 'failing' | 'passing',
): FindingRunResult {
  return { id, runner, actual };
}

describe('compareFindingResults', () => {
  it('akzeptiert exakt die erwarteten roten Findings', () => {
    const exact = [result('PR-AUTH-01', 'vitest', 'failing'), result('PR-CLIP-13', 'playwright', 'failing')];
    expect(compareFindingResults(contracts, exact)).toEqual({ ok: true, mismatches: [] });
  });

  it('weist ein zusätzliches rotes Finding ab', () => {
    const extra = [
      result('PR-AUTH-01', 'vitest', 'failing'),
      result('PR-CLIP-13', 'playwright', 'failing'),
      result('PR-RLS-02', 'vitest', 'failing'),
    ];
    const comparison = compareFindingResults(contracts, extra);
    expect(comparison.ok).toBe(false);
    expect(comparison.mismatches.some((mismatch) => mismatch.includes('PR-RLS-02'))).toBe(true);
  });

  it('weist ein fehlendes erwartetes Finding ab', () => {
    const missing = [result('PR-AUTH-01', 'vitest', 'failing')];
    const comparison = compareFindingResults(contracts, missing);
    expect(comparison.ok).toBe(false);
    expect(comparison.mismatches.some((mismatch) => mismatch.includes('PR-CLIP-13'))).toBe(true);
  });

  it('weist ein unerwartet grünes Finding ab', () => {
    const green = [result('PR-AUTH-01', 'vitest', 'failing'), result('PR-CLIP-13', 'playwright', 'passing')];
    const comparison = compareFindingResults(contracts, green);
    expect(comparison.ok).toBe(false);
    expect(comparison.mismatches.some((mismatch) => mismatch.includes('PR-CLIP-13'))).toBe(true);
  });
});
