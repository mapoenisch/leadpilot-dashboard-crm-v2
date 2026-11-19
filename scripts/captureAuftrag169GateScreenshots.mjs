#!/usr/bin/env node
/**
 * Auftrag 169: Dashboard-Editor: Transformationen je Kachel (P14a).
 * Screenshot-Harness für die Abnahmematrix (§2.3 Nr. 18):
 * 1. editor-uebersicht-umgeformt: Transformations-Szenario im Editor (Kacheln mit „umgeformt“-Hinweis)
 * 2. kachel-umgeformt-einheit: Kachel mit umgerechneter Einheit (Tsd. EUR) und Hinweis
 * 3. inspector-umformen-kette: Inspector-Abschnitt „Umformen“ mit Kettenschritten und Alarm-Badges
 * 4. inspector-sperrgrund-durchschnitt: Inspector mit gesperrtem gleitendem Durchschnitt bei Einzelwert
 * 5. inspector-alarm-pausiert-warnung: Warnhinweis „Der Alarm dieser Kachel wird pausiert.“
 * 6. kachel-gleitender-durchschnitt: Zeitreihen-Kachel mit geglättetem Verlauf
 *
 * Viewports: 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes.
 * Schreibt docs/screenshots/auftrag-169/README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-169');
const PORT = 3169;
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
    id: 'editor-uebersicht-umgeformt',
    title: 'Editor-Übersicht: Kacheln mit Umformungen und Badges',
    path: '/dashboard-vorschau.html?bereich=editor_v2&transformationen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await page.waitForSelector('[data-testid="tile-transformed-hint"]', { timeout: 10000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'kachel-umgeformt-einheit',
    title: 'Kachel mit Einheitenumrechnung (EUR in Tsd. EUR)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&transformationen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-preview_trans_tile_unit');
      await tile.scrollIntoViewIfNeeded();
      await tile.click();
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'inspector-umformen-kette',
    title: 'Inspector: Abschnitt Umformen mit Kettenschritten',
    path: '/dashboard-vorschau.html?bereich=editor_v2&transformationen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-preview_trans_tile_unit');
      await tile.scrollIntoViewIfNeeded();
      await tile.click();
      await page.waitForTimeout(300);
      await ensureInspectorOpen(page);
      const tab = page.getByTestId('inspector-tab-daten');
      await tab.click();
      await page.waitForSelector('[data-testid="inspector-transformation-section"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'inspector-sperrgrund-durchschnitt',
    title: 'Inspector: Sperrgrund Durchschnitt bei Einzelwert',
    path: '/dashboard-vorschau.html?bereich=editor_v2&transformationen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-preview_trans_tile_rename');
      await tile.scrollIntoViewIfNeeded();
      await tile.click();
      await page.waitForTimeout(300);
      await ensureInspectorOpen(page);
      const tab = page.getByTestId('inspector-tab-daten');
      await tab.click();
      await page.waitForSelector('[data-testid="inspector-transformation-section"]', { timeout: 5000 });
      const addBtn = page.getByTestId('add-transformation-btn');
      if (await addBtn.isVisible()) {
        await addBtn.click();
      }
      await page.waitForSelector('[data-testid="transformation-disabled-durchschnitt"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'inspector-alarm-pausiert-warnung',
    title: 'Inspector: Warnung Pausierter Alarm bei nicht alarmfähiger Transformation',
    path: '/dashboard-vorschau.html?bereich=editor_v2&transformationen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-preview_trans_tile_paused_alarm');
      await tile.scrollIntoViewIfNeeded();
      await tile.click();
      await page.waitForTimeout(300);
      await ensureInspectorOpen(page);
      const tab = page.getByTestId('inspector-tab-daten');
      await tab.click();
      await page.waitForSelector('[data-testid="transformation-alarm-warning"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'kachel-gleitender-durchschnitt',
    title: 'Kachel: Gleitender Durchschnitt (Glättung einer Zeitreihe)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&transformationen=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-preview_trans_tile_ma');
      await tile.scrollIntoViewIfNeeded();
      await tile.click();
      await page.waitForTimeout(300);
    },
  },
];

let serverProcess = null;

async function startServer() {
  console.log(`[Harness 169] Starte Vite-Preview-Server auf Port ${PORT}...`);
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
            console.log(`[Harness 169] Server läuft auf ${BASE_URL}`);
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
    console.log('[Harness 169] Beende Preview-Server...');
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
              `[Screenshot-Gate 169] Horizontaler Überlauf (${overflowPx} px) in Szenario "${sc.id}" (${vp.name}/${theme}) verletzt das 0-px-Kriterium.`,
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
    const markdown = `# Abnahme-Screenshots Auftrag 169 (P14a Kachel-Transformationen)

**Erzeugt am:** ${new Date().toISOString()}  
**Auftrag:** 169 – Dashboard-Editor: Transformationen je Kachel (P14a)  
**Viewports:** 1440 × 900 (Desktop), 768 × 1024 (Tablet), 375 × 812 (Mobil)  
**Farbschemata:** Dunkel (Standard) und Hell  
**Horizontales Überlauf-Kriterium:** 0 px Pflicht auf allen Viewports  
**Sichtbarkeits-Kriterium:** Jeder Zustand erzeugt je Viewport/Farbschema einen eigenen SHA-256-Hash (keine identischen Bilder).

## Szenarien (§2.3 Nr. 18)

1. **Editor-Übersicht:** Kacheln mit Umformungen und „umgeformt“-Badges (\`editor-uebersicht-umgeformt\`)
2. **Kachel Einheitenumrechnung:** Umrechnung EUR in Tsd. EUR (\`kachel-umgeformt-einheit\`)
3. **Inspector Umformen:** Abschnitt Umformen mit Kettenschritten (\`inspector-umformen-kette\`)
4. **Inspector Sperrgrund:** Gesperrter gleitender Durchschnitt bei Einzelwert (\`inspector-sperrgrund-durchschnitt\`)
5. **Inspector Alarm pausiert:** Warnhinweis vor Pausieren des Alarms (\`inspector-alarm-pausiert-warnung\`)
6. **Kachel Gleitender Durchschnitt:** Geglättete Zeitreihe (\`kachel-gleitender-durchschnitt\`)

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
      `\n[Harness 169] Erfolgreich! README geschrieben nach docs/screenshots/auftrag-169/README.md`,
    );
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[Harness 169] FEHLER:', err);
  process.exit(1);
});
