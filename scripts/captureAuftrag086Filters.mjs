#!/usr/bin/env node
/**
 * Auftrag 086 (Paket C): Vorher-/Nachher-Nachweis der Dashboard-Filterleiste.
 *
 * Je Breite (1440/768/375) × dunkel/hell: Ganzseiten-Screenshot von /dashboard, SHA-256 der
 * Filterleiste, Anzahl Datumsfelder, Sichtbarkeit von Filterknopf und Filterbereich, horizontaler
 * Überlauf an Dokument und <main>, axe serious/critical. Auf 375 px zusätzlich der aufgeklappte
 * Zustand. Bilder und result.json bleiben lokal unter artifacts/auftrag-086/, committet wird nur
 * die README.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag086Filters.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag086Filters.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { axeSevere, login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-086');
const RAW = path.join(ROOT, 'artifacts/auftrag-086');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const THEMES = ['dark', 'light'];
const SOLL = VIEWPORTS.length * THEMES.length;

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt.`);
  return value;
};
const overflowOf = (page) =>
  page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
    };
  });
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function measure(page, dir, name) {
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  const form = page.getByTestId('dashboard-filters');
  const formVisible = await form.isVisible();
  let filterSha256 = null;
  if (formVisible) {
    const formFile = path.join(dir, `${name}-filter.png`);
    await form.screenshot({ path: formFile, animations: 'disabled' });
    filterSha256 = sha(formFile);
  }
  const toggle = page.getByTestId('dashboard-filters-toggle');
  return {
    name,
    sha256: sha(file),
    filterSha256,
    dateFields: await form.locator('input[type="date"]').count(),
    formVisible,
    toggleVisible: (await toggle.count()) > 0 && (await toggle.isVisible()),
    toggleText: (await toggle.count()) > 0 ? ((await toggle.textContent()) ?? '').trim() : null,
    note: ((await form.locator('p').last().textContent()) ?? '').trim(),
    overflow: await overflowOf(page),
    severe: await axeSevere(page),
  };
}

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
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({
          content:
            '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }',
        });
        await page.waitForTimeout(300);
        const shot = await measure(page, dir, name);
        shots.push(shot);
        const toggle = page.getByTestId('dashboard-filters-toggle');
        if (shot.toggleVisible) {
          await toggle.click();
          await page.waitForTimeout(200);
          shots.push(await measure(page, dir, `${name}-offen`));
        }
        console.log(
          `${name}: Datumsfelder ${shot.dateFields} · Knopf ${shot.toggleVisible ? 'ja' : 'nein'} · Bereich ${shot.formVisible ? 'offen' : 'zu'} · Überlauf ${shot.overflow.document}/${shot.overflow.main} · axe ${shot.severe.length}`,
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
  const read = (label) => JSON.parse(fs.readFileSync(path.join(RAW, label, 'result.json'), 'utf8'));
  const before = new Map(read('vorher').map((s) => [s.name, s]));
  const after = new Map(read('nachher').map((s) => [s.name, s]));
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
      const mobile = viewport.width < 768;
      const open = after.get(`${name}-offen`);
      const ok = {
        // Codex PR #72: Gate auf die Filterleiste; der Ganzseiten-Hash wird nur berichtet.
        hash: mobile
          ? Boolean(open?.filterSha256) && open.filterSha256 !== b.filterSha256
          : Boolean(a.filterSha256) && a.filterSha256 !== b.filterSha256,
        dates: a.dateFields === 0 && (!open || open.dateFields === 0),
        mobile: mobile
          ? a.toggleVisible && !a.formVisible && Boolean(open?.formVisible)
          : !a.toggleVisible && a.formVisible,
        overflow: [a, open]
          .filter(Boolean)
          .every((s) => s.overflow.document <= 0 && s.overflow.main <= 0),
        axe: [a, open].filter(Boolean).every((s) => s.severe.length === 0),
      };
      for (const [key, value] of Object.entries(ok)) if (!value) problems.push(`${name}: ${key}`);
      rows.push(
        `| ${viewport.width} | ${theme} | \`${b.filterSha256?.slice(0, 12)}\` | \`${(mobile ? open?.filterSha256 : a.filterSha256)?.slice(0, 12)}\` | ${b.dateFields} → ${a.dateFields} | ${mobile ? `Knopf „${a.toggleText}“, zu → offen: ${open?.formVisible ? 'ja' : 'nein'}` : 'offen, kein Knopf'} | ${a.overflow.document}/${a.overflow.main} px | ${a.severe.length} |`,
      );
    }
  }
  const passed = SOLL - new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 086 – Screenshot-Matrix Filterleiste

Produktionsbuild gegen lokales Supabase (Testnutzer aus \`supabase/seed.sql\`). Vorher = \`main\`
vor Auftrag 086, Nachher = Branch \`claude/auftrag-086-ehrliche-filter\`. Bilder bleiben lokal
unter \`artifacts/auftrag-086/\`.

| Breite | Theme | SHA-256 Filterleiste vorher | SHA-256 Filterleiste nachher | Datumsfelder | Mobil | Überlauf Dok./main | axe |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

**Ergebnis:** ${passed}/${SOLL} Aufnahmen bestanden${problems.length ? ` – offen: ${problems.join('; ')}` : ''}.
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'README.md'), readme);
  console.log(readme);
  if (problems.length) process.exitCode = 1;
}

if (process.env.COMPARE) compare();
else await capture();
