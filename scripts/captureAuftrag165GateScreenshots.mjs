#!/usr/bin/env node
/**
 * Auftrag 165: Dashboard-Editor: Versionshistorie, Vergleich, Wiederherstellen, Import/Export (P12).
 * Screenshot-Harness für die Abnahmematrix (§2.5 Nr. 32):
 * 1. Versionsbereich (Seitenleiste/Modal mit Revisionen 1..4, Autoren, Tags)
 * 2. Vergleich (Zwei Versionen vergleichen - RevisionDiffViewV2 mit Diff-Zusammenfassung und Kacheln)
 * 3. Wiederherstellen-Dialog mit Entwurfsschutz (Optionen "Entwurf als persönliche Kopie sichern", "Verwerfen", "Abbrechen")
 * 4. Import-Vorschau mit gesperrter Kachel (Import-Dialog mit Fehlermeldung/Sperre wegen nicht existierender Katalog-Kachel)
 * 5. Leseansicht mit Versionsbereich (Leseansicht-Banner + Versionen-Bereich ohne Wiederherstellen-Buttons)
 * Viewports: 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes.
 * Schreibt docs/screenshots/auftrag-165/README.md (Bilder bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-165');
const PORT = 3165;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 768, height: 1024, name: '768' },
  { width: 375, height: 812, name: '375' },
];

const THEMES = ['dunkel', 'hell'];

const b64url = (val) => Buffer.from(JSON.stringify(val)).toString('base64url');

async function mockAdminAndTeams(context) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: '11111111-1111-1111-1111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin-a@e2e.local',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
    sub: user.id,
    email: user.email,
    role: 'authenticated',
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
  })}.mock`;

  await context.addInitScript(
    ({ t, u }) => {
      window.sessionStorage.setItem('lp_dashboard_editor_v2', 'true');
      const authData = {
        access_token: t,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock-refresh',
        user: u,
      };
      for (const k of [
        'sb-127.0.0.1-auth-token',
        'sb-localhost-auth-token',
        'sb-leadpilot-crm-auth-token',
      ]) {
        window.localStorage.setItem(k, JSON.stringify(authData));
      }
    },
    { t: token, u: user },
  );
}

const SCENARIOS = [
  {
    id: 'versionsbereich',
    title: 'Versionsbereich (Historie mit Revisionen, Autoren und Aktionen)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&versionen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const btn = page.getByTestId('editor-open-versions');
      await btn.waitFor({ state: 'visible', timeout: 10000 });
      await btn.click();
      await page.waitForSelector('[data-testid="revision-history-panel"]', { timeout: 5000 });
      await page.waitForSelector('[data-testid="revision-item-4"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'vergleich',
    title: 'Versionsvergleich (Revision 1 vs. Revision 3 mit Kachel-Diff)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&versionen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const btn = page.getByTestId('editor-open-versions');
      await btn.waitFor({ state: 'visible', timeout: 10000 });
      await btn.click();
      await page.waitForSelector('[data-testid="revision-history-panel"]', { timeout: 5000 });
      await page.getByTestId('toggle-select-mode-button').click();
      await page.getByTestId('revision-item-1').click();
      await page.getByTestId('revision-item-3').click();
      await page.getByTestId('compare-selected-button').click();
      await page.waitForSelector('[data-testid="revision-diff-view"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'wiederherstellen-entwurfsschutz',
    title: 'Wiederherstellen-Dialog mit Entwurfsschutz',
    path: '/dashboard-vorschau.html?bereich=editor_v2&versionen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tf = page.getByTestId('global-timeframe-select');
      await tf.selectOption('letzte_7_tage');
      await page.waitForSelector('[data-testid="dirty-indicator"]', { timeout: 5000 });
      const btn = page.getByTestId('editor-open-versions');
      await btn.waitFor({ state: 'visible', timeout: 10000 });
      await btn.click();
      await page.waitForSelector('[data-testid="revision-history-panel"]', { timeout: 5000 });
      const restoreBtn = page.getByTestId('restore-revision-1');
      await restoreBtn.waitFor({ state: 'visible', timeout: 5000 });
      await restoreBtn.click();
      await page.waitForSelector('[data-testid="restore-revision-dialog"]', { timeout: 5000 });
      await page.waitForSelector('[data-testid="restore-save-copy-button"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'import-vorschau-gesperrt',
    title: 'Import-Vorschau mit gesperrter unbekannter Kachel',
    path: '/dashboard-vorschau.html?bereich=editor_v2&versionen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const switcherBtn = page.getByTestId('dashboard-switcher-button');
      await switcherBtn.click();
      const importItem = page.getByTestId('import-dashboard-menu-item');
      await importItem.waitFor({ state: 'visible', timeout: 5000 });
      await importItem.click();
      await page.waitForSelector('[data-testid="import-dashboard-dialog"]', { timeout: 5000 });
      const fakeJson = JSON.stringify({
        format: 'leadpilot-dashboard',
        version: 2,
        exportedAt: new Date().toISOString(),
        dashboard: {
          id: 'fake_dash',
          title: 'Import mit unbekannter Kachel',
          scope: 'personal',
          layouts: { desktop: [], tablet: [], mobile: [] },
          tiles: [
            {
              id: 'fake_kachel',
              catalogId: 'unbekannte_kachel_xyz',
              title: 'Unbekannte Kachel',
              frame: { x: 0, y: 0, w: 4, h: 4 },
            },
          ],
        },
      });
      const fileInput = page.locator('[data-testid="import-file-input"]');
      await fileInput.setInputFiles({
        name: 'unbekannte-kachel.json',
        mimeType: 'application/json',
        buffer: Buffer.from(fakeJson, 'utf-8'),
      });
      await page.waitForSelector('[data-testid="import-error-banner"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'leseansicht-versionen',
    title: 'Leseansicht mit geöffnetem Versionsbereich (ohne Wiederherstellen)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&versionen=1&teams=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const switcherBtn = page.getByTestId('dashboard-switcher-button');
      await switcherBtn.click();
      const readonlyItem = page.locator('[data-testid="dashboard-item-preview_team_dash_read"]');
      await readonlyItem.waitFor({ state: 'visible', timeout: 5000 });
      await readonlyItem.click();
      await page.waitForSelector('[data-testid="readonly-notice-banner"]', { timeout: 5000 });
      const btn = page.getByTestId('editor-open-versions');
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      await page.waitForSelector('[data-testid="revision-history-panel"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
];

async function startServer() {
  console.log(`[Harness 165] Starte Vite-Preview auf Port ${PORT}...`);
  const proc = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite-Preview Start-Timeout')), 15000);
    const onData = (chunk) => {
      const text = chunk.toString();
      if (text.includes(`http://127.0.0.1:${PORT}`) || text.includes(`Local:`)) {
        clearTimeout(timer);
        resolve();
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  console.log(`[Harness 165] Vite-Preview bereit unter ${BASE_URL}`);
  return () => {
    try {
      proc.kill('SIGTERM');
    } catch {}
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stopServer = await startServer();

  try {
    const browser = await chromium.launch({ headless: true });
    const records = [];

    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        console.log(`\n[Viewport ${vp.name} (${vp.width}×${vp.height}), Theme: ${theme}]`);
        for (const sc of SCENARIOS) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: theme === 'hell' ? 'light' : 'dark',
            reducedMotion: 'reduce',
            deviceScaleFactor: 1,
          });

          await mockAdminAndTeams(context);
          const page = await context.newPage();

          await page.goto(`${BASE_URL}${sc.path}`, { waitUntil: 'networkidle' });
          await page.evaluate((th) => {
            const target = th === 'hell' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', target);
            if (target === 'light') {
              document.documentElement.classList.remove('dark');
              document.documentElement.classList.add('light');
            } else {
              document.documentElement.classList.remove('light');
              document.documentElement.classList.add('dark');
            }
          }, theme);
          await page.evaluate(() => document.fonts.ready);
          await sc.prepare(page, vp);

          const overflowPx = await page.evaluate(() => {
            const docEl = document.documentElement;
            const bodyEl = document.body;
            const scrollWidth = Math.max(docEl.scrollWidth, bodyEl.scrollWidth);
            const clientWidth = Math.min(docEl.clientWidth, bodyEl.clientWidth);
            return Math.max(0, scrollWidth - clientWidth);
          });

          if (overflowPx > 0) {
            throw new Error(
              `[Screenshot-Gate 165] Horizontaler Überlauf (${overflowPx} px) in Szenario "${sc.id}" (${vp.name}/${theme}) verletzt das 0-px-Kriterium.`,
            );
          }

          const filename = `${sc.id}-${vp.name}-${theme}.png`;
          const filepath = path.join(OUT_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: false });

          const bytes = fs.readFileSync(filepath);
          const hash = crypto.createHash('sha256').update(bytes).digest('hex');

          records.push({
            scenarioId: sc.id,
            scenarioTitle: sc.title,
            viewport: vp.name,
            theme,
            dimensions: `${vp.width} × ${vp.height} px`,
            overflowPx,
            hash,
            filename,
          });

          console.log(`  ✓ ${filename}: overflow=${overflowPx}px, hash=${hash.slice(0, 12)}...`);
          await context.close();
        }
      }
    }

    await browser.close();

    // Verifikation: Hashes je Viewport/Theme müssen für alle 5 Szenarien unterschiedlich sein
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const rows = records.filter((r) => r.viewport === vp.name && r.theme === theme);
        const unique = new Set(rows.map((r) => r.hash));
        if (unique.size !== rows.length) {
          throw new Error(
            `Kollidierende Screenshots für ${vp.name}/${theme}: ${unique.size} ungleiche Hashes bei ${rows.length} Szenarien`,
          );
        }
      }
    }

    // README generieren
    const markdown = `# Abnahme-Screenshots Auftrag 165 (P12 Versionshistorie, Vergleich, Wiederherstellen, Import/Export)

**Erzeugt am:** ${new Date().toISOString()}  
**Auftrag:** 165 – Dashboard-Editor: Versionshistorie, Vergleich, Wiederherstellen, Import/Export (P12)  
**Viewports:** 1440 × 900 (Desktop), 768 × 1024 (Tablet), 375 × 812 (Mobil)  
**Farbschemata:** Dunkel (Standard) und Hell  
**Horizontales Überlauf-Kriterium:** 0 px Pflicht auf allen Viewports  
**Sichtbarkeits-Kriterium:** Jeder Zustand erzeugt je Viewport/Farbschema einen eigenen SHA-256-Hash (keine identischen Bilder).

## Szenarien (§2.5 Nr. 32)

1. **Versionsbereich:** Historie mit Revisionen, Autoren und Aktionen (\`versionsbereich\`)
2. **Versionsvergleich:** Revision 1 vs. Revision 3 mit Kachel-Diff (\`vergleich\`)
3. **Wiederherstellen-Dialog:** Bestätigung mit Entwurfsschutz (\`wiederherstellen-entwurfsschutz\`)
4. **Import-Vorschau gesperrt:** Sperre bei unbekannter Katalog-Kachel (\`import-vorschau-gesperrt\`)
5. **Leseansicht mit Versionen:** Versionenansicht ohne Wiederherstellen-Buttons (\`leseansicht-versionen\`)

## Nachweismatrix

| Szenario | Viewport | Thema | Abmessungen | Horizontaler Überlauf | SHA-256-Prüfsumme | Datei |
|---|---|---|---|---|---|---|
${records
  .map(
    (r) =>
      `| ${r.scenarioTitle} | ${r.viewport} | ${r.theme} | ${r.dimensions} | ${r.overflowPx} px | \`${r.hash}\` | \`${r.filename}\` |`,
  )
  .join('\n')}

## Zusammenfassung
- Gesamt-Screenshots: ${records.length} (5 Szenarien × 3 Viewports × 2 Farbschemata)
- Horizontaler Überlauf: **${Math.max(0, ...records.map((r) => r.overflowPx))} px** über alle Durchläufe (Kriterium 0 px: ${records.every((r) => r.overflowPx === 0) ? 'eingehalten' : 'verletzt'}).
- Prüfsummen-Eindeutigkeit: **vollständig eindeutig** je Viewport und Thema nachgewiesen (${records.length / 5} Durchläufe mit je 5 distinkten Hashes).
`;

    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), markdown, 'utf8');
    console.log(
      `\n[Harness 165] Erfolgreich! README geschrieben nach docs/screenshots/auftrag-165/README.md`,
    );
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[Harness 165] FEHLER:', err);
  process.exit(1);
});
