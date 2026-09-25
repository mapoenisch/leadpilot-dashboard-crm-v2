// Issue #7: Quality-Debt-Budget-Ratsche. Prüft Zählung und Fail-closed-Verhalten
// in beide Richtungen (Regression und nicht nachgezogene Budgetsenkung).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BUDGET_PATH,
  areaFor,
  countInlineStyles,
  countSuppressions,
  evaluateBudget,
  runQualityBudget,
  type DebtBudget,
} from '../verifyQualityBudget';

const entry = (budget: number, target = 0) => ({ budget, target, rationale: 'test' });

const budget = (overrides: Partial<DebtBudget> = {}): DebtBudget => ({
  owner: '@test',
  reviewBy: '2099-01-01',
  suppressions: { 'no-console': entry(1, 1) },
  inlineStyles: { 'src/frozen/': entry(1, 1), 'src/': entry(1) },
  ...overrides,
});

describe('verifyQualityBudget', () => {
  it('zählt eslint-disable-Direktiven je Regel und ignoriert Fließtext', () => {
    const counts = countSuppressions([
      {
        path: 'src/a.ts',
        content: [
          '/* eslint-disable no-console -- zentraler Logger */',
          '// eslint-disable-next-line react/forbid-dom-props, max-lines -- Grund',
          'const x = 1; // eslint-disable-line',
          '// Hinweis: kein eslint-disable ohne Begründung',
        ].join('\n'),
      },
    ]);
    expect(counts).toEqual({
      'no-console': 1,
      'react/forbid-dom-props': 1,
      'max-lines': 1,
      '*': 1,
    });
  });

  it('zählt nur unbegründete Inline-Styles in Produktions-TSX je Bereich', () => {
    const counts = countInlineStyles(
      [
        { path: 'src/frozen/A.tsx', content: '<div style={{ a: 1 }} />' },
        {
          path: 'src/B.tsx',
          content: [
            '<Badge style={{ fontSize: 9 }} />',
            '{/* eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie */}',
            '<div style={{ width }} />',
          ].join('\n'),
        },
        { path: 'src/__tests__/C.tsx', content: '<div style={{}} />' },
        { path: 'src/D.ui.vitest.tsx', content: '<div style={{}} />' },
      ],
      ['src/frozen/', 'src/'],
    );
    expect(counts).toEqual({ 'src/frozen/': 1, 'src/': 1 });
  });

  it('erkennt style-Attribute mit Whitespace um das Gleichheitszeichen', () => {
    const counts = countInlineStyles(
      [{ path: 'src/B.tsx', content: '<a style = {{}} />\n<b style ={x} />\n<c style= {y} />' }],
      ['src/'],
    );
    expect(counts).toEqual({ 'src/': 3 });
  });

  it('ordnet überlappende Bereiche nach dem längsten Präfix zu (Key-Reihenfolge egal)', () => {
    const files = [
      { path: 'src/frozen/A.tsx', content: '<div style={{}} />' },
      { path: 'src/B.tsx', content: '<a style={{}} />' },
    ];
    expect(countInlineStyles(files, ['src/', 'src/frozen/'])).toEqual({
      'src/': 1,
      'src/frozen/': 1,
    });
    expect(areaFor('src/frozen/x/A.tsx', ['src/', 'src/frozen/'])).toBe('src/frozen/');
    expect(areaFor('lib/A.tsx', ['src/'])).toBeUndefined();
  });

  it('Ausnahme deckt genau ein style-Attribut; weitere auf derselben Zeile zählen', () => {
    const counts = countInlineStyles(
      [
        {
          path: 'src/B.tsx',
          content: [
            '{/* eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie */}',
            '<div style={{ width }}><span style={{ color: "red" }} /></div>',
            '<div style={{ height }} /> {/* eslint-disable-line react/forbid-dom-props -- Laufzeit */}',
            '<a style={{}} /><b style={{}} /> {/* eslint-disable-line react/forbid-dom-props -- x */}',
          ].join('\n'),
        },
      ],
      ['src/'],
    );
    // Zeile 2: 2 Attribute, 1 gedeckt → 1; Zeile 3: 1 gedeckt → 0; Zeile 4: 2, 1 gedeckt → 1.
    expect(counts).toEqual({ 'src/': 2 });
  });

  it('Negativtest: zweites style auf einer Ausnahmezeile macht die Ratsche rot', () => {
    const files = [
      { path: 'src/frozen/A.tsx', content: '<div style={{}} />' },
      { path: 'src/B.tsx', content: '<a style={{}} />' },
      {
        path: 'src/C.tsx',
        content: [
          '/* eslint-disable no-console -- ok */',
          '{/* eslint-disable-next-line react/forbid-dom-props -- Laufzeit */}',
          '<div style={{ width }}><i style={{ color }} /></div>',
        ].join('\n'),
      },
    ];
    expect(
      evaluateBudget(
        files,
        budget({
          suppressions: { ...budget().suppressions, 'react/forbid-dom-props': entry(1, 1) },
        }),
      ),
    ).toEqual([
      expect.objectContaining({ metric: 'inlineStyles:src/', actual: 2, kind: 'regression' }),
    ]);
  });

  it('meldet Überschreitung als Regression', () => {
    const files = [
      { path: 'src/frozen/A.tsx', content: '<div style={{}} />' },
      { path: 'src/B.tsx', content: '<a style={{}} /><b style={{}} />' },
      { path: 'src/l.ts', content: '/* eslint-disable no-console -- ok */' },
    ];
    expect(evaluateBudget(files, budget())).toEqual([
      expect.objectContaining({ metric: 'inlineStyles:src/', actual: 2, kind: 'regression' }),
    ]);
  });

  it('meldet neue, nicht budgetierte Suppression-Regel als Regression', () => {
    const files = [
      { path: 'src/frozen/A.tsx', content: '<div style={{}} />' },
      { path: 'src/B.tsx', content: '<a style={{}} />' },
      { path: 'src/l.ts', content: '/* eslint-disable no-console, max-lines -- ok */' },
    ];
    expect(evaluateBudget(files, budget())).toEqual([
      expect.objectContaining({ metric: 'suppressions:max-lines', kind: 'regression' }),
    ]);
  });

  it('verlangt Budgetsenkung, sobald Schulden abgebaut wurden (Ratsche)', () => {
    const files = [
      { path: 'src/frozen/A.tsx', content: '<div style={{}} />' },
      { path: 'src/l.ts', content: '/* eslint-disable no-console -- ok */' },
    ];
    expect(evaluateBudget(files, budget())).toEqual([
      expect.objectContaining({ metric: 'inlineStyles:src/', actual: 0, kind: 'stale-budget' }),
    ]);
  });

  it('weist Ziel oberhalb des Budgets als ungültig ab', () => {
    const files = [
      { path: 'src/frozen/A.tsx', content: '<div style={{}} />' },
      { path: 'src/B.tsx', content: '<a style={{}} />' },
    ];
    const findings = evaluateBudget(files, budget({ suppressions: { 'no-console': entry(0, 1) } }));
    expect(findings).toEqual([
      expect.objectContaining({ metric: 'suppressions:no-console', kind: 'invalid-budget' }),
    ]);
  });

  it('hält das eingecheckte Budget exakt auf dem Ist-Stand des Repos', () => {
    expect(runQualityBudget(DEFAULT_BUDGET_PATH)).toBe(0);
  });
});
