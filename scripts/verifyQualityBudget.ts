// Issue #7: Quality-Debt-Budget als Ratsche.
// Misst die Qualitätsschulden, die die ESLint-/TSC-Baselines in ci.yml nicht
// sehen (Suppressions per eslint-disable, Inline-Styles außerhalb des
// react/forbid-dom-props-Scopes) und vergleicht sie mit
// docs/quality/debt-budget.json. Fail-closed in beide Richtungen:
//   - Ist > Budget  → Regression, CI rot.
//   - Ist < Budget  → Abbau erzielt, Budget muss im selben PR gesenkt werden
//                     (sonst könnte der gewonnene Spielraum wieder verbraucht werden).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

export const DEFAULT_BUDGET_PATH = path.join(ROOT, 'docs/quality/debt-budget.json');

export interface BudgetEntry {
  budget: number;
  target: number;
  rationale: string;
}

export interface DebtBudget {
  owner: string;
  reviewBy: string;
  suppressions: Record<string, BudgetEntry>;
  inlineStyles: Record<string, BudgetEntry>;
}

export interface SourceFile {
  path: string;
  content: string;
}

export interface BudgetFinding {
  metric: string;
  actual: number;
  budget: number;
  target: number;
  kind: 'regression' | 'stale-budget' | 'invalid-budget';
}

const TEST_FILE = /(__tests__\/|\.vitest\.tsx?$|\.test\.tsx?$|\.spec\.tsx?$)/;
const DISABLE_DIRECTIVE = /(?:\/\/|\/\*)\s*eslint-disable(?:-next-line|-line)?(?=[\s*]|$)([^\n]*)/g;
// Whitespace um `=` ist gültiges JSX (Prettier läuft in der CI nicht für jede Datei).
const STYLE_ATTR = /\bstyle\s*=\s*\{/g;

/** Zählt eslint-disable-Direktiven je Regel. Direktiven ohne Regelnamen zählen als `*`. */
export function countSuppressions(files: SourceFile[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of files) {
    for (const match of file.content.matchAll(DISABLE_DIRECTIVE)) {
      const body = match[1]
        .split('--')[0]
        .replace(/\*\/.*$/, '')
        .trim();
      const rules = body
        ? body
            .split(',')
            .map((rule) => rule.trim())
            .filter(Boolean)
        : ['*'];
      for (const rule of rules) counts[rule] = (counts[rule] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Bereich mit dem längsten passenden Präfix — unabhängig von der Reihenfolge
 * der Keys in debt-budget.json (`src/features/resources/` vor `src/`).
 */
export function areaFor(filePath: string, areas: string[]): string | undefined {
  return areas
    .filter((prefix) => filePath.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];
}

/**
 * Zählt `style={…}`-Attribute in Produktions-TSX, die NICHT durch eine
 * zeilengenaue, begründete forbid-dom-props-Ausnahme gedeckt sind (die sind
 * bereits im Suppression-Budget). Zuordnung zum ersten passenden Pfad-Präfix.
 */
export function countInlineStyles(files: SourceFile[], areas: string[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(areas.map((area) => [area, 0]));
  for (const file of files) {
    if (!file.path.endsWith('.tsx') || TEST_FILE.test(file.path)) continue;
    const area = areaFor(file.path, areas);
    const lines = file.content.split('\n');
    lines.forEach((line, index) => {
      const hits = line.match(STYLE_ATTR)?.length ?? 0;
      if (hits === 0) return;
      const covered =
        /eslint-disable-line[^\n]*react\/forbid-dom-props/.test(line) ||
        /eslint-disable-next-line[^\n]*react\/forbid-dom-props/.test(lines[index - 1] ?? '');
      // Eine begründete Ausnahme deckt genau ein style-Attribut; jedes weitere
      // auf derselben Zeile zählt als unbegründeter Inline-Style.
      const uncovered = covered ? hits - 1 : hits;
      if (uncovered === 0) return;
      if (area === undefined) {
        throw new Error(`Inline-Style in ${file.path} liegt in keinem Budget-Bereich`);
      }
      counts[area] += uncovered;
    });
  }
  return counts;
}

function compare(
  group: string,
  actual: Record<string, number>,
  entries: Record<string, BudgetEntry>,
): BudgetFinding[] {
  const findings: BudgetFinding[] = [];
  const keys = new Set([...Object.keys(actual), ...Object.keys(entries)]);
  for (const key of [...keys].sort()) {
    const entry = entries[key] ?? { budget: 0, target: 0, rationale: '' };
    const value = actual[key] ?? 0;
    const metric = `${group}:${key}`;
    const base = { metric, actual: value, budget: entry.budget, target: entry.target };
    if (entry.target > entry.budget || entry.budget < 0 || entry.target < 0) {
      findings.push({ ...base, kind: 'invalid-budget' });
    } else if (value > entry.budget) {
      findings.push({ ...base, kind: 'regression' });
    } else if (value < entry.budget) {
      findings.push({ ...base, kind: 'stale-budget' });
    }
  }
  return findings;
}

export function evaluateBudget(files: SourceFile[], budget: DebtBudget): BudgetFinding[] {
  return [
    ...compare('suppressions', countSuppressions(files), budget.suppressions),
    ...compare(
      'inlineStyles',
      countInlineStyles(files, Object.keys(budget.inlineStyles)),
      budget.inlineStyles,
    ),
  ];
}

function collectSourceFiles(dir: string): SourceFile[] {
  const result: SourceFile[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      result.push({
        path: path.relative(ROOT, full).split(path.sep).join('/'),
        content: fs.readFileSync(full, 'utf-8'),
      });
    }
  }
  return result;
}

export function runQualityBudget(budgetPath = DEFAULT_BUDGET_PATH): number {
  const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf-8')) as DebtBudget;
  const files = collectSourceFiles(path.join(ROOT, 'src'));
  const suppressions = countSuppressions(files);
  const inlineStyles = countInlineStyles(files, Object.keys(budget.inlineStyles));

  console.log(`Quality-Debt-Budget (Owner ${budget.owner}, Review bis ${budget.reviewBy})`);
  for (const [group, actual, entries] of [
    ['suppressions', suppressions, budget.suppressions],
    ['inlineStyles', inlineStyles, budget.inlineStyles],
  ] as const) {
    for (const [key, entry] of Object.entries(entries)) {
      console.log(
        `  ${group}:${key} = ${actual[key] ?? 0} (Budget ${entry.budget}, Ziel ${entry.target})`,
      );
    }
  }

  const findings = evaluateBudget(files, budget);
  for (const f of findings) {
    if (f.kind === 'regression') {
      console.log(`::error::Debt-Regression ${f.metric}: ${f.actual} > Budget ${f.budget}`);
    } else if (f.kind === 'stale-budget') {
      console.log(
        `::error::${f.metric} auf ${f.actual} gesenkt — Budget in docs/quality/debt-budget.json von ${f.budget} auf ${f.actual} senken (Ratsche)`,
      );
    } else {
      console.log(
        `::error::${f.metric}: ungültiges Budget (Budget ${f.budget}, Ziel ${f.target}; Ziel darf Budget nicht übersteigen)`,
      );
    }
  }
  return findings.length === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  process.exit(runQualityBudget());
}
