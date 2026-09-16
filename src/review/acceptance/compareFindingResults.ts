// G44 (Auftrag 067A, Block A): Reine Soll-/Ist-Vergleichslogik für den
// v2.3.0-Finding-Baseline-Verifier. Keine Runner-, Datei- oder Prozesslogik —
// nur exakter Abgleich registrierter Verträge gegen gemessene Ergebnisse plus
// fail-closed Report-Parsing: Als fachliches `failing` zählt ausschließlich
// eine fehlgeschlagene Expect-Assertion. Timeouts, Abbrüche, Collection-,
// Setup- und Navigationsfehler, falsche Runner sowie widersprüchliche
// Ergebnisse werden als technische Fehler bzw. Mismatches abgewiesen.
import type { V23FindingContract } from './findingContract';

export type V23FindingContractLike = Pick<
  V23FindingContract,
  'id' | 'title' | 'severity' | 'targetGate' | 'runner' | 'expected'
>;

export interface FindingRunResult {
  id: string;
  runner: 'vitest' | 'playwright';
  actual: 'failing' | 'passing';
}

export interface FindingComparison {
  ok: boolean;
  mismatches: string[];
}

export interface ParsedFindingResults {
  results: FindingRunResult[];
  technicalErrors: string[];
}

const FINDING_ID_PATTERN = /\[(PR-[A-Z0-9]+-\d{2})\]/;
const EXPECT_EVIDENCE_PATTERN = /AssertionError|expect\(|Expected:|Received:/;

function extractFindingId(title: string): string | null {
  const match = FINDING_ID_PATTERN.exec(title);
  return match?.[1] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface VitestAssertion {
  ancestorTitles?: string[];
  title?: string;
  status?: string;
  failureMessages?: string[];
}

interface VitestFileResult {
  name?: string;
  status?: string;
  message?: string;
  assertionResults?: VitestAssertion[];
}

export function parseVitestFindingResults(reportJson: string): ParsedFindingResults {
  const report = JSON.parse(reportJson) as { testResults?: VitestFileResult[] };
  const results: FindingRunResult[] = [];
  const technicalErrors: string[] = [];
  const testResults = Array.isArray(report.testResults) ? report.testResults : [];
  for (const fileResult of testResults) {
    const assertions = Array.isArray(fileResult.assertionResults)
      ? fileResult.assertionResults
      : [];
    if (fileResult.status === 'failed' && assertions.length === 0) {
      technicalErrors.push(
        `vitest collection: ${fileResult.name ?? 'unbekannte Datei'}: ${(fileResult.message ?? 'unbekannter Fehler').slice(0, 300)}`,
      );
      continue;
    }
    for (const assertion of assertions) {
      const ancestors = Array.isArray(assertion.ancestorTitles) ? assertion.ancestorTitles : [];
      const fullTitle = [...ancestors, assertion.title ?? ''].join(' ');
      const id = extractFindingId(fullTitle);
      if (assertion.status === 'passed') {
        if (id) {
          results.push({ id, runner: 'vitest', actual: 'passing' });
        }
        continue;
      }
      if (assertion.status !== 'failed') {
        continue;
      }
      const evidence = (assertion.failureMessages ?? []).join('\n');
      if (!EXPECT_EVIDENCE_PATTERN.test(evidence)) {
        technicalErrors.push(
          `vitest non-expect failure ${id ?? fullTitle.slice(0, 120)}: ${evidence.slice(0, 300)}`,
        );
        continue;
      }
      const key = id ?? `untitled:${fileResult.name ?? 'unknown'}::${assertion.title ?? 'unknown'}`;
      results.push({ id: key, runner: 'vitest', actual: 'failing' });
    }
  }
  return { results, technicalErrors };
}

function collectPlaywright(
  node: unknown,
  inheritedId: string | null,
  results: FindingRunResult[],
  technicalErrors: string[],
): void {
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
  const leafResults = node['results'];
  if (Array.isArray(leafResults) && leafResults.length > 0) {
    let sawFailingEvidence = false;
    let sawPassing = false;
    for (const entry of leafResults) {
      if (!isRecord(entry)) {
        continue;
      }
      const status = entry['status'];
      if (status === 'passed') {
        sawPassing = true;
        continue;
      }
      if (status === 'failed') {
        const errorText =
          (isRecord(entry['error']) && typeof entry['error']['message'] === 'string'
            ? entry['error']['message']
            : '') + (typeof entry['error'] === 'string' ? entry['error'] : '');
        if (EXPECT_EVIDENCE_PATTERN.test(errorText)) {
          sawFailingEvidence = true;
        } else {
          technicalErrors.push(
            `playwright non-expect failure ${currentId ?? String(node['title'] ?? 'unknown').slice(0, 120)}: ${errorText.slice(0, 300)}`,
          );
        }
        continue;
      }
      if (status === 'timedOut' || status === 'interrupted') {
        technicalErrors.push(
          `playwright ${String(status)} ${currentId ?? String(node['title'] ?? 'unknown').slice(0, 120)}`,
        );
      }
    }
    const key =
      currentId ?? `untitled:${typeof node['title'] === 'string' ? node['title'] : 'unknown'}`;
    if (sawFailingEvidence) {
      results.push({ id: key, runner: 'playwright', actual: 'failing' });
    } else if (sawPassing) {
      results.push({ id: key, runner: 'playwright', actual: 'passing' });
    }
    return;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        collectPlaywright(entry, currentId, results, technicalErrors);
      }
    } else if (isRecord(value)) {
      collectPlaywright(value, currentId, results, technicalErrors);
    }
  }
}

export function parsePlaywrightFindingResults(reportJson: string): ParsedFindingResults {
  const report: unknown = JSON.parse(reportJson);
  const results: FindingRunResult[] = [];
  const technicalErrors: string[] = [];
  if (isRecord(report) && Array.isArray(report['errors'])) {
    for (const entry of report['errors']) {
      const message = isRecord(entry) ? String(entry['message'] ?? entry) : String(entry);
      if (message.trim().length > 0) {
        technicalErrors.push(`playwright report error: ${message.slice(0, 300)}`);
      }
    }
  }
  collectPlaywright(report, null, results, technicalErrors);
  return { results, technicalErrors };
}

export function compareFindingResults(
  contracts: readonly V23FindingContractLike[],
  results: readonly FindingRunResult[],
): FindingComparison {
  const mismatches: string[] = [];
  const groups = new Map<string, { id: string; runner: string; actuals: Set<string> }>();
  for (const runResult of results) {
    const key = `${runResult.runner}::${runResult.id}`;
    const group = groups.get(key) ?? { id: runResult.id, runner: runResult.runner, actuals: new Set<string>() };
    group.actuals.add(runResult.actual);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    if (group.actuals.size > 1) {
      mismatches.push(
        `conflict:${group.id} (${group.runner}: ${[...group.actuals].sort().join(' vs ')})`,
      );
    }
  }

  for (const contract of contracts) {
    const measured = groups.get(`${contract.runner}::${contract.id}`);
    if (!measured || measured.actuals.size > 1) {
      if (!measured) {
        mismatches.push(
          `missing:${contract.id} (erwartet ${contract.expected} via ${contract.runner}, kein Ergebnis gemessen)`,
        );
      }
      continue;
    }
    const actual = measured.actuals.has('failing') ? 'failing' : 'passing';
    if (actual !== contract.expected) {
      mismatches.push(
        `unexpected:${contract.id} (erwartet ${contract.expected}, gemessen ${actual})`,
      );
    }
  }

  for (const group of groups.values()) {
    if (!group.actuals.has('failing')) {
      continue;
    }
    const sameId = contracts.filter((candidate) => candidate.id === group.id);
    if (sameId.length === 0) {
      mismatches.push(`unregistered-failing:${group.id} (zusätzlicher roter Befund)`);
    } else if (sameId.every((candidate) => candidate.runner !== group.runner)) {
      mismatches.push(
        `runner-mismatch:${group.id} (gemessen via ${group.runner}, registriert für ${sameId.map((candidate) => candidate.runner).join('/')})`,
      );
    } else if (sameId.every((candidate) => candidate.expected !== 'failing')) {
      mismatches.push(`unregistered-failing:${group.id} (zusätzlicher roter Befund)`);
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}
