// Gate G64 (Auftrag 067R): Der Finding-Check der Release-Readiness ist
// fail-closed — fehlende/veraltete Reports, technische Fehler, jede
// Register-Abweichung und offene Findings vor G65 ergeben OFFEN.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkFindings } from '../v23FindingReadiness';

type Outcome = 'passed' | 'failed';

let dir: string;

const KNOWN = [
  {
    id: 'PR-SOURCE-04',
    title: 'Quelle',
    severity: 'critical',
    targetGate: 'G47',
    runner: 'vitest',
    expected: 'passing',
  },
  {
    id: 'PR-CLIP-13',
    title: 'Clip',
    severity: 'important',
    targetGate: 'G56',
    runner: 'playwright',
    expected: 'passing',
  },
  {
    id: 'PR-LICENSE-19',
    title: 'Lizenz',
    severity: 'important',
    targetGate: 'G65',
    runner: 'vitest',
    expected: 'failing',
  },
];

function write(
  known: unknown[],
  vitest: Record<string, Outcome>,
  playwright: Record<string, Outcome>,
): void {
  fs.writeFileSync(path.join(dir, 'known.json'), JSON.stringify(known));
  const assertionResults = Object.entries(vitest).map(([id, status]) => ({
    ancestorTitles: ['v2.3.0'],
    title: `[${id}] Vertrag`,
    status,
    failureMessages:
      status === 'failed'
        ? [`AssertionError: DATA_SOURCE_UNAVAILABLE / All Rights Reserved: expected '' to contain 'x'`]
        : [],
  }));
  fs.writeFileSync(
    path.join(dir, 'vitest.json'),
    JSON.stringify({ testResults: [{ name: 'a.ts', status: 'passed', assertionResults }] }),
  );
  const specs = Object.entries(playwright).map(([id, status]) => ({
    title: `[${id}] Vertrag`,
    tests: [{ results: [{ status }] }],
  }));
  fs.writeFileSync(path.join(dir, 'playwright.json'), JSON.stringify({ suites: [{ specs }] }));
}

function check(maxArtifactAgeMs = 60 * 60 * 1000) {
  return checkFindings({
    rootDir: dir,
    findingsDir: dir,
    knownFindingsPath: path.join(dir, 'known.json'),
    maxArtifactAgeMs,
  });
}

describe('checkFindings (G64)', () => {
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v23-findings-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('ist erfüllt, wenn Messung und Register übereinstimmen und nur G65 offen ist', () => {
    write(
      KNOWN,
      { 'PR-SOURCE-04': 'passed', 'PR-LICENSE-19': 'failed' },
      { 'PR-CLIP-13': 'passed' },
    );
    const result = check();
    expect(result.ok).toBe(true);
    expect(result.metrics[0]).toMatchObject({ status: 'ERFÜLLT', actual: '2/3 grün' });
    expect(result.metrics[0]?.note).toContain('PR-LICENSE-19');
  });

  it('weist fehlende Reports ab', () => {
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.metrics[0]).toMatchObject({ status: 'OFFEN', actual: 'FEHLT' });
  });

  it('weist veraltete Reports ab', () => {
    write(
      KNOWN,
      { 'PR-SOURCE-04': 'passed', 'PR-LICENSE-19': 'failed' },
      { 'PR-CLIP-13': 'passed' },
    );
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
    fs.utimesSync(path.join(dir, 'vitest.json'), old, old);
    expect(check().metrics[0]).toMatchObject({ status: 'OFFEN', actual: 'VERALTET' });
  });

  it('weist eine Regression gegen das Register ab', () => {
    write(
      KNOWN,
      { 'PR-SOURCE-04': 'failed', 'PR-LICENSE-19': 'failed' },
      { 'PR-CLIP-13': 'passed' },
    );
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/PR-SOURCE-04/);
  });

  it('weist ein fehlendes Resultat ab', () => {
    write(KNOWN, { 'PR-LICENSE-19': 'failed' }, { 'PR-CLIP-13': 'passed' });
    expect(check().ok).toBe(false);
  });

  it('weist ein vor G65 als failing registriertes Finding ab', () => {
    const known = KNOWN.map((f) => (f.id === 'PR-SOURCE-04' ? { ...f, expected: 'failing' } : f));
    write(
      known,
      { 'PR-SOURCE-04': 'failed', 'PR-LICENSE-19': 'failed' },
      { 'PR-CLIP-13': 'passed' },
    );
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/ohne Gate-Nachweis: PR-SOURCE-04/);
  });

  it('weist technische Runner-Fehler ab', () => {
    write(
      KNOWN,
      { 'PR-SOURCE-04': 'passed', 'PR-LICENSE-19': 'passed' },
      { 'PR-CLIP-13': 'passed' },
    );
    const report = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'), 'utf-8'));
    report.testResults.push({ name: 'b.ts', status: 'failed', message: 'collection failed' });
    fs.writeFileSync(path.join(dir, 'vitest.json'), JSON.stringify(report));
    expect(check().metrics[0]?.actual).toMatch(/technische Fehler/);
  });
});
