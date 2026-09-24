// Gate G58 (Auftrag 067L Nacharbeit 2): CI Security & Leakage Prevention Tests
// Prüft, dass im öffentlichen Repository weder Traces noch Videos/Screenshots
// mit potenziellen Test-Zugangsdaten als Artefakt hochgeladen werden können ([P1-4]),
// und dass Workflow-Berechtigungen sowie Retention-Limits strikt konfiguriert sind ([P3]).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('CI Security & Secret Leakage Prevention (G58 / [P1-4] & [P3])', () => {
  it('stellt sicher, dass in der CI weder Trace, noch Video, noch Screenshot in playwright.config.ts aktiviert sind', () => {
    const configPath = path.resolve(__dirname, '../../playwright.config.ts');
    const configContent = fs.readFileSync(configPath, 'utf-8');

    // Kein unbedingtes trace auf on-first-retry oder on
    expect(configContent).not.toMatch(/trace:\s*['"](on|on-first-retry|retain-on-failure)['"]/);
    // trace muss in CI explizit 'off' sein
    expect(configContent).toMatch(/trace:\s*process\.env\.CI\s*\?\s*['"]off['"]\s*:\s*['"]on-first-retry['"]/);
    // video und screenshot in CI explizit 'off'
    expect(configContent).toMatch(/video:\s*process\.env\.CI\s*\?\s*['"]off['"]/);
    expect(configContent).toMatch(/screenshot:\s*process\.env\.CI\s*\?\s*['"]off['"]/);
  });

  it('stellt sicher, dass ci.yml Workflow-Permissions auf contents: read einschränkt ([P3])', () => {
    const ciPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');
    const ciContent = fs.readFileSync(ciPath, 'utf-8');
    expect(ciContent).toMatch(/permissions:\s*\n\s*contents:\s*read/);
  });

  it('startet Push-CI nur auf main und prüft Feature-Branches über Pull Requests', () => {
    const ciPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');
    const ciContent = fs.readFileSync(ciPath, 'utf-8');

    expect(ciContent).toMatch(/^on:\s*\n  push:\s*\n    branches:\s*\n      - main\s*\n  pull_request:/m);
    expect(ciContent).toMatch(/^  workflow_dispatch:/m);
  });

  it('erzeugt Coverage einmal und übergibt sie im selben Lauf fail-closed an e2e', () => {
    const ciPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');
    const ciContent = fs.readFileSync(ciPath, 'utf-8');
    const e2eJob = ciContent.slice(ciContent.indexOf('\n  e2e:\n'));

    expect(ciContent.match(/run: npm run test:coverage/g)).toHaveLength(1);
    expect(e2eJob).toMatch(/^    needs: test$/m);
    expect(e2eJob).toMatch(/uses: actions\/download-artifact@[0-9a-f]{40}/);
    expect(e2eJob).toMatch(/name: coverage\s*\n\s*path: coverage\//);
    expect(e2eJob).toMatch(/run: test -s coverage\/coverage-summary\.json/);
    expect(e2eJob.indexOf('name: Coverage aus test-Job laden')).toBeLessThan(
      e2eJob.indexOf('name: ReleaseReadiness Orchestrator (Fail-Closed)'),
    );
  });

  it('stellt sicher, dass Report-Artefakt-Uploads auf 7 Tage Retention limitiert sind ([P1-4])', () => {
    const ciPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');
    const ciContent = fs.readFileSync(ciPath, 'utf-8');
    const playwrightMatches = ciContent.match(/name:\s*playwright-report[\s\S]*?retention-days:\s*7/);
    const lighthouseMatches = ciContent.match(/name:\s*lighthouse-report[\s\S]*?retention-days:\s*7/);
    expect(playwrightMatches).not.toBeNull();
    expect(lighthouseMatches).not.toBeNull();
  });
});
