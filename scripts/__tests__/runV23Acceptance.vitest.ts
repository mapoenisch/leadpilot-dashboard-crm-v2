// Gate G64 (Auftrag 067R): Der Abnahme-Orchestrator ist fail-closed —
// getrennte Exit-Codes je Gate, blockierte Folge-Gates, übersprungene Gates
// machen den Lauf nie grün.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  E2E_PARALLEL,
  E2E_SEQUENTIAL,
  GATES,
  parseArgs,
  resolveOutDir,
  runGates,
  summarize,
} from '../runV23Acceptance.mjs';

type Gate = (typeof GATES)[number];

function run(failing: string[] = [], opts: Partial<ReturnType<typeof parseArgs>> = {}) {
  const calls: string[] = [];
  const results = runGates(
    GATES,
    { only: null, skip: [], failFast: false, ...opts },
    (gate: Gate) => {
      calls.push(gate.id);
      return { exitCode: failing.includes(gate.id) ? 1 : 0, output: '' };
    },
  );
  return { results, calls, ...summarize(results) };
}

describe('runV23Acceptance', () => {
  it('hat eindeutige Gate-Codes ab 11 und deckt die Plan-Gates ab', () => {
    const codes = GATES.map((g) => g.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(Math.min(...codes)).toBe(11);
    expect(GATES.map((g) => g.id)).toEqual([
      'typecheck',
      'lint',
      'format',
      'quality-budget',
      'unit-coverage',
      'integrity',
      'build',
      'bundle',
      'audit',
      'sql-rls',
      'e2e',
      'findings',
      'lighthouse',
      'readiness',
    ]);
  });

  it('endet mit 0, wenn alle Gates grün sind', () => {
    const { result, exitCode, calls } = run();
    expect(result).toBe('passed');
    expect(exitCode).toBe(0);
    expect(new Set(calls).size).toBe(GATES.length);
  });

  it('meldet den Code des ersten roten Gates und läuft weiter', () => {
    const { exitCode, results } = run(['lint', 'audit']);
    expect(exitCode).toBe(12);
    expect(results.find((r) => r.id === 'audit')?.status).toBe('failed');
    expect(results.find((r) => r.id === 'readiness')?.status).toBe('blocked');
  });

  it('blockiert abhängige Gates bei rotem Build', () => {
    const { results, calls, exitCode } = run(['build']);
    expect(exitCode).toBe(17);
    for (const id of ['bundle', 'e2e', 'findings', 'lighthouse', 'readiness']) {
      expect(results.find((r) => r.id === id)?.status).toBe('blocked');
      expect(calls).not.toContain(id);
    }
  });

  it('wertet übersprungene Gates als unvollständig (Exit 2), nie als grün', () => {
    const { result, exitCode } = run([], { skip: ['sql-rls'] });
    expect(result).toBe('incomplete');
    expect(exitCode).toBe(2);
  });

  it('bricht mit --fail-fast nach dem ersten roten Gate ab', () => {
    const { calls, exitCode, results } = run(['typecheck'], { failFast: true });
    expect(calls).toEqual(['typecheck']);
    expect(exitCode).toBe(11);
    expect(results.filter((r) => r.status === 'blocked')).toHaveLength(GATES.length - 1);
  });

  it('bricht einen Schritt-Fehler innerhalb eines Gates sofort ab', () => {
    const steps: string[] = [];
    const results = runGates(
      GATES.filter((g) => g.id === 'audit'),
      { only: null, skip: [], failFast: false },
      (_gate: Gate, step: string[]) => {
        steps.push(step.join(' '));
        return { exitCode: 1, output: 'high' };
      },
    );
    expect(steps).toEqual(['npm audit --omit=dev']);
    expect(results[0]).toMatchObject({ status: 'failed', exitCode: 1 });
  });

  it('erlaubt als rekursiv geleertes Ausgabeziel nur Unterordner von artifacts/', () => {
    const root = path.resolve('/repo');
    expect(resolveOutDir('artifacts/v2.3.0', root)).toBe(path.join(root, 'artifacts/v2.3.0'));
    for (const bad of [
      '.',
      '..',
      'artifacts',
      'artifacts/..',
      'src',
      '/',
      '/tmp/x',
      '../artifacts/x',
    ]) {
      expect(() => resolveOutDir(bad, root), bad).toThrow(/Unterordner von artifacts/);
    }
    expect(() => parseArgs(['--out=.'])).toThrow(/Unterordner von artifacts/);
  });

  it('weist unbekannte Gate-IDs ab', () => {
    expect(() => parseArgs(['--skip=gibtsnicht'])).toThrow(/Unbekannte Gate-ID/);
    expect(parseArgs(['--only=lint,format']).only).toEqual(['lint', 'format']);
  });

  // G64-Befund: audit-health (G62) und member-management (G59) liefen nie in
  // der CI. Jede E2E-Datei muss im Orchestrator UND im CI-Job e2e laufen.
  it('führt jede E2E-Datei im Orchestrator und im CI-Job e2e aus', () => {
    const root = path.resolve(__dirname, '../..');
    const specs = fs
      .readdirSync(path.join(root, 'e2e'))
      .filter((name) => /\.(spec|acceptance)\.ts$/.test(name))
      .map((name) => `e2e/${name}`)
      .sort();
    const orchestrated = [...E2E_PARALLEL, ...E2E_SEQUENTIAL].sort();
    expect(orchestrated).toEqual(specs);
    const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf-8');
    const ciRuns = ci
      .split('\n')
      .filter((line) => /run: npx playwright test /.test(line))
      .join(' ');
    for (const spec of specs) {
      expect(ciRuns, `${spec} im CI-Job e2e`).toContain(spec);
    }
  });
});
