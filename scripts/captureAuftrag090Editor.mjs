#!/usr/bin/env node
/**
 * Auftrag 090 (Paket F, Teil 1): Vorher-/Nachher-Nachweis für Kachelaktionen und Bearbeitungsleiste.
 *
 * Je Breite (1440/768/375/320) × dunkel/hell: /dashboard im Bearbeitungsmodus, Aktionen der ersten
 * Kachel geöffnet (nachher über „Kachel-Aktionen“). Aufnahme des ersten Bildschirms, SHA-256,
 * kleinste Höhe der Bearbeitungsknöpfe (Leiste und Aktionen, ohne „Details“ der Kachel), Überlauf Dokument/<main>, axe serious/critical. Danach wird
 * <main> ans Ende gescrollt und geprüft, ob „Speichern“ sichtbar im Fenster bleibt (haftende Leiste).
 * Bilder und result.json bleiben lokal unter artifacts/auftrag-090/.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag090Editor.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag090Editor.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-090');
const RAW = path.join(ROOT, 'artifacts/auftrag-090');
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
      const name = `editor-${viewport.width}-${theme}`;
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
        await page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
        const toggle = page.getByRole('button', { name: /Kachel-Aktionen/ }).first();
        if (await toggle.count()) await toggle.click();
        await page
          .getByRole('button', { name: /: Nach unten, / })
          .first()
          .waitFor();
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
          const item = document.querySelector('[data-tile-id]');
          const heights = Array.from(
            item?.querySelectorAll(
              '[data-testid="tile-edit-bar"] button, [data-testid="tile-actions"] button, button[data-action="hoch"], button[data-action="runter"], button[data-action="bearbeiten"], button[data-action="entfernen"]',
            ) ?? [],
          ).map((button) => Math.round(button.getBoundingClientRect().height));
          return {
            minActionHeight: heights.length ? Math.min(...heights) : null,
            overflow: {
              document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              main: main ? main.scrollWidth - main.clientWidth : 0,
            },
          };
        });
        const severe = (await new AxeBuilder({ page }).analyze()).violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}(${v.nodes.length})`);
        // Haftende Leiste: nach dem Scrollen ans Ende muss „Speichern“ im Fenster liegen.
        await page.evaluate(() => {
          const main = document.querySelector('main');
          if (main) main.scrollTop = main.scrollHeight;
        });
        await page.waitForTimeout(200);
        const save = await page
          .getByRole('button', { name: 'Speichern', exact: true })
          .boundingBox();
        const saveVisibleAfterScroll =
          !!save && save.y >= 0 && save.y + save.height <= viewport.height;
        const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        shots.push({ name, sha256, ...metrics, saveVisibleAfterScroll, severe });
        console.log(
          `${name}: Aktionen min ${metrics.minActionHeight} px · Speichern nach Scrollen ${saveVisibleAfterScroll ? 'sichtbar' : 'weg'} · Überlauf ${metrics.overflow.document}/${metrics.overflow.main} · axe ${severe.join(',') || 0}`,
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
      const name = `editor-${viewport.width}-${theme}`;
      const b = before.get(name);
      const a = after.get(name);
      if (!b || !a) {
        problems.push(`${name}: Aufnahme fehlt`);
        continue;
      }
      const checks = {
        hash: a.sha256 !== b.sha256,
        touch: a.minActionHeight !== null && a.minActionHeight >= 44,
        sticky: a.saveVisibleAfterScroll,
        overflow: a.overflow.document <= 0 && a.overflow.main <= 0,
        axe: a.severe.length === 0,
      };
      for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
      rows.push(
        `| ${viewport.width} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${b.minActionHeight} → ${a.minActionHeight} px | ${b.saveVisibleAfterScroll ? 'ja' : 'nein'} → ${a.saveVisibleAfterScroll ? 'ja' : 'nein'} | ${a.overflow.document}/${a.overflow.main} px | ${a.severe.join(', ') || 0} |`,
      );
    }
  }
  const total = VIEWPORTS.length * THEMES.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 090 – Screenshot-Matrix Kachelaktionen und Bearbeitungsleiste

Produktionsbuild gegen lokales Supabase (Testnutzer aus \`supabase/seed.sql\`), \`/dashboard\` im
Bearbeitungsmodus mit geöffneten Aktionen der ersten Kachel. Vorher = \`main\` nach Auftrag 089,
Nachher = Branch \`claude/auftrag-090-editor-vereinfachen\`. Bilder bleiben lokal unter \`artifacts/auftrag-090/\`.

| Breite | Theme | SHA-256 vorher | SHA-256 nachher | kleinste Aktionshöhe | „Speichern“ nach Scrollen sichtbar | Überlauf Dok./main | axe |
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
