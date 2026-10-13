#!/usr/bin/env node
/**
 * Auftrag 093 (Paket G1): Vorher-/Nachher-Nachweis Sales Funnel als echte HTML-Seite.
 *
 * Je Breite (1440/768/375/320, dazu 250 px als Ersatz für 150 % Schrift bei 375 px) × dunkel/hell:
 * /sales/funnel als ganze Seite. Gemessen: SHA-256, Ganzseitenbild (WebP) vorhanden, Zoom-Hinweis,
 * Zahl der h1, sichtbare Überschriften, globaler horizontaler Überlauf, axe serious/critical.
 * Bilder und result.json bleiben unter artifacts/auftrag-093/.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag093Funnel.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag093Funnel.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-093');
const RAW = path.join(ROOT, 'artifacts/auftrag-093');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
  { width: 320, height: 720 },
  { width: 250, height: 720 },
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
      const name = `funnel-${viewport.width}-${theme}`;
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
        await page.goto('/sales/funnel', { waitUntil: 'networkidle' });
        await page.locator('main h1').filter({ hasText: 'Sales Funnel' }).waitFor({
          state: 'attached',
          timeout: 15000,
        });
        await page.addStyleTag({
          content:
            '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }',
        });
        await page.waitForTimeout(500);
        const file = path.join(dir, `${name}.png`);
        await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
        const metrics = await page.evaluate(() => {
          const main = document.querySelector('main') ?? document.body;
          const visible = (el) => {
            const r = el.getBoundingClientRect();
            return r.width > 1 && r.height > 1 && !el.closest('.sr-only');
          };
          return {
            webp: main.querySelectorAll('img[src$=".webp"]').length,
            zoomHint: !!main.querySelector('[data-testid="image-page-hint"]'),
            // Header-h1 (Layout) zählt nicht; Seiten-h1 nur im Hauptinhalt.
            h1: main.querySelectorAll('h1').length,
            headings: Array.from(main.querySelectorAll('h1, h2'))
              .filter(visible)
              .map((h) => (h.textContent ?? '').trim()),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        const severe = (await new AxeBuilder({ page }).analyze()).violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}(${v.nodes.length})`);
        const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        shots.push({ name, sha256, ...metrics, severe });
        console.log(
          `${name}: Bild ${metrics.webp} · Hinweis ${metrics.zoomHint} · h1 ${metrics.h1} · sichtbar ${metrics.headings.length} · Überlauf ${metrics.overflow} · axe ${severe.join(',') || 0}`,
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
  const WANT = [
    'Sales Funnel 2025',
    'Stufen im Geschäftsjahr',
    'Conversion je Stufe',
    'Quartalsverlauf je Stufe',
  ];
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const name = `funnel-${viewport.width}-${theme}`;
      const b = before.get(name);
      const a = after.get(name);
      if (!b || !a) {
        problems.push(`${name}: Aufnahme fehlt`);
        continue;
      }
      const checks = {
        hash: a.sha256 !== b.sha256,
        vorherBild: b.webp === 1,
        keinBild: a.webp === 0 && !a.zoomHint,
        h1: a.h1 === 1,
        sichtbar: WANT.every((w) => a.headings.includes(w)),
        overflow: a.overflow <= 0,
        axe: a.severe.length === 0,
      };
      for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
      rows.push(
        `| ${viewport.width} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${b.webp} → ${a.webp} | ${a.zoomHint ? 'ja' : 'nein'} | ${a.h1} | ${WANT.filter((w) => a.headings.includes(w)).length}/${WANT.length} | ${a.overflow} px | ${a.severe.join(', ') || 0} |`,
      );
    }
  }
  const total = VIEWPORTS.length * THEMES.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 093 – Screenshot-Matrix Sales Funnel als HTML-Seite

Produktionsbuild gegen lokales Supabase (Testnutzer aus \`supabase/seed.sql\`), \`/sales/funnel\` als
ganze Seite. Vorher = \`main\` nach Auftrag 092 (Ganzseitenbild), Nachher = Branch
\`claude/auftrag-093-funnel-seite\` (Seitenfreigabe \`HTML_PAGES\`). 250 px steht für 150 % Schrift bei
375 px. Bilder bleiben lokal unter \`artifacts/auftrag-093/\`.

| Breite | Theme | SHA-256 vorher | SHA-256 nachher | WebP vorher → nachher | Zoom-Hinweis | h1 | Überschriften sichtbar | Überlauf | axe |
|---|---|---|---|---|---|---|---|---|---|
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
