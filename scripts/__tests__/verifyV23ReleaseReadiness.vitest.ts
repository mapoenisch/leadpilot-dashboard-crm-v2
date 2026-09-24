// Gate G58 (Auftrag 067L): Fail-closed Release Readiness Tests
// Prüft, dass verifyV23ReleaseReadiness bei fehlenden Artefakten, Grenzwertüberschreitungen
// und roten Unterprozessen strikt fehlschlägt und niemals auf Default- oder Baselinewerte zurückfällt.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  checkCoverage,
  checkLighthouse,
  checkAudit,
  checkBundle,
  checkMigration,
  checkE2E,
  runReleaseReadiness,
} from '../verifyV23ReleaseReadiness';

describe('verifyV23ReleaseReadiness fail-closed behavior', () => {
  it('weist fehlendes Coverage-Artefakt ab und verwendet keinen Baseline-Fallback', () => {
    const nonExistentPath = path.resolve('/tmp/nonexistent-coverage-summary.json');
    const result = checkCoverage({ coverageSummaryPath: nonExistentPath });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/coverage.*fehlt|nicht gefunden|missing/i);
    // Sicherstellen, dass keine festen 71.8% / 87.27% Fallback-Werte angenommen werden
    expect(result.metrics.some((m) => m.status === 'ERFÜLLT')).toBe(false);
  });

  it('weist unzureichende Coverage-Werte fail-closed ab', () => {
    const tempCoverageFile = path.resolve('/tmp/low-coverage-summary.json');
    fs.writeFileSync(
      tempCoverageFile,
      JSON.stringify({
        total: {
          lines: { total: 100, covered: 50, pct: 50 },
          statements: { total: 100, covered: 50, pct: 50 },
          functions: { total: 100, covered: 50, pct: 50 },
          branches: { total: 100, covered: 50, pct: 50 },
        },
      }),
    );
    try {
      const result = checkCoverage({ coverageSummaryPath: tempCoverageFile });
      expect(result.ok).toBe(false);
      expect(result.metrics.some((m) => m.status === 'OFFEN')).toBe(true);
    } finally {
      fs.rmSync(tempCoverageFile, { force: true });
    }
  });

  it('weist fehlendes Lighthouse-Artefakt ab und hardcodiert keine Scores', () => {
    const nonExistentDir = path.resolve('/tmp/nonexistent-lighthouseci');
    const result = checkLighthouse({ lighthouseDir: nonExistentDir });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/lighthouse.*fehlt|nicht gefunden|missing/i);
    // Sicherstellen, dass kein fester Score wie 99 oder 100 als ERFÜLLT eingetragen wird
    expect(result.metrics.some((m) => m.status === 'ERFÜLLT')).toBe(false);
  });

  it('weist fehlendes oder fehlerhaftes Audit-Artefakt fail-closed ab', () => {
    const tempAuditFile = path.resolve('/tmp/vulnerable-audit.json');
    fs.writeFileSync(
      tempAuditFile,
      JSON.stringify({
        metadata: {
          vulnerabilities: {
            info: 0,
            low: 0,
            moderate: 0,
            high: 2,
            critical: 1,
            total: 3,
          },
        },
      }),
    );
    try {
      const result = checkAudit({ auditJsonPath: tempAuditFile });
      expect(result.ok).toBe(false);
      expect(result.metrics.some((m) => m.status === 'OFFEN')).toBe(true);
    } finally {
      fs.rmSync(tempAuditFile, { force: true });
    }
  });

  it('weist fehlendes Migration-Artefakt fail-closed ab', () => {
    const nonExistentDir = path.resolve('/tmp/nonexistent-migrations');
    const result = checkMigration({ migrationsDir: nonExistentDir });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('weist fehlende oder fehlgeschlagene E2E-Reports fail-closed ab', () => {
    const nonExistentReport = path.resolve('/tmp/nonexistent-playwright-report.json');
    const result = checkE2E({ e2eReportPath: nonExistentReport });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('weist fehlendes Bundle oder Bundle-Limit-Überschreitung fail-closed ab', () => {
    const nonExistentBundleDir = path.resolve('/tmp/nonexistent-dist');
    const result = checkBundle({ distDir: nonExistentBundleDir });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('weist veraltetes Coverage-Artefakt fail-closed ab (> 60m)', () => {
    const tempCoverageFile = path.resolve('/tmp/stale-coverage-summary.json');
    fs.writeFileSync(
      tempCoverageFile,
      JSON.stringify({
        total: {
          lines: { total: 100, covered: 100, pct: 100 },
          statements: { total: 100, covered: 100, pct: 100 },
          functions: { total: 100, covered: 100, pct: 100 },
          branches: { total: 100, covered: 100, pct: 100 },
        },
      }),
    );
    // Setze mtime auf vor 2 Stunden (7200 Sekunden in der Vergangenheit)
    const twoHoursAgo = (Date.now() - 7_200_000) / 1000;
    fs.utimesSync(tempCoverageFile, twoHoursAgo, twoHoursAgo);

    try {
      const result = checkCoverage({
        coverageSummaryPath: tempCoverageFile,
        maxArtifactAgeMs: 3_600_000,
      });
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /veraltet|stale|alter/i.test(e))).toBe(true);
      expect(result.metrics.some((m) => m.status === 'OFFEN')).toBe(true);
    } finally {
      fs.rmSync(tempCoverageFile, { force: true });
    }
  });

  it('weist veraltete Lighthouse-Artefakte fail-closed ab (> 60m)', () => {
    const tempLhDir = path.resolve('/tmp/stale-lhci');
    fs.mkdirSync(tempLhDir, { recursive: true });
    const reportFile = path.join(tempLhDir, 'lhr-12345.json');
    fs.writeFileSync(
      reportFile,
      JSON.stringify({
        categories: {
          performance: { score: 1.0 },
          accessibility: { score: 1.0 },
        },
      }),
    );
    const twoHoursAgo = (Date.now() - 7_200_000) / 1000;
    fs.utimesSync(reportFile, twoHoursAgo, twoHoursAgo);

    try {
      const result = checkLighthouse({
        lighthouseDir: tempLhDir,
        maxArtifactAgeMs: 3_600_000,
      });
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /veraltet|stale|alter/i.test(e))).toBe(true);
      expect(result.metrics.some((m) => m.status === 'OFFEN')).toBe(true);
    } finally {
      fs.rmSync(tempLhDir, { recursive: true, force: true });
    }
  });

  it('weist veraltete E2E-Reports fail-closed ab (> 60m)', () => {
    const tempReport = path.resolve('/tmp/stale-playwright-report.html');
    fs.writeFileSync(tempReport, '<html><body>OK</body></html>');
    const twoHoursAgo = (Date.now() - 7_200_000) / 1000;
    fs.utimesSync(tempReport, twoHoursAgo, twoHoursAgo);

    try {
      const result = checkE2E({
        e2eReportPath: tempReport,
        maxArtifactAgeMs: 3_600_000,
      });
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /veraltet|stale|alter/i.test(e))).toBe(true);
      expect(result.metrics.some((m) => m.status === 'OFFEN')).toBe(true);
    } finally {
      fs.rmSync(tempReport, { force: true });
    }
  });

  it('propagiert rote Unterprozess-Ergebnisse strikt als Gesamtfehler (success: false)', async () => {
    const report = await runReleaseReadiness({
      coverageSummaryPath: '/tmp/nonexistent-coverage.json',
      lighthouseDir: '/tmp/nonexistent-lh',
      auditJsonPath: '/tmp/nonexistent-audit.json',
      distDir: '/tmp/nonexistent-dist',
      migrationsDir: '/tmp/nonexistent-migrations',
      e2eReportPath: '/tmp/nonexistent-e2e.json',
      runSubprocesses: false,
    });
    expect(report.success).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });
});
