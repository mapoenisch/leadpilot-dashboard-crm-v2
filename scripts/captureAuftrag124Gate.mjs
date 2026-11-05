#!/usr/bin/env node
/**
 * Auftrag 124: Vorher/Nachher-Nachweis Beschriftung Simulationsleiste (/crm/live-simulation, Reiter
 * Management-Ebene) bei 1440/768/375 px, beide Themes.
 * Misst Überlauf (Dokument, <main>), Inhaltshöhe, SHA-256 des Bildes; schreibt die textuelle Matrix
 * docs/screenshots/auftrag-124/README.md. Bilder bleiben lokal.
 * Aufruf: VORHER_URL=… NACHHER_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag124Gate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-124');
const ROUTES = ['/crm/live-simulation'];
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];
const SIDES = { vorher: process.env.VORHER_URL, nachher: process.env.NACHHER_URL };

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];
for (const [side, base] of Object.entries(SIDES)) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
        locale: 'de-DE',
        timezoneId: 'Europe/Berlin',
      });
      await ctx.addInitScript((t) => localStorage.setItem('leadpilot-theme', t), theme);
      const page = await ctx.newPage();
      await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
      await page.fill('#login-email', process.env.E2E_AUTH_EMAIL);
      await page.fill('#login-password', process.env.E2E_AUTH_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      for (const route of ROUTES) {
        await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        await page
          .locator('main button[role="tab"]:has-text("Management-Ebene")')
          .waitFor({ timeout: 10000 });
        await page.waitForTimeout(800);
        const m = await page.evaluate(() => {
          const main = document.querySelector('main');
          return {
            overflowDocument: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            overflowMain: Math.max(0, main.scrollWidth - main.clientWidth),
            height: main.scrollHeight,
          };
        });
        const png = await page.screenshot({ fullPage: true });
        const name = `${side}${route.replaceAll('/', '-')}-${width}-${theme}.png`;
        fs.writeFileSync(path.join(OUT, name), png);
        rows.push({
          side,
          route,
          width,
          theme,
          ...m,
          sha: crypto.createHash('sha256').update(png).digest('hex').slice(0, 12),
        });
      }
      await ctx.close();
    }
  }
}
await browser.close();

const find = (side, r, w, t) =>
  rows.find((x) => x.side === side && x.route === r && x.width === w && x.theme === t);
const lines = [];
let bad = 0;
for (const route of ROUTES)
  for (const theme of THEMES)
    for (const width of WIDTHS) {
      const v = find('vorher', route, width, theme);
      const n = find('nachher', route, width, theme);
      if (n.overflowDocument || n.overflowMain) bad += 1;
      lines.push(
        `| \`${route}\` | ${width} | ${theme} | ${v.overflowDocument}/${v.overflowMain} | ${n.overflowDocument}/${n.overflowMain} | ${v.height} → ${n.height} | ${v.sha === n.sha ? 'gleich' : 'verschieden'} (${v.sha} / ${n.sha}) |`,
      );
    }
const readme = `# Auftrag 124 – Vorher/Nachher Beschriftung Simulationsleiste

Vorher: \`1c890bb\` (main), Nachher: Stand dieses Branches. Aufgenommen ${new Date().toISOString().slice(0, 10)}, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Überlauf = Dokument/\`<main>\` in px; Hash = SHA-256 (12 Zeichen) des Ganzseitenbilds.

| Seite | Breite | Theme | Überlauf vorher | Überlauf nachher | Inhaltshöhe | Bild |
|---|---|---|---|---|---|---|
${lines.join('\n')}

Ergebnis: ${bad === 0 ? '0 px Überlauf in allen Nachher-Aufnahmen.' : `${bad} Nachher-Aufnahmen mit Überlauf.`}
`;
fs.writeFileSync(path.join(OUT, 'README.md'), readme);
console.log(readme);
process.exit(bad === 0 ? 0 : 1);
