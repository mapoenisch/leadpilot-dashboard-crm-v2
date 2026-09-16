// G44 (Auftrag 067A, Block E): Sanitisiertes Review-Evidence für npm-Audit und
// GitHub-Rulesets. Fail-closed: Gespeichert werden ausschließlich validierte
// Zähler und Ruleset-Eigenschaften — niemals Auth-Header, Tokens,
// Audit-Payloads, personenbezogene Werte oder unkontrollierte stderr-Texte.
// Jeder technische Fehler bricht ohne Schreiben ab (Exit 1); einzige Ausnahme
// ist die bereits klassifizierte, nicht auswertbare Ruleset-Liste (HTTP 403),
// die als ehrlicher Leerbefund mit kategorisierter Notiz gespeichert wird.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reviewsDir = resolve(repoRoot, 'docs/reviews');
const REPOSITORY = 'mapoenisch/leadpilot-dashboard-crm';

interface AuditCounts {
  total: number;
  moderate: number;
  high: number;
  critical: number;
}

interface AuditEvidence {
  capturedAt: string;
  production: AuditCounts;
  all: AuditCounts;
}

interface RulesetEvidence {
  capturedAt: string;
  repository: string;
  activeRulesets: Array<{
    name: string;
    enforcement: string;
    target: string;
    appliesToMain: boolean;
    allowsBypass: boolean;
    requiredChecks: string[];
    allowsDirectPush: boolean;
  }>;
  captureNote: string;
}

function countOf(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Audit-Metadaten ungültig: ${label} ist keine nichtnegative Zahl.`);
  }
  return value;
}

function runAudit(extraArgs: string[]): AuditCounts {
  let outcome;
  try {
    outcome = spawnSync('npm', ['audit', '--json', ...extraArgs], {
      cwd: repoRoot,
      encoding: 'utf-8',
      shell: false,
    });
  } catch (error) {
    throw new Error(
      `npm audit konnte nicht gestartet werden: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  // Hinweis: npm audit meldet Findings per Exit ungleich 0 — das ist kein
  // technischer Fehler. Technisch ist nur fehlendes/ungültiges JSON.
  const output = typeof outcome.stdout === 'string' ? outcome.stdout : '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('npm audit lieferte kein parsebares JSON — kein Befund gespeichert.');
  }
  if (!isRecord(parsed) || !isRecord(parsed['metadata'])) {
    throw new Error('npm audit ohne Metadaten — kein Befund gespeichert.');
  }
  const metadata = parsed['metadata'] as Record<string, unknown>;
  if (!isRecord(metadata['vulnerabilities'])) {
    throw new Error('npm audit ohne vulnerabilities-Metadaten — kein Befund gespeichert.');
  }
  const vulnerabilities = metadata['vulnerabilities'] as Record<string, unknown>;
  return {
    total: countOf(vulnerabilities['total'], 'total'),
    moderate: countOf(vulnerabilities['moderate'], 'moderate'),
    high: countOf(vulnerabilities['high'], 'high'),
    critical: countOf(vulnerabilities['critical'], 'critical'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function refMatchesMain(pattern: unknown): boolean {
  if (typeof pattern !== 'string') {
    return false;
  }
  // Nur explizite main-Bindung zählt als Nachweis: exakter Ref oder ~ALL.
  // ~DEFAULT_BRANCH ist ohne Repo-Wissen kein belastbarer main-Nachweis.
  return pattern === 'refs/heads/main' || pattern === '~ALL';
}

function appliesToMain(entry: unknown): boolean {
  if (!isRecord(entry) || entry['target'] !== 'branch') {
    return false;
  }
  if (!isRecord(entry['conditions']) || !isRecord(entry['conditions']['ref_name'])) {
    return false;
  }
  const refName = entry['conditions']['ref_name'] as Record<string, unknown>;
  const include = Array.isArray(refName['include']) ? refName['include'] : [];
  const exclude = Array.isArray(refName['exclude']) ? refName['exclude'] : [];
  if (exclude.some((pattern) => pattern === 'refs/heads/main')) {
    return false;
  }
  return include.some(refMatchesMain);
}

function allowsBypass(entry: unknown): boolean {
  if (!isRecord(entry)) {
    return true;
  }
  const actors = entry['bypass_actors'];
  if (Array.isArray(actors) && actors.length > 0) {
    return true;
  }
  const rules = Array.isArray(entry['rules']) ? entry['rules'] : [];
  return rules.some((rule) => isRecord(rule) && rule['type'] === 'bypass');
}
function mapRuleset(entry: unknown): RulesetEvidence['activeRulesets'][number] {
  if (!isRecord(entry)) {
    throw new Error('Ruleset-Eintrag ohne Objektstruktur — kein Befund gespeichert.');
  }
  const rules = Array.isArray(entry['rules']) ? entry['rules'] : [];
  const requiredChecks: string[] = [];
  let allowsDirectPush = true;
  for (const rule of rules) {
    if (!isRecord(rule)) {
      continue;
    }
    if (rule['type'] === 'required_status_checks' && isRecord(rule['parameters'])) {
      const checks = rule['parameters']['required_status_checks'];
      if (Array.isArray(checks)) {
        for (const check of checks) {
          if (isRecord(check) && typeof check['context'] === 'string') {
            requiredChecks.push(check['context']);
          }
        }
      }
    }
    // Nur eine PR-Pflicht verhindert direkten Push. required_signatures
    // schützt Commits, nicht den Branch — zählt bewusst nicht als Push-Schutz.
    if (rule['type'] === 'pull_request') {
      allowsDirectPush = false;
    }
  }
  return {
    name: typeof entry['name'] === 'string' ? entry['name'] : 'unbenannt',
    enforcement: typeof entry['enforcement'] === 'string' ? entry['enforcement'] : 'unbekannt',
    target: typeof entry['target'] === 'string' ? entry['target'] : 'branch',
    appliesToMain: appliesToMain(entry),
    allowsBypass: allowsBypass(entry),
    requiredChecks,
    allowsDirectPush,
  };
}

function ghApiRaw(path: string): { status: number | null; stdout: string; stderr: string } {
  let outcome;
  try {
    outcome = spawnSync('gh', ['api', path], { cwd: repoRoot, encoding: 'utf-8', shell: false });
  } catch (error) {
    throw new Error(
      `gh konnte nicht gestartet werden: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (outcome.error) {
    throw new Error(
      `gh konnte nicht gestartet werden: ${outcome.error.message ?? String(outcome.error)}`,
    );
  }
  return {
    status: outcome.status,
    stdout: typeof outcome.stdout === 'string' ? outcome.stdout : '',
    stderr: typeof outcome.stderr === 'string' ? outcome.stderr : '',
  };
}

function isExplicit403(stderr: string): boolean {
  return /\(HTTP 403\)/.test(stderr);
}

function ghApi(path: string): unknown {
  const { status, stdout, stderr } = ghApiRaw(path);
  if (status !== 0) {
    throw new Error(
      `gh-API-Fehler (Exit ${String(status)}): ${(stderr || stdout).slice(0, 200).replace(/\s+/g, ' ').trim()}`,
    );
  }
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error('gh lieferte kein parsebares JSON — kein Befund gespeichert.');
  }
}

function runRulesetEvidence(): RulesetEvidence {
  const capturedAt = new Date().toISOString();
  // Einzige zugelassene Ausnahme: der bekannte 403-Sonderfall (privates Repo
  // ohne Pro-Freischaltung). 401, fehlende CLI, Netzwerk- und unbekannte
  // Fehler brechen ohne Schreiben ab (Fail-closed, Exit 1 in main).
  const raw = ghApiRaw(`repos/${REPOSITORY}/rulesets`);
  if (raw.status !== 0) {
    if (isExplicit403(raw.stderr)) {
      return {
        capturedAt,
        repository: REPOSITORY,
        activeRulesets: [],
        captureNote:
          'Rulesets-API verweigert (HTTP 403: privates Repo ohne Pro-Freischaltung) — kein Ruleset nachweisbar',
      };
    }
    throw new Error(
      `gh-API-Fehler (Exit ${String(raw.status)}): kein Ruleset-Evidence gespeichert.`,
    );
  }
  let list: unknown;
  try {
    list = JSON.parse(raw.stdout);
  } catch {
    throw new Error('gh lieferte kein parsebares JSON — kein Befund gespeichert.');
  }
  // Nur der explizite 403-Fall (oben) darf einen leeren Befund erzeugen. Eine
  // erfolgreiche, aber nicht-arrayförmige Antwort ist unvollständig und bricht
  // ohne Dateischreibung ab.
  if (!Array.isArray(list)) {
    throw new Error('Ruleset-Liste ist kein Array — kein Befund gespeichert.');
  }
  const entries: unknown[] = list;
  const activeRulesets: RulesetEvidence['activeRulesets'] = [];
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry['id'] !== 'number') {
      throw new Error('Ruleset-Listeneintrag ohne ID — kein unvollständiges Evidence gespeichert.');
    }
    const detail = ghApi(`repos/${REPOSITORY}/rulesets/${String(entry['id'])}`);
    activeRulesets.push(mapRuleset(detail));
  }
  return {
    capturedAt,
    repository: REPOSITORY,
    activeRulesets,
    captureNote:
      'sanitisiertes Live-Evidence aus Listen- und Detailabfrage; keine Tokens oder Header gespeichert',
  };
}

function main(): void {
  // Fail-closed: erst alles erfassen und validieren, dann schreiben. Jeder
  // throw bricht ohne Dateischreibung ab (Exit 1).
  const production = runAudit(['--omit=dev']);
  const all = runAudit([]);
  const auditEvidence: AuditEvidence = {
    capturedAt: new Date().toISOString(),
    production,
    all,
  };
  const rulesetEvidence = runRulesetEvidence();
  writeFileSync(
    resolve(reviewsDir, 'v2.3.0-npm-audit-baseline.json'),
    `${JSON.stringify(auditEvidence, null, 2)}\n`,
  );
  writeFileSync(
    resolve(reviewsDir, 'v2.3.0-github-ruleset-baseline.json'),
    `${JSON.stringify(rulesetEvidence, null, 2)}\n`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `[captureV23ReviewEvidence] audit prod=${production.total} (mod ${production.moderate}) ` +
      `gesamt=${all.total} (high ${all.high}) rulesets=${rulesetEvidence.activeRulesets.length}`,
  );
}

try {
  main();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(
    `[captureV23ReviewEvidence] ABBRUCH ohne Schreiben: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
