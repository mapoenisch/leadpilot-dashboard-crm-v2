// G44 (Auftrag 067A, Block E): Sanitisiertes Review-Evidence für npm-Audit und
// GitHub-Rulesets. Gespeichert werden ausschließlich Zähler und
// Ruleset-Eigenschaften — niemals Auth-Header, Tokens, Audit-Payloads oder
// personenbezogene Werte. Weicht der Live-Stand vom Review ab, werden die
// echten gemessenen Werte gespeichert und im Finding-Register begründet.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reviewsDir = resolve(repoRoot, 'docs/reviews');

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
    requiredChecks: string[];
    allowsDirectPush: boolean;
  }>;
  captureNote: string;
}

function countOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function runAudit(extraArgs: string[]): AuditCounts {
  const outcome = spawnSync('npm', ['audit', '--json', ...extraArgs], {
    cwd: repoRoot,
    encoding: 'utf-8',
    shell: false,
  });
  const output = typeof outcome.stdout === 'string' ? outcome.stdout : '';
  const parsed = JSON.parse(output) as {
    metadata?: { vulnerabilities?: Record<string, unknown> };
  };
  const vulnerabilities = parsed.metadata?.vulnerabilities ?? {};
  return {
    total: countOf(vulnerabilities['total']),
    moderate: countOf(vulnerabilities['moderate']),
    high: countOf(vulnerabilities['high']),
    critical: countOf(vulnerabilities['critical']),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function runRulesetEvidence(): RulesetEvidence {
  const capturedAt = new Date().toISOString();
  const repository = 'mapoenisch/leadpilot-dashboard-crm';
  const outcome = spawnSync('gh', ['api', `repos/${repository}/rulesets`], {
    cwd: repoRoot,
    encoding: 'utf-8',
    shell: false,
  });
  const output = typeof outcome.stdout === 'string' ? outcome.stdout : '';
  if (outcome.status !== 0) {
    const stderr = typeof outcome.stderr === 'string' ? outcome.stderr : '';
    const reason = stderr.slice(0, 200).replace(/\s+/g, ' ').trim();
    return {
      capturedAt,
      repository,
      activeRulesets: [],
      captureNote: `Rulesets-API nicht auswertbar (Exit ${String(outcome.status)}): ${reason}`,
    };
  }
  const parsed: unknown = JSON.parse(output);
  const entries = Array.isArray(parsed) ? parsed : [];
  const activeRulesets: RulesetEvidence['activeRulesets'] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) {
      continue;
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
      if (rule['type'] === 'pull_request' || rule['type'] === 'required_signatures') {
        allowsDirectPush = false;
      }
    }
    activeRulesets.push({
      name: typeof entry['name'] === 'string' ? entry['name'] : 'unbenannt',
      enforcement: typeof entry['enforcement'] === 'string' ? entry['enforcement'] : 'unbekannt',
      target: typeof entry['target'] === 'string' ? entry['target'] : 'branch',
      requiredChecks,
      allowsDirectPush,
    });
  }
  return {
    capturedAt,
    repository,
    activeRulesets,
    captureNote: 'sanitisiertes Live-Evidence; keine Tokens oder Header gespeichert',
  };
}

function main(): void {
  const production = runAudit(['--omit=dev']);
  const all = runAudit([]);
  const auditEvidence: AuditEvidence = {
    capturedAt: new Date().toISOString(),
    production,
    all,
  };
  writeFileSync(
    resolve(reviewsDir, 'v2.3.0-npm-audit-baseline.json'),
    `${JSON.stringify(auditEvidence, null, 2)}\n`,
  );
  const rulesetEvidence = runRulesetEvidence();
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

main();
