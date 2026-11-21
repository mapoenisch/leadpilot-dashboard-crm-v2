#!/usr/bin/env node
/**
 * Auftrag 171: Dashboard-Editor: TV/Kiosk-Modus, Rotation, Sitzung, Offline (P15a).
 * Screenshot-Harness für die Abnahmematrix (§2.3 Nr. 14) gegen die Vorschau
 * (`dashboard-vorschau.html?bereich=kiosk`, Build mit VITE_DASHBOARD_PREVIEW=true):
 * 1. kiosk-rotation: zwei lesbare Dashboards + eine fremde ID (Hinweis „übersprungen“)
 * 2. kiosk-pausiert: Rotation per Leertaste pausiert
 * 3. kiosk-offline: Offline-Hinweis, Live-Werte veraltet, Schwellenwerte „nicht bewertet“
 * 4. kiosk-ablauf: Sitzung abgelaufen (simuliertes Token), keine Kacheln mehr
 * 5. editor-kiosk-start: Einstieg „Im Kiosk anzeigen“ mit Auswahldialog im V2-Editor
 *
 * Viewports: 1920 × 1080, 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes (je Viewport/Theme verschieden).
 * Schreibt docs/screenshots/auftrag-171/README.md (Bilddateien bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-171');
const PORT = 3171;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const KIOSK = '/dashboard-vorschau.html?bereich=kiosk';
const IDS = 'ids=preview_thresholds_dashboard,preview_v2_dashboard,fremd_dashboard';

const VIEWPORTS = [
  { width: 1920, height: 1080, name: '1920' },
  { width: 1440, height: 900, name: '1440' },
  { width: 768, height: 1024, name: '768' },
  { width: 375, height: 812, name: '375' },
];
const THEMES = ['dunkel', 'hell'];

const waitTiles = async (page) => {
  await page.getByTestId('dashboard-tile').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(600);
};

const SCENARIOS = [
  {
    id: 'kiosk-rotation',
    title: 'Kiosk mit Rotation (2 lesbare Dashboards, 1 übersprungen)',
    path: (theme) => `${KIOSK}&${IDS}&intervall=60&theme=${theme}`,
    prepare: waitTiles,
  },
  {
    id: 'kiosk-pausiert',
    title: 'Rotation per Leertaste pausiert',
    path: (theme) => `${KIOSK}&${IDS}&intervall=60&theme=${theme}`,
    prepare: async (page) => {
      await waitTiles(page);
      await page.keyboard.press('Space');
      await page.getByTestId('kiosk-root').and(page.locator('[data-paused="true"]')).waitFor();
    },
  },
  {
    id: 'kiosk-offline',
    title: 'Offline-Hinweis, Werte veraltet, Schwellenwerte nicht bewertet',
    path: (theme) => `${KIOSK}&ids=preview_thresholds_dashboard&offline=1&theme=${theme}`,
    prepare: async (page) => {
      await waitTiles(page);
      await page.getByTestId('kiosk-offline-banner').waitFor({ timeout: 10_000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'kiosk-ablauf',
    title: 'Sitzung abgelaufen – Hinweis mit letztem Datenstand',
    path: (theme) => `${KIOSK}&${IDS}&ablauf=2&theme=${theme}`,
    prepare: async (page) => {
      await page.getByTestId('kiosk-session-expired').waitFor({ timeout: 15_000 });
    },
  },
  {
    id: 'editor-kiosk-start',
    title: 'Einstieg „Im Kiosk anzeigen“ im V2-Editor',
    path: () => '/dashboard-vorschau.html?bereich=editor_v2',
    theme: 'attribute',
    prepare: async (page) => {
      await page.getByTestId('kiosk-launch-button').click();
      await page.getByTestId('kiosk-launch-dialog').waitFor();
      await page.waitForTimeout(300);
    },
  },
];

let serverProcess = null;

async function startServer() {
  serverProcess = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'],
    { cwd: ROOT, stdio: 'inherit' },
  );
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE_URL}/dashboard-vorschau.html`);
      if (res.ok) return;
    } catch {
      /* wartet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Server auf ${BASE_URL} nicht erreichbar (Build mit VITE_DASHBOARD_PREVIEW=true?).`,
  );
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
          const page = await context.newPage();
          await page.goto(`${BASE_URL}${sc.path(theme)}`, { waitUntil: 'networkidle' });
          if (sc.theme === 'attribute') {
            await page.evaluate((th) => {
              document.documentElement.setAttribute('data-theme', th === 'hell' ? 'light' : 'dark');
            }, theme);
          }
          await page.evaluate(() => document.fonts.ready);
          await sc.prepare(page);

          const overflowPx = await page.evaluate(() => {
            const scrollWidth = Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            );
            return Math.max(0, scrollWidth - document.documentElement.clientWidth);
          });
          if (overflowPx > 0) {
            throw new Error(
              `[Screenshot-Gate 171] Überlauf ${overflowPx} px in "${sc.id}" (${vp.name}/${theme}).`,
            );
          }
          const filename = `${sc.id}-${vp.name}-${theme}.png`;
          const filepath = path.join(OUT_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: false });
          const hash = crypto.createHash('sha256').update(fs.readFileSync(filepath)).digest('hex');
          records.push({ ...sc, viewport: vp.name, theme, overflowPx, hash, filename });
          console.log(`  ✓ ${filename}: overflow=${overflowPx}px, hash=${hash.slice(0, 12)}…`);
          await context.close();
        }
      }
    }
    await browser.close();

    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const rows = records.filter((r) => r.viewport === vp.name && r.theme === theme);
        if (new Set(rows.map((r) => r.hash)).size !== rows.length) {
          throw new Error(`[Screenshot-Gate 171] Doppelte Hashes bei ${vp.name}/${theme}.`);
        }
      }
    }

    const lines = [
      '# Auftrag 171 – Screenshot-Nachweis (Kiosk, Rotation, Sitzung, Offline)',
      '',
      `Erzeugt mit \`node scripts/captureAuftrag171GateScreenshots.mjs\` am ${new Date().toISOString()}.`,
      'Bilddateien liegen lokal (`.gitignore`); committet wird nur diese Matrix.',
      '',
      '| Szenario | Viewport | Theme | Überlauf | SHA-256 (gekürzt) |',
      '| --- | --- | --- | --- | --- |',
      ...records.map(
        (r) =>
          `| ${r.title} | ${r.viewport} | ${r.theme} | ${r.overflowPx} px | \`${r.hash.slice(0, 16)}\` |`,
      ),
      '',
      `Ergebnis: ${records.length} Aufnahmen, 0 px horizontaler Überlauf, Hashes je Viewport/Theme paarweise verschieden.`,
      '',
    ];
    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), lines.join('\n'));
    console.log(`\n[Harness 171] ${records.length} Aufnahmen, README geschrieben.`);
  } finally {
    serverProcess?.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  serverProcess?.kill('SIGTERM');
  process.exit(1);
});
