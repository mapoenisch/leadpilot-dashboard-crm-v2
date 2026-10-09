#!/usr/bin/env node
/**
 * Auftrag 085 (Paket B, F08): Vorher-/Nachher-Nachweis der Funnel-Seite `/sales/funnel`.
 *
 * Sichtbar ist weiterhin das Original-Bild (`PAGE_PRESENTATION = 'bild'`); geändert sind die
 * Domänendaten und damit die Textschicht für Screenreader. Je 1440/768/375 × dunkel/hell:
 * Screenshot + SHA-256 (sichtbar unverändert erwartet), Überlauf an Dokument und <main>,
 * axe serious/critical über die ganze Seite und die Conversion-Texte der Textschicht.
 * Bilder und result.json bleiben lokal unter artifacts/auftrag-085/, committet wird nur die README.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag085FunnelText.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag085FunnelText.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-085');
const RAW = path.join(ROOT, 'artifacts/auftrag-085');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const THEMES = ['dark', 'light'];
const ROUTE = '/sales/funnel';
// Erwartete Textschicht nach Auftrag 085 (Entscheidung Marc 09.10.2026).
const SOLL = [
  '29,1 % der Leads',
  '37,2 % der MQL',
  '56,3 % der SQL',
  'Win Rate 43,5 %',
  '108 Angebote',
  '47 Neukunden',
];
const VERBOTEN = ['38 % der MQL', '56 % der SQL', 'Win Rate 43 %', '108 Leads', '47 Leads'];

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt.`);
  return value;
};

async function capture() {
  const label = env('LABEL');
  if (!['vorher', 'nachher'].includes(label)) throw new Error(`LABEL '${label}' ungültig.`);
  const credentials = { email: env('E2E_AUTH_EMAIL'), password: env('E2E_AUTH_PASSWORD') };
  const dir = path.join(RAW, label);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const state = await login(browser, env('BASE_URL'), credentials);
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
        await page.goto(ROUTE, { waitUntil: 'networkidle' });
        await page.getByTestId('sales-funnel-webp').waitFor({ timeout: 10000 });
        await page.evaluate(async () => {
          await document.fonts.ready;
          const img = document.querySelector('[data-testid="sales-funnel-webp"]');
          if (img && !img.complete)
            await new Promise((resolve) => img.addEventListener('load', resolve));
        });
        await page.waitForTimeout(400);
        const actualTheme = await page.evaluate(
          () => document.documentElement.getAttribute('data-theme') ?? 'dark',
        );
        if (actualTheme !== theme) throw new Error(`${name}: Theme ${actualTheme} statt ${theme}`);
        const file = path.join(dir, `${name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        const text = await page.getByTestId('image-page-text').textContent();
        const overflow = await page.evaluate(() => {
          const main = document.querySelector('main');
          return {
            document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            main: main ? main.scrollWidth - main.clientWidth : 0,
          };
        });
        const axe = await new AxeBuilder({ page }).analyze();
        const severe = axe.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => v.id);
        shots.push({
          name,
          sha256,
          overflow,
          severe,
          soll: SOLL.filter((s) => text?.includes(s)),
          verboten: VERBOTEN.filter((s) => text?.includes(s)),
        });
        console.log(
          `${name}: ${sha256.slice(0, 12)} · Soll ${shots.at(-1).soll.length}/${SOLL.length} · axe ${severe.length}`,
        );
      } finally {
        await context.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(dir, 'result.json'), `${JSON.stringify({ label, shots }, null, 2)}\n`);
}

function compare() {
  const read = (label) => JSON.parse(fs.readFileSync(path.join(RAW, label, 'result.json'), 'utf8'));
  const before = read('vorher');
  const after = read('nachher');
  const expected = VIEWPORTS.flatMap((v) => THEMES.map((t) => `funnel-${v.width}-${t}`));
  const rows = [];
  let passed = 0;
  for (const name of expected) {
    const prev = before.shots.find((s) => s.name === name);
    const shot = after.shots.find((s) => s.name === name);
    if (!prev || !shot) {
      rows.push(
        `| ${name} | ${prev ? '' : 'vorher fehlt'} ${shot ? '' : 'nachher fehlt'} | – | – | – | – | ❌ |`,
      );
      continue;
    }
    // Textschicht: vorher alte Werte, nachher vollständig Soll und nichts Verbotenes.
    const textOk =
      shot.soll.length === SOLL.length && shot.verboten.length === 0 && prev.verboten.length > 0;
    const ok =
      textOk &&
      shot.severe.length === 0 &&
      shot.overflow.document === 0 &&
      shot.overflow.main === 0;
    if (ok) passed += 1;
    rows.push(
      `| ${name} | ${prev.verboten.join(', ') || '–'} | ${shot.soll.length}/${SOLL.length}, verboten ${shot.verboten.length} | ${prev.sha256 === shot.sha256 ? 'gleich' : 'verschieden'} (${shot.sha256.slice(0, 12)}) | ${shot.overflow.document}/${shot.overflow.main} px | ${shot.severe.length} | ${ok ? '✅' : '❌'} |`,
    );
  }
  const md = `# Auftrag 085 – Funnel-Werte (F08), Vorher/Nachher

Erzeugt mit \`scripts/captureAuftrag085FunnelText.mjs\` gegen den Produktionsbuild (lokales Supabase,
\`admin-a@e2e.local\`). Vorher = \`main\` vor Auftrag 085, Nachher = Branch \`claude/auftrag-085-funnel-wahrheit\`.
Bilder bleiben lokal (\`.gitignore\`).

Sichtbar ist weiterhin das Original-Bild (\`PAGE_PRESENTATION = 'bild'\`); die sichtbare Seite ändert sich
erst mit Welle G1. Deshalb ist **gleicher** Screenshot-Hash hier das erwartete Ergebnis. Geprüft wird die
Textschicht für Screenreader: nachher alle Sollwerte (${SOLL.join(' · ')}), keiner der alten Werte.

| Aufnahme | Alte Werte vorher | Textschicht nachher | Screenshot | Überlauf Dokument/\`<main>\` | axe | OK |
|---|---|---|---|---|---|---|
${rows.join('\n')}

**Ergebnis:** ${passed}/${expected.length} Aufnahmen bestanden.
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'README.md'), md);
  console.log(md);
  if (passed !== expected.length) process.exit(1);
}

if (process.env.COMPARE === '1') compare();
else await capture();
