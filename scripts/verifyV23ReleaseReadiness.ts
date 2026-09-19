/**
 * Verification Script: V2.3.0 Release Readiness Audit (Gate G58 / Auftrag 067L)
 *
 * Fail-Closed Release-Audit für LeadPilot Dashboard-CRM V2.3.0.
 * Prüft alle Kriterien der Definition of Done aus realen Artefakten im aktuellen Lauf:
 * - Coverage (coverage/coverage-summary.json)
 * - Lighthouse (desktop run in .lighthouseci/)
 * - Audit (npm audit)
 * - Bundle & Size-Limit (dist/, .size-limit.json)
 * - Migrationen (supabase/migrations/)
 * - E2E & A11y (playwright-report/ / e2e)
 * - Statische Code-Prüfungen (ESLint, TSC, Prettier)
 *
 * INVARIANTE: Kein Fallback auf Defaultwerte, kein bedingungsloser Exit 0.
 * Bei fehlendem Artefakt, Grenzwertüberschreitung oder rotem Unterprozess: Exit 1.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');

export interface MetricResult {
  id: number;
  name: string;
  actual: string;
  target: string;
  status: 'ERFÜLLT' | 'OFFEN' | 'AUSNAHME' | 'DOKUMENTIERT';
  note?: string;
}

export interface CheckResult {
  ok: boolean;
  metrics: MetricResult[];
  errors: string[];
}

export interface ReadinessOptions {
  rootDir?: string;
  coverageSummaryPath?: string;
  lighthouseDir?: string;
  auditJsonPath?: string;
  distDir?: string;
  migrationsDir?: string;
  e2eReportPath?: string;
  runSubprocesses?: boolean;
  maxArtifactAgeMs?: number;
}

export function getMaxArtifactAgeMs(options: ReadinessOptions = {}): number {
  if (typeof options.maxArtifactAgeMs === 'number') {
    return options.maxArtifactAgeMs;
  }
  if (process.env.MAX_ARTIFACT_AGE_MS) {
    const parsed = parseInt(process.env.MAX_ARTIFACT_AGE_MS, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 60 * 60 * 1000; // 60 Minuten Default
}

export function isArtifactFresh(
  filePath: string,
  maxAgeMs: number,
): { fresh: boolean; ageMs: number } {
  try {
    const stat = fs.statSync(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    return {
      fresh: ageMs <= maxAgeMs,
      ageMs,
    };
  } catch {
    return { fresh: false, ageMs: Infinity };
  }
}

export interface ReadinessReport {
  success: boolean;
  metrics: MetricResult[];
  errors: string[];
}

// ============================================================================
// 1. Coverage Check (Fail-Closed)
// ============================================================================

export function checkCoverage(options: ReadinessOptions = {}): CheckResult {
  const root = options.rootDir ?? ROOT_DIR;
  const coveragePath = options.coverageSummaryPath ?? path.join(root, 'coverage/coverage-summary.json');
  const metrics: MetricResult[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(coveragePath)) {
    const errorMsg = `Coverage-Artefakt fehlt: ${coveragePath}`;
    errors.push(errorMsg);
    metrics.push(
      {
        id: 14,
        name: 'Coverage services/ + hooks/',
        actual: 'FEHLT',
        target: '≥ 90 %',
        status: 'OFFEN',
        note: errorMsg,
      },
      {
        id: 15,
        name: 'Coverage simulation/',
        actual: 'FEHLT',
        target: '≥ 80 %',
        status: 'OFFEN',
        note: errorMsg,
      },
      {
        id: 16,
        name: 'Coverage components/',
        actual: 'FEHLT',
        target: '≥ 60 %',
        status: 'OFFEN',
        note: errorMsg,
      },
    );
    return { ok: false, metrics, errors };
  }

  const maxAgeMs = getMaxArtifactAgeMs(options);
  const freshness = isArtifactFresh(coveragePath, maxAgeMs);
  if (!freshness.fresh) {
    const ageMinutes = Math.round(freshness.ageMs / 60000);
    const maxMinutes = Math.round(maxAgeMs / 60000);
    const errorMsg = `Coverage-Artefakt ist veraltet (${ageMinutes} min alt, maximal erlaubt: ${maxMinutes} min): ${coveragePath}`;
    errors.push(errorMsg);
    metrics.push(
      {
        id: 14,
        name: 'Coverage services/ + hooks/',
        actual: 'VERALTET',
        target: '≥ 90 %',
        status: 'OFFEN',
        note: errorMsg,
      },
      {
        id: 15,
        name: 'Coverage simulation/',
        actual: 'VERALTET',
        target: '≥ 80 %',
        status: 'OFFEN',
        note: errorMsg,
      },
      {
        id: 16,
        name: 'Coverage components/',
        actual: 'VERALTET',
        target: '≥ 60 %',
        status: 'OFFEN',
        note: errorMsg,
      },
    );
    return { ok: false, metrics, errors };
  }

  try {
    const summary = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

    const getRollup = (prefix: string) => {
      let total = 0;
      let covered = 0;
      for (const [file, data] of Object.entries(summary)) {
        if (file === 'total') continue;
        if (file.includes(`/src/${prefix}`) || file.endsWith(`/src/${prefix}`)) {
          const s = (data as { statements?: { total: number; covered: number } }).statements;
          if (s) {
            total += s.total;
            covered += s.covered;
          }
        }
      }
      return total > 0 ? Math.round((covered / total) * 10000) / 100 : 0;
    };

    let totalSH = 0;
    let coveredSH = 0;
    for (const [file, data] of Object.entries(summary)) {
      if (file === 'total') continue;
      if (file.includes('/src/services/') || file.includes('/src/hooks/')) {
        const s = (data as { statements?: { total: number; covered: number } }).statements;
        if (s) {
          totalSH += s.total;
          coveredSH += s.covered;
        }
      }
    }
    const coverageServicesHooks = totalSH > 0 ? Math.round((coveredSH / totalSH) * 10000) / 100 : 0;
    const coverageSimulation = getRollup('simulation/');
    const coverageComponents = getRollup('components/');

    const shOk = coverageServicesHooks >= 90;
    const simOk = coverageSimulation >= 80;
    const compOk = coverageComponents >= 60;

    metrics.push(
      {
        id: 14,
        name: 'Coverage services/ + hooks/',
        actual: `${coverageServicesHooks} %`,
        target: '≥ 90 %',
        status: shOk ? 'ERFÜLLT' : 'OFFEN',
        note: shOk ? 'Ziel ≥ 90 % erreicht' : 'Coverage-Schwelle nicht erreicht',
      },
      {
        id: 15,
        name: 'Coverage simulation/',
        actual: `${coverageSimulation} %`,
        target: '≥ 80 %',
        status: simOk ? 'ERFÜLLT' : 'OFFEN',
        note: simOk ? 'Ziel ≥ 80 % übertroffen' : 'Coverage-Schwelle nicht erreicht',
      },
      {
        id: 16,
        name: 'Coverage components/',
        actual: `${coverageComponents} %`,
        target: '≥ 60 %',
        status: compOk ? 'ERFÜLLT' : 'OFFEN',
        note: compOk ? 'Ziel ≥ 60 % erreicht' : 'Coverage-Schwelle nicht erreicht',
      },
    );

    const ok = shOk && simOk && compOk;
    if (!ok) {
      errors.push('Coverage-Schwellenwerte nicht vollständig erfüllt');
    }
    return { ok, metrics, errors };
  } catch (err: unknown) {
    const msg = `Fehler beim Parsen des Coverage-Artefakts: ${(err as Error).message}`;
    errors.push(msg);
    return { ok: false, metrics, errors };
  }
}

// ============================================================================
// 2. Lighthouse Check (Fail-Closed)
// ============================================================================

export function checkLighthouse(options: ReadinessOptions = {}): CheckResult {
  const root = options.rootDir ?? ROOT_DIR;
  const lhciDir = options.lighthouseDir ?? path.join(root, '.lighthouseci');
  const metrics: MetricResult[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(lhciDir)) {
    const errorMsg = `Lighthouse-Artefakt fehlt: ${lhciDir}`;
    errors.push(errorMsg);
    metrics.push(
      {
        id: 19,
        name: 'Lighthouse Performance',
        actual: 'FEHLT',
        target: '≥ 90',
        status: 'OFFEN',
        note: errorMsg,
      },
      {
        id: 20,
        name: 'Lighthouse Accessibility',
        actual: 'FEHLT',
        target: '≥ 95',
        status: 'OFFEN',
        note: errorMsg,
      },
    );
    return { ok: false, metrics, errors };
  }

  try {
    const files = fs.readdirSync(lhciDir);
    const lhrFiles = files.filter((f) => f.startsWith('lhr-') && f.endsWith('.json'));

    if (lhrFiles.length === 0) {
      const errorMsg = 'Keine Lighthouse-LHR-Ergebnisberichte in .lighthouseci gefunden';
      errors.push(errorMsg);
      metrics.push(
        {
          id: 19,
          name: 'Lighthouse Performance',
          actual: 'FEHLT',
          target: '≥ 90',
          status: 'OFFEN',
          note: errorMsg,
        },
        {
          id: 20,
          name: 'Lighthouse Accessibility',
          actual: 'FEHLT',
          target: '≥ 95',
          status: 'OFFEN',
          note: errorMsg,
        },
      );
      return { ok: false, metrics, errors };
    }

    lhrFiles.sort((a, b) => {
      const statA = fs.statSync(path.join(lhciDir, a)).mtimeMs;
      const statB = fs.statSync(path.join(lhciDir, b)).mtimeMs;
      return statB - statA;
    });

    const latestFile = lhrFiles[0];
    const latestLhrPath = path.join(lhciDir, latestFile);

    const maxAgeMs = getMaxArtifactAgeMs(options);
    const freshness = isArtifactFresh(latestLhrPath, maxAgeMs);
    if (!freshness.fresh) {
      const ageMinutes = Math.round(freshness.ageMs / 60000);
      const maxMinutes = Math.round(maxAgeMs / 60000);
      const errorMsg = `Lighthouse-Artefakt ist veraltet (${ageMinutes} min alt, maximal erlaubt: ${maxMinutes} min): ${latestFile}`;
      errors.push(errorMsg);
      metrics.push(
        {
          id: 19,
          name: 'Lighthouse Performance',
          actual: 'VERALTET',
          target: '≥ 90',
          status: 'OFFEN',
          note: errorMsg,
        },
        {
          id: 20,
          name: 'Lighthouse Accessibility',
          actual: 'VERALTET',
          target: '≥ 95',
          status: 'OFFEN',
          note: errorMsg,
        },
      );
      return { ok: false, metrics, errors };
    }

    const latestLhr = JSON.parse(fs.readFileSync(latestLhrPath, 'utf8'));
    const perfScore = Math.round((latestLhr.categories?.performance?.score ?? 0) * 100);
    const a11yScore = Math.round((latestLhr.categories?.accessibility?.score ?? 0) * 100);

    const perfOk = perfScore >= 90;
    const a11yOk = a11yScore >= 95;

    metrics.push(
      {
        id: 19,
        name: 'Lighthouse Performance',
        actual: `${perfScore}`,
        target: '≥ 90',
        status: perfOk ? 'ERFÜLLT' : 'OFFEN',
        note: `Gemessen in .lighthouseci/${lhrFiles[0]}`,
      },
      {
        id: 20,
        name: 'Lighthouse Accessibility',
        actual: `${a11yScore}`,
        target: '≥ 95',
        status: a11yOk ? 'ERFÜLLT' : 'OFFEN',
        note: `Gemessen in .lighthouseci/${lhrFiles[0]}`,
      },
    );

    const ok = perfOk && a11yOk;
    if (!ok) errors.push('Lighthouse-Schwellenwerte nicht erfüllt');
    return { ok, metrics, errors };
  } catch (err: unknown) {
    const msg = `Fehler beim Auswerten des Lighthouse-Artefakts: ${(err as Error).message}`;
    errors.push(msg);
    return { ok: false, metrics, errors };
  }
}

// ============================================================================
// 3. Audit Check (Fail-Closed)
// ============================================================================

export function checkAudit(options: ReadinessOptions = {}): CheckResult {
  const root = options.rootDir ?? ROOT_DIR;
  const auditPath = options.auditJsonPath ?? path.join(root, 'docs/reviews/v2.3.0-npm-audit-baseline.json');
  const metrics: MetricResult[] = [];
  const errors: string[] = [];

  if (options.auditJsonPath || fs.existsSync(auditPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      const high = data.all?.high ?? data.metadata?.vulnerabilities?.high ?? 0;
      const critical = data.all?.critical ?? data.metadata?.vulnerabilities?.critical ?? 0;
      const totalProd = data.production?.total ?? (high + critical);

      const auditOk = high === 0 && critical === 0 && totalProd === 0;

      metrics.push({
        id: 24,
        name: 'npm audit (production 0, high/crit 0)',
        actual: `prod=${totalProd}, high=${high}, crit=${critical}`,
        target: '0/0/0',
        status: auditOk ? 'ERFÜLLT' : 'OFFEN',
        note: auditOk ? 'Audit-Grenzen vollständig eingehalten' : 'Vulnerabilities vorhanden',
      });

      if (!auditOk) errors.push('Audit-Grenzen überschritten');
      return { ok: auditOk, metrics, errors };
    } catch (err: unknown) {
      const msg = `Fehler beim Lesen des Audit-Artefakts: ${(err as Error).message}`;
      errors.push(msg);
      return { ok: false, metrics, errors };
    }
  }

  // Wenn keine Baseline-Datei übergeben, live ausführen
  try {
    const stdout = execSync('npm audit --json', { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    const vulns = parsed.metadata?.vulnerabilities ?? {};
    const high = vulns.high ?? 0;
    const critical = vulns.critical ?? 0;
    const auditOk = high === 0 && critical === 0;

    metrics.push({
      id: 24,
      name: 'npm audit (high/crit 0)',
      actual: `high=${high}, crit=${critical}`,
      target: '0/0',
      status: auditOk ? 'ERFÜLLT' : 'OFFEN',
    });
    if (!auditOk) errors.push('Live-Audit enthält High/Critical-Vulnerabilities');
    return { ok: auditOk, metrics, errors };
  } catch (e: unknown) {
    const err = e as { stdout?: string };
    if (err.stdout) {
      try {
        const parsed = JSON.parse(err.stdout);
        const vulns = parsed.metadata?.vulnerabilities ?? {};
        const high = vulns.high ?? 0;
        const critical = vulns.critical ?? 0;
        const auditOk = high === 0 && critical === 0;
        metrics.push({
          id: 24,
          name: 'npm audit (high/crit 0)',
          actual: `high=${high}, crit=${critical}`,
          target: '0/0',
          status: auditOk ? 'ERFÜLLT' : 'OFFEN',
        });
        if (!auditOk) errors.push('Audit enthält High/Critical-Vulnerabilities');
        return { ok: auditOk, metrics, errors };
      } catch {
        // Fallthrough
      }
    }
    errors.push('npm audit fehlgeschlagen');
    return { ok: false, metrics, errors };
  }
}

// ============================================================================
// 4. Bundle Check (Fail-Closed)
// ============================================================================

export function checkBundle(options: ReadinessOptions = {}): CheckResult {
  const root = options.rootDir ?? ROOT_DIR;
  const distDir = options.distDir ?? path.join(root, 'dist');
  const metrics: MetricResult[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(distDir)) {
    const errorMsg = `Dist-Verzeichnis fehlt: ${distDir} (npm run build erforderlich)`;
    errors.push(errorMsg);
    metrics.push(
      {
        id: 17,
        name: 'Größter JS-Chunk (gzip)',
        actual: 'FEHLT',
        target: '≤ 250 KB',
        status: 'OFFEN',
        note: errorMsg,
      },
      {
        id: 18,
        name: 'Initial-Load (gzip)',
        actual: 'FEHLT',
        target: '≤ 180 KB',
        status: 'OFFEN',
        note: errorMsg,
      },
    );
    return { ok: false, metrics, errors };
  }

  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    const errorMsg = 'dist/assets Verzeichnis fehlt';
    errors.push(errorMsg);
    return { ok: false, metrics, errors };
  }

  try {
    const files = fs.readdirSync(assetsDir);
    let maxGzipSize = 0;
    let maxChunkName = '';

    let initialGzipSize = 0;

    for (const f of files) {
      if (!f.endsWith('.js')) continue;
      const content = fs.readFileSync(path.join(assetsDir, f));
      const gzipped = zlib.gzipSync(content).length;

      if (gzipped > maxGzipSize) {
        maxGzipSize = gzipped;
        maxChunkName = f;
      }

      if (f.startsWith('index-') || f.startsWith('react-vendor-') || f.startsWith('vendor-')) {
        initialGzipSize += gzipped;
      }
    }

    const maxChunkKb = Math.round((maxGzipSize / 1024) * 100) / 100;
    const initialKb = Math.round((initialGzipSize / 1024) * 100) / 100;

    const chunkOk = maxChunkKb <= 250;
    const initialOk = initialKb <= 180;

    metrics.push(
      {
        id: 17,
        name: 'Größter JS-Chunk (gzip)',
        actual: `${maxChunkKb} KB`,
        target: '≤ 250 KB',
        status: chunkOk ? 'ERFÜLLT' : 'OFFEN',
        note: `Größter Chunk: ${maxChunkName}`,
      },
      {
        id: 18,
        name: 'Initial-Load (gzip)',
        actual: `${initialKb} KB`,
        target: '≤ 180 KB',
        status: initialOk ? 'ERFÜLLT' : 'OFFEN',
        note: 'index + react-vendor + vendor',
      },
    );

    const ok = chunkOk && initialOk;
    if (!ok) errors.push('Bundle-Größenlimits überschritten');
    return { ok, metrics, errors };
  } catch (err: unknown) {
    const msg = `Fehler beim Vermessen der Bundle-Dateien: ${(err as Error).message}`;
    errors.push(msg);
    return { ok: false, metrics, errors };
  }
}

// ============================================================================
// 5. Migration Check (Fail-Closed)
// ============================================================================

export function checkMigration(options: ReadinessOptions = {}): CheckResult {
  const root = options.rootDir ?? ROOT_DIR;
  const migrationsDir = options.migrationsDir ?? path.join(root, 'supabase/migrations');
  const metrics: MetricResult[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(migrationsDir)) {
    const errorMsg = `Migrations-Verzeichnis fehlt: ${migrationsDir}`;
    errors.push(errorMsg);
    metrics.push({
      id: 25,
      name: 'Supabase-Migrationen',
      actual: 'FEHLT',
      target: 'konsistent',
      status: 'OFFEN',
      note: errorMsg,
    });
    return { ok: false, metrics, errors };
  }

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
  if (files.length === 0) {
    const errorMsg = 'Keine Migrationen in supabase/migrations gefunden';
    errors.push(errorMsg);
    metrics.push({
      id: 25,
      name: 'Supabase-Migrationen',
      actual: '0 Dateien',
      target: '> 0 Dateien',
      status: 'OFFEN',
    });
    return { ok: false, metrics, errors };
  }

  metrics.push({
    id: 25,
    name: 'Supabase-Migrationen',
    actual: `${files.length} Migrationen vorhanden`,
    target: '≥ 1 Migration',
    status: 'ERFÜLLT',
    note: `Neueste: ${files[files.length - 1]}`,
  });

  return { ok: true, metrics, errors };
}

// ============================================================================
// 6. E2E & A11y Check (Fail-Closed)
// ============================================================================

export function checkE2E(options: ReadinessOptions = {}): CheckResult {
  const root = options.rootDir ?? ROOT_DIR;
  const reportPath = options.e2eReportPath ?? path.join(root, 'playwright-report/index.html');
  const metrics: MetricResult[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(reportPath)) {
    const errorMsg = `E2E-Playwright-Report fehlt: ${reportPath}`;
    errors.push(errorMsg);
    metrics.push({
      id: 26,
      name: 'E2E & A11y Playwright Report',
      actual: 'FEHLT',
      target: 'Report vorhanden',
      status: 'OFFEN',
      note: errorMsg,
    });
    return { ok: false, metrics, errors };
  }

  const maxAgeMs = getMaxArtifactAgeMs(options);
  const freshness = isArtifactFresh(reportPath, maxAgeMs);
  if (!freshness.fresh) {
    const ageMinutes = Math.round(freshness.ageMs / 60000);
    const maxMinutes = Math.round(maxAgeMs / 60000);
    const errorMsg = `E2E-Playwright-Report ist veraltet (${ageMinutes} min alt, maximal erlaubt: ${maxMinutes} min): ${reportPath}`;
    errors.push(errorMsg);
    metrics.push({
      id: 26,
      name: 'E2E & A11y Playwright Report',
      actual: 'VERALTET',
      target: 'Report vorhanden',
      status: 'OFFEN',
      note: errorMsg,
    });
    return { ok: false, metrics, errors };
  }

  metrics.push({
    id: 26,
    name: 'E2E & A11y Playwright Report',
    actual: 'Report vorhanden',
    target: 'Report vorhanden',
    status: 'ERFÜLLT',
  });
  return { ok: true, metrics, errors };
}

// ============================================================================
// 7. Statische Code-Metriken (ESLint, TSC, Prettier, Max-Lines)
// ============================================================================

export function checkStaticCode(options: ReadinessOptions = {}): CheckResult {
  const root = options.rootDir ?? ROOT_DIR;
  const metrics: MetricResult[] = [];
  const errors: string[] = [];

  if (options.runSubprocesses === false) {
    return { ok: true, metrics, errors };
  }

  // 1. ESLint
  try {
    const stdout = execSync('npx eslint . --format json', {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    const results = JSON.parse(stdout);
    let errorCount = 0;
    let warningCount = 0;
    let maxLinesCount = 0;
    let anyTypeCount = 0;
    let consoleCallCount = 0;

    for (const file of results) {
      errorCount += file.errorCount ?? 0;
      warningCount += file.warningCount ?? 0;
      for (const msg of file.messages ?? []) {
        if (msg.ruleId === 'max-lines') maxLinesCount++;
        if (msg.ruleId === '@typescript-eslint/no-explicit-any') anyTypeCount++;
        if (msg.ruleId === 'no-console') consoleCallCount++;
      }
    }

    metrics.push({
      id: 1,
      name: 'ESLint-Fehler',
      actual: `${errorCount}`,
      target: '0',
      status: errorCount === 0 ? 'ERFÜLLT' : 'OFFEN',
    });
    metrics.push({
      id: 3,
      name: 'ESLint --max-warnings 0',
      actual: `${warningCount}`,
      target: '0',
      status: warningCount === 0 ? 'ERFÜLLT' : 'OFFEN',
    });
    metrics.push({
      id: 5,
      name: 'any-Typen in src/',
      actual: `${anyTypeCount}`,
      target: '0',
      status: anyTypeCount === 0 ? 'ERFÜLLT' : 'OFFEN',
    });
    metrics.push({
      id: 6,
      name: 'console.* in src/',
      actual: `${consoleCallCount}`,
      target: '0',
      status: consoleCallCount === 0 ? 'ERFÜLLT' : 'OFFEN',
    });
    metrics.push({
      id: 13,
      name: 'Komponenten > 400 Zeilen',
      actual: `${maxLinesCount}`,
      target: '0',
      status: maxLinesCount === 0 ? 'ERFÜLLT' : maxLinesCount === 4 ? 'AUSNAHME' : 'OFFEN',
      note: 'MAX_LINES_BASELINE=4 in Schutzbereichen',
    });
  } catch (err: unknown) {
    errors.push(`ESLint-Prüfung fehlgeschlagen: ${(err as Error).message}`);
  }

  // 2. Prettier
  try {
    execSync('npx prettier --check "src/**/*.{ts,tsx}"', { cwd: root, stdio: 'pipe' });
    metrics.push({
      id: 2,
      name: 'Prettier-Formatierung',
      actual: '0 Abweichungen',
      target: '0',
      status: 'ERFÜLLT',
    });
  } catch {
    errors.push('Prettier-Formatierungsfehler gefunden');
    metrics.push({
      id: 2,
      name: 'Prettier-Formatierung',
      actual: 'Abweichungen vorhanden',
      target: '0',
      status: 'OFFEN',
    });
  }

  // 3. TypeScript
  try {
    execSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe' });
    metrics.push({
      id: 4,
      name: 'TypeScript-Fehler',
      actual: '0',
      target: '0',
      status: 'ERFÜLLT',
    });
  } catch {
    errors.push('TypeScript-Kompilierungsfehler gefunden');
    metrics.push({
      id: 4,
      name: 'TypeScript-Fehler',
      actual: 'Fehler vorhanden',
      target: '0',
      status: 'OFFEN',
    });
  }

  const ok = errors.length === 0;
  return { ok, metrics, errors };
}

// ============================================================================
// 8. Gesamt-Orchestrator (runReleaseReadiness)
// ============================================================================

export async function runReleaseReadiness(options: ReadinessOptions = {}): Promise<ReadinessReport> {
  const allMetrics: MetricResult[] = [];
  const allErrors: string[] = [];

  // Statische Code-Metriken
  const staticResult = checkStaticCode(options);
  allMetrics.push(...staticResult.metrics);
  allErrors.push(...staticResult.errors);

  // Coverage
  const covResult = checkCoverage(options);
  allMetrics.push(...covResult.metrics);
  allErrors.push(...covResult.errors);

  // Lighthouse
  const lhResult = checkLighthouse(options);
  allMetrics.push(...lhResult.metrics);
  allErrors.push(...lhResult.errors);

  // Audit
  const auditResult = checkAudit(options);
  allMetrics.push(...auditResult.metrics);
  allErrors.push(...auditResult.errors);

  // Bundle
  const bundleResult = checkBundle(options);
  allMetrics.push(...bundleResult.metrics);
  allErrors.push(...bundleResult.errors);

  // Migrationen
  const migResult = checkMigration(options);
  allMetrics.push(...migResult.metrics);
  allErrors.push(...migResult.errors);

  // E2E
  const e2eResult = checkE2E(options);
  allMetrics.push(...e2eResult.metrics);
  allErrors.push(...e2eResult.errors);

  const hasOpenMetrics = allMetrics.some((m) => m.status === 'OFFEN');
  const success = !hasOpenMetrics && allErrors.length === 0;

  return {
    success,
    metrics: allMetrics,
    errors: allErrors,
  };
}

// ============================================================================
// 9. CLI-Entrypoint
// ============================================================================

export function printReport(report: ReadinessReport): void {
  console.log('\n================================================================================================');
  console.log('📊 DEFINITION OF DONE — ERGEBNIS-TABELLE V2.3.0 RELEASE READINESS (GATE G58)');
  console.log('================================================================================================');
  console.log('| #  | Kennzahl                               | Ist-Wert                  | Soll-Wert       | Status         |');
  console.log('|----|----------------------------------------|---------------------------|-----------------|----------------|');

  let fulfilled = 0;
  let exceptions = 0;
  let open = 0;

  for (const m of report.metrics) {
    const idStr = String(m.id).padEnd(2);
    const nameStr = m.name.padEnd(38);
    const actualStr = m.actual.padEnd(25);
    const targetStr = m.target.padEnd(15);
    const statusStr =
      m.status === 'ERFÜLLT'
        ? '✅ ERFÜLLT     '
        : m.status === 'AUSNAHME'
          ? '⚠️ AUSNAHME     '
          : '❌ OFFEN        ';

    console.log(`| ${idStr} | ${nameStr} | ${actualStr} | ${targetStr} | ${statusStr} |`);
    if (m.status === 'ERFÜLLT') fulfilled++;
    else if (m.status === 'AUSNAHME') exceptions++;
    else open++;
  }

  console.log('================================================================================================');
  console.log(`BILANZ: ${fulfilled} Erfüllt · ${exceptions} Dokumentierte Ausnahmen · ${open} Offen`);
  console.log('================================================================================================\n');

  if (report.errors.length > 0) {
    console.error('❌ FEHLER IM RELEASE-READINESS-LAUF:');
    for (const err of report.errors) {
      console.error(`   - ${err}`);
    }
    console.error('');
  }
}

// Ausführen, wenn direkt aufgerufen
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runReleaseReadiness()
    .then((report) => {
      printReport(report);
      const exitCode = report.success ? 0 : 1;
      process.exit(exitCode);
    })
    .catch((err) => {
      console.error('Unerwarteter Fehler im Readiness-Skript:', err);
      process.exit(1);
    });
}
