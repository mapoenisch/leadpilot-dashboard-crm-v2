/**
 * Gate G64 (Auftrag 067R): Finding-Check für die Release-Readiness.
 *
 * Liest die frischen Reports des Finding-Laufs (`npm run verify:v23:baseline`
 * → test-results/v23-findings/{vitest,playwright}.json) und gleicht sie mit
 * docs/reviews/v2.3.0-known-findings.json ab. Fail-closed:
 * - fehlender, veralteter oder unlesbarer Report → OFFEN
 * - technische Runner-Fehler (Timeout, Collection, markerlose Assertion) → OFFEN
 * - jede Abweichung zwischen Register und Messung → OFFEN
 * - ein als `failing` registriertes Finding außerhalb des Release-Gates → OFFEN
 *   (vor G65 darf nur noch das Lizenz-Finding offen sein)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  compareFindingResults,
  parsePlaywrightFindingResults,
  parseVitestFindingResults,
  type V23FindingContractLike,
} from '../src/review/acceptance/compareFindingResults.js';

export const RELEASE_GATE = 'G65';
/** Einzige vor G65 zulässig offene Findings (Codex-Review #28: explizite ID-Menge). */
export const RELEASE_GATE_FINDINGS: readonly string[] = ['PR-LICENSE-19'];

export interface FindingCheckMetric {
  id: number;
  name: string;
  actual: string;
  target: string;
  status: 'ERFÜLLT' | 'OFFEN';
  note?: string;
}

export interface FindingCheckOptions {
  rootDir: string;
  findingsDir?: string;
  knownFindingsPath?: string;
  maxArtifactAgeMs: number;
}

export interface FindingCheckResult {
  ok: boolean;
  metrics: FindingCheckMetric[];
  errors: string[];
}

const METRIC_ID = 27;
const NAME = 'v2.3.0-Findings (G44-Register)';
const TARGET = 'Register = Messung';

function open(errors: string[], actual: string, message: string): FindingCheckResult {
  errors.push(message);
  return {
    ok: false,
    metrics: [
      { id: METRIC_ID, name: NAME, actual, target: TARGET, status: 'OFFEN', note: message },
    ],
    errors,
  };
}

export function checkFindings(options: FindingCheckOptions): FindingCheckResult {
  const errors: string[] = [];
  const findingsDir =
    options.findingsDir ?? path.join(options.rootDir, 'test-results/v23-findings');
  const knownPath =
    options.knownFindingsPath ??
    path.join(options.rootDir, 'docs/reviews/v2.3.0-known-findings.json');
  const reports = {
    vitest: path.join(findingsDir, 'vitest.json'),
    playwright: path.join(findingsDir, 'playwright.json'),
  };

  for (const [runner, reportPath] of Object.entries(reports)) {
    let ageMs: number;
    try {
      ageMs = Date.now() - fs.statSync(reportPath).mtimeMs;
    } catch {
      return open(errors, 'FEHLT', `Finding-Report (${runner}) fehlt: ${reportPath}`);
    }
    if (ageMs > options.maxArtifactAgeMs) {
      return open(
        errors,
        'VERALTET',
        `Finding-Report (${runner}) ist veraltet (${Math.round(ageMs / 60000)} min): ${reportPath}`,
      );
    }
  }

  let known: V23FindingContractLike[];
  let parsed: ReturnType<typeof parseVitestFindingResults>[];
  try {
    known = JSON.parse(fs.readFileSync(knownPath, 'utf-8')) as V23FindingContractLike[];
    parsed = [
      parseVitestFindingResults(fs.readFileSync(reports.vitest, 'utf-8')),
      parsePlaywrightFindingResults(fs.readFileSync(reports.playwright, 'utf-8')),
    ];
  } catch (error) {
    return open(
      errors,
      'UNLESBAR',
      `Finding-Report oder Register nicht lesbar: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const technical = parsed.flatMap((p) => p.technicalErrors);
  if (technical.length > 0) {
    return open(errors, `${technical.length} technische Fehler`, technical.join(' | '));
  }

  const results = parsed.flatMap((p) => p.results);
  const comparison = compareFindingResults(known, results);
  if (!comparison.ok) {
    return open(
      errors,
      `${comparison.mismatches.length} Abweichungen`,
      `Finding-Register weicht von der Messung ab: ${comparison.mismatches.join(', ')}`,
    );
  }

  const openBeforeRelease = known.filter(
    (finding) =>
      finding.expected === 'failing' &&
      !(finding.targetGate === RELEASE_GATE && RELEASE_GATE_FINDINGS.includes(finding.id)),
  );
  if (openBeforeRelease.length > 0) {
    return open(
      errors,
      `${openBeforeRelease.length} offen vor ${RELEASE_GATE}`,
      `Findings ohne Gate-Nachweis: ${openBeforeRelease.map((f) => f.id).join(', ')}`,
    );
  }

  const passing = known.filter((finding) => finding.expected === 'passing').length;
  const releaseOpen = known.filter((finding) => finding.expected === 'failing');
  return {
    ok: true,
    metrics: [
      {
        id: METRIC_ID,
        name: NAME,
        actual: `${passing}/${known.length} grün`,
        target: TARGET,
        status: 'ERFÜLLT',
        note:
          releaseOpen.length > 0
            ? `offen bis ${RELEASE_GATE}: ${releaseOpen.map((f) => f.id).join(', ')}`
            : undefined,
      },
    ],
    errors,
  };
}
