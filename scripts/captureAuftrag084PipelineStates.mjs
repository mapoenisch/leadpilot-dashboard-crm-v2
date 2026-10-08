#!/usr/bin/env node
/**
 * Auftrag 084 (Paket A, F12): Vorher-/Nachher-Nachweis der CRM-Listen im Fehlerzustand.
 *
 * crm-query-export antwortet kontrolliert mit 500 (OPTIONS-Preflights passieren mit CORS-Headern).
 * Je Seite (Deals, Unternehmen, Leads) × 1440/768/375 × dunkel/hell: Screenshot, SHA-256,
 * Anzahl-Badge, Exportsperre, „Erneut versuchen“, axe serious/critical über die ganze Seite,
 * horizontaler Überlauf an Dokument und <main>. Zusätzlich je Breite der Navigationsfall
 * Pipeline → Unternehmenssteckbrief (Kopfzeilen-Überschrift nach dem Wechsel).
 * Bilder bleiben lokal (.gitignore), committet wird nur docs/screenshots/auftrag-084/README.md.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag084PipelineStates.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag084PipelineStates.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-084');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const THEMES = ['dark', 'light'];
const PAGES = [
  { id: 'deals', route: '/crm/deals', title: 'Deal Pipeline', badge: /Funnel Deals$/ },
  { id: 'companies', route: '/crm/companies', title: 'Unternehmen', badge: /B2B Accounts$/ },
  { id: 'leads', route: '/crm/leads', title: 'Leads & Kontakte', badge: /Einträge$/ },
];

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt.`);
  return value;
};

async function failCrm(context) {
  const cors = { 'Access-Control-Allow-Origin': '*' };
  let posts = 0;
  await context.route('**/functions/v1/crm-query-export**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
        },
      });
      return;
    }
    posts += 1;
    await route.fulfill({
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SERVER_ERROR' }),
    });
  });
  return () => posts;
}

async function openPage(browser, state, viewport, theme, route) {
  const context = await browser.newContext({
    baseURL: env('BASE_URL'),
    storageState: state,
    viewport,
  });
  await context.addInitScript(
    (mode) => window.localStorage.setItem('leadpilot-theme', mode),
    theme,
  );
  const posts = await failCrm(context);
  const page = await context.newPage();
  await page.goto(route, { waitUntil: 'networkidle' });
  await page
    .getByText(/Integritätsfehler|Fehler:/)
    .first()
    .waitFor({ timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return { context, page, posts };
}

async function capture() {
  const label = env('LABEL');
  if (!['vorher', 'nachher'].includes(label)) throw new Error(`LABEL '${label}' ungültig.`);
  const credentials = { email: env('E2E_AUTH_EMAIL'), password: env('E2E_AUTH_PASSWORD') };
  const dir = path.join(OUT, label);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const state = await login(browser, env('BASE_URL'), credentials);
  const shots = [];
  const navigation = [];
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const view of PAGES) {
        const name = `${view.id}-${viewport.width}-${theme}`;
        const { context, page, posts } = await openPage(
          browser,
          state,
          viewport,
          theme,
          view.route,
        );
        try {
          const actualTheme = await page.evaluate(
            () => document.documentElement.getAttribute('data-theme') ?? 'dark',
          );
          if (actualTheme !== theme)
            throw new Error(`${name}: Theme ${actualTheme} statt ${theme}.`);
          if (posts() < 1) throw new Error(`${name}: kein POST abgefangen.`);
          const main = page.locator('main');
          const badge = (await main.getByText(view.badge).first().textContent())?.trim() ?? null;
          const exportBtn = page.getByRole('button', { name: 'CSV Export' });
          const exportDisabled = await exportBtn.isDisabled();
          const retryVisible = await main
            .getByRole('button', { name: 'Erneut versuchen' })
            .isVisible();
          const axe = await new AxeBuilder({ page }).analyze();
          const severe = axe.violations
            .filter((v) => v.impact === 'serious' || v.impact === 'critical')
            .map((v) => v.id);
          const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            const m = document.querySelector('main');
            return {
              document: Math.max(0, doc.scrollWidth - doc.clientWidth),
              main: m ? Math.max(0, m.scrollWidth - m.clientWidth) : 0,
            };
          });
          const file = path.join(dir, `${name}.png`);
          await page.screenshot({ path: file });
          const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
          shots.push({ name, badge, exportDisabled, retryVisible, severe, overflow, sha256 });
          console.log(
            `${name}: ${badge} · Export ${exportDisabled ? 'gesperrt' : 'aktiv'} · axe ${severe.length}`,
          );
        } finally {
          await context.close();
        }
      }
    }
    // Navigationsfall im Fehlerzustand: Pipeline → Unternehmenssteckbrief.
    const { context, page } = await openPage(browser, state, viewport, 'dark', '/crm/deals');
    try {
      const link = page.getByRole('link', { name: /unternehmenssteckbrief/i }).first();
      if (!(await link.isVisible())) {
        await page.getByRole('button', { name: 'Hauptmenü umschalten' }).click();
      }
      await link.click();
      await page.waitForURL('**/company/profile', { timeout: 5000 });
      await page.waitForTimeout(3000);
      const headerH1 = (await page.locator('header h1').first().textContent())?.trim() ?? null;
      navigation.push({ width: viewport.width, path: '/company/profile', headerH1 });
      console.log(`Navigation ${viewport.width}: Kopfzeile „${headerH1}“`);
    } finally {
      await context.close();
    }
  }
  await browser.close();
  fs.writeFileSync(
    path.join(dir, 'result.json'),
    `${JSON.stringify({ label, shots, navigation }, null, 2)}\n`,
  );
}

function compare() {
  const read = (label) => JSON.parse(fs.readFileSync(path.join(OUT, label, 'result.json'), 'utf8'));
  const before = read('vorher');
  const after = read('nachher');
  const byName = new Map(before.shots.map((s) => [s.name, s]));
  const rows = [];
  let failures = 0;
  for (const shot of after.shots) {
    const prev = byName.get(shot.name);
    const changed = prev && prev.sha256 !== shot.sha256;
    const ok =
      changed &&
      !/^0 /.test(shot.badge ?? '') &&
      shot.exportDisabled &&
      shot.retryVisible &&
      shot.severe.length === 0 &&
      shot.overflow.document === 0 &&
      shot.overflow.main <= (prev?.overflow.main ?? 0);
    if (!ok) failures += 1;
    rows.push(
      `| ${shot.name} | ${prev?.badge ?? '–'} | ${shot.badge} | ${prev?.exportDisabled ? 'gesperrt' : 'aktiv'} → ${shot.exportDisabled ? 'gesperrt' : 'aktiv'} | ${shot.retryVisible ? 'ja' : 'nein'} | ${shot.severe.length ? shot.severe.join(', ') : '0'} | ${shot.overflow.document}/${shot.overflow.main} px | ${prev?.sha256.slice(0, 12) ?? '–'} | ${shot.sha256.slice(0, 12)} | ${ok ? '✅' : '❌'} |`,
    );
  }
  const navRows = after.navigation.map((n) => {
    const prev = before.navigation.find((p) => p.width === n.width);
    const ok = n.headerH1 === 'Unternehmenssteckbrief';
    if (!ok) failures += 1;
    return `| ${n.width} | ${prev?.headerH1 ?? '–'} | ${n.headerH1} | ${ok ? '✅' : '❌'} |`;
  });
  const md = `# Auftrag 084 – Pipeline-Fehlerzustand (F12), Vorher/Nachher

Erzeugt mit \`scripts/captureAuftrag084PipelineStates.mjs\`. \`crm-query-export\` antwortet kontrolliert
mit 500 (\`SERVER_ERROR\`), Preflights passieren. Vorher = \`main\` vor Auftrag 084, Nachher = Branch
\`claude/auftrag-084-pipeline-fehler\`. Produktionsbuild gegen lokales Supabase, \`admin-a@e2e.local\`.
Bilder bleiben lokal (\`.gitignore\`). axe: serious/critical über die **ganze Seite**. Überlauf: Dokument/\`<main>\`.

## Fehlerzustand je Seite, Breite und Theme

| Aufnahme | Anzahl vorher | Anzahl nachher | Export | Erneut versuchen | axe | Überlauf | SHA vorher | SHA nachher | OK |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Navigation im Fehlerzustand: Pipeline → Unternehmenssteckbrief

Kopfzeilen-Überschrift 3 s nach dem Wechsel (Adresse wechselt in beiden Ständen auf \`/company/profile\`).

| Breite | Vorher | Nachher | OK |
|---|---|---|---|
${navRows.join('\n')}

**Ergebnis:** ${failures === 0 ? `${after.shots.length}/${after.shots.length} Aufnahmen und ${navRows.length}/${navRows.length} Navigationsfälle bestanden.` : `${failures} Prüfungen fehlgeschlagen.`}
`;
  fs.writeFileSync(path.join(OUT, 'README.md'), md);
  console.log(md);
  if (failures > 0) process.exit(1);
}

if (process.env.COMPARE === '1') compare();
else await capture();
