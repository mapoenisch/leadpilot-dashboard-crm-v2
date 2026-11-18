#!/usr/bin/env node
/**
 * Auftrag 166: Dashboard-Editor: Schwellenwerte auf Kacheln, Alarmfähigkeit je KPI, Betriebsweg für Alarme (P13a).
 * Screenshot-Harness für die Abnahmematrix (§2.4 Nr. 23):
 * 1. editor-uebersicht: Schwellenwert-Szenario im Editor (Kacheln mit Badges Warnung, Kritisch, Prüfen)
 * 2. leseansicht: Schwellenwert-Szenario in Leseansicht (Viewer-Modus mit sichtbaren Badges)
 * 3. inspector-hoch-ist-schlecht: Inspector für Kachel mit Regel hoch_ist_schlecht
 * 4. inspector-bereich: Inspector für Kachel mit Regel bereich (Min/Max)
 * 5. inspector-validierungsfehler: Inspector mit Validierungsfehler (Übernehmen gesperrt)
 * 6. inspector-gesperrt-zeitreihe: Inspector für Zeitreihen-Kachel (Sperrhinweis nur Einzelwert)
 *
 * Viewports: 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes.
 * Schreibt docs/screenshots/auftrag-166/README.md (Bilder bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-166');
const PORT = 3166;
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

async function ensureInspectorOpen(page) {
  if (await page.getByTestId('editor-inspector').isVisible()) return;
  const toggleBtn = page.getByTestId('toggle-inspector-button');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await page.waitForSelector('[data-testid="editor-inspector"]', { timeout: 5000 });
  }
}

const SCENARIOS = [
  {
    id: 'editor-uebersicht',
    title: 'Editor-Übersicht mit Schwellenwert-Badges',
    path: '/dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await page.waitForSelector('[data-testid="tile-threshold-badge"]', { timeout: 10000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'leseansicht',
    title: 'Leseansicht mit Badges (ohne Bearbeitung)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1&teams=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await page.waitForSelector('[data-testid="tile-threshold-badge"]', { timeout: 10000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'inspector-hoch-ist-schlecht',
    title: 'Inspector: Regel Hoch ist schlecht (Warnung & Kritisch)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-preview_tile_normal');
      await tile.scrollIntoViewIfNeeded();
      await tile.getByRole('heading', { name: 'ARR (Normalbereich)' }).click();
      await page.waitForTimeout(300);
      await ensureInspectorOpen(page);
      const tab = page.getByTestId('inspector-tab-schwellenwerte');
      await tab.click();
      await page.waitForSelector('[data-testid="tab-content-schwellenwerte"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'inspector-bereich',
    title: 'Inspector: Regel Bereich (Min/Max Korridor)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-preview_tile_normal');
      await tile.scrollIntoViewIfNeeded();
      await tile.getByRole('heading', { name: 'ARR (Normalbereich)' }).click();
      await page.waitForTimeout(300);
      await ensureInspectorOpen(page);
      const tab = page.getByTestId('inspector-tab-schwellenwerte');
      await tab.click();
      await page.waitForSelector('[data-testid="tab-content-schwellenwerte"]', { timeout: 5000 });
      const radioBereich = page.getByTestId('threshold-art-zielbereich');
      await radioBereich.click();
      await page.waitForSelector('[data-testid="threshold-untenWarnung-input"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'inspector-validierungsfehler',
    title: 'Inspector: Validierungsfehler (Übernehmen gesperrt)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-preview_tile_normal');
      await tile.scrollIntoViewIfNeeded();
      await tile.getByRole('heading', { name: 'ARR (Normalbereich)' }).click();
      await page.waitForTimeout(300);
      await ensureInspectorOpen(page);
      const tab = page.getByTestId('inspector-tab-schwellenwerte');
      await tab.click();
      await page.waitForSelector('[data-testid="tab-content-schwellenwerte"]', { timeout: 5000 });
      const warnInput = page.getByTestId('threshold-warnung-input');
      const critInput = page.getByTestId('threshold-kritisch-input');
      await warnInput.fill('1000');
      await critInput.fill('800');
      await page.waitForSelector('[data-testid="threshold-error-kritisch"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'inspector-gesperrt-zeitreihe',
    title: 'Inspector: Gesperrt auf Zeitreihe (Nur Einzelwert)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-preview_tile_zeitreihe');
      await tile.scrollIntoViewIfNeeded();
      await tile.getByRole('heading', { name: 'ARR-Verlauf (Zeitreihe)' }).click();
      await page.waitForTimeout(300);
      await ensureInspectorOpen(page);
      const tab = page.getByTestId('inspector-tab-schwellenwerte');
      await tab.click();
      await page.waitForSelector('[data-testid="tab-content-schwellenwerte"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
];

let serverProcess = null;

async function startServer() {
  console.log(`[Harness 166] Starte Vite-Preview-Server auf Port ${PORT}...`);
  return new Promise((resolve, reject) => {
    serverProcess = spawn(
      'npx',
      ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'],
      {
        cwd: ROOT,
        stdio: 'inherit',
      },
    );
    serverProcess.on('error', reject);

    const check = async () => {
      for (let i = 0; i < 30; i++) {
        try {
          const res = await fetch(`${BASE_URL}/dashboard-vorschau.html`);
          if (res.ok) {
            console.log(`[Harness 166] Server läuft auf ${BASE_URL}`);
            resolve();
            return;
          }
        } catch {
          /* wait */
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      reject(new Error(`Server auf ${BASE_URL} nicht rechtzeitig erreichbar.`));
    };
    check();
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('[Harness 166] Beende Preview-Server...');
    serverProcess.kill('SIGTERM');
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await startServer();

  const records = [];

  try {
    const browser = await chromium.launch();

    for (const sc of SCENARIOS) {
      console.log(`\n[Szenario] ${sc.title} (${sc.id})`);
      for (const vp of VIEWPORTS) {
        for (const theme of THEMES) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            reducedMotion: 'reduce',
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
              `[Screenshot-Gate 166] Horizontaler Überlauf (${overflowPx} px) in Szenario "${sc.id}" (${vp.name}/${theme}) verletzt das 0-px-Kriterium.`,
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

    // Verifikation: Hashes je Viewport/Theme müssen für alle 6 Szenarien unterschiedlich sein
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
    const markdown = `# Abnahme-Screenshots Auftrag 166 (P13a Schwellenwerte auf Kacheln, Alarmfähigkeit je KPI)

**Erzeugt am:** ${new Date().toISOString()}  
**Auftrag:** 166 – Dashboard-Editor: Schwellenwerte auf Kacheln, Alarmfähigkeit je KPI, Betriebsweg für Alarme (P13a)  
**Viewports:** 1440 × 900 (Desktop), 768 × 1024 (Tablet), 375 × 812 (Mobil)  
**Farbschemata:** Dunkel (Standard) und Hell  
**Horizontales Überlauf-Kriterium:** 0 px Pflicht auf allen Viewports  
**Sichtbarkeits-Kriterium:** Jeder Zustand erzeugt je Viewport/Farbschema einen eigenen SHA-256-Hash (keine identischen Bilder).

## Szenarien (§2.4 Nr. 23)

1. **Editor-Übersicht:** Kacheln mit Badges Warnung, Kritisch, Prüfen (\`editor-uebersicht\`)
2. **Leseansicht:** Viewer-Modus mit Badges, ohne Bearbeitungsleiste (\`leseansicht\`)
3. **Inspector Hoch ist schlecht:** Regel Hoch ist schlecht mit Warnung & Kritisch (\`inspector-hoch-ist-schlecht\`)
4. **Inspector Bereich:** Regel Bereich mit Min/Max-Korridor (\`inspector-bereich\`)
5. **Inspector Validierungsfehler:** Kritisch kleiner als Warnung gesperrt mit roter Meldung (\`inspector-validierungsfehler\`)
6. **Inspector Gesperrt:** Zeitreihen-Kachel mit Sperrhinweis "nur Einzelwert" (\`inspector-gesperrt-zeitreihe\`)

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
- Gesamt-Screenshots: ${records.length} (6 Szenarien × 3 Viewports × 2 Farbschemata = 36 Screenshots)
- Horizontaler Überlauf: **${Math.max(0, ...records.map((r) => r.overflowPx))} px** über alle Durchläufe (Kriterium 0 px: ${records.every((r) => r.overflowPx === 0) ? 'eingehalten' : 'verletzt'}).
- Prüfsummen-Eindeutigkeit: **vollständig eindeutig** je Viewport und Thema nachgewiesen (${records.length / 6} Durchläufe mit je 6 distinkten Hashes).
`;

    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), markdown, 'utf8');
    console.log(
      `\n[Harness 166] Erfolgreich! README geschrieben nach docs/screenshots/auftrag-166/README.md`,
    );
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[Harness 166] FEHLER:', err);
  process.exit(1);
});
