#!/usr/bin/env node
/**
 * Auftrag Dashboard-Testkachel (Teilauftrag 0): Screenshot-Harness der Designprobe.
 *
 * Öffnet /dashboard-vorschau (ohne Anmeldung, feste Beispieldaten) auf 1440/768/375 px,
 * schaltet jede Darstellung durch und prüft je Aufnahme: SHA-256 (alle verschieden),
 * horizontalen Überlauf (muss 0 px sein) und axe-Verstöße der Stufen serious/critical.
 * Bilder bleiben lokal (.gitignore), committet wird nur die Matrix in README.md (CLAUDE.md §7).
 *
 * Voraussetzung: Dev-Server (`npm run dev`) oder Vorschau-Build mit VITE_DASHBOARD_PREVIEW=true.
 * Aufruf: BASE_URL=http://localhost:3000 node scripts/captureDashboardPreviewScreenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-dashboard-testkachel');
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const VIEWS = ['Zahl', 'Tabelle', 'Säulen', 'Ring', 'Linie', 'Fläche'];

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const rows = [];
  try {
    for (const viewport of WIDTHS) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${BASE_URL}/dashboard-vorschau`, { waitUntil: 'networkidle' });
      await page.getByTestId('dashboard-test-tile').waitFor();
      for (const view of VIEWS) {
        await page.getByRole('tab', { name: view, exact: true }).click();
        await page.waitForTimeout(250);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        const file = `${viewport.width}-${view.toLowerCase().replace(/ä/g, 'ae')}.png`;
        const image = await page.getByTestId('dashboard-test-tile').screenshot({ path: path.join(OUT_DIR, file) });
        const axe = await new AxeBuilder({ page }).include('[data-testid="dashboard-test-tile"]').analyze();
        const severe = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        rows.push({
          width: viewport.width,
          view,
          file,
          sha256: sha256(image),
          overflowPx: overflow,
          axeSevere: severe.map((v) => v.id),
        });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const hashes = rows.map((row) => row.sha256);
  const result = {
    baseUrl: BASE_URL,
    capturedAt: new Date().toISOString(),
    allHashesDistinct: new Set(hashes).size === hashes.length,
    maxOverflowPx: Math.max(...rows.map((row) => row.overflowPx)),
    axeSevereTotal: rows.reduce((sum, row) => sum + row.axeSevere.length, 0),
    rows,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ ...result, rows: undefined }, null, 2));
  const ok = result.allHashesDistinct && result.maxOverflowPx === 0 && result.axeSevereTotal === 0;
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
