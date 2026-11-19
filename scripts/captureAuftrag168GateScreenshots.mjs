#!/usr/bin/env node
/**
 * Auftrag 168: Dashboard-Editor: Alarme in der App, Lesebestätigung und Quittierung, Admin-Übernahme, Ausfallhinweis (P13c).
 * Screenshot-Harness für die Abnahmematrix (§2.4 Nr. 26):
 * 1. alarmliste: Alarmliste mit Filtern, ungelesenen und quittierten Ereignissen
 * 2. quittier-dialog: Quittier-Dialog für Ereignis mit Kommentarfeld und Bestätigung
 * 3. inspector-alarm-abschnitt: Inspector mit Alarm-Abschnitt (Schalter, Mindestdauer, Abklingzeit)
 * 4. kachel-glocke: Kachel mit Schwellenwert-Badge und Glockensymbol
 * 5. admin-ansicht: Admin-Ansicht mit verwaisten/pausierten Regeln und Übernahme-Schaltfläche
 * 6. ausfallbanner: Ausfallhinweis-Banner bei verzögerter/ausgefallener Alarmprüfung
 *
 * Viewports: 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes.
 * Schreibt docs/screenshots/auftrag-168/README.md (Bilder bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-168');
const PORT = 3168;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 768, height: 1024, name: '768' },
  { width: 375, height: 812, name: '375' },
];

const THEMES = ['dunkel', 'hell'];

const b64url = (val) => Buffer.from(JSON.stringify(val)).toString('base64url');

async function mockAdminAndAuth(context) {
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
    id: 'alarmliste',
    title: 'Alarmliste mit Filtern und Quittierungen',
    path: '/dashboard-vorschau.html?bereich=editor_v2&alarme=1',
    prepare: async (page) => {
      const tab = page.getByTestId('preview-tab-alarme');
      await tab.click();
      await page.waitForSelector('[data-testid="alarm-list-container"]', { timeout: 10000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'quittier-dialog',
    title: 'Quittier-Dialog für Alarmereignis',
    path: '/dashboard-vorschau.html?bereich=editor_v2&alarme=1',
    prepare: async (page) => {
      const tab = page.getByTestId('preview-tab-alarme');
      await tab.click();
      await page.waitForSelector('[data-testid="alarm-list-container"]', { timeout: 10000 });
      const ackBtn = page.getByTestId('alarm-ack-btn-preview-event-1');
      await ackBtn.click();
      await page.waitForSelector('[data-testid="alarm-acknowledge-dialog"]', { timeout: 5000 });
      const commentInput = page.getByTestId('alarm-ack-comment-input');
      await commentInput.fill('Prüfung durch Manager: Grenzwerte werden beobachtet.');
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'inspector-alarm-abschnitt',
    title: 'Inspector mit Schwellenwert- und Alarm-Abschnitt',
    path: '/dashboard-vorschau.html?bereich=editor_v2&alarme=1',
    prepare: async (page) => {
      const tab = page.getByTestId('preview-tab-kacheln');
      await tab.click();
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-tile-alarm-active');
      await tile.scrollIntoViewIfNeeded();
      await tile.click();
      await page.waitForTimeout(300);
      await ensureInspectorOpen(page);
      const thresholdTab = page.getByTestId('inspector-tab-schwellenwerte');
      await thresholdTab.click();
      await page.waitForSelector('[data-testid="tab-content-schwellenwerte"]', { timeout: 5000 });
      const alarmSection = page.getByTestId('alarm-section');
      await alarmSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'kachel-glocke',
    title: 'Kachel mit Schwellenwert-Badge und Alarm-Glocke',
    path: '/dashboard-vorschau.html?bereich=editor_v2&alarme=1',
    prepare: async (page) => {
      const tab = page.getByTestId('preview-tab-kacheln');
      await tab.click();
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tile = page.getByTestId('canvas-tile-tile-alarm-active');
      await tile.scrollIntoViewIfNeeded();
      await page.waitForSelector('[data-testid="tile-alarm-bell"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'admin-ansicht',
    title: 'Admin-Bereich: Übernahme verwaister Alarmregeln',
    path: '/dashboard-vorschau.html?bereich=editor_v2&alarme=1',
    prepare: async (page) => {
      const tab = page.getByTestId('preview-tab-admin');
      await tab.click();
      await page.waitForSelector('[data-testid="admin-alarms-page"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="admin-alarm-takeover-btn-preview-rule-orphaned"]', {
        timeout: 5000,
      });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'ausfallbanner',
    title: 'Ausfallhinweis-Banner bei verzögerter Alarmprüfung',
    path: '/dashboard-vorschau.html?bereich=editor_v2&alarme=1',
    prepare: async (page) => {
      const tab = page.getByTestId('preview-tab-alarme');
      await tab.click();
      const banner = page.getByTestId('alarm-list-container').getByTestId('alarm-worker-banner');
      await banner.waitFor({ state: 'visible', timeout: 10000 });
      await banner.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    },
  },
];

let serverProcess = null;

async function startServer() {
  console.log(`[Harness 168] Starte Vite-Preview-Server auf Port ${PORT}...`);
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
            console.log(`[Harness 168] Server läuft auf ${BASE_URL}`);
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
    console.log('[Harness 168] Beende Preview-Server...');
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
          await mockAdminAndAuth(context);

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
              `[Screenshot-Gate 168] Horizontaler Überlauf (${overflowPx} px) in Szenario "${sc.id}" (${vp.name}/${theme}) verletzt das 0-px-Kriterium.`,
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
    const markdown = `# Abnahme-Screenshots Auftrag 168 (P13c Alarme in der App, Lesebestätigung und Quittierung, Admin-Übernahme, Ausfallhinweis)

**Erzeugt am:** ${new Date().toISOString()}  
**Auftrag:** 168 – Dashboard-Editor: Alarme in der App, Lesebestätigung und Quittierung, Admin-Übernahme, Ausfallhinweis (P13c)  
**Viewports:** 1440 × 900 (Desktop), 768 × 1024 (Tablet), 375 × 812 (Mobil)  
**Farbschemata:** Dunkel (Standard) und Hell  
**Horizontales Überlauf-Kriterium:** 0 px Pflicht auf allen Viewports  
**Sichtbarkeits-Kriterium:** Jeder Zustand erzeugt je Viewport/Farbschema einen eigenen SHA-256-Hash (keine identischen Bilder).

## Szenarien (§2.4 Nr. 26)

1. **Alarmliste:** Übersicht aller Alarmmeldungen mit Filtern und Quittierungen (\`alarmliste\`)
2. **Quittier-Dialog:** Quittier-Dialog für Ereignis mit Kommentarfeld (\`quittier-dialog\`)
3. **Inspector Alarm-Abschnitt:** Schwellenwerte-Tab mit Alarm-Schalter und Parametern (\`inspector-alarm-abschnitt\`)
4. **Kachel Glocke:** Kachel mit aktivem Schwellenwert-Badge und Alarm-Glockensymbol (\`kachel-glocke\`)
5. **Admin-Ansicht:** Übernahme verwaister Regeln nach Rechteverlust (\`admin-ansicht\`)
6. **Ausfallbanner:** Ausfallhinweis bei verzögerter Alarmprüfung (\`ausfallbanner\`)

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
- Horizontaler Überlauf: **0 px** über alle 36 Kombinationen
- Prüfsummen-Eindeutigkeit: **100% eindeutig** je Viewport und Thema (keine Duplikate)
- Status: **BESTANDEN**
`;

    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), markdown, 'utf-8');
    console.log(`\n[Harness 168] README.md erfolgreich geschrieben in ${OUT_DIR}/README.md`);
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[Harness 168 Fehler]', err);
  stopServer();
  process.exit(1);
});
