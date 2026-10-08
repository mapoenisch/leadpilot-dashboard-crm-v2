#!/usr/bin/env node
/**
 * Auftrag 083 (Korrekturauftrag F15): axe serious/critical über die ganze Seite (Kopfzeile, Sidebar,
 * Simulationsleiste, <main>) in allen 42 Ansichten des 081-Inventars, dunkel und hell, 1440/768/375 px.
 * Je Verstoß werden Regel, Selektor, Vorder-/Hintergrundfarbe und Kontrastwert protokolliert, damit
 * die Ursache im Code auffindbar ist. Horizontaler Überlauf des Dokuments > 0 px zählt ebenfalls
 * als Verstoß. Optional zusätzlich Bilder für den Vorher/Nachher-Vergleich.
 *
 * Aufruf: BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… [ONLY=dashboard,s-daten] [SHOTS_DIR=…]
 *         [JSON_OUT=…] node scripts/captureAuftrag083ContrastScan.mjs
 * Exit-Code 1, sobald ein Verstoß gefunden wird oder eine Ansicht nicht öffnet.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt.`);
  return value;
};
const BASE_URL = env('BASE_URL');
const CREDENTIALS = { email: env('E2E_AUTH_EMAIL'), password: env('E2E_AUTH_PASSWORD') };
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const SHOTS_DIR = process.env.SHOTS_DIR ?? null;
const JSON_OUT = process.env.JSON_OUT ?? null;
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const THEMES = ['dark', 'light'];

/** Die 42 Ansichten stammen aus dem committeten 081-Inventar (eine Quelle für beide Aufträge). */
const inventory = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'docs/reviews/2026-10-06-frontend-inventar.json'), 'utf8'),
);
const VIEWS = [];
for (const shot of inventory.shots) {
  if (VIEWS.some((v) => v.id === shot.id)) continue;
  VIEWS.push({
    id: shot.id,
    route:
      shot.id === 'dashboard-detail'
        ? '/dashboard'
        : new URL(shot.url, 'http://inventar.local').pathname,
    edit: shot.id === 'dashboard-edit',
    detail: shot.id === 'dashboard-detail',
  });
}
if (VIEWS.length !== 42) throw new Error(`Erwartet 42 Ansichten, gefunden ${VIEWS.length}.`);

async function open(browser, state, viewport, theme, view) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: state,
    viewport,
    reducedMotion: 'reduce',
  });
  // Feste Browserzeit wie im 081-Harness, damit „Stand“-Zeitstempel die Bild-Hashes nicht verändern.
  await context.clock.setFixedTime('2026-10-07T12:00:00.000Z');
  await context.addInitScript((mode) => {
    window.localStorage.setItem('leadpilot-theme', mode);
  }, theme);
  const page = await context.newPage();
  await page.goto(view.route, { waitUntil: 'networkidle' });
  await page.locator('main').first().waitFor({ timeout: 15000 });
  if (view.edit) {
    await page
      .getByRole('button', { name: /bearbeiten/i })
      .first()
      .click();
    await page.getByTestId('editor-toolbar').waitFor({ timeout: 10000 });
  }
  if (view.detail) {
    await page
      .getByRole('button', { name: /^details zu/i })
      .first()
      .click();
    await page.getByTestId('tile-detail-page').waitFor({ timeout: 10000 });
  }
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  // Lazy-Inhalte aktivieren: <main> einmal vollständig durchscrollen, dann zurück nach oben.
  await page.evaluate(async () => {
    const main = document.querySelector('main');
    const scroller =
      main && main.scrollHeight > main.clientHeight ? main : document.scrollingElement;
    for (let y = 0; y <= scroller.scrollHeight; y += 400) {
      scroller.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scroller.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  const actualTheme = await page.evaluate(
    () => document.documentElement.getAttribute('data-theme') ?? 'dark',
  );
  if (actualTheme !== theme)
    throw new Error(`Theme ${theme} nicht aktiv (gefunden ${actualTheme}).`);
  return { context, page };
}

const results = [];
const browser = await chromium.launch();
const state = await login(browser, BASE_URL, CREDENTIALS);
if (SHOTS_DIR) fs.mkdirSync(SHOTS_DIR, { recursive: true });
let failures = 0;
for (const view of VIEWS) {
  if (ONLY && !ONLY.has(view.id)) continue;
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const name = `${view.id}-${viewport.width}-${theme}`;
      let context;
      try {
        const opened = await open(browser, state, viewport, theme, view);
        context = opened.context;
        const axe = await new AxeBuilder({ page: opened.page }).analyze();
        const violations = axe.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .flatMap((v) =>
            v.nodes.map((n) => ({
              rule: v.id,
              target: n.target.join(' '),
              html: n.html.slice(0, 160),
              data: n.any?.[0]?.data
                ? {
                    fg: n.any[0].data.fgColor,
                    bg: n.any[0].data.bgColor,
                    ratio: n.any[0].data.contrastRatio,
                  }
                : null,
            })),
          );
        const overflow = await opened.page.evaluate(() =>
          Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        );
        if (overflow > 0)
          violations.push({
            rule: 'horizontal-overflow',
            target: 'html',
            html: `${overflow}px`,
            data: null,
          });
        let hash = null;
        if (SHOTS_DIR) {
          const buffer = await opened.page.screenshot();
          fs.writeFileSync(path.join(SHOTS_DIR, `${name}.png`), buffer);
          hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
        }
        results.push({ id: view.id, width: viewport.width, theme, violations, overflow, hash });
        if (violations.length > 0) failures += 1;
        console.log(`${name}: ${violations.length} Verstöße${hash ? ` sha=${hash}` : ''}`);
      } catch (error) {
        failures += 1;
        results.push({ id: view.id, width: viewport.width, theme, failed: String(error.message) });
        console.log(`${name}: FEHLER ${error.message}`);
      } finally {
        await context?.close();
      }
    }
  }
}
await browser.close();
if (JSON_OUT) fs.writeFileSync(JSON_OUT, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Aufnahmen: ${results.length}, mit Verstoß oder Fehler: ${failures}`);
process.exit(failures > 0 ? 1 : 0);
