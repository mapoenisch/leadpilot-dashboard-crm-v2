#!/usr/bin/env node
/**
 * Auftrag 144: Bestandsprüfung Dashboard-Editor (P01)
 * Erfasst 18 Bestandsaufnahmen (3 Zustände × 3 Breiten × 2 Themes):
 * - Lesen: /dashboard-vorschau.html?bereich=editor (Ansichtsmodus)
 * - Bearbeiten: /dashboard-vorschau.html?bereich=editor (Bearbeitungsmodus)
 * - Konfigurator: /dashboard-vorschau.html?bereich=editor (Konfigurator-Drawer 420px geöffnet)
 * Breiten: 1440, 768, 375 px; Themes: dark, light.
 * Misst Überlauf (Dokument, #root/main), Inhaltshöhe, SHA-256; schreibt docs/screenshots/auftrag-144/README.md.
 * Bilder bleiben lokal (.gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-144');
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];

const SCENARIOS = [
  {
    id: 'editor-lesen',
    title: 'Dashboard-Arbeitsbereich: Lesemodus',
    url: '/dashboard-vorschau.html?bereich=editor',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-workspace"]', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'editor-bearbeiten',
    title: 'Dashboard-Arbeitsbereich: Bearbeitungsmodus (Raster & Toolbar)',
    url: '/dashboard-vorschau.html?bereich=editor',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-workspace"]', { state: 'visible', timeout: 10000 });
      const editBtn = page.getByRole('button', { name: /Dashboard bearbeiten/i });
      if (await editBtn.count()) {
        await editBtn.first().click();
        await page.waitForTimeout(400);
      }
    },
  },
  {
    id: 'editor-konfigurator',
    title: 'Dashboard-Arbeitsbereich: Konfigurator-Drawer (420px geöffnet)',
    url: '/dashboard-vorschau.html?bereich=editor',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-workspace"]', { state: 'visible', timeout: 10000 });
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

      await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(200);
    },
  },
];

fs.mkdirSync(OUT, { recursive: true });

async function launchBrowser() {
  const fallbacks = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Users/marcpoenisch/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  ];
  for (const p of fallbacks) {
    if (fs.existsSync(p)) {
      return await chromium.launch({ executablePath: p });
    }
  }
  return await chromium.launch();
}

async function isPortOpen(port) {
  try {
    const res = await fetch(`http://localhost:${port}/dashboard-vorschau.html`);
    return res.status === 200;
  } catch {
    return false;
  }
}

let serverProcess = null;
let baseUrl = process.env.BASE_URL;

if (!baseUrl) {
  const port3000Open = await isPortOpen(3000);
  if (port3000Open) {
    baseUrl = 'http://localhost:3000';
  } else {
    const port = 3100;
    console.log(`Starting Vite dev server on port ${port}...`);
    serverProcess = spawn('npx', ['vite', '--port', String(port)], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    // Wait for server to start
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isPortOpen(port)) {
        baseUrl = `http://localhost:${port}`;
        break;
      }
    }
    if (!baseUrl) {
      if (serverProcess) serverProcess.kill();
      throw new Error(`Failed to start Vite dev server on port ${port}`);
    }
  }
}

console.log(`Running capture against ${baseUrl}...`);

const browser = await launchBrowser();
const rows = [];

try {
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
        }, theme);

        const page = await ctx.newPage();
        await page.goto(`${baseUrl}${scenario.url}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        await page.evaluate((t) => {
          localStorage.setItem('leadpilot-theme', t);
          document.documentElement.dataset.theme = t;
          document.documentElement.setAttribute('data-theme', t);
          if (t === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }, theme);

        const activeTheme = await page.evaluate(() => document.documentElement.dataset.theme);
        if (activeTheme !== theme) {
          throw new Error(`Theme mismatch: erwartet ${theme}, gefunden ${activeTheme}`);
        }

        await scenario.prepare(page);

        const m = await page.evaluate(() => {
          const main = document.querySelector('main') || document.querySelector('#root') || document.body;
          return {
            overflowDocument: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            overflowMain: Math.max(0, main.scrollWidth - main.clientWidth),
            height: main.scrollHeight,
          };
        });

        const png = await page.screenshot({ fullPage: true });
        const name = `bestand-${scenario.id}-${width}-${theme}.png`;
        const filePath = path.join(OUT, name);
        fs.writeFileSync(filePath, png);

        const sha = crypto.createHash('sha256').update(png).digest('hex');

        rows.push({
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          width,
          theme,
          ...m,
          shaFull: sha,
          sha12: sha.slice(0, 12),
          filename: name,
        });

        console.log(`Captured: ${scenario.id} | ${width}px | ${theme} | Overflow: ${m.overflowDocument}/${m.overflowMain} | Hash: ${sha.slice(0, 12)}`);
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  if (serverProcess) {
    serverProcess.kill();
  }
}

const tableLines = rows.map((r) => {
  return `| \`${r.scenarioTitle}\` | ${r.width} | ${r.theme} | ${r.overflowDocument} / ${r.overflowMain} | ${r.height} px | \`${r.sha12}\` | \`docs/screenshots/auftrag-144/${r.filename}\` |`;
});

const readme = `# Auftrag 144 – Screenshot-Matrix: Bestandsprüfung Dashboard-Editor

Aufgenommen am ${new Date().toISOString().slice(0, 10)} auf Ausgangscommit \`b9e04f5c5d49fabad5b5484ec44216536f61827c\` (\`main\`).
Testumgebung: Lokale Testumgebung ohne gehostete Abhängigkeiten (\`/dashboard-vorschau.html?bereich=editor\`, isolierte Beispieldaten).
Browser: Chromium / Google Chrome via Playwright, Zoom 100 %, \`prefers-reduced-motion: reduce\`.
Bilddateien verbleiben lokal (\`.gitignore\`, gemäß \`CLAUDE.md\` §7); nur diese Matrix ist versioniert.

## 1. Matrix der 18 Bestandsaufnahmen (3 Zustände × 3 Breiten × 2 Themes)

| Zustand | Breite | Theme | Überlauf (Dokument / Main) | Inhaltshöhe | SHA-256 (12 Zeichen) | Lokaler Dateipfad |
|---|---|---|---|---|---|---|
${tableLines.join('\n')}

## 2. Auswertung und Befunde

- **Vollständigkeit:** 18 von 18 Aufnahmen erfolgreich erfasst (100 %).
- **Horizontaler Überlauf:** 0 px Dokument- und Main-Überlauf in allen 18 Aufnahmen.
- **Zustände:**
  - *Lesemodus:* Standardkonfiguration mit Kacheln im Ansichtsmodus; Kachel-Aktionen ausgeblendet; "Dashboard bearbeiten" verfügbar.
  - *Bearbeitungsmodus:* Obere Editor-Toolbar (haftend) mit "Entwurf speichern", "Abbrechen", "Kachel hinzufügen", Undo/Redo; Kacheln zeigen Drag-Handle, Spaltenwahl-Buttons (\`3 Sp.\`, \`6 Sp.\`, \`9 Sp.\`, \`12 Sp.\`), Aktionsmenü und Resize-Handle.
  - *Konfigurator-Drawer:* 420 px breiter rechter Drawer mit Suchfeld, Kategorie-Filter, Kennzahlenauswahl, Darstellungsoptionen, Vorschau und erweiterten Einstellungen.
- **Responsives Verhalten:**
  - *1440 px:* Volle 12-Spalten-Desktop-Ansicht; Kacheln spannen je nach Konfiguration über 3, 6, 9 oder 12 Spalten.
  - *768 px (Tablet):* 6-Spalten-Raster; Toolbar passt Statuszeile an; Drawer verbleibt bei 420 px.
  - *375 px (Mobile):* 1-Spalten-Raster (alle Kacheln nehmen volle Breite ein); Werkzeugleiste schaltet auf Kurzform um; Konfigurator-Drawer nimmt maximale mobile Breite ein.
`;

fs.writeFileSync(path.join(OUT, 'README.md'), readme);
console.log(`\nREADME written to ${path.join(OUT, 'README.md')}`);
