#!/usr/bin/env node
/**
 * Auftrag 088 (Paket E, Teil 1): Vorher-/Nachher-Nachweis der Dashboard-Kacheln nach den Regeln
 * aus Paket D (Titel 15 px, Zahl 32 px, kein redundanter Festwert-Hinweis, Diagrammwerte im
 * Textton, Fehlerrot dunkel kontrastfest).
 *
 * Je Breite (1440/768/375/320) × dunkel/hell: Ganzseiten-Screenshot von /dashboard nach Durchscrollen
 * (Lazy Loading), SHA-256, Höhe der Zahlkacheln, Anzahl „Historischer Stand ist fest“, Anzahl fest
 * weißer Diagrammwerte, Überlauf Dokument/<main>, axe serious/critical (ganze Seite).
 * Bilder und result.json bleiben lokal unter artifacts/auftrag-088/, committet wird nur die README.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag088Tiles.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag088Tiles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login, scrollThrough } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-088');
const RAW = path.join(ROOT, 'artifacts/auftrag-088');
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
        await scrollThrough(page, viewport);
        await page.waitForLoadState('networkidle');
        await page.addStyleTag({
          content:
            '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }',
        });
        await page.mouse.move(0, 0);
        await page.waitForTimeout(400);
        const file = path.join(dir, `${name}.png`);
        await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
        const metrics = await page.evaluate(() => {
          const main = document.querySelector('main');
          const tiles = [...document.querySelectorAll('[data-testid="dashboard-tile"]')];
          return {
            overflow: {
              document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              main: main ? main.scrollWidth - main.clientWidth : 0,
            },
            numberTileHeights: tiles
              .filter((t) => t.getAttribute('data-view') === 'zahl')
              .map((t) => Math.round(t.getBoundingClientRect().height)),
            redundantHints: (document.body.innerText.match(/Historischer Stand ist fest/g) ?? [])
              .length,
            // Codex PR #74: nur Außenbeschriftungen von Säulen/Balken zählen. Die Ringsumme (dunkle
            // Aussparung) und Werte innerhalb einer Säule (Klasse fill-white) sind absichtlich weiß.
            whiteChartValues: document.querySelectorAll(
              ':is([data-testid="depth-bar-chart"], [data-testid="depth-hbar-chart"]) svg text[font-weight="700"][fill="#ffffff"]:not(.fill-white)',
            ).length,
          };
        });
        const axe = await new AxeBuilder({ page }).analyze();
        const severe = axe.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}(${v.nodes.length})`);
        const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        shots.push({ name, sha256, ...metrics, severe });
        const median = [...metrics.numberTileHeights].sort((a, b) => a - b)[
          Math.floor(metrics.numberTileHeights.length / 2)
        ];
        console.log(
          `${name}: Zahlkachel Median ${median} px · Hinweise ${metrics.redundantHints} · weiße Werte ${metrics.whiteChartValues} · Überlauf ${metrics.overflow.document}/${metrics.overflow.main} · axe ${severe.join(',') || 0}`,
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
  const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)] ?? 0;
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
        hints: a.redundantHints === 0,
        white: a.whiteChartValues === 0,
        height: median(a.numberTileHeights) <= median(b.numberTileHeights),
        overflow: a.overflow.document <= 0 && a.overflow.main <= 0,
        axe: a.severe.length === 0,
      };
      for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
      rows.push(
        `| ${viewport.width} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${median(b.numberTileHeights)} → ${median(a.numberTileHeights)} px | ${b.redundantHints} → ${a.redundantHints} | ${b.whiteChartValues} → ${a.whiteChartValues} | ${a.overflow.document}/${a.overflow.main} px | ${a.severe.join(', ') || 0} |`,
      );
    }
  }
  const total = VIEWPORTS.length * THEMES.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 088 – Screenshot-Matrix kompakte Kacheln

Produktionsbuild gegen lokales Supabase (Testnutzer aus \`supabase/seed.sql\`), \`/dashboard\` nach
Durchscrollen (Lazy Loading). Vorher = \`main\` vor Auftrag 088, Nachher = Branch
\`claude/auftrag-088-kompakte-kacheln\`. Bilder bleiben lokal unter \`artifacts/auftrag-088/\`.

| Breite | Theme | SHA-256 vorher | SHA-256 nachher | Zahlkachel (Median) | „Historischer Stand ist fest“ | fest weiße Außenwerte (Säulen/Balken) | Überlauf Dok./main | axe |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

**Ergebnis:** ${total - failed}/${total} Aufnahmen bestanden${problems.length ? ` – offen: ${problems.join('; ')}` : ''}.
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'README.md'), readme);
  console.log(readme);
  if (problems.length) process.exitCode = 1;
}

if (process.env.COMPARE) compare();
else await capture();
