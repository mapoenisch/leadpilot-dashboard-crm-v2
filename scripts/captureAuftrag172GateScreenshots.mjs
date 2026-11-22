#!/usr/bin/env node
/**
 * Auftrag 172: Mobile Bedienung, Barrierefreiheits-Abnahme, Reportexport (P15b §2.4 Nr. 12).
 * Screenshot-Harness gegen die Vorschau (Build mit VITE_DASHBOARD_PREVIEW=true), Touch-Emulation:
 * alle V2-Ansichten aus der T0-Liste auf 375 × 812 und 768 × 1024 px, je hell und dunkel,
 * dazu die Druckansicht des Reports im A4-Format (Druckmedien-Emulation).
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes (je Viewport/Theme verschieden).
 * Schreibt docs/screenshots/auftrag-172/README.md (Bilddateien bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-172');
const PORT = 3172;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const V2 = '/dashboard-vorschau.html?bereich=editor_v2';

const VIEWPORTS = [
  { width: 768, height: 1024, name: '768' },
  { width: 375, height: 812, name: '375' },
  { width: 794, height: 1123, name: 'A4', print: true },
];
const THEMES = ['dunkel', 'hell'];

const firstTile = (page) => page.locator('[data-testid^="canvas-tile-"]').first();
const openInspector = async (page) => {
  const edit = page.locator('[data-testid^="tile-list-actions-"] [data-testid^="tile-edit-btn-"]');
  if (await edit.first().isVisible()) {
    await edit.first().tap();
  } else {
    await firstTile(page).tap();
    if (!(await page.getByTestId('editor-inspector').isVisible())) {
      await page.getByTestId('toggle-inspector-button').tap();
    }
  }
  await page.getByTestId('editor-inspector').waitFor();
};

const SCENARIOS = [
  { id: 'editor', title: 'Editor (Telefon: Bearbeiten per Liste)', path: V2 },
  {
    id: 'inspector',
    title: 'Inspector (Telefon: Vollbild-Blatt), Tab Schwellenwerte',
    path: `${V2}&schwellenwerte=1`,
    prepare: async (page) => {
      await openInspector(page);
      await page.getByTestId('inspector-tab-schwellenwerte').tap();
    },
  },
  {
    id: 'bibliothek',
    title: 'Widget-Bibliothek',
    path: V2,
    prepare: async (page) => {
      if (!(await page.getByTestId('widget-library').isVisible())) {
        await page.getByTestId('toggle-library-button').tap();
      }
      await page.getByTestId('widget-library').waitFor();
    },
  },
  {
    id: 'versionen',
    title: 'Versionen',
    path: `${V2}&versionen=1`,
    prepare: async (page) => {
      await page.getByTestId('editor-open-versions').tap();
      await page.getByTestId('revision-history-panel').waitFor();
    },
  },
  {
    id: 'teams',
    title: 'Dashboard-Auswahl mit Team-Freigaben',
    path: `${V2}&teams=1`,
    prepare: async (page) => {
      await page.getByTestId('dashboard-switcher-button').tap();
      await page.getByTestId('dashboard-switcher-menu').waitFor();
    },
  },
  {
    id: 'alarme',
    title: 'Alarmliste',
    path: `${V2}&alarme=1`,
    prepare: async (page) => {
      await page.getByTestId('preview-tab-alarme').tap();
      await page.getByTestId('alarm-list-container').waitFor();
    },
  },
  {
    id: 'report-dialog',
    title: 'Report-Dialog',
    path: `${V2}&schwellenwerte=1`,
    prepare: async (page) => {
      await page.getByTestId('editor-open-report').tap();
      await page.getByTestId('print-submit-btn').waitFor();
    },
  },
  {
    id: 'kiosk',
    title: 'Kiosk',
    path: '/dashboard-vorschau.html?bereich=kiosk&ids=preview_thresholds_dashboard',
    prepare: async (page) => {
      await page.getByTestId('dashboard-tile').first().waitFor({ timeout: 15_000 });
    },
  },
  {
    id: 'druck',
    title: 'Druckansicht Report (A4)',
    path: `${V2}&schwellenwerte=1`,
    printOnly: true,
    prepare: async (page) => {
      await page.evaluate(() => {
        window.print = () => {};
      });
      await page.getByTestId('editor-open-report').click();
      await page.getByTestId('print-submit-btn').click();
      await page.emulateMedia({ media: 'print' });
      await page.getByTestId('dashboard-print-view-v2').waitFor();
      await page.locator('[data-testid^="print-tile-threshold-"]').first().waitFor();
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
        if (Boolean(vp.print) !== Boolean(sc.printOnly)) continue;
        for (const theme of THEMES) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            reducedMotion: 'reduce',
            hasTouch: !vp.print,
            colorScheme: theme === 'hell' ? 'light' : 'dark',
          });
          const page = await context.newPage();
          await page.goto(`${BASE_URL}${sc.path}`, { waitUntil: 'networkidle' });
          await page.evaluate((th) => {
            document.documentElement.setAttribute('data-theme', th === 'hell' ? 'light' : 'dark');
          }, theme);
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(500);
          if (sc.prepare) await sc.prepare(page);
          await page.waitForTimeout(300);

          const overflowPx = await page.evaluate(() => {
            const scrollWidth = Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            );
            return Math.max(0, scrollWidth - document.documentElement.clientWidth);
          });
          if (overflowPx > 0) {
            throw new Error(
              `[Screenshot-Gate 172] Überlauf ${overflowPx} px in "${sc.id}" (${vp.name}/${theme}).`,
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
          throw new Error(`[Screenshot-Gate 172] Doppelte Hashes bei ${vp.name}/${theme}.`);
        }
      }
    }

    const lines = [
      '# Auftrag 172 – Screenshot-Nachweis (Mobile Bedienung, Barrierefreiheit, Report)',
      '',
      `Erzeugt mit \`node scripts/captureAuftrag172GateScreenshots.mjs\` am ${new Date().toISOString()}.`,
      'Bilddateien liegen lokal (`.gitignore`); committet wird nur diese Matrix. Touch-Emulation (pointer: coarse) auf 375/768; A4 = Druckmedien-Emulation 794 × 1123 px.',
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
    console.log(`\n[Harness 172] ${records.length} Aufnahmen, README geschrieben.`);
  } finally {
    serverProcess?.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  serverProcess?.kill('SIGTERM');
  process.exit(1);
});
