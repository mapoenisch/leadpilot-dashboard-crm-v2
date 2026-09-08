/**
 * Verification Script: V2.1.0 Release Readiness (Gate G27 / Auftrag 043)
 *
 * Deterministischer, lokaler Release-Audit ohne externe Abhängigkeiten.
 * Prüft G24–G26-Nachweise, Versionsparität, G26-Hash-Matrix und Release-Dokumentation.
 *
 * Checks:
 *  1. package.json, package-lock.json root und packages[""] sind exakt "2.1.0"
 *  2. docs/releases/V2.1.0.md existiert mit Pflichtinhalten
 *  3. docs/BUILD_PLAN_V2.1.0.md existiert mit Pflichtinhalten
 *  4. docs/BUILD_LOG.md enthält unabhängige Freigaben G24/G25/G26
 *  5. G24/G25/G26-Verifier laufen als Child-Prozesse durch (Exit 0)
 *  6. 12 G26-PNGs existieren; SHA-256 stimmt mit Matrix; 6 Paare sind DISTINCT
 *  7. Git-Diff fc48233..HEAD enthält nur erlaubte Dateien
 *  8. Diff src/supabase/tools/n8n/public gegen fc48233 ist leer
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    failed++;
  } else {
    console.log(`✅ ${message}`);
    passed++;
  }
}

function assertFatal(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ FATAL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
  passed++;
}

/**
 * Konsistenz-Wächter für die Release-Dokumentation. Bricht bei Verletzung mit
 * Exit 1 ab, zählt aber NICHT in die Check-Summe — der dokumentierte Sollwert
 * `54/54` soll die Zahl echter Prüfungen bleiben, nicht die der Doku-Wächter.
 */
function guard(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ KONSISTENZ: ${message}`);
    process.exit(1);
  }
  console.log(`· ${message}`);
}

const EXPECTED_RELEASE_CHECKS = 54;
const RELEASE_READINESS_COUNT = '54/54';
const A11Y_AUDIT_COUNT = '57/57';

/**
 * Eine Zeile gilt als *aktuelle Ergebnisbehauptung* (nicht als historische
 * Befund-Prosa), wenn sie eine Tabellenzeile ist oder ein fettes „bestanden“-
 * Ergebnis mit ✅ / Exit 0. Nur solche Zeilen werden auf Zählwert-Konsistenz
 * geprüft — frühere Review-Notizen dürfen veraltete Zahlen zitieren.
 */
function isCurrentClaimLine(line: string): boolean {
  const l = line.trim();
  if (l.startsWith('|')) return true;
  if (/bestanden/.test(l) && /(✅|Exit 0)/.test(l)) return true;
  return false;
}

/**
 * Verlangt, dass jede *aktuelle* Ergebniszeile, die eines der G27-Artefakte
 * referenziert, keinen anderen `NN/NN`-Zählwert als den Kanon nennt. Damit
 * werden widersprüchliche bzw. veraltete Zählwerte (z. B. `52/52`, `58/58`,
 * `65/65`) in Tabellen und Ergebnissätzen abgelehnt.
 */
function assertNoConflictingCount(
  src: string,
  docLabel: string,
  artifactPattern: RegExp,
  canonical: string,
): void {
  const violations: string[] = [];
  for (const rawLine of src.split('\n')) {
    if (!isCurrentClaimLine(rawLine)) continue;
    if (!artifactPattern.test(rawLine)) continue;
    const counts = rawLine.match(/\b\d{1,3}\/\d{1,3}\b/g) ?? [];
    for (const c of counts) {
      if (c !== canonical) violations.push(`"${c}" statt ${canonical} — ${rawLine.trim()}`);
    }
  }
  guard(
    violations.length === 0,
    `${docLabel}: keine widersprüchlichen Zählwerte in aktuellen Ergebniszeilen (Sollwert ${canonical})` +
      (violations.length > 0 ? `\n    ${violations.join('\n    ')}` : ''),
  );
}

console.log('================================================================');
console.log('🔍 V2.1.0 RELEASE READINESS AUDIT (GATE G27 / AUFTRAG 043)');
console.log('================================================================\n');

// ---------------------------------------------------------------
// 1. Versionsparität: package.json + package-lock.json
// ---------------------------------------------------------------
console.log('--- 1. Versionsparität package.json / package-lock.json ---');
const TARGET_VERSION = '2.1.0';

const pkgPath = path.join(ROOT_DIR, 'package.json');
const lockPath = path.join(ROOT_DIR, 'package-lock.json');

assertFatal(fs.existsSync(pkgPath), 'package.json exists');
assertFatal(fs.existsSync(lockPath), 'package-lock.json exists');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

assert(pkg.version === TARGET_VERSION, `package.json version === "${TARGET_VERSION}" (actual: "${pkg.version}")`);
assert(lock.version === TARGET_VERSION, `package-lock.json root version === "${TARGET_VERSION}" (actual: "${lock.version}")`);

const lockPkgsRoot = lock.packages?.['']?.version;
assert(lockPkgsRoot === TARGET_VERSION, `package-lock.json packages[""].version === "${TARGET_VERSION}" (actual: "${lockPkgsRoot}")`);

// ---------------------------------------------------------------
// 2. docs/releases/V2.1.0.md
// ---------------------------------------------------------------
console.log('\n--- 2. docs/releases/V2.1.0.md ---');
const releasePath = path.join(ROOT_DIR, 'docs/releases/V2.1.0.md');
assert(fs.existsSync(releasePath), 'docs/releases/V2.1.0.md exists');

if (fs.existsSync(releasePath)) {
  const releaseSrc = fs.readFileSync(releasePath, 'utf8');
  assert(releaseSrc.includes('2.1.0'), 'Release note mentions 2.1.0');
  assert(releaseSrc.includes('fc48233'), 'Release note mentions baseline fc48233');
  assert(releaseSrc.includes('G24') && releaseSrc.includes('G25') && releaseSrc.includes('G26') && releaseSrc.includes('G27'),
    'Release note mentions all four gates G24–G27');
  assert(releaseSrc.includes('BEREIT ZUR UNABHÄNGIGEN PRÜFUNG'), 'Release note contains required status "BEREIT ZUR UNABHÄNGIGEN PRÜFUNG"');
  assert(!releaseSrc.includes('TAG/PUSH AUTORISIERT'), 'Release note does NOT claim TAG/PUSH AUTORISIERT');
  assert(!releaseSrc.toUpperCase().includes('VERÖFFENTLICHUNG ERFOLGT') && !releaseSrc.includes('has been published'),
    'Release note does NOT claim publication has occurred');
  guard(!releaseSrc.includes('TBD'), 'Release note enthält keinen TBD-Platzhalter');
  guard(releaseSrc.includes(RELEASE_READINESS_COUNT),
    `Release note nennt ${RELEASE_READINESS_COUNT} Checks für Release Readiness`);
  guard(releaseSrc.includes(A11Y_AUDIT_COUNT),
    `Release note nennt ${A11Y_AUDIT_COUNT} Checks für den Accessibility-Audit`);
  assertNoConflictingCount(releaseSrc, 'Release note', /verifyV21ReleaseReadiness|Release Readiness|Release-Verifier|Release-Audit/, RELEASE_READINESS_COUNT);
  assertNoConflictingCount(releaseSrc, 'Release note', /auditV21LiveAccessibility|Accessibility[- ]Audit|Accessibility-Protokoll/, A11Y_AUDIT_COUNT);
}

// ---------------------------------------------------------------
// 3. docs/BUILD_PLAN_V2.1.0.md
// ---------------------------------------------------------------
console.log('\n--- 3. docs/BUILD_PLAN_V2.1.0.md ---');
const buildPlanPath = path.join(ROOT_DIR, 'docs/BUILD_PLAN_V2.1.0.md');
assert(fs.existsSync(buildPlanPath), 'docs/BUILD_PLAN_V2.1.0.md exists');

if (fs.existsSync(buildPlanPath)) {
  const buildPlanSrc = fs.readFileSync(buildPlanPath, 'utf8');
  assert(buildPlanSrc.includes('G24') && buildPlanSrc.includes('G25') && buildPlanSrc.includes('G26'),
    'BUILD_PLAN_V2.1.0.md mentions G24, G25, G26 releases');
  assert(buildPlanSrc.includes('2cba81b') || buildPlanSrc.includes('G24'), 'BUILD_PLAN mentions G24 commit or gate');
  assert(buildPlanSrc.includes('e243dca'), 'BUILD_PLAN mentions G25 baseline e243dca');
  assert(buildPlanSrc.includes('fc48233'), 'BUILD_PLAN mentions G26 approval fc48233');
  assert(buildPlanSrc.includes('OFFEN — explizite Autorisierung erforderlich'),
    'BUILD_PLAN status is "OFFEN — explizite Autorisierung erforderlich"');
  guard(!buildPlanSrc.includes('TBD'), 'BUILD_PLAN enthält keinen TBD-Platzhalter');
  guard(!buildPlanSrc.includes('95de1c9'),
    'BUILD_PLAN listet 95de1c9 NICHT als G27-Freigabe-Commit (war ein Nacharbeitsbefund)');
  guard(!/G27[^\n|]*\bFREIGEGEBEN\b/.test(buildPlanSrc),
    'BUILD_PLAN behauptet keine G27-Freigabe (G27 ist noch nicht freigegeben)');
  assertNoConflictingCount(buildPlanSrc, 'BUILD_PLAN', /verifyV21ReleaseReadiness|Release Readiness|Release-Verifier|Release-Audit/, RELEASE_READINESS_COUNT);
  assertNoConflictingCount(buildPlanSrc, 'BUILD_PLAN', /auditV21LiveAccessibility|Accessibility[- ]Audit|Accessibility-Protokoll/, A11Y_AUDIT_COUNT);
}

// ---------------------------------------------------------------
// 4. docs/BUILD_LOG.md enthält G24/G25/G26-Freigaben
// ---------------------------------------------------------------
console.log('\n--- 4. BUILD_LOG.md G24–G26-Freigaben ---');
const buildLogPath = path.join(ROOT_DIR, 'docs/BUILD_LOG.md');
assertFatal(fs.existsSync(buildLogPath), 'docs/BUILD_LOG.md exists');

const buildLogSrc = fs.readFileSync(buildLogPath, 'utf8');
assert(buildLogSrc.includes('2cba81b'), 'BUILD_LOG contains G24 independent approval commit 2cba81b');
assert(buildLogSrc.includes('e243dca'), 'BUILD_LOG contains G25 baseline/approval e243dca');
assert(buildLogSrc.includes('fc48233'), 'BUILD_LOG contains G26 independent approval fc48233');
assert(!buildLogSrc.includes('V2.1.0 veröffentlicht') && !buildLogSrc.includes('published to production'),
  'BUILD_LOG does not contain false V2.1 publication claim');
// Hinweis: BUILD_LOG ist ein Append-only-Ledger und darf frühere Review-Befunde
// (inkl. des Wortes "TBD" in Zitaten) enthalten. Die TBD-Ablehnung gilt für die
// vorwärtsgerichteten Planungsdokumente (Release-Notiz, BUILD_PLAN, A11y-Protokoll).
guard(buildLogSrc.includes(RELEASE_READINESS_COUNT),
  `BUILD_LOG nennt ${RELEASE_READINESS_COUNT} Checks für Release Readiness`);
guard(buildLogSrc.includes(A11Y_AUDIT_COUNT),
  `BUILD_LOG nennt ${A11Y_AUDIT_COUNT} Checks für den Accessibility-Audit`);
assertNoConflictingCount(buildLogSrc, 'BUILD_LOG', /verifyV21ReleaseReadiness|Release Readiness|Release-Verifier|Release-Audit/, RELEASE_READINESS_COUNT);
assertNoConflictingCount(buildLogSrc, 'BUILD_LOG', /auditV21LiveAccessibility|Accessibility[- ]Audit|Accessibility-Protokoll/, A11Y_AUDIT_COUNT);

// 4b. docs/accessibility/auftrag-043/README.md — vom Audit erzeugtes Protokoll
console.log('\n--- 4b. docs/accessibility/auftrag-043/README.md ---');
const a11yReadmePath = path.join(ROOT_DIR, 'docs/accessibility/auftrag-043/README.md');
guard(fs.existsSync(a11yReadmePath), 'docs/accessibility/auftrag-043/README.md existiert');
if (fs.existsSync(a11yReadmePath)) {
  const a11yReadmeSrc = fs.readFileSync(a11yReadmePath, 'utf8');
  guard(!a11yReadmeSrc.includes('TBD'), 'Accessibility-Protokoll enthält keinen TBD-Platzhalter');
  guard(a11yReadmeSrc.includes(A11Y_AUDIT_COUNT),
    `Accessibility-Protokoll nennt ${A11Y_AUDIT_COUNT} Checks`);
  assertNoConflictingCount(a11yReadmeSrc, 'Accessibility-Protokoll', /Gesamt|Checks|auditV21LiveAccessibility/, A11Y_AUDIT_COUNT);
}

// ---------------------------------------------------------------
// 5. G24/G25/G26-Verifier als Child-Prozesse
// ---------------------------------------------------------------
console.log('\n--- 5. Vorhandene Verifier-Dateien laufen durch ---');

const verifiers = [
  'scripts/verifyLiveKpiCatalog.ts',
  'scripts/verifyLiveKpiStream.ts',
  'scripts/verifyLivePerformanceSurface.ts',
];

for (const v of verifiers) {
  const vPath = path.join(ROOT_DIR, v);
  assert(fs.existsSync(vPath), `${v} exists`);
  if (fs.existsSync(vPath)) {
    console.log(`  → Running ${v} ...`);
    const result = spawnSync('npx', ['tsx', vPath], {
      cwd: ROOT_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 120_000,
    });
    const exitOk = result.status === 0;
    if (!exitOk) {
      console.error(`  STDOUT: ${result.stdout?.slice(-500)}`);
      console.error(`  STDERR: ${result.stderr?.slice(-500)}`);
    }
    assert(exitOk, `${v} exits with code 0`);
  }
}

// ---------------------------------------------------------------
// 6. G26-PNG-Matrix: 12 Dateien + SHA-256 vs README
// ---------------------------------------------------------------
console.log('\n--- 6. G26-Screenshot-Matrix SHA-256-Verifikation ---');

const screenshotDir = path.join(ROOT_DIR, 'docs/screenshots/auftrag-042');
const matrixReadme = path.join(screenshotDir, 'README.md');
assertFatal(fs.existsSync(matrixReadme), 'docs/screenshots/auftrag-042/README.md exists');

const viewports = ['1440', '768', '375'] as const;
const stages = ['vorher', 'nachher'] as const;
const modes = ['deeplink', 'reload'] as const;

// Parse SHA-256 aus der README-Tabelle
const readmeSrc = fs.readFileSync(matrixReadme, 'utf8');

/** Extrahiert den Hash für einen gegebenen Dateinamen aus der README-Tabelle.
 *  Tabelle 2 hat jede PNG auf einer eigenen Zeile (bevorzugte Quelle).
 *  Tabelle 1 enthält Vorher+Nachher in einer Zeile – dort nehmen wir den
 *  Hash, der nach der Position des gesuchten Dateinamens kommt.
 */
function extractHash(filename: string): string | null {
  for (const line of readmeSrc.split('\n')) {
    if (!line.includes(filename)) continue;
    const namePos = line.indexOf(filename);
    // Alle 64-stelligen Hex-Hashes in der Zeile finden
    const allHashes: Array<{ index: number; hash: string }> = [];
    const re = /`([0-9a-f]{64})`/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      allHashes.push({ index: m.index, hash: m[1].toLowerCase() });
    }
    if (allHashes.length === 0) continue;
    // Hash nach dem Dateinamen bevorzugen
    const afterName = allHashes.find(h => h.index >= namePos);
    if (afterName) return afterName.hash;
    // Fallback: letzter Hash in der Zeile
    return allHashes[allHashes.length - 1].hash;
  }
  return null;
}

const expectedPngs: string[] = [];
for (const vp of viewports) {
  for (const stage of stages) {
    for (const mode of modes) {
      expectedPngs.push(`dashboard-${vp}-${stage}-${mode}.png`);
    }
  }
}

assert(expectedPngs.length === 12, `Expected exactly 12 PNG filenames (got ${expectedPngs.length})`);

// Überprüfe Existenz + Hash jeder PNG
const hashMap: Record<string, string> = {};
for (const pngName of expectedPngs) {
  const pngPath = path.join(screenshotDir, pngName);
  if (!fs.existsSync(pngPath)) {
    assert(false, `PNG exists: ${pngName}`);
    continue;
  }
  const buf = fs.readFileSync(pngPath);
  const sha = crypto.createHash('sha256').update(buf).digest('hex').toLowerCase();
  hashMap[pngName] = sha;

  const expectedHash = extractHash(pngName);
  if (expectedHash === null) {
    assert(false, `README contains hash for ${pngName}`);
  } else {
    assert(sha === expectedHash, `SHA-256 matches README for ${pngName} (${sha.slice(0, 16)}…)`);
  }
}

// Prüfe 6 DISTINCT Vorher-/Nachher-Paare
console.log('\n  → Prüfe DISTINCT-Paare:');
let distinctCount = 0;
for (const vp of viewports) {
  for (const mode of modes) {
    const vorher = `dashboard-${vp}-vorher-${mode}.png`;
    const nachher = `dashboard-${vp}-nachher-${mode}.png`;
    const hVor = hashMap[vorher];
    const hNach = hashMap[nachher];
    if (hVor && hNach) {
      const isDistinct = hVor !== hNach;
      if (isDistinct) distinctCount++;
      assert(isDistinct, `${vp} ${mode}: vorher ≠ nachher (DISTINCT pair)`);
    }
  }
}
assert(distinctCount === 6, `All 6 Vorher-/Nachher-Paare are DISTINCT (found ${distinctCount})`);

// ---------------------------------------------------------------
// 7. Git-Diff fc48233..HEAD – nur erlaubte Dateien
// ---------------------------------------------------------------
console.log('\n--- 7. Git-Diff-Scope: nur erlaubte Dateien seit fc48233 ---');

const BASELINE = 'fc48233';
const ALLOWED_DIFF_FILES = new Set([
  'docs/auftraege/ANTIGRAVITY_AUFTRAG_043_V2_1_REGRESSION_ACCESSIBILITY_RELEASE.md',
  'scripts/verifyV21ReleaseReadiness.ts',
  'scripts/auditV21LiveAccessibility.mjs',
  'docs/accessibility/auftrag-043/README.md',
  'docs/releases/V2.1.0.md',
  'docs/BUILD_PLAN_V2.1.0.md',
  'docs/BUILD_LOG.md',
  'package.json',
  'package-lock.json',
]);

let diffOutput = '';
try {
  diffOutput = execSync(`git diff --name-only ${BASELINE}..HEAD`, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  }).trim();
} catch (e) {
  assert(false, `git diff --name-only ${BASELINE}..HEAD succeeded`);
}

const changedFiles = diffOutput ? diffOutput.split('\n').map(f => f.trim()).filter(Boolean) : [];
const disallowedFiles = changedFiles.filter(f => !ALLOWED_DIFF_FILES.has(f));

assert(disallowedFiles.length === 0,
  `No disallowed files changed since ${BASELINE} (changed: ${changedFiles.join(', ') || 'none'})`);
if (disallowedFiles.length > 0) {
  console.error(`  Disallowed files: ${disallowedFiles.join(', ')}`);
}

// Prüfe package.json: nur version-Feld geändert
if (changedFiles.includes('package.json')) {
  try {
    const pkgDiff = execSync(`git diff ${BASELINE}..HEAD -- package.json`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });
    const addedLines = pkgDiff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
    const removedLines = pkgDiff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'));
    const onlyVersionChanged = [...addedLines, ...removedLines].every(l =>
      l.includes('"version"') || l.includes('version'));
    assert(onlyVersionChanged, 'package.json diff contains only version field changes');
  } catch {
    assert(false, 'Could not read package.json diff');
  }
}

// Prüfe package-lock.json: nur version-Felder geändert
if (changedFiles.includes('package-lock.json')) {
  try {
    const lockDiff = execSync(`git diff ${BASELINE}..HEAD -- package-lock.json`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });
    const addedLines = lockDiff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
    const removedLines = lockDiff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'));
    const onlyVersionChanged = [...addedLines, ...removedLines].every(l =>
      l.includes('"version"') || l.includes('version'));
    assert(onlyVersionChanged, 'package-lock.json diff contains only version field changes');
  } catch {
    assert(false, 'Could not read package-lock.json diff');
  }
}

// ---------------------------------------------------------------
// 8. Schutzbereichs-Diff: src/supabase/tools/n8n/public leer
// ---------------------------------------------------------------
console.log('\n--- 8. Schutzbereichs-Diff gegen fc48233 ---');

let protectedDiff = '';
try {
  protectedDiff = execSync(
    `git diff ${BASELINE}..HEAD -- src supabase tools/n8n public`,
    { cwd: ROOT_DIR, encoding: 'utf8' }
  ).trim();
} catch (e) {
  assert(false, `git diff ${BASELINE}..HEAD -- src supabase tools/n8n public succeeded`);
}

assert(protectedDiff === '', `Protected scope diff (src/supabase/tools/n8n/public) is empty against ${BASELINE}`);

// ---------------------------------------------------------------
// 9. Selbst-Zählwert-Kontrakt: der tatsächliche Lauf muss dem in
//    BUILD_LOG / Release-Notiz / BUILD_PLAN dokumentierten Sollwert entsprechen.
// ---------------------------------------------------------------
console.log('\n--- 9. Selbst-Zählwert-Kontrakt ---');
guard(failed === 0,
  `Release-Verifier hat 0 Fehlschläge (tatsächlich ${failed})`);
guard(passed === EXPECTED_RELEASE_CHECKS,
  `Release-Verifier zählt exakt ${EXPECTED_RELEASE_CHECKS} echte Checks (${RELEASE_READINESS_COUNT}); tatsächlich ${passed}. ` +
  `Bei bewusster Änderung EXPECTED_RELEASE_CHECKS und alle drei Dokumente gemeinsam anpassen.`);

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------
console.log('\n================================================================');
console.log(`📊 SUMMARY: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  console.error(`\n❌ V2.1.0 Release Readiness Audit FAILED — ${failed} check(s) did not pass.`);
  process.exit(1);
} else {
  console.log('\n✅ V2.1.0 Release Readiness Audit PASSED — BEREIT ZUR UNABHÄNGIGEN PRÜFUNG');
  process.exit(0);
}
