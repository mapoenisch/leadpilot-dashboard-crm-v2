#!/usr/bin/env node
/**
 * Auftrag 087 (Paket D): reproduzierbarer Nachweis der Designmuster (Codex PR #73).
 *
 * Öffnet `dashboard-vorschau.html?bereich=muster` je Fall und Theme, nimmt eine Ganzseite auf und
 * misst horizontalen Überlauf, axe serious/critical und die tatsächliche Schriftgröße eines
 * Mustertitels. Vergrößerung (Codex PR #73, Runde 2): 375 px mit Browser-Zoom 150 % und 200 %
 * (CSS `zoom` am Wurzelelement – Schrift wird wirklich größer, gemessen am Titel 15 → 22,5 / 30 px).
 * Vorher: dieselbe URL gegen den Elternstand (zeigt dort die bisherige Vorschauseite); Hashes müssen
 * sich unterscheiden. Bilder bleiben lokal unter artifacts/auftrag-087/, committet wird nur die README.
 * Die gestalterische Freigabe erteilt Marc, nicht dieses Skript.
 *
 * Aufruf: BASE_URL=<Nachher-Server> BASE_URL_VORHER=<Elternstand-Server> node scripts/captureAuftrag087Patterns.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-087');
const RAW = path.join(ROOT, 'artifacts/auftrag-087');
const CASES = [
  { width: 1440, zoom: 1 },
  { width: 768, zoom: 1 },
  { width: 375, zoom: 1 },
  { width: 320, zoom: 1 },
  { width: 375, zoom: 1.5 },
  { width: 375, zoom: 2 },
];
const THEMES = ['dark', 'light'];
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4310';
const BASE_URL_VORHER = process.env.BASE_URL_VORHER;
if (!BASE_URL_VORHER) throw new Error('BASE_URL_VORHER (Elternstand) fehlt.');
const URL_PATH = '/dashboard-vorschau.html?bereich=muster';
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

fs.mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
const rows = [];
const problems = [];
for (const { width, zoom } of CASES) {
  for (const theme of THEMES) {
    const name = `muster-${width}-z${zoom * 100}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    try {
      // Vorher: dieselbe URL gegen den Elternstand.
      const before = await context.newPage();
      await before.goto(`${BASE_URL_VORHER}${URL_PATH}`, { waitUntil: 'networkidle' });
      const beforeFile = path.join(RAW, `${name}-vorher.png`);
      await before.screenshot({ path: beforeFile, fullPage: true });
      const beforeSha = sha(beforeFile);
      await before.close();

      const page = await context.newPage();
      await page.goto(`${BASE_URL}${URL_PATH}`, { waitUntil: 'networkidle' });
      await page.getByTestId('muster-editor').waitFor({ timeout: 15000 });
      if (zoom !== 1) {
        await page.evaluate((z) => {
          document.documentElement.style.zoom = String(z);
        }, zoom);
      }
      if (theme === 'light') await page.getByRole('button', { name: 'Hell' }).click();
      // Hover-Zustand des Umschalters nicht mitmessen.
      await page.mouse.move(0, 0);
      await page.waitForTimeout(400);
      const { overflow, titlePx } = await page.evaluate(() => {
        const title = document.querySelector('#zahl-normal-titel');
        const z = Number(document.documentElement.style.zoom || 1);
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          // Wirksame Schriftgröße inkl. Zoom.
          titlePx: title ? Number.parseFloat(getComputedStyle(title).fontSize) * z : null,
        };
      });
      const severe = (await new AxeBuilder({ page }).analyze()).violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}(${v.nodes.length})`);
      const file = path.join(RAW, `${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const afterSha = sha(file);
      if (afterSha === beforeSha) problems.push(`${name}: Hash gleich Vorher`);
      if (zoom !== 1 && !(titlePx >= 15 * zoom - 0.5))
        problems.push(`${name}: Schrift nicht vergrößert`);
      if (overflow > 0) problems.push(`${name}: Überlauf ${overflow} px`);
      if (severe.length) problems.push(`${name}: axe ${severe.join(', ')}`);
      rows.push(
        `| ${width} | ${zoom * 100} % | ${theme} | \`${beforeSha.slice(0, 12)}\` | \`${afterSha.slice(0, 12)}\` | ${titlePx} px | ${overflow} px | ${severe.join(', ') || 0} |`,
      );
      console.log(`${name}: Überlauf ${overflow} · axe ${severe.join(',') || 0}`);
    } finally {
      await context.close();
    }
  }
}
await browser.close();

const total = CASES.length * THEMES.length;
const failed = new Set(problems.map((p) => p.split(':')[0])).size;
const readme = `# Auftrag 087 – Screenshot-Matrix Designmuster

Erzeugt mit \`scripts/captureAuftrag087Patterns.mjs\` gegen \`dashboard-vorschau.html?bereich=muster\`.
Vorher = dieselbe URL im Elternstand \`e007ff0\` (bisherige Vorschauseite), Nachher = Branch
\`claude/auftrag-087-designmuster\`. Vergrößerung über Browser-Zoom (CSS \`zoom\`): Schrift des
Mustertitels gemessen. Bilder bleiben lokal unter \`artifacts/auftrag-087/\`. Sichtabnahme durch Marc am 09.10.2026.

| Breite | Zoom | Theme | SHA-256 vorher | SHA-256 nachher | Titel wirksam | Überlauf | axe |
| ------ | ---- | ----- | -------------- | --------------- | ------------- | -------- | --- |
${rows.join('\n')}

**Ergebnis:** ${total - failed}/${total} ohne Überlauf und ohne axe-Verstöße${problems.length ? ` – offen: ${problems.join('; ')}` : ''}. Gestalterische Freigabe durch Marc, nicht durch die Messung.
`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'README.md'), readme);
if (problems.length) process.exitCode = 1;
