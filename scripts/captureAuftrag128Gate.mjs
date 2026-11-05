#!/usr/bin/env node
/**
 * Auftrag 128: Vorher/Nachher-Nachweis Dashboard-Editor & Vorschauseite
 * (/dashboard-vorschau.html, Editor-Bearbeitungsmodus, Konfigurator-Drawer 420px)
 * bei 1440/768/375 px, beide Themes (dark/light mit data-theme).
 * Misst Überlauf (Dokument, #root/main), Inhaltshöhe, SHA-256 des Bildes; schreibt die textuelle Matrix
 * docs/screenshots/auftrag-128/README.md. Bilder bleiben lokal (.gitignore).
 * Aufruf: VORHER_URL=… NACHHER_URL=… node scripts/captureAuftrag128Gate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-128');
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];
const SIDES = {
  vorher: process.env.VORHER_URL ?? 'http://localhost:3001',
  nachher: process.env.NACHHER_URL ?? 'http://localhost:3000',
};

const SCENARIOS = [
  {
    id: 'vorschau-seite',
    title: '/dashboard-vorschau.html (Vorschauseite & Schnellnavigation)',
    url: '/dashboard-vorschau.html',
    prepare: async () => {},
  },
  {
    id: 'editor-bearbeiten',
    title: '/dashboard-vorschau.html?bereich=editor (Bearbeitungsmodus & Spaltenwahl)',
    url: '/dashboard-vorschau.html?bereich=editor',
    prepare: async (page) => {
      const editBtn = page.getByRole('button', { name: /Dashboard bearbeiten/i });
      if (await editBtn.count()) {
        await editBtn.first().click();
        await page.waitForTimeout(400);
      }
    },
  },
  {
    id: 'editor-drawer',
    title: '/dashboard-vorschau.html?bereich=editor (Konfigurator-Drawer 420px)',
    url: '/dashboard-vorschau.html?bereich=editor',
    prepare: async (page) => {
      const editBtn = page.getByRole('button', { name: /Dashboard bearbeiten/i });
      if (await editBtn.count()) {
        await editBtn.first().click();
        await page.waitForTimeout(300);
      }
      const actionsBtn = page.getByRole('button', { name: /Kachel-Aktionen/i }).first();
      await actionsBtn.waitFor({ state: 'visible', timeout: 5000 });
      await actionsBtn.click();
      await page.waitForTimeout(300);

      const configureBtn = page
        .locator('[data-action="bearbeiten"]')
        .or(page.getByRole('button', { name: /Bearbeiten/i }))
        .first();
      await configureBtn.waitFor({ state: 'visible', timeout: 5000 });
      await configureBtn.click();
      await page.waitForTimeout(400);

      // Verbindlich prüfen, dass der Konfigurator-Drawer sichtbar geöffnet ist
      await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(200);
    },
  },
];

fs.mkdirSync(OUT, { recursive: true });

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch {
    const fallback =
      '/Users/marcpoenisch/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
    if (fs.existsSync(fallback)) {
      return await chromium.launch({ executablePath: fallback });
    }
    throw new Error('Chromium executable not found');
  }
}

const browser = await launchBrowser();
const rows = [];

for (const [side, base] of Object.entries(SIDES)) {
  for (const scenario of SCENARIOS) {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const ctx = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: 'reduce',
          locale: 'de-DE',
          timezoneId: 'Europe/Berlin',
        });
        await ctx.addInitScript((t) => {
          localStorage.setItem('leadpilot-theme', t);
          document.documentElement.dataset.theme = t;
          document.documentElement.setAttribute('data-theme', t);
          if (t === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }, theme);

        const page = await ctx.newPage();
        await page.goto(`${base}${scenario.url}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        try {
          await scenario.prepare(page);
        } catch (err) {
          console.warn(`[${side}] prepare failed for ${scenario.id}:`, err.message);
        }

        const m = await page.evaluate(() => {
          const main = document.querySelector('main') || document.querySelector('#root') || document.body;
          return {
            overflowDocument: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            overflowMain: Math.max(0, main.scrollWidth - main.clientWidth),
            height: main.scrollHeight,
          };
        });

        const png = await page.screenshot({ fullPage: true });
        const name = `${side}-${scenario.id}-${width}-${theme}.png`;
        fs.writeFileSync(path.join(OUT, name), png);

        rows.push({
          side,
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          width,
          theme,
          ...m,
          sha: crypto.createHash('sha256').update(png).digest('hex').slice(0, 12),
        });

        await ctx.close();
      }
    }
  }
}
await browser.close();

const find = (side, sId, w, t) =>
  rows.find((x) => x.side === side && x.scenarioId === sId && x.width === w && x.theme === t);

const lines = [];
let bad = 0;
let differentCount = 0;

for (const scenario of SCENARIOS) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const v = find('vorher', scenario.id, width, theme);
      const n = find('nachher', scenario.id, width, theme);
      if (n.overflowDocument || n.overflowMain) bad += 1;
      const isDiff = v.sha !== n.sha;
      if (isDiff) differentCount += 1;
      const changed = isDiff ? 'verschieden' : 'gleich';
      lines.push(
        `| \`${scenario.title}\` | ${width} | ${theme} | ${v.overflowDocument}/${v.overflowMain} | ${n.overflowDocument}/${n.overflowMain} | ${v.height} → ${n.height} | ${changed} (${v.sha} / ${n.sha}) |`,
      );
    }
  }
}

const readme = `# Auftrag 128 – Vorher/Nachher Dashboard-Editor & Vorschauseite

Vorher: \`413e55f\` (main), Nachher: Stand dieses Branches. Aufgenommen ${new Date().toISOString().slice(0, 10)}, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Überlauf = Dokument/<main> in px; Hash = SHA-256 (12 Zeichen) des Ganzseitenbilds.

| Szenario | Breite | Theme | Überlauf vorher | Überlauf nachher | Inhaltshöhe | Bild |
|---|---|---|---|---|---|---|
${lines.join('\n')}

Ergebnis: ${bad === 0 ? '0 px Überlauf in allen Nachher-Aufnahmen.' : `${bad} Nachher-Aufnahmen mit Überlauf.`}
Verschiedene Aufnahmen: ${differentCount} von ${lines.length} Paaren (${Math.round((differentCount / lines.length) * 100)} %).
Änderungen gegenüber Baseline 413e55f:
- Direkte 1-Klick-Spaltenbuttons (\`3 Sp.\`, \`6 Sp.\`, \`9 Sp.\`, \`12 Sp.\`) an jeder Kachel im Bearbeitungsmodus
- Inhaltsabhängige Mindestgrößensperre (\`minSizeFor\`) für Diagrammkacheln
- Verschlankter Konfigurator-Drawer (420 px statt 640 px) mit dezenterem Backdrop und sichtbarem Dashboard
- Kontrast-Tokens für Vorlagenmenü und Drag-Ghost (\`text-[var(--color-text-inverse)]\`)
- Echtes Light-Theme via \`[data-theme='light']\` für valide Kontrastprüfung
- Schnelle Navigationsleiste auf der Vorschauseite
`;

fs.writeFileSync(path.join(OUT, 'README.md'), readme);
console.log(readme);
process.exit(bad === 0 ? 0 : 1);
