#!/usr/bin/env node
/**
 * Auftrag 091 (Paket E, Teil 3): Vorher-/Nachher-Nachweis für Kennzahlnamen, Vorjahr und kompakte
 * Zahlkachel. Je Breite (1440/768/375/320) × dunkel/hell: ganze Seite /dashboard, SHA-256, Median-
 * und Höchsthöhe aller Zahlkacheln (Richtwert 160–220 px bei 1440 px), Zahl der Klartext- und
 * Vorjahreszeilen, Überlauf Dokument/<main>, axe serious/critical. Bilder und result.json bleiben
 * lokal unter artifacts/auftrag-091/.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag091Tiles.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag091Tiles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-091');
const RAW = path.join(ROOT, 'artifacts/auftrag-091');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
  { width: 320, height: 720 },
];
const THEMES = ['dark', 'light'];

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt.`);
  return value;
};

async function capture() {
  const label = env('LABEL');
  if (!['vorher', 'nachher'].includes(label)) throw new Error(`LABEL '${label}' ungültig.`);
  const dir = path.join(RAW, label);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const state = await login(browser, env('BASE_URL'), {
    email: env('E2E_AUTH_EMAIL'),
    password: env('E2E_AUTH_PASSWORD'),
  });
  const shots = [];
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const name = `dashboard-${viewport.width}-${theme}`;
      const context = await browser.newContext({
        baseURL: env('BASE_URL'),
        storageState: state,
        viewport,
      });
      try {
        await context.addInitScript(
          (mode) => window.localStorage.setItem('leadpilot-theme', mode),
          theme,
        );
        const page = await context.newPage();
        await page.goto('/dashboard', { waitUntil: 'networkidle' });
        await page
          .getByTestId('dashboard-workspace')
          .and(page.locator('[aria-busy="false"]'))
          .waitFor({ timeout: 15000 });
        await page.getByTestId('tile-number').first().waitFor({ timeout: 15000 });
        // Kacheln laden erst nahe am Sichtbereich: einmal durchscrollen, damit alle gemessen werden.
        for (let step = 0; step < 30; step += 1) {
          const done = await page.evaluate(() => {
            const main = document.querySelector('main');
            if (!main) return true;
            main.scrollTop += main.clientHeight;
            return main.scrollTop + main.clientHeight >= main.scrollHeight - 2;
          });
          await page.waitForTimeout(150);
          if (done) break;
        }
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => {
          const main = document.querySelector('main');
          if (main) main.scrollTop = 0;
        });
        await page.addStyleTag({
          content:
            '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }',
        });
        await page.mouse.move(0, 0);
        await page.waitForTimeout(400);
        const file = path.join(dir, `${name}.png`);
        await page.screenshot({ path: file, animations: 'disabled' });
        const metrics = await page.evaluate(() => {
          const main = document.querySelector('main');
          const heights = Array.from(
            document.querySelectorAll('[data-testid="dashboard-tile"][data-view="zahl"]'),
          )
            .map((tile) => Math.round(tile.getBoundingClientRect().height))
            .sort((x, y) => x - y);
          // Gewöhnlicher Inhalt (Plan §10): Klartext, Metazeile und Zahl je einzeilig, kein Vorjahr.
          const oneLine = (el) => !el || el.getBoundingClientRect().height <= 20;
          const ordinary = Array.from(
            document.querySelectorAll('[data-testid="dashboard-tile"][data-view="zahl"]'),
          )
            .filter(
              (tile) =>
                !tile.querySelector('[data-testid="tile-comparison"]') &&
                oneLine(tile.querySelector('[data-testid="tile-plain-name"]')) &&
                oneLine(tile.querySelector('[data-testid="tile-time-reference"] p')) &&
                (tile.querySelector('[data-testid="tile-number"]')?.getBoundingClientRect()
                  .height ?? 99) <= 48,
            )
            .map((tile) => Math.round(tile.getBoundingClientRect().height))
            .sort((x, y) => x - y);
          return {
            ordinaryTiles: ordinary.length,
            ordinaryMax: ordinary.length ? ordinary[ordinary.length - 1] : null,
            numberTiles: heights.length,
            medianHeight: heights.length ? heights[Math.floor(heights.length / 2)] : null,
            maxHeight: heights.length ? heights[heights.length - 1] : null,
            plainNames: document.querySelectorAll('[data-testid="tile-plain-name"]').length,
            comparisons: document.querySelectorAll('[data-testid="tile-comparison"]').length,
            overflow: {
              document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              main: main ? main.scrollWidth - main.clientWidth : 0,
            },
          };
        });
        const severe = (await new AxeBuilder({ page }).analyze()).violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}(${v.nodes.length})`);
        const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        shots.push({ name, sha256, ...metrics, severe });
        console.log(
          `${name}: Zahlkacheln ${metrics.numberTiles} · gewöhnlich ${metrics.ordinaryTiles} × ≤ ${metrics.ordinaryMax} px · Median ${metrics.medianHeight} px · max ${metrics.maxHeight} px · Klartext ${metrics.plainNames} · Vorjahr ${metrics.comparisons} · Überlauf ${metrics.overflow.document}/${metrics.overflow.main} · axe ${severe.join(',') || 0}`,
        );
      } finally {
        await context.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(shots, null, 2));
}

function compare() {
  const read = (label) =>
    new Map(
      JSON.parse(fs.readFileSync(path.join(RAW, label, 'result.json'), 'utf8')).map((s) => [
        s.name,
        s,
      ]),
    );
  const before = read('vorher');
  const after = read('nachher');
  const rows = [];
  const problems = [];
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const name = `dashboard-${viewport.width}-${theme}`;
      const b = before.get(name);
      const a = after.get(name);
      if (!b || !a) {
        problems.push(`${name}: Aufnahme fehlt`);
        continue;
      }
      const checks = {
        hash: a.sha256 !== b.sha256,
        // Richtwert gilt für gewöhnliche Inhalte bei 1440 px; übrige Breiten werden berichtet.
        hoehe:
          viewport.width !== 1440 ||
          (a.ordinaryTiles > 0 && a.ordinaryMax >= 160 && a.ordinaryMax <= 220),
        klartext: a.plainNames > 0,
        vorjahr: a.comparisons > 0,
        overflow: a.overflow.document <= 0 && a.overflow.main <= 0,
        axe: a.severe.length === 0,
      };
      for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
      rows.push(
        `| ${viewport.width} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${b.medianHeight} → ${a.medianHeight} px | ${b.maxHeight} → ${a.maxHeight} px | ${a.ordinaryTiles} × ≤ ${a.ordinaryMax} px | ${a.plainNames} / ${a.comparisons} | ${a.overflow.document}/${a.overflow.main} px | ${a.severe.join(', ') || 0} |`,
      );
    }
  }
  const total = VIEWPORTS.length * THEMES.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 091 – Screenshot-Matrix Kennzahlnamen, Vorjahr, kompakte Zahlkachel

Produktionsbuild gegen lokales Supabase (Testnutzer aus \`supabase/seed.sql\`), \`/dashboard\`.
Vorher = \`main\` nach Auftrag 090, Nachher = Branch \`claude/auftrag-091-paket-e-rest\`. Höhen über alle
Zahlkacheln der Standardansicht (auch außerhalb des ersten Bildschirms). „Gewöhnlich“ = Klartext,
Metazeile und Zahl je einzeilig und ohne Vorjahreszeile; für sie gilt der Richtwert 160–220 px. Bilder bleiben lokal unter
\`artifacts/auftrag-091/\`.

| Breite | Theme | SHA-256 vorher | SHA-256 nachher | Median Zahlkachel | höchste Zahlkachel | gewöhnliche Zahlkacheln | Klartext / Vorjahr | Überlauf Dok./main | axe |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

**Ergebnis:** ${total - failed}/${total} Aufnahmen bestanden${problems.length ? ` – offen: ${problems.join('; ')}` : ''}. Richtwert 160–220 px für gewöhnliche Zahlkacheln geprüft bei 1440 px; längere Inhalte bleiben vollständig sichtbar und dürfen höher sein.
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'README.md'), readme);
  console.log(readme);
  if (problems.length) process.exitCode = 1;
}

if (process.env.COMPARE) compare();
else await capture();
