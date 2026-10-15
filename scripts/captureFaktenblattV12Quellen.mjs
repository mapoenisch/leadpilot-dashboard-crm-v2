#!/usr/bin/env node
/**
 * Faktenblatt v1.2 (PR #80): Vorher-/Nachher-Nachweis der sichtbaren Quellenangaben.
 *
 * Sichtbar sind die geänderten Texte nur in `/dashboard-vorschau.html?bereich=muster` (Quellenzeilen der
 * Designmuster). `/dashboard` zeigt den Hero-Untertitel aus `execData.ts` in keiner Ansicht.
 * Die Vorschau entsteht nur im Build mit VITE_DASHBOARD_PREVIEW=true (CI-Artefakt `dashboard-preview`).
 * Je Breite (1440/768/375) × dunkel/hell als ganze Seite. Gemessen: SHA-256, Zahl der sichtbaren
 * Nennungen „Faktenblatt v1.1“ / „Faktenblatt v1.2“, globaler horizontaler Überlauf.
 * Bilder und result.json bleiben unter artifacts/faktenblatt-v1-2/.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureFaktenblattV12Quellen.mjs
 * Matrix:   COMPARE=1 node scripts/captureFaktenblattV12Quellen.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/faktenblatt-v1-2');
const RAW = path.join(ROOT, 'artifacts/faktenblatt-v1-2');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const THEMES = ['dark', 'light'];
const PAGES = [
  { key: 'muster', url: '/dashboard-vorschau.html?bereich=muster', ready: 'main h1, main h2' },
];

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
  for (const target of PAGES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const name = `${target.key}-${viewport.width}-${theme}`;
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
          await page.goto(target.url, { waitUntil: 'networkidle' });
          await page.locator(target.ready).first().waitFor({ state: 'attached', timeout: 15000 });
          // Die Vorschau führt den Farbmodus als eigenen State (Start „Dunkel“) und überschreibt
          // data-theme beim Mounten; Hell daher über den Schalter der Seite wählen.
          if (theme === 'light') {
            await page
              .getByRole('group', { name: 'Farbmodus' })
              .getByRole('button', { name: 'Hell' })
              .click();
            await page.waitForFunction(
              () => document.documentElement.getAttribute('data-theme') === 'light',
            );
          }
          await page.addStyleTag({
            content:
              '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }',
          });
          const fullHeight = await page.evaluate(() =>
            Math.max(
              ...Array.from(document.querySelectorAll('main, main *, body'))
                .filter((el) => el.scrollHeight > el.clientHeight + 1)
                .map((el) => el.scrollHeight - el.clientHeight + window.innerHeight),
              window.innerHeight,
            ),
          );
          await page.setViewportSize({ width: viewport.width, height: Math.min(fullHeight, 8000) });
          await page.waitForTimeout(500);
          const file = path.join(dir, `${name}.png`);
          await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
          const metrics = await page.evaluate(() => {
            const text = document.body.innerText;
            const count = (needle) => text.split(needle).length - 1;
            return {
              v11: count('Faktenblatt v1.1'),
              v12: count('Faktenblatt v1.2'),
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            };
          });
          const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
          shots.push({ name, sha256, ...metrics });
          console.log(
            `${name}: v1.1 ${metrics.v11} · v1.2 ${metrics.v12} · Überlauf ${metrics.overflow}`,
          );
        } finally {
          await context.close();
        }
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
  for (const target of PAGES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const name = `${target.key}-${viewport.width}-${theme}`;
        const b = before.get(name);
        const a = after.get(name);
        if (!b || !a) {
          problems.push(`${name}: Aufnahme fehlt`);
          continue;
        }
        const checks = {
          hash: a.sha256 !== b.sha256,
          vorherV11: b.v11 > 0,
          keinV11: a.v11 === 0,
          v12: a.v12 > 0,
          overflow: a.overflow <= 0,
        };
        for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
        rows.push(
          `| ${target.url} | ${viewport.width} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${b.v11} → ${a.v11} | ${b.v12} → ${a.v12} | ${a.overflow} px |`,
        );
      }
    }
  }
  const total = PAGES.length * VIEWPORTS.length * THEMES.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Faktenblatt v1.2 (PR #80) – Screenshot-Matrix Quellenangaben

Builds mit \`VITE_DASHBOARD_PREVIEW=true\` (CI-Artefakt \`dashboard-preview\`) gegen lokales Supabase (Testnutzer aus
\`supabase/seed.sql\`), ganze Seite. Vorher = \`main\` nach PR #79, Nachher = Branch
\`claude/faktenblatt-v1-2\`. Gezählt werden sichtbare Nennungen im Seitentext. Einzige sichtbare Stelle
ist die Designmuster-Vorschau: \`/dashboard\` rendert den Hero-Untertitel aus \`execData.ts\` nicht, Projektkontext- und
Quellenseite (\`projektkontextData.ts\`, Quellenfluss in \`execData.ts\`) sind in keiner Route eingebunden,
\`BASELINE_ACCESS\` wird nicht gerendert. Hell wird über den Farbmodus-Schalter der Vorschau gewählt. Bilder bleiben
lokal unter \`artifacts/faktenblatt-v1-2/\`.

| Seite | Breite | Theme | SHA-256 vorher | SHA-256 nachher | „v1.1“ vorher → nachher | „v1.2“ vorher → nachher | Überlauf |
|---|---|---|---|---|---|---|---|
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
