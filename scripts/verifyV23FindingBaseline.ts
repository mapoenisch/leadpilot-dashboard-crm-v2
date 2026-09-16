// G44 (Auftrag 067A, Block A): Baseline-Verifier für die v2.3.0-Findings.
// Startet beide Finding-Runner per spawnSync, liest deren JSON-Reports aus
// test-results/v23-findings/, extrahiert die Finding-IDs aus den Testtiteln
// und vergleicht exakt gegen docs/reviews/v2.3.0-known-findings.json.
// Exit 0 nur bei exakt allen registrierten roten Findings — ohne zusätzliche,
// fehlende oder unerwartet grüne Abweichung. Fehlender Import, Webserver- oder
// Auth-State-Fehler zählen nicht als Produktbefund und machen rot (Exit 1).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resultsDir = resolve(repoRoot, 'test-results/v23-findings');
const vitestReportPath = resolve(resultsDir, 'vitest.json');
const playwrightReportPath = resolve(resultsDir, 'playwright.json');

type RunnerName = 'vitest' | 'playwright';
type MeasuredStatus = 'failing' | 'passing';

interface MeasuredResult {
  id: string;
  runner: RunnerName;
  actual: MeasuredStatus;
}

interface KnownFinding {
  id: string;
  expected: 'failing' | 'passing';
}

const FINDING_ID_PATTERN = /\[(PR-[A-Z0-9]+-\d{2})\]/;

function extractFindingId(title: string): string | null {
  const match = FINDING_ID_PATTERN.exec(title);
  return match?.[1] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseVitestReport(raw: string, runner: RunnerName): MeasuredResult[] {
  const report = JSON.parse(raw) as {
    testResults?: Array<{
      name?: string;
      assertionResults?: Array<{ ancestorTitles?: string[]; title?: string; status?: string }>;
    }>;
  };
  const merged = new Map<string, MeasuredResult>();
  const testResults = Array.isArray(report.testResults) ? report.testResults : [];
  for (const fileResult of testResults) {
    const assertions = Array.isArray(fileResult.assertionResults) ? fileResult.assertionResults : [];
    for (const assertion of assertions) {
      const ancestors = Array.isArray(assertion.ancestorTitles) ? assertion.ancestorTitles : [];
      const fullTitle = [...ancestors, assertion.title ?? ''].join(' ');
      const id = extractFindingId(fullTitle);
      const status = assertion.status;
      if (status !== 'failed' && status !== 'passed') {
        continue;
      }
      const actual: MeasuredStatus = status === 'failed' ? 'failing' : 'passing';
      const key = id ?? `untitled:${fileResult.name ?? 'unknown'}::${assertion.title ?? 'unknown'}`;
      const previous = merged.get(key);
      if (previous === undefined || previous.actual !== 'failing') {
        merged.set(key, { id: key, runner, actual });
      }
    }
  }
  return [...merged.values()];
}

function collectPlaywrightResults(node: unknown, inheritedId: string | null, acc: Map<string, MeasuredResult>): void {
  if (!isRecord(node)) {
    return;
  }
  let currentId = inheritedId;
  if (typeof node['title'] === 'string') {
    const found = extractFindingId(node['title']);
    if (found) {
      currentId = found;
    }
  }
  const results = node['results'];
  if (Array.isArray(results) && results.length > 0) {
    const statuses = results.map((entry) => (isRecord(entry) ? entry['status'] : undefined));
    const failing = statuses.some(
      (status) => status === 'failed' || status === 'timedOut' || status === 'interrupted',
    );
    const passing = statuses.some((status) => status === 'passed');
    const next: MeasuredStatus | null = failing ? 'failing' : passing ? 'passing' : null;
    if (next) {
      const key = currentId ?? `untitled:${typeof node['title'] === 'string' ? node['title'] : 'unknown'}`;
      const previous = acc.get(key);
      if (previous === undefined || previous.actual !== 'failing') {
        acc.set(key, { id: key, runner: 'playwright', actual: next });
      }
    }
    return;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        collectPlaywrightResults(entry, currentId, acc);
      }
    } else if (isRecord(value)) {
      collectPlaywrightResults(value, currentId, acc);
    }
  }
}

function parsePlaywrightReport(raw: string): MeasuredResult[] {
  const report: unknown = JSON.parse(raw);
  const acc = new Map<string, MeasuredResult>();
  collectPlaywrightResults(report, null, acc);
  return [...acc.values()];
}

function runStep(label: string, command: string, args: string[]): void {
  const outcome = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit', shell: false });
  const status = typeof outcome.status === 'number' ? outcome.status : 1;
  // Der Runner-Exit wird nicht verschluckt, sondern als Finding-Status
  // ausgewertet: Exit ungleich 0 ist bei roten Sollverträgen erwartet.
  // eslint-disable-next-line no-console
  console.log(`[verify:v23:baseline] ${label}: Runner-Exit ${status} (wird gegen Register geprüft)`);
}

function fail(message: string): never {
  // eslint-disable-next-line no-console
  console.error(`[verify:v23:baseline] FEHLER: ${message}`);
  process.exit(1);
}

function main(): void {
  rmSync(resultsDir, { recursive: true, force: true });
  mkdirSync(resultsDir, { recursive: true });

  runStep('vitest-findings', 'npx', [
    'vitest',
    'run',
    '--config',
    'vitest.v23-findings.config.ts',
    '--reporter=json',
    '--outputFile=test-results/v23-findings/vitest.json',
  ]);
  runStep('playwright-findings', 'npx', [
    'playwright',
    'test',
    '--config',
    'playwright.v23-findings.config.ts',
  ]);

  if (!existsSync(vitestReportPath)) {
    fail(`Vitest-Report fehlt (${vitestReportPath}) — technischer Runner-Fehler, kein Produktbefund.`);
  }
  if (!existsSync(playwrightReportPath)) {
    fail(
      `Playwright-Report fehlt (${playwrightReportPath}) — technischer Runner-Fehler, kein Produktbefund.`,
    );
  }

  let measured: MeasuredResult[];
  try {
    measured = [
      ...parseVitestReport(readFileSync(vitestReportPath, 'utf-8'), 'vitest'),
      ...parsePlaywrightReport(readFileSync(playwrightReportPath, 'utf-8')),
    ];
  } catch (error) {
    fail(`Reports nicht lesbar (${error instanceof Error ? error.message : String(error)}).`);
  }

  const knownRaw = readFileSync(resolve(repoRoot, 'docs/reviews/v2.3.0-known-findings.json'), 'utf-8');
  const known = JSON.parse(knownRaw) as KnownFinding[];
  const byId = new Map<string, MeasuredResult>();
  for (const entry of measured) {
    const previous = byId.get(entry.id);
    if (previous === undefined || previous.actual !== 'failing') {
      byId.set(entry.id, entry);
    }
  }

  const mismatches: string[] = [];
  for (const contract of known) {
    const actual = byId.get(contract.id);
    if (!actual) {
      mismatches.push(`missing:${contract.id}`);
    } else if (actual.actual !== contract.expected) {
      mismatches.push(`unexpected:${contract.id} (erwartet ${contract.expected}, gemessen ${actual.actual})`);
    }
  }
  for (const entry of byId.values()) {
    const contract = known.find((candidate) => candidate.id === entry.id);
    if (entry.actual === 'failing' && (!contract || contract.expected !== 'failing')) {
      mismatches.push(`unregistered-failing:${entry.id}`);
    }
  }

  const expectedFailing = known.filter((entry) => entry.expected === 'failing').length;
  const measuredFailing = [...byId.values()].filter((entry) => entry.actual === 'failing').length;
  // eslint-disable-next-line no-console
  console.log(
    `[verify:v23:baseline] ${expectedFailing} erwartete Findings, ${measuredFailing} gemessene rote, ${mismatches.length} Abweichungen`,
  );
  if (mismatches.length > 0) {
    for (const mismatch of mismatches) {
      // eslint-disable-next-line no-console
      console.error(`[verify:v23:baseline] Abweichung: ${mismatch}`);
    }
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log('[verify:v23:baseline] OK — exakt die registrierten Findings sind rot.');
}

main();
