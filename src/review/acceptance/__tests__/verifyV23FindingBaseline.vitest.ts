// G44 (Auftrag 067A, Block A): Selbsttest des Finding-Baseline-Verifiers.
// Grün — beweist, dass exakt erwartete rote Findings akzeptiert, jede
// zusätzliche, fehlende oder unerwartet grüne Abweichung aber abgewiesen wird.
// Nach Review-Nacharbeit zusätzlich: synthetische Gegenproben für technische
// Fehler, Runner-Mismatch und widersprüchliche Ergebnisse (fail-closed).
import { describe, expect, it } from 'vitest';
import {
  compareFindingResults,
  parsePlaywrightFindingResults,
  parseVitestFindingResults,
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
    const exact = [
      result('PR-AUTH-01', 'vitest', 'failing'),
      result('PR-CLIP-13', 'playwright', 'failing'),
    ];
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
    const green = [
      result('PR-AUTH-01', 'vitest', 'failing'),
      result('PR-CLIP-13', 'playwright', 'passing'),
    ];
    const comparison = compareFindingResults(contracts, green);
    expect(comparison.ok).toBe(false);
    expect(comparison.mismatches.some((mismatch) => mismatch.includes('PR-CLIP-13'))).toBe(true);
  });

  it('weist ein Ergebnis aus falschem Runner ab', () => {
    const wrongRunner = [
      result('PR-AUTH-01', 'vitest', 'failing'),
      result('PR-CLIP-13', 'vitest', 'failing'),
    ];
    const comparison = compareFindingResults(contracts, wrongRunner);
    expect(comparison.ok).toBe(false);
    expect(comparison.mismatches.some((mismatch) => mismatch.includes('PR-CLIP-13'))).toBe(true);
  });

  it('weist widersprüchliche Ergebnisse derselben ID ab', () => {
    const conflicted = [
      result('PR-AUTH-01', 'vitest', 'failing'),
      result('PR-AUTH-01', 'vitest', 'passing'),
      result('PR-CLIP-13', 'playwright', 'failing'),
    ];
    const comparison = compareFindingResults(contracts, conflicted);
    expect(comparison.ok).toBe(false);
    expect(
      comparison.mismatches.some(
        (mismatch) => mismatch.includes('PR-AUTH-01') && mismatch.includes('conflict'),
      ),
    ).toBe(true);
  });
});

describe('parseVitestFindingResults', () => {
  it('meldet Collection-Fehler als technischen Fehler statt Befund', () => {
    const report = JSON.stringify({
      testResults: [
        {
          name: 'broken.acceptance.ts',
          status: 'failed',
          message: 'Error: Cannot find module',
          assertionResults: [],
        },
      ],
    });
    const parsed = parseVitestFindingResults(report);
    expect(parsed.results).toEqual([]);
    expect(parsed.technicalErrors.length).toBe(1);
  });

  it('meldet fehlgeschlagene Assertion ohne Expect-Signatur als technischen Fehler', () => {
    const report = JSON.stringify({
      testResults: [
        {
          name: 'io.acceptance.ts',
          status: 'failed',
          assertionResults: [
            {
              ancestorTitles: [],
              title: '[PR-AUTH-01] io',
              status: 'failed',
              failureMessages: ['Error: ENOENT: no such file or directory'],
            },
          ],
        },
      ],
    });
    const parsed = parseVitestFindingResults(report);
    expect(parsed.results).toEqual([]);
    expect(parsed.technicalErrors.some((entry) => entry.includes('PR-AUTH-01'))).toBe(true);
  });

  it('wertet fehlgeschlagene Expect-Assertion als fachliches failing', () => {
    const report = JSON.stringify({
      testResults: [
        {
          name: 'ok.acceptance.ts',
          status: 'failed',
          assertionResults: [
            {
              ancestorTitles: [],
              title: '[PR-AUTH-01] vertrag',
              status: 'failed',
              failureMessages: ['AssertionError: expected false to be true'],
            },
          ],
        },
      ],
    });
    const parsed = parseVitestFindingResults(report);
    expect(parsed.technicalErrors).toEqual([]);
    expect(parsed.results).toEqual([result('PR-AUTH-01', 'vitest', 'failing')]);
  });
});

describe('parsePlaywrightFindingResults', () => {
  it('meldet Timeouts ohne Expect-Signatur als technischen Fehler', () => {
    const report = JSON.stringify({
      suites: [
        {
          title: 'element-clipping.acceptance.ts',
          specs: [
            {
              title: '[PR-CLIP-13] clipping',
              tests: [
                {
                  results: [{ status: 'timedOut', error: { message: 'Timeout 30000ms exceeded' } }],
                },
              ],
            },
          ],
        },
      ],
    });
    const parsed = parsePlaywrightFindingResults(report);
    expect(parsed.results).toEqual([]);
    expect(parsed.technicalErrors.some((entry) => entry.includes('PR-CLIP-13'))).toBe(true);
  });

  it('meldet Report-Level-Fehler (z. B. Auth-Setup) als technischen Fehler', () => {
    const report = JSON.stringify({
      suites: [],
      errors: [{ message: 'Global setup failed: login to /login timed out' }],
    });
    const parsed = parsePlaywrightFindingResults(report);
    expect(parsed.results).toEqual([]);
    expect(parsed.technicalErrors.length).toBe(1);
  });

  it('wertet fehlgeschlagenen Expect als fachliches failing', () => {
    const report = JSON.stringify({
      suites: [
        {
          title: 'element-clipping.acceptance.ts',
          specs: [
            {
              title: '[PR-CLIP-13] clipping',
              tests: [
                {
                  results: [
                    {
                      status: 'failed',
                      error: {
                        message:
                          'Error: rechter Rand\n\nexpect(received).toBeLessThanOrEqual(expected)\n\nExpected: <= 375',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const parsed = parsePlaywrightFindingResults(report);
    expect(parsed.technicalErrors).toEqual([]);
    expect(parsed.results).toEqual([result('PR-CLIP-13', 'playwright', 'failing')]);
  });
});
