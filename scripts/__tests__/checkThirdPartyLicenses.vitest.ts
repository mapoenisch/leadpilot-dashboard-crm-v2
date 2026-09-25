// G65 (Auftrag 067S): Third-Party-License-Check ist fail-closed.
import { describe, expect, it } from 'vitest';
import { evaluateLockfile, isAllowedExpression } from '../checkThirdPartyLicenses.mjs';

describe('isAllowedExpression', () => {
  it('erlaubt permissive Einzellizenzen und kombinierte Ausdrücke', () => {
    expect(isAllowedExpression('MIT')).toBe(true);
    expect(isAllowedExpression('MIT AND ISC')).toBe(true);
    expect(isAllowedExpression('(MIT OR GPL-3.0)')).toBe(true);
    expect(isAllowedExpression('GPL-3.0 OR Apache-2.0')).toBe(true);
  });

  it('weist Copyleft, AND mit verbotener Lizenz, Leeres und Kaputtes ab', () => {
    expect(isAllowedExpression('GPL-3.0')).toBe(false);
    expect(isAllowedExpression('MIT AND GPL-3.0')).toBe(false);
    expect(isAllowedExpression('')).toBe(false);
    expect(isAllowedExpression(null)).toBe(false);
    expect(isAllowedExpression('(MIT')).toBe(false);
    expect(isAllowedExpression('MIT OR')).toBe(false);
  });
});

describe('evaluateLockfile', () => {
  it('prüft nur Produktionspakete und meldet fehlende Angaben', () => {
    const result = evaluateLockfile({
      packages: {
        '': { name: 'leadpilot', license: 'UNLICENSED' },
        'node_modules/react': { license: 'MIT' },
        'node_modules/devtool': { license: 'GPL-3.0', dev: true },
        'node_modules/a/node_modules/unknown': {},
        'node_modules/copyleft': { license: 'AGPL-3.0' },
      },
    });
    expect(result.total).toBe(3);
    expect(result.violations.map((v) => v.name)).toEqual(['unknown', 'copyleft']);
  });

  it('das echte Lockfile enthält nur erlaubte Produktionslizenzen', async () => {
    const { readFileSync } = await import('node:fs');
    const lock = JSON.parse(
      readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf-8'),
    );
    const result = evaluateLockfile(lock);
    expect(result.total).toBeGreaterThan(0);
    expect(result.violations).toEqual([]);
  });
});
