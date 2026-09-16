// G44 (Auftrag 067A, Block E): Rote Qualitäts- und Release-Verträge. Bewusst
// rot — friert Audit-, Baseline-, Release-, CI-, Lizenz- und Ruleset-Mängel
// als Sollverträge ein. Genau ein maßgeblicher Test pro Finding-ID;
// Detailassertions laufen per soft weiter. Produktdateien bleiben unberührt.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf-8');
}

interface AuditBaseline {
  production: { total: number; moderate: number; high: number; critical: number };
  all: { total: number; moderate: number; high: number; critical: number };
}

interface RulesetBaseline {
  activeRulesets: Array<{
    name: string;
    enforcement: string;
    target: string;
    appliesToMain: boolean;
    allowsBypass: boolean;
    requiredChecks: string[];
    allowsDirectPush: boolean;
  }>;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readRepo(relativePath)) as T;
}

function firstNumberAfter(text: string, key: string): number | null {
  const pattern = new RegExp(`^\\s*${key}:\\s*(\\d+),?\\s*$`, 'm');
  const match = pattern.exec(text);
  return match?.[1] ? Number(match[1]) : null;
}

describe('v2.3.0 quality and release findings', () => {
  it('[PR-DEPENDENCY-15] hält Audit-Grenzen ein', () => {
    const audit = readJson<AuditBaseline>('docs/reviews/v2.3.0-npm-audit-baseline.json');
    expect.soft(audit.production.total, 'Produktionsaudit total 0').toBe(0);
    expect.soft(audit.all.high, 'Gesamtaudit high 0').toBe(0);
    expect.soft(audit.all.critical, 'Gesamtaudit critical 0').toBe(0);
  });

  it('[PR-QUALITY-16] erfüllt Qualitätsgrenzen ohne Baseline-Ausnahmen', () => {
    const workflow = readRepo('.github/workflows/ci.yml');
    for (const key of [
      'LINT_BASELINE',
      'MAX_LINES_BASELINE',
      'TSC_BASELINE',
      'INLINE_STYLE_BASELINE',
    ]) {
      const match = new RegExp(`^\\s*${key}:\\s*(\\d+)\\s*$`, 'm').exec(workflow);
      expect.soft(Number(match?.[1] ?? NaN), `CI-Baseline ${key} ist 0`).toBe(0);
    }
    const vitestConfig = readRepo('vitest.config.ts');
    const thresholdsIndex = vitestConfig.indexOf('thresholds:');
    const thresholdsBlock = thresholdsIndex >= 0 ? vitestConfig.slice(thresholdsIndex) : '';
    expect
      .soft(firstNumberAfter(thresholdsBlock, 'lines'), 'globale Coverage lines ≥ 80')
      .toBeGreaterThanOrEqual(80);
    expect
      .soft(firstNumberAfter(thresholdsBlock, 'branches'), 'globale Coverage branches ≥ 80')
      .toBeGreaterThanOrEqual(80);
    expect
      .soft(firstNumberAfter(thresholdsBlock, 'functions'), 'globale Coverage functions ≥ 75')
      .toBeGreaterThanOrEqual(75);
    expect
      .soft(firstNumberAfter(thresholdsBlock, 'statements'), 'globale Coverage statements ≥ 70')
      .toBeGreaterThanOrEqual(70);

    const prettier = spawnSync('npx', ['prettier', '--check', 'src/**/*.{ts,tsx}'], {
      cwd: repoRoot,
      encoding: 'utf-8',
      shell: false,
    });
    expect.soft(prettier.status, 'Prettier 0 Abweichungen').toBe(0);

    const linted = spawnSync(
      'npx',
      [
        'eslint',
        'src/simulation/scenarioService.ts',
        'src/simulation/eventRules.ts',
        'src/features/resources/components/ResourceViewer.tsx',
        '--max-warnings',
        '0',
      ],
      { cwd: repoRoot, encoding: 'utf-8', shell: false },
    );
    expect.soft(linted.status, 'keine fortbestehende Max-Lines-Ausnahme').toBe(0);
  }, 300_000);

  it('[PR-RELEASE-17] meldet Readiness ehrlich per Exit-Code', () => {
    const script = readRepo('scripts/verifyV22ReleaseReadiness.ts');
    expect
      .soft(script, 'keine Defaultmetriken per Fallback')
      .not.toMatch(/Fallback auf Baselinewerte/);
    expect.soft(script, 'kein bedingungsloser Exit 0').not.toMatch(/^process\.exit\(0\);?\s*$/m);
  });

  it('[PR-CI-18] pinnt Actions und testet E2E auf PR und main', () => {
    const workflow = readRepo('.github/workflows/ci.yml');
    const usesLines = workflow.split('\n').filter((line) => line.trim().startsWith('uses:'));
    const external = usesLines.filter((line) => line.includes('/') && !line.includes('docker://'));
    expect.soft(external.length, 'externe Actions vorhanden').toBeGreaterThan(0);
    for (const line of external) {
      expect.soft(line.trim(), `SHA-gepinnt: ${line.trim()}`).toMatch(/@[0-9a-f]{40}(\s|$)/);
    }
    const e2eIndex = workflow.indexOf('\n  e2e:');
    const e2eBlock = e2eIndex >= 0 ? workflow.slice(e2eIndex) : '';
    const restrictsEvent = /event_name/.test(e2eBlock);
    const allowsMain = /refs\/heads\/main/.test(e2eBlock);
    expect.soft(!restrictsEvent || allowsMain, 'E2E läuft auf Pull Requests und main').toBe(true);
    expect.soft(e2eBlock, 'E2E führt Release-Readiness aus').toMatch(/ReleaseReadiness/);
    expect.soft(e2eBlock, 'E2E führt Accessibility-Prüfung aus').toMatch(/a11y|axe/i);
  });

  it('[PR-LICENSE-19] weist proprietäre Root-Lizenz nach', () => {
    const licensePath = resolve(repoRoot, 'LICENSE');
    expect.soft(existsSync(licensePath), 'Root-Datei LICENSE existiert').toBe(true);
    const license = existsSync(licensePath) ? readFileSync(licensePath, 'utf-8') : '';
    expect.soft(license, 'All Rights Reserved enthalten').toContain('All Rights Reserved');
  });

  it('[PR-BRANCH-20] schützt main per Ruleset nachweisbar', () => {
    const evidence = readJson<RulesetBaseline>('docs/reviews/v2.3.0-github-ruleset-baseline.json');
    const mainRulesets = evidence.activeRulesets.filter((ruleset) => ruleset.target === 'branch');
    expect
      .soft(mainRulesets.length, 'mindestens ein aktives main-Ruleset')
      .toBeGreaterThanOrEqual(1);
    for (const ruleset of mainRulesets) {
      expect.soft(ruleset.enforcement, `${ruleset.name}: Enforcement aktiv`).toBe('active');
      expect.soft(ruleset.appliesToMain, `${ruleset.name}: wirkt auf main`).toBe(true);
      expect.soft(ruleset.allowsBypass, `${ruleset.name}: keine Bypass-Akteure`).toBe(false);
      expect
        .soft(ruleset.requiredChecks.length, `${ruleset.name}: Required Checks`)
        .toBeGreaterThanOrEqual(1);
      expect.soft(ruleset.allowsDirectPush, `${ruleset.name}: kein direkter Push`).toBe(false);
    }
  });
});
