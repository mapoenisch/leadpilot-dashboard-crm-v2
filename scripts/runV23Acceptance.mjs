#!/usr/bin/env node
/**
 * Gate G64 (Auftrag 067R), ergänzt in G65 (067S): Gesamt-Abnahme v2.3.0 in einem Lauf.
 *
 * Führt alle Abnahme-Gates nacheinander aus, schreibt je Gate ein Log und eine
 * maschinenlesbare Zusammenfassung nach artifacts/v2.3.0/ und endet mit einem
 * eindeutigen Exit-Code:
 *
 *   0   alle Gates grün, keins übersprungen
 *   2   unvollständig: kein Gate rot, aber mindestens eins übersprungen (--skip)
 *   11+ Code des ersten roten Gates (siehe GATES), blockierte Gates zählen als rot
 *
 * Aufruf (Umgebung wie im CI-Job e2e: lokales Supabase, VITE_- und E2E_-Variablen):
 *   node scripts/runV23Acceptance.mjs [--only=a,b] [--skip=a,b] [--fail-fast] [--list]
 *                                     [--out=artifacts/v2.3.0]
 *
 * Fail-closed: Kein Gate wird als grün gewertet, das nicht in diesem Lauf mit
 * Exit 0 beendet wurde. Übersprungene Gates machen den Lauf nie grün.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SUMMARY_SCHEMA = 'v23-acceptance/1';

export const E2E_PARALLEL = [
  'e2e/a11y.spec.ts',
  'e2e/audit-health.spec.ts',
  'e2e/auth.spec.ts',
  'e2e/crm-query-export.spec.ts',
  'e2e/element-clipping.acceptance.ts',
  'e2e/resources-viewer.spec.ts',
  'e2e/routes.spec.ts',
  'e2e/semantic-routes.spec.ts',
  'e2e/tenant-isolation.spec.ts',
  'e2e/visual.spec.ts',
];
export const E2E_SEQUENTIAL = [
  'e2e/persistence-multisession.spec.ts',
  'e2e/worker-responsiveness.spec.ts',
  'e2e/run-control.spec.ts',
  'e2e/member-management.spec.ts',
];

/** Reihenfolge = Ausführungsreihenfolge; `needs` blockiert bei rotem Vorgänger. */
export const GATES = [
  { id: 'typecheck', code: 11, steps: [['npx', 'tsc', '--noEmit']] },
  { id: 'lint', code: 12, steps: [['npm', 'run', 'lint']] },
  { id: 'format', code: 13, steps: [['npm', 'run', 'format:check']] },
  { id: 'quality-budget', code: 14, steps: [['npm', 'run', 'verify:quality-budget']] },
  { id: 'unit-coverage', code: 15, steps: [['npm', 'run', 'test:coverage']] },
  { id: 'integrity', code: 16, steps: [['npm', 'run', 'verify']] },
  { id: 'build', code: 17, steps: [['npx', 'vite', 'build']] },
  { id: 'bundle', code: 18, needs: ['build'], steps: [['npx', 'size-limit']] },
  {
    id: 'audit',
    code: 19,
    steps: [
      ['npm', 'audit', '--omit=dev'],
      ['npm', 'audit', '--audit-level=high'],
    ],
  },
  { id: 'sql-rls', code: 20, steps: [[process.env.SUPABASE_BIN || 'supabase', 'test', 'db']] },
  {
    id: 'e2e',
    code: 21,
    needs: ['build'],
    steps: [
      ['npx', 'playwright', 'test', ...E2E_PARALLEL],
      ['npx', 'playwright', 'test', ...E2E_SEQUENTIAL, '--workers=1'],
    ],
  },
  { id: 'findings', code: 22, needs: ['build'], steps: [['npm', 'run', 'verify:v23:baseline']] },
  { id: 'lighthouse', code: 23, needs: ['build'], steps: [['npx', 'lhci', 'autorun']] },
  {
    id: 'readiness',
    code: 24,
    needs: ['unit-coverage', 'bundle', 'audit', 'e2e', 'findings', 'lighthouse'],
    steps: [['npx', 'tsx', 'scripts/verifyV23ReleaseReadiness.ts']],
  },
  // G65 (Auftrag 067S): Lizenz- und Migrationsnachweis. Neue Codes hinten
  // angefügt, damit die Codes 11–24 aus G64 stabil bleiben.
  { id: 'licenses', code: 25, steps: [['npm', 'run', 'verify:licenses']] },
  {
    id: 'migrations',
    code: 26,
    needs: ['sql-rls'],
    steps: [['npm', 'run', 'verify:migrations']],
  },
  // Setzt die lokale DB zurück und stellt sie aus dem Backup wieder her: immer zuletzt.
  {
    id: 'backup',
    code: 27,
    needs: ['migrations'],
    steps: [['npm', 'run', 'verify:backup']],
  },
];

function listArg(argv, name) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return null;
  return hit
    .slice(name.length + 3)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Das Ausgabeziel wird vor jedem Lauf rekursiv geleert. Zulässig ist deshalb
 * nur ein echter Unterordner von artifacts/ — nie der Repo-Root, artifacts/
 * selbst, ein Vorfahr oder ein Pfad außerhalb (Codex-Review #28).
 */
export function resolveOutDir(value, root = ROOT) {
  const artifactsRoot = path.join(root, 'artifacts');
  const resolved = path.resolve(root, value);
  const relative = path.relative(artifactsRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `Ausgabeziel muss ein Unterordner von ${path.relative(root, artifactsRoot) || 'artifacts'}/ sein: ${value}`,
    );
  }
  return resolved;
}

/** Wertet die Argumente aus; unbekannte Gate-IDs sind ein Bedienfehler (Exit 1). */
export function parseArgs(argv, gates = GATES) {
  const known = new Set(gates.map((g) => g.id));
  const only = listArg(argv, 'only');
  const skip = listArg(argv, 'skip') ?? [];
  const unknown = [...(only ?? []), ...skip].filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new Error(`Unbekannte Gate-ID(s): ${unknown.join(', ')}`);
  }
  const outArg = argv.find((a) => a.startsWith('--out='));
  return {
    only,
    skip,
    failFast: argv.includes('--fail-fast'),
    list: argv.includes('--list'),
    outDir: resolveOutDir(outArg ? outArg.slice('--out='.length) : 'artifacts/v2.3.0'),
  };
}

/**
 * Führt die Gates aus. `runStep(gate, step)` liefert den Exit-Code und die
 * Ausgabe eines Schritts (injizierbar für Tests).
 */
export function runGates(gates, options, runStep) {
  const results = [];
  let stop = false;
  for (const gate of gates) {
    const selected = options.only === null || options.only.includes(gate.id);
    if (!selected || options.skip.includes(gate.id)) {
      results.push({
        id: gate.id,
        code: gate.code,
        status: 'skipped',
        exitCode: null,
        durationMs: 0,
        output: '',
      });
      continue;
    }
    const failedNeeds = (gate.needs ?? []).filter((need) => {
      const dep = results.find((r) => r.id === need);
      return dep && (dep.status === 'failed' || dep.status === 'blocked');
    });
    if (stop || failedNeeds.length > 0) {
      results.push({
        id: gate.id,
        code: gate.code,
        status: 'blocked',
        exitCode: null,
        durationMs: 0,
        output: stop ? 'abgebrochen (--fail-fast)' : `blockiert durch: ${failedNeeds.join(', ')}`,
      });
      continue;
    }
    const started = Date.now();
    let exitCode = 0;
    let output = '';
    for (const step of gate.steps) {
      const outcome = runStep(gate, step);
      output += `$ ${step.join(' ')}\n${outcome.output}\n[exit ${outcome.exitCode}]\n`;
      if (outcome.exitCode !== 0) {
        exitCode = outcome.exitCode;
        break;
      }
    }
    const status = exitCode === 0 ? 'passed' : 'failed';
    results.push({
      id: gate.id,
      code: gate.code,
      status,
      exitCode,
      durationMs: Date.now() - started,
      output,
    });
    if (status === 'failed' && options.failFast) stop = true;
  }
  return results;
}

/** Gesamtergebnis: erster roter/blockierter Gate-Code, sonst 2 bei Lücken, sonst 0. */
export function summarize(results) {
  const red = results.find((r) => r.status === 'failed' || r.status === 'blocked');
  if (red) return { result: 'failed', exitCode: red.code };
  if (results.some((r) => r.status === 'skipped')) return { result: 'incomplete', exitCode: 2 };
  return { result: 'passed', exitCode: 0 };
}

function spawnStep(_gate, [command, ...args]) {
  const outcome = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf-8',
    shell: false,
    maxBuffer: 256 * 1024 * 1024,
    env: process.env,
  });
  const output = `${outcome.stdout ?? ''}${outcome.stderr ?? ''}${outcome.error ? `\n${outcome.error.message}` : ''}`;
  return { exitCode: typeof outcome.status === 'number' ? outcome.status : 1, output };
}

function git(args) {
  const out = spawnSync('git', args, { cwd: ROOT, encoding: 'utf-8' });
  return out.status === 0 ? out.stdout.trim() : null;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[v23-acceptance] ${error.message}`);
    process.exit(1);
  }
  if (options.list) {
    for (const gate of GATES) console.log(`${gate.code}  ${gate.id}`);
    return;
  }
  fs.rmSync(options.outDir, { recursive: true, force: true });
  fs.mkdirSync(options.outDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const results = runGates(GATES, options, (gate, step) => {
    console.log(`[v23-acceptance] ${gate.id}: ${step.join(' ')}`);
    return spawnStep(gate, step);
  });
  const { result, exitCode } = summarize(results);
  for (const r of results) {
    fs.writeFileSync(path.join(options.outDir, `${r.id}.log`), r.output);
  }
  const summary = {
    schema: SUMMARY_SCHEMA,
    commit: git(['rev-parse', 'HEAD']),
    dirty: (git(['status', '--porcelain']) ?? '').length > 0,
    node: process.version,
    startedAt,
    finishedAt: new Date().toISOString(),
    result,
    exitCode,
    gates: results.map(({ output: _output, ...rest }) => ({ ...rest, log: `${rest.id}.log` })),
  };
  fs.writeFileSync(
    path.join(options.outDir, 'acceptance-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log('\n| Code | Gate | Status | Dauer |\n|---|---|---|---|');
  for (const r of results) {
    console.log(`| ${r.code} | ${r.id} | ${r.status} | ${Math.round(r.durationMs / 1000)} s |`);
  }
  console.log(`\n[v23-acceptance] Ergebnis: ${result} (Exit ${exitCode})`);
  process.exit(exitCode);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
