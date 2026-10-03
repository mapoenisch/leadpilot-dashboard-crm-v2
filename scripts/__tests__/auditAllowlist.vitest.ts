// CI-Auftrag Audit-Ausnahme braces: Ausnahmen gelten nur vollständig, nur befristet und nur per ID.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ALLOWLIST, advisoryId, evaluateAudit, rootAdvisories } from '../auditAllowlist.mjs';

const BRACES = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const OTHER = 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc';
const advisory = (name: string, url: string, severity = 'high') => ({ name, url, severity });

// Aufbau wie `npm audit --json` am 03.10.2026 (tailwindcss@3 → chokidar/micromatch → braces).
const report = (extraVia: object[] = []) => ({
  vulnerabilities: {
    braces: { severity: 'high', via: [advisory('braces', BRACES), ...extraVia] },
    chokidar: { severity: 'high', via: ['braces'] },
    micromatch: { severity: 'high', via: ['braces'] },
    'fast-glob': { severity: 'high', via: ['micromatch'] },
    tailwindcss: { severity: 'high', via: ['chokidar', 'fast-glob', 'micromatch'] },
  },
});
const allowlist = [
  { id: 'GHSA-vfj7-8cjw-p6xm', package: 'braces', reason: 'x', expires: '2026-11-02' },
];

describe('evaluateAudit', () => {
  it('lässt die braces-Kette samt abhängiger Pakete vor Ablauf zu', () => {
    const result = evaluateAudit(report(), { allowlist, today: '2026-10-03', level: 'high' });
    expect(result.remaining).toEqual([]);
    expect(result.suppressed.map((entry) => entry.name).sort()).toEqual([
      'braces',
      'chokidar',
      'fast-glob',
      'micromatch',
      'tailwindcss',
    ]);
  });

  it('greift nach Ablauf nicht mehr (fail-closed)', () => {
    const result = evaluateAudit(report(), { allowlist, today: '2026-11-03', level: 'high' });
    expect(result.remaining).toHaveLength(5);
    expect(result.expired).toHaveLength(1);
  });

  it('lässt eine Schwachstelle nicht zu, sobald eine weitere Advisory dazukommt', () => {
    const result = evaluateAudit(report([advisory('braces', OTHER)]), {
      allowlist,
      today: '2026-10-03',
      level: 'high',
    });
    expect(result.remaining.map((entry) => entry.name)).toContain('braces');
    expect(result.remaining.map((entry) => entry.name)).toContain('tailwindcss');
  });

  it('verlangt ID und Paket: dieselbe ID an einem anderen Paket zählt nicht', () => {
    const foreign = {
      vulnerabilities: { other: { severity: 'critical', via: [advisory('other', BRACES)] } },
    };
    expect(evaluateAudit(foreign, { allowlist, today: '2026-10-03' }).remaining).toHaveLength(1);
  });

  it('wertet nur ab der verlangten Stufe und lehnt unbekannte Stufen ab', () => {
    const low = { vulnerabilities: { x: { severity: 'moderate', via: [advisory('x', OTHER)] } } };
    expect(evaluateAudit(low, { allowlist, today: '2026-10-03', level: 'high' }).remaining).toEqual(
      [],
    );
    expect(evaluateAudit(low, { allowlist, today: '2026-10-03' }).remaining).toHaveLength(1);
    expect(() => evaluateAudit(low, { allowlist, today: '2026-10-03', level: 'hoch' })).toThrow();
  });

  it('löst Kreise in der via-Kette ohne Endlosschleife auf', () => {
    const vulnerabilities = {
      a: { severity: 'high', via: ['b'] },
      b: { severity: 'high', via: ['a'] },
    };
    expect(rootAdvisories(vulnerabilities, 'a')).toEqual([]);
    expect(
      evaluateAudit({ vulnerabilities }, { allowlist, today: '2026-10-03' }).remaining,
    ).toHaveLength(2);
  });

  it('liest die GHSA-ID aus der Advisory-URL', () => {
    expect(advisoryId(BRACES)).toBe('GHSA-vfj7-8cjw-p6xm');
    expect(advisoryId('https://example.org')).toBeUndefined();
  });
});

describe('Ausnahmeliste und CI-Vertrag', () => {
  it('jede Ausnahme hat ID, Paket, Begründung und ein Ablaufdatum höchstens 90 Tage nach dem 03.10.2026', () => {
    for (const entry of ALLOWLIST) {
      expect(entry.id).toMatch(/^GHSA-/);
      expect(entry.package).toBeTruthy();
      expect(entry.reason.length).toBeGreaterThan(40);
      expect(entry.expires).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.expires <= '2027-01-01').toBe(true);
    }
  });

  it('ci.yml prüft Produktion ab low und alle Abhängigkeiten ab high über das Skript', () => {
    const ci = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('node scripts/auditAllowlist.mjs --omit=dev\n');
    expect(ci).toContain('node scripts/auditAllowlist.mjs --audit-level=high\n');
    expect(ci).not.toMatch(/^\s*npm audit/m);
  });
});
