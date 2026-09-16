// G44 (Auftrag 067A, Block A): Reine Soll-/Ist-Vergleichslogik für den
// v2.3.0-Finding-Baseline-Verifier. Keine Runner-, Datei- oder Prozesslogik.
// Fail-closed in drei Stufen:
// 1. Als fachliches `failing` zählt ausschließlich eine fehlgeschlagene
//    Expect-Assertion, die einen expliziten, zur Finding-ID gehörenden
//    Produktmarker trägt (PRODUCT_MARKERS). Timeouts, Abbrüche, Collection-,
//    Setup-/Navigationsfehler und markerlose Assertions sind technische Fehler.
//    Beispiel: Eine `toBeVisible`-Assertion nach Login-Versagen enthält zwar
//    `expect(`, aber keinen PR-CLIP-13-Marker — sie wird abgewiesen.
// 2. Exakt ein Rohresultat je registriertem `(runner, id)`: identische
//    Duplikate, fehlende Ergebnisse und zusätzliche Resultate (auch `passing`
//    aus falschem Runner) werden abgewiesen — nichts wird zusammengefaltet.
// 3. Runner-Bindung: Ein Ergebnis zählt nur im registrierten Runner.
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
const HOOK_TITLE_PATTERN = /before(All|Each)|after(All|Each)|hook/i;

// Explizite Produktmarker je Finding-ID: unverwechselbare Teilstrings, die nur
// die echte Vertrags-Assertion im Fehlertext hinterlässt (Titel der
// Soll-Aussage, verbotene Code-Strings oder gemessene Befundwerte).
// Jede fachliche `failing`-Wertung verlangt mindestens einen Marker.
const PRODUCT_MARKERS: Record<string, readonly string[]> = {
  'PR-AUTH-01': ["from './localAuthAdapter'"],
  'PR-RLS-02': ['organization_id'],
  'PR-INGEST-03': ['Ingress-Pfad'],
  'PR-SOURCE-04': ['DATA_SOURCE_UNAVAILABLE', 'Envelope nennt'],
  'PR-SEED-05': ['seedSupabaseDatabase'],
  'PR-BASELINE-06': ['verschiedene Baseline'],
  'PR-FREEZE-07': ['eingefroren'],
  'PR-PERSIST-08': ['Reload-fähiges Repository'],
  'PR-WORKER-09': ['createWorkerAdapter('],
  'PR-HUBSPOT-10': ["|| 'LOST'", 'limit=100-Request'],
  'PR-SEMANTIC-11': ['sichtbare h1'],
  'PR-A11Y-12': ['#main-content', 'Initialfokus', 'künstlicher Button', 'Responsive-DOM'],
  'PR-CLIP-13': ['rechter Rand', 'Container-Grenze'],
  'PR-ASSET-14': ['Google-Fonts', 'Content-Security-Policy'],
  'PR-DEPENDENCY-15': ['Produktionsaudit'],
  'PR-QUALITY-16': ['CI-Baseline', 'Max-Lines-Ausnahme'],
  'PR-RELEASE-17': ['Defaultmetrik', 'Exit 0'],
  'PR-CI-18': ['SHA-gepinnt'],
  'PR-LICENSE-19': ['All Rights Reserved'],
  'PR-BRANCH-20': ['main-Ruleset'],
};

function extractFindingId(title: string): string | null {
  const match = FINDING_ID_PATTERN.exec(title);
  return match?.[1] ?? null;
}

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '');
}

function normalizeEvidence(text: string): string {
  return stripAnsi(text).replace(/\\'/g, "'").replace(/\\"/g, '"');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasProductMarker(id: string, evidence: string): boolean {
  const markers = PRODUCT_MARKERS[id] ?? [];
  return markers.some((marker) => evidence.includes(marker));
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
    // Dateiweite Fehler gelten unabhängig von vorhandenen Assertions: Ein
    // Setup-/Hook-/Unhandled-Fehler neben einer markierten Sollassertion darf
    // das Finding nicht als bestätigt werten (der Verifier bricht technisch ab).
    if (fileResult.status === 'failed' && (fileResult.message ?? '').trim().length > 0) {
      technicalErrors.push(
        `vitest file error ${fileResult.name ?? 'unbekannte Datei'}: ${(fileResult.message ?? '').slice(0, 300)}`,
      );
    }
    for (const assertion of assertions) {
      const ancestors = Array.isArray(assertion.ancestorTitles) ? assertion.ancestorTitles : [];
      const fullTitle = [...ancestors, assertion.title ?? ''].join(' ');
      const id = extractFindingId(fullTitle);
      const isHookFailure = assertion.status === 'failed' && HOOK_TITLE_PATTERN.test(fullTitle);
      if (isHookFailure) {
        technicalErrors.push(
          `vitest hook failure ${id ?? fullTitle.slice(0, 120)}: ${(assertion.failureMessages ?? []).join('\n').slice(0, 300)}`,
        );
        continue;
      }
      if (assertion.status === 'passed') {
        if (id) {
          results.push({ id, runner: 'vitest', actual: 'passing' });
        }
        continue;
      }
      if (assertion.status !== 'failed') {
        continue;
      }
      const evidence = normalizeEvidence((assertion.failureMessages ?? []).join('\n'));
      if (!EXPECT_EVIDENCE_PATTERN.test(evidence)) {
        technicalErrors.push(
          `vitest non-expect failure ${id ?? fullTitle.slice(0, 120)}: ${evidence.slice(0, 300)}`,
        );
        continue;
      }
      if (!id) {
        results.push({
          id: `untitled:${fileResult.name ?? 'unknown'}::${assertion.title ?? 'unknown'}`,
          runner: 'vitest',
          actual: 'failing',
        });
        continue;
      }
      if (!hasProductMarker(id, evidence)) {
        technicalErrors.push(`vitest missing-marker ${id}: keine ID-gebundene Produktassertion`);
        continue;
      }
      results.push({ id, runner: 'vitest', actual: 'failing' });
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
    const nodeTitle = typeof node['title'] === 'string' ? node['title'] : 'unknown';
    if (HOOK_TITLE_PATTERN.test(nodeTitle)) {
      technicalErrors.push(`playwright hook failure ${nodeTitle.slice(0, 120)}`);
      return;
    }
    let sawMarkedFailing = false;
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
        const rawError =
          (isRecord(entry['error']) && typeof entry['error']['message'] === 'string'
            ? entry['error']['message']
            : '') + (typeof entry['error'] === 'string' ? entry['error'] : '');
        const evidence = normalizeEvidence(rawError);
        if (!EXPECT_EVIDENCE_PATTERN.test(evidence)) {
          technicalErrors.push(
            `playwright non-expect failure ${currentId ?? String(node['title'] ?? 'unknown').slice(0, 120)}: ${evidence.slice(0, 300)}`,
          );
        } else if (!currentId) {
          results.push({
            id: `untitled:${typeof node['title'] === 'string' ? node['title'] : 'unknown'}`,
            runner: 'playwright',
            actual: 'failing',
          });
        } else if (!hasProductMarker(currentId, evidence)) {
          technicalErrors.push(
            `playwright missing-marker ${currentId}: keine ID-gebundene Produktassertion`,
          );
        } else {
          sawMarkedFailing = true;
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
    if (sawMarkedFailing) {
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
  // Doppelte Vertragszeilen werden fail-closed abgewiesen — auch identische
  // Duplikate dürfen 21 erwartete gegen 20 gemessene Findings nicht grün machen.
  const seenContracts = new Set<string>();
  for (const contract of contracts) {
    const contractKey = `${contract.runner}::${contract.id}`;
    if (seenContracts.has(contractKey)) {
      mismatches.push(`duplicate-contract:${contractKey} (Vertragszeile doppelt registriert)`);
    } else {
      seenContracts.add(contractKey);
    }
  }
  const seenIds = new Set<string>();
  for (const contract of contracts) {
    if (seenIds.has(contract.id)) {
      mismatches.push(`duplicate-contract:${contract.id} (Finding-ID doppelt registriert)`);
    } else {
      seenIds.add(contract.id);
    }
  }
  // Rohzählung ohne Zusammenfaltung: exakt ein Resultat je (runner, id).
  const groups = new Map<string, FindingRunResult[]>();
  for (const runResult of results) {
    const key = `${runResult.runner}::${runResult.id}`;
    groups.set(key, [...(groups.get(key) ?? []), runResult]);
  }

  for (const contract of contracts) {
    const entries = groups.get(`${contract.runner}::${contract.id}`) ?? [];
    if (entries.length === 0) {
      mismatches.push(
        `missing:${contract.id} (erwartet ${contract.expected} via ${contract.runner}, kein Ergebnis gemessen)`,
      );
    } else if (entries.length > 1) {
      mismatches.push(
        `duplicate:${contract.runner}::${contract.id} (${entries.length} Ergebnisse, erwartet exakt 1)`,
      );
    } else {
      const actual = entries[0]?.actual;
      if (actual !== contract.expected) {
        mismatches.push(
          `unexpected:${contract.id} (erwartet ${contract.expected}, gemessen ${String(actual)})`,
        );
      }
    }
  }

  for (const [key, entries] of groups) {
    const first = entries[0];
    if (!first) {
      continue;
    }
    const sameId = contracts.filter((candidate) => candidate.id === first.id);
    if (sameId.length === 0) {
      mismatches.push(`extra-result:${key} (nicht registriert, Status ${first.actual})`);
    } else if (sameId.every((candidate) => candidate.runner !== first.runner)) {
      mismatches.push(
        `runner-mismatch:${key} (registriert für ${sameId.map((candidate) => candidate.runner).join('/')})`,
      );
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}
