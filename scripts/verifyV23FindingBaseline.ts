// G44 (Auftrag 067A, Block A): Baseline-Verifier für die v2.3.0-Findings.
// Startet beide Finding-Runner per spawnSync, liest deren JSON-Reports aus
// test-results/v23-findings/ und gleicht exakt gegen
// docs/reviews/v2.3.0-known-findings.json ab. Fail-closed: Als fachliches
// `failing` zählt ausschließlich eine fehlgeschlagene Expect-Assertion.
// Timeouts, Abbrüche, Collection-/Setup-Fehler, falsche Runner,
// Duplikate/Widersprüche und fehlende Reports ergeben Exit 1.
// Exit 0 nur bei exakt allen registrierten roten Findings ohne Abweichung.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareFindingResults,
  parsePlaywrightFindingResults,
  parseVitestFindingResults,
} from '../src/review/acceptance/compareFindingResults.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resultsDir = resolve(repoRoot, 'test-results/v23-findings');
const vitestReportPath = resolve(resultsDir, 'vitest.json');
const playwrightReportPath = resolve(resultsDir, 'playwright.json');

interface KnownFinding {
  id: string;
  title: string;
  severity: string;
  targetGate: string;
  runner: 'vitest' | 'playwright';
  expected: 'failing' | 'passing';
}

function runStep(label: string, command: string, args: string[]): void {
  const outcome = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit', shell: false });
  const status = typeof outcome.status === 'number' ? outcome.status : 1;
  // Der Runner-Exit wird nicht verschluckt, sondern protokolliert: Exit
  // ungleich 0 ist bei roten Sollverträgen erwartet, die fachliche Wertung
  // erfolgt ausschließlich über die Report-Reports und Expect-Nachweise.
  // eslint-disable-next-line no-console
  console.log(
    `[verify:v23:baseline] ${label}: Runner-Exit ${status} (wird gegen Register geprüft)`,
  );
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
    fail(
      `Vitest-Report fehlt (${vitestReportPath}) — technischer Runner-Fehler, kein Produktbefund.`,
    );
  }
  if (!existsSync(playwrightReportPath)) {
    fail(
      `Playwright-Report fehlt (${playwrightReportPath}) — technischer Runner-Fehler, kein Produktbefund.`,
    );
  }

  let vitestParsed;
  let playwrightParsed;
  try {
    vitestParsed = parseVitestFindingResults(readFileSync(vitestReportPath, 'utf-8'));
  } catch (error) {
    fail(`Vitest-Report nicht lesbar (${error instanceof Error ? error.message : String(error)}).`);
  }
  try {
    playwrightParsed = parsePlaywrightFindingResults(readFileSync(playwrightReportPath, 'utf-8'));
  } catch (error) {
    fail(
      `Playwright-Report nicht lesbar (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
  const technicalErrors = [...vitestParsed.technicalErrors, ...playwrightParsed.technicalErrors];
  if (technicalErrors.length > 0) {
    for (const entry of technicalErrors) {
      // eslint-disable-next-line no-console
      console.error(`[verify:v23:baseline] technischer Fehler: ${entry}`);
    }
    fail(`${technicalErrors.length} technische Fehler — kein belastbarer Produktbefund.`);
  }

  const knownRaw = readFileSync(
    resolve(repoRoot, 'docs/reviews/v2.3.0-known-findings.json'),
    'utf-8',
  );
  const known = JSON.parse(knownRaw) as KnownFinding[];
  const comparison = compareFindingResults(known, [
    ...vitestParsed.results,
    ...playwrightParsed.results,
  ]);

  const expectedFailing = known.filter((entry) => entry.expected === 'failing').length;
  const measuredFailing = new Set(
    [...vitestParsed.results, ...playwrightParsed.results]
      .filter((entry) => entry.actual === 'failing')
      .map((entry) => `${entry.runner}::${entry.id}`),
  ).size;
  // eslint-disable-next-line no-console
  console.log(
    `[verify:v23:baseline] ${expectedFailing} erwartete Findings, ${measuredFailing} gemessene rote, ${comparison.mismatches.length} Abweichungen`,
  );
  if (!comparison.ok) {
    for (const mismatch of comparison.mismatches) {
      // eslint-disable-next-line no-console
      console.error(`[verify:v23:baseline] Abweichung: ${mismatch}`);
    }
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log('[verify:v23:baseline] OK — exakt die registrierten Findings sind rot.');
}

main();
