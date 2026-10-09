#!/usr/bin/env node
/**
 * Auftrag 087 (Paket D): reproduzierbarer Nachweis der Designmuster (Codex PR #73).
 *
 * Öffnet `dashboard-vorschau.html?bereich=muster` je Breite und Theme, nimmt eine Ganzseite auf
 * und misst horizontalen Überlauf sowie axe serious/critical. 250 px entspricht 150 %, 188 px
 * 200 % Zoom auf einem 375-px-Gerät. Neue Seite, daher kein Vorher-Bild. Bilder bleiben lokal unter
 * artifacts/auftrag-087/, committet wird nur die README. Die gestalterische Freigabe erteilt Marc,
 * nicht dieses Skript.
 *
 * Aufruf (Vite-Dev-Server läuft): BASE_URL=http://localhost:4310 node scripts/captureAuftrag087Patterns.mjs
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
const WIDTHS = [1440, 768, 375, 320, 250, 188];
const THEMES = ['dark', 'light'];
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4310';

fs.mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
const rows = [];
const problems = [];
for (const width of WIDTHS) {
  for (const theme of THEMES) {
    const name = `muster-${width}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    try {
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/dashboard-vorschau.html?bereich=muster`, {
        waitUntil: 'networkidle',
      });
      await page.getByTestId('muster-editor').waitFor({ timeout: 15000 });
      if (theme === 'light') await page.getByRole('button', { name: 'Hell' }).click();
      // Hover-Zustand des Umschalters nicht mitmessen.
      await page.mouse.move(0, 0);
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      const severe = (await new AxeBuilder({ page }).analyze()).violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}(${v.nodes.length})`);
      const file = path.join(RAW, `${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      if (overflow > 0) problems.push(`${name}: Überlauf ${overflow} px`);
      if (severe.length) problems.push(`${name}: axe ${severe.join(', ')}`);
      rows.push(
        `| ${width} | ${theme} | \`${sha.slice(0, 12)}\` | ${overflow} px | ${severe.join(', ') || 0} |`,
      );
      console.log(`${name}: Überlauf ${overflow} · axe ${severe.join(',') || 0}`);
    } finally {
      await context.close();
    }
  }
}
await browser.close();

const total = WIDTHS.length * THEMES.length;
const failed = new Set(problems.map((p) => p.split(':')[0])).size;
const readme = `# Auftrag 087 – Screenshot-Matrix Designmuster

Erzeugt mit \`scripts/captureAuftrag087Patterns.mjs\` gegen \`dashboard-vorschau.html?bereich=muster\`
(Vite-Dev-Server), Branch \`claude/auftrag-087-designmuster\`. Neue Vorschauseite, daher kein
Vorher-Bild. 250 px = 150 %, 188 px = 200 % Zoom auf einem 375-px-Gerät. Bilder bleiben lokal unter
\`artifacts/auftrag-087/\`. Sichtabnahme durch Marc am 09.10.2026.

| Breite | Theme | SHA-256 | Überlauf | axe serious/critical |
| ------ | ----- | ------- | -------- | -------------------- |
${rows.join('\n')}

**Ergebnis:** ${total - failed}/${total} ohne Überlauf und ohne axe-Verstöße${problems.length ? ` – offen: ${problems.join('; ')}` : ''}. Gestalterische Freigabe durch Marc, nicht durch die Messung.
`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'README.md'), readme);
if (problems.length) process.exitCode = 1;
