#!/usr/bin/env node
/**
 * Auftrag 173: Gesamtabnahme und Abgleich V1 <-> V2 (P16a §2.3 Nr. 10).
 * Screenshot-Harness für die neue Admin-Ansicht „Umstellung vorbereiten“ gegen die Vorschau
 * (`dashboard-vorschau.html?bereich=umstellung`, Build mit VITE_DASHBOARD_PREVIEW=true):
 * Liste, aufgeklappte Unterschiede, Übernahme-Dialog und Zustand nach der Übernahme auf
 * 1440/768/375 px, je hell und dunkel. Die Ansicht ist neu; ein „Vorher“ gibt es nicht. Die Paare
 * sind deshalb Zustandswechsel derselben Ansicht (Hashes je Viewport/Theme paarweise verschieden).
 * Misst horizontalen Überlauf (0 px Pflicht). Schreibt docs/screenshots/auftrag-173/README.md
 * (Bilddateien bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-173');
const PORT = 3173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PREP = '/dashboard-vorschau.html?bereich=umstellung';

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 768, height: 1024, name: '768' },
  { width: 375, height: 812, name: '375' },
];
const THEMES = ['dunkel', 'hell'];

const SCENARIOS = [
  { id: 'liste', title: 'Liste mit allen fünf Klassen', path: PREP },
  {
    id: 'unterschiede',
    title: 'Unterschiede aufgeklappt (Alter Editor geändert)',
    path: PREP,
    prepare: async (page) => {
      await page.getByTestId('rollout-diff-toggle-u-v1').click();
      await page.getByTestId('rollout-diff-u-v1').scrollIntoViewIfNeeded();
    },
  },
  {
    id: 'dialog',
    title: 'Übernahme-Dialog',
    path: PREP,
    prepare: async (page) => {
      await page.getByTestId('rollout-adopt-u-v1').click();
      await page.getByTestId('rollout-adopt-dialog').waitFor();
    },
  },
  {
    id: 'nach-uebernahme',
    title: 'Nach Übernahme und „Pilot behalten“',
    path: PREP,
    prepare: async (page) => {
      await page.getByTestId('rollout-adopt-u-v1').click();
      await page.getByTestId('rollout-adopt-confirm').click();
      await page.getByTestId('rollout-keep-u-beide').click();
      await page.getByText('Keine offenen Entscheidungen.').waitFor();
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
            hasTouch: vp.width < 1024,
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
              `[Screenshot-Gate 173] Überlauf ${overflowPx} px in "${sc.id}" (${vp.name}/${theme}).`,
            );
          }
          const filename = `${sc.id}-${vp.name}-${theme}.png`;
          const filepath = path.join(OUT_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: true });
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
          throw new Error(`[Screenshot-Gate 173] Doppelte Hashes bei ${vp.name}/${theme}.`);
        }
      }
    }

    const lines = [
      '# Auftrag 173 – Screenshot-Nachweis (Umstellung vorbereiten)',
      '',
      `Erzeugt mit \`node scripts/captureAuftrag173GateScreenshots.mjs\` am ${new Date().toISOString()}.`,
      'Bilddateien liegen lokal (`.gitignore`); committet wird nur diese Matrix. Neue Ansicht ohne Vorher-Zustand; Paare = Zustandswechsel. Touch-Emulation auf 375/768.',
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
    console.log(`\n[Harness 173] ${records.length} Aufnahmen, README geschrieben.`);
  } finally {
    serverProcess?.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  serverProcess?.kill('SIGTERM');
  process.exit(1);
});
