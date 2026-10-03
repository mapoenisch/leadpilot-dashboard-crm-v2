#!/usr/bin/env node
// CI-Auftrag Audit-Ausnahme braces (docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_AUDIT_AUSNAHME_BRACES.md):
// Führt `npm audit --json` aus und bricht wie `npm audit` ab, lässt aber einzelne, begründete und
// befristete Advisories zu. Eine Schwachstelle gilt nur dann als zugelassen, wenn ALLE Advisories,
// auf die sie (auch über Abhängigkeiten) zurückgeht, auf der Liste stehen und nicht abgelaufen sind.
// Nach Ablauf greift die Ausnahme nicht mehr (fail-closed). Keine Abhängigkeiten.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const ALLOWLIST = [
  {
    id: 'GHSA-vfj7-8cjw-p6xm',
    package: 'braces',
    reason:
      'Stack-Exhaustion bei tief verschachtelten Mustern. Betroffen bis 3.0.3, der neuesten Version; ' +
      'keine reparierte Version (Stand 03.10.2026). Kommt nur über tailwindcss@3 (Build-Werkzeug) mit festen Mustern ' +
      'aus dem Repository, keine fremden Eingaben. Entscheidung Marc vom 03.10.2026.',
    expires: '2026-11-02',
  },
];

const SEVERITIES = ['info', 'low', 'moderate', 'high', 'critical'];

export const advisoryId = (url) =>
  (url ?? '').match(/GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/)?.[0];

/** Aktive Einträge der Liste zum Stichtag `today` (YYYY-MM-DD); abgelaufene getrennt. */
export function activeAllowlist(allowlist, today) {
  const active = allowlist.filter((entry) => entry.expires >= today);
  const expired = allowlist.filter((entry) => entry.expires < today);
  return { active, expired };
}

/** Alle Advisories, auf die eine Schwachstelle zurückgeht (über `via` rekursiv aufgelöst). */
export function rootAdvisories(vulnerabilities, name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const vulnerability = vulnerabilities[name];
  if (!vulnerability) return [{ id: undefined, package: name }];
  return vulnerability.via.flatMap((via) =>
    typeof via === 'string'
      ? rootAdvisories(vulnerabilities, via, seen)
      : [{ id: advisoryId(via.url), package: via.name ?? name }],
  );
}

/**
 * Teilt den Audit-Bericht in verbleibende und zugelassene Schwachstellen ab `level`.
 * Zugelassen nur, wenn jede Wurzel-Advisory mit ID und Paket auf der aktiven Liste steht.
 */
export function evaluateAudit(report, { allowlist = ALLOWLIST, today, level = 'low' }) {
  const minimum = SEVERITIES.indexOf(level);
  if (minimum === -1) throw new Error(`Unbekannte Audit-Stufe: ${level}`);
  const { active, expired } = activeAllowlist(allowlist, today);
  const allowed = (advisory) =>
    active.some((entry) => entry.id === advisory.id && entry.package === advisory.package);
  const vulnerabilities = report.vulnerabilities ?? {};
  const remaining = [];
  const suppressed = [];
  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (SEVERITIES.indexOf(vulnerability.severity) < minimum) continue;
    const roots = rootAdvisories(vulnerabilities, name);
    const entry = { name, severity: vulnerability.severity, advisories: roots.map((r) => r.id) };
    if (roots.length > 0 && roots.every(allowed)) suppressed.push(entry);
    else remaining.push(entry);
  }
  return { remaining, suppressed, expired };
}

function runAudit(omitDev) {
  const args = ['audit', '--json', ...(omitDev ? ['--omit=dev'] : [])];
  try {
    return execFileSync('npm', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  } catch (error) {
    // npm audit meldet Befunde mit Exit ungleich 0; maßgeblich ist das JSON auf stdout.
    if (error.stdout) return error.stdout;
    throw error;
  }
}

function main(argv) {
  const args = Object.fromEntries(
    argv.map((arg) => arg.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? 'true']),
  );
  const omitDev = args.omit === 'dev';
  const level = args['audit-level'] ?? 'low';
  const report = JSON.parse(runAudit(omitDev));
  if (report.error) throw new Error(`npm audit fehlgeschlagen: ${JSON.stringify(report.error)}`);
  const today = new Date().toISOString().slice(0, 10);
  const { remaining, suppressed, expired } = evaluateAudit(report, { today, level });
  const scope = `${omitDev ? 'nur Produktion' : 'alle Abhängigkeiten'}, ab ${level}`;

  for (const entry of expired)
    console.log(`Ausnahme ${entry.id} (${entry.package}) ist am ${entry.expires} abgelaufen.`);
  for (const entry of suppressed)
    console.log(
      `zugelassen: ${entry.name} (${entry.severity}) über ${entry.advisories.join(', ')}`,
    );
  if (remaining.length > 0) {
    console.error(
      `npm audit (${scope}): ${remaining.length} Schwachstelle(n) ohne gültige Ausnahme:`,
    );
    for (const entry of remaining)
      console.error(`  ${entry.name} (${entry.severity}) über ${entry.advisories.join(', ')}`);
    process.exit(1);
  }
  console.log(`npm audit (${scope}): keine Schwachstelle ohne gültige Ausnahme.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
