#!/usr/bin/env node
// G65 (Auftrag 067S, Spec §21): Third-Party-License-Check ohne Netz und ohne
// Zusatzpaket. Liest package-lock.json und prüft jede Produktionsabhängigkeit
// (alles ohne `dev: true`) gegen eine Allowlist permissiver Lizenzen.
// SPDX-Ausdrücke: `OR` braucht eine erlaubte Alternative, `AND` verlangt alle.
// Fehlende oder unbekannte Lizenzangaben sind rot (fail-closed).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ALLOWED_LICENSES = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'BlueOak-1.0.0',
]);

/** Wertet einen einfachen SPDX-Ausdruck (AND/OR, Klammern) gegen die Allowlist aus. */
export function isAllowedExpression(expression, allowed = ALLOWED_LICENSES) {
  if (typeof expression !== 'string' || expression.trim() === '') return false;
  const tokens = expression.replace(/[()]/g, ' $& ').trim().split(/\s+/);
  let pos = 0;
  const parseOr = () => {
    let value = parseAnd();
    while (tokens[pos] === 'OR') {
      pos++;
      const right = parseAnd();
      value = value || right;
    }
    return value;
  };
  const parseAnd = () => {
    let value = parseAtom();
    while (tokens[pos] === 'AND') {
      pos++;
      const right = parseAtom();
      value = value && right;
    }
    return value;
  };
  const parseAtom = () => {
    const token = tokens[pos++];
    if (token === '(') {
      const value = parseOr();
      if (tokens[pos++] !== ')') throw new Error(`Ungültiger SPDX-Ausdruck: ${expression}`);
      return value;
    }
    if (token === undefined || token === ')' || token === 'AND' || token === 'OR') {
      throw new Error(`Ungültiger SPDX-Ausdruck: ${expression}`);
    }
    return allowed.has(token);
  };
  try {
    const result = parseOr();
    return pos === tokens.length && result;
  } catch {
    return false;
  }
}

/** Liefert alle Produktionspakete aus dem Lockfile mit ihrer Lizenz und dem Prüfergebnis. */
export function evaluateLockfile(lock, allowed = ALLOWED_LICENSES) {
  const packages = Object.entries(lock?.packages ?? {}).filter(
    ([path, meta]) => path !== '' && meta && meta.dev !== true,
  );
  const checked = packages.map(([path, meta]) => {
    const license = typeof meta.license === 'string' ? meta.license : null;
    return {
      name: path.replace(/^.*node_modules\//, ''),
      license,
      ok: isAllowedExpression(license, allowed),
    };
  });
  return { total: checked.length, violations: checked.filter((p) => !p.ok) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const lockPath = resolve(import.meta.dirname, '..', 'package-lock.json');
  const { total, violations } = evaluateLockfile(JSON.parse(readFileSync(lockPath, 'utf-8')));
  if (total === 0) {
    console.error('LIZENZCHECK ROT: keine Produktionsabhängigkeiten im Lockfile gefunden.');
    process.exit(1);
  }
  for (const v of violations) console.error(`  ${v.name}: ${v.license ?? '(keine Angabe)'}`);
  if (violations.length > 0) {
    console.error(`LIZENZCHECK ROT: ${violations.length} von ${total} Paketen nicht erlaubt.`);
    process.exit(1);
  }
  console.log(`LIZENZCHECK GRÜN: ${total} Produktionspakete, alle mit erlaubter Lizenz.`);
}
