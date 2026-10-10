#!/usr/bin/env node
/**
 * Auftrag 089 (Paket E, Teil 2): Vorher-/Nachher-Nachweis für kompakten Seitenkopf und mobile
 * Simulationsleiste.
 *
 * Je Breite (1440/768/375/320) × dunkel/hell: Aufnahme des ersten Bildschirms von /dashboard,
 * SHA-256, Unterkante der ersten Zahl (`tile-number`) relativ zur Fensterhöhe (Plan: bei 375 × 812
 * ein vollständiger Wert ohne Scrollen), Höhe der Simulationsleiste, Überlauf Dokument/<main>,
 * axe serious/critical. Zusätzlich (Codex PR #75) bei 375 × 812 kontrollierter Lade- und Fehlerzustand
 * (Abfrage der Dashboard-Einstellungen hängt bzw. antwortet 500): Begrenzungsrahmen der Statusmeldung
 * muss vollständig im Fenster liegen. Bilder und result.json bleiben lokal unter artifacts/auftrag-089/.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag089Shell.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag089Shell.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-089');
const RAW = path.join(ROOT, 'artifacts/auftrag-089');
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
          const number = document.querySelector('[data-testid="tile-number"]');
          const strip = document.querySelector('[aria-label="Simulation Command Strip"]');
          return {
            firstNumberBottom: number ? Math.round(number.getBoundingClientRect().bottom) : null,
            viewportHeight: window.innerHeight,
            stripHeight: strip ? Math.round(strip.getBoundingClientRect().height) : null,
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
          `${name}: erste Zahl unten ${metrics.firstNumberBottom}/${metrics.viewportHeight} · Leiste ${metrics.stripHeight} px · Überlauf ${metrics.overflow.document}/${metrics.overflow.main} · axe ${severe.join(',') || 0}`,
        );
      } finally {
        await context.close();
      }
    }
  }
  const states = label === 'nachher' ? await captureStates(browser, state, dir) : [];
  await browser.close();
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(shots, null, 2));
  fs.writeFileSync(path.join(dir, 'states.json'), JSON.stringify(states, null, 2));
}

// Lade- und Fehlerzustand bei 375 × 812 (Plan §10): Meldung sofort im ersten Bildschirm sichtbar.
const STATES = [
  { kind: 'laden', target: (page) => page.getByText('Dein Dashboard wird geladen …') },
  { kind: 'fehler', target: (page) => page.getByTestId('dashboard-error') },
];
async function captureStates(browser, storageState, dir) {
  const results = [];
  for (const theme of THEMES) {
    for (const { kind, target } of STATES) {
      const name = `zustand-${kind}-375-${theme}`;
      const context = await browser.newContext({
        baseURL: env('BASE_URL'),
        storageState,
        viewport: { width: 375, height: 812 },
      });
      try {
        await context.addInitScript(
          (mode) => window.localStorage.setItem('leadpilot-theme', mode),
          theme,
        );
        await context.route('**/rest/v1/executive_dashboard_preferences**', async (route) => {
          if (kind === 'laden') return; // Antwort bleibt aus: Ladezustand hält an.
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"message":"kontrollierter Fehler"}',
          });
        });
        const page = await context.newPage();
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        const element = target(page);
        await element.waitFor({ timeout: 15000 });
        await page.mouse.move(0, 0);
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(dir, `${name}.png`), animations: 'disabled' });
        const box = await element.boundingBox();
        const visible = !!box && box.y >= 0 && box.y + box.height <= 812;
        results.push({
          name,
          top: box && Math.round(box.y),
          bottom: box && Math.round(box.y + box.height),
          visible,
        });
        console.log(
          `${name}: Meldung ${box && Math.round(box.y)}–${box && Math.round(box.y + box.height)} / 812 px ${visible ? '✓' : '✗'}`,
        );
      } finally {
        await context.close();
      }
    }
  }
  return results;
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
      const visible = a.firstNumberBottom !== null && a.firstNumberBottom <= a.viewportHeight;
      const checks = {
        hash: a.sha256 !== b.sha256,
        // Plan §10: Pflicht bei 375 × 812; die übrigen Breiten werden berichtet.
        firstValue: viewport.width !== 375 || visible,
        overflow: a.overflow.document <= 0 && a.overflow.main <= 0,
        axe: a.severe.length === 0,
      };
      for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
      rows.push(
        `| ${viewport.width} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${b.firstNumberBottom} → ${a.firstNumberBottom} / ${a.viewportHeight} px${visible ? ' ✓' : ''} | ${b.stripHeight} → ${a.stripHeight} px | ${a.overflow.document}/${a.overflow.main} px | ${a.severe.join(', ') || 0} |`,
      );
    }
  }
  const states = JSON.parse(fs.readFileSync(path.join(RAW, 'nachher', 'states.json'), 'utf8'));
  if (states.length !== THEMES.length * STATES.length) problems.push('zustand: Aufnahme fehlt');
  for (const st of states) if (!st.visible) problems.push(`${st.name}: nicht im ersten Bildschirm`);
  const stateRows = states.map(
    (st) => `| ${st.name} | ${st.top}–${st.bottom} / 812 px | ${st.visible ? '✓' : '✗'} |`,
  );
  const total = VIEWPORTS.length * THEMES.length + states.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 089 – Screenshot-Matrix Seitenkopf und mobile Hülle

Produktionsbuild gegen lokales Supabase (Testnutzer aus \`supabase/seed.sql\`), erster Bildschirm von
\`/dashboard\`. Vorher = Stand Auftrag 088, Nachher = Branch \`claude/auftrag-089-dashboard-kopf-mobil\`.
Bilder bleiben lokal unter \`artifacts/auftrag-089/\`. ✓ = erste Zahl vollständig ohne Scrollen sichtbar.

| Breite | Theme | SHA-256 vorher | SHA-256 nachher | Unterkante erste Zahl | Simulationsleiste | Überlauf Dok./main | axe |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

Lade- und Fehlerzustand bei 375 × 812 (Abfrage der Dashboard-Einstellungen hängt bzw. antwortet 500):

| Zustand | Meldung oben–unten | Sofort sichtbar |
|---|---|---|
${stateRows.join('\n')}

**Ergebnis:** ${total - failed}/${total} Aufnahmen bestanden${problems.length ? ` – offen: ${problems.join('; ')}` : ''}.
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'README.md'), readme);
  console.log(readme);
  if (problems.length) process.exitCode = 1;
}

if (process.env.COMPARE) compare();
else await capture();
