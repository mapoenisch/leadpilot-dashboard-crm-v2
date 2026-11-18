#!/usr/bin/env node
/**
 * Auftrag 161/164: Analysezeitpunkt, Zeitfenster und Fadenkreuz (P10b-2).
 * Screenshot-Harness für die Abnahmematrix:
 * - vorher-dashboard: Dashboard im Standard-Zustand (Live, ohne Fadenkreuz)
 * - nachher-zeitpunkt-dialog: Dialog zur Auswahl des Zeitpunkts geöffnet
 * - nachher-zeitpunkt-modus: Dashboard im Zeitpunkt-Modus mit Banner "Ansicht zum..."
 * - nachher-fadenkreuz: Gemeinsames Fadenkreuz über mehrere Verlaufskacheln
 * - nachher-inspector-zeitfenster: Inspector mit Zeitfenster-Auswahl
 * Viewports: 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes.
 * Schreibt docs/screenshots/auftrag-161/README.md (Bilder bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-161');
const PORT = 3161;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 768, height: 1024, name: '768' },
  { width: 375, height: 812, name: '375' },
];

const THEMES = ['dunkel', 'hell'];

async function openLibrary(page) {
  if (await page.getByTestId('widget-library').isVisible()) return;
  await page.getByTestId('toggle-library-button').click();
  await page.waitForSelector('[data-testid="widget-library"]', { timeout: 5000 });
}

async function addCrmHistoryTile(page) {
  await openLibrary(page);
  await page.getByTestId('library-tab-crm').click();
  const button = page.getByTestId('add-tile-btn-crm.phaseneintritte_verlauf');
  await button.waitFor({ state: 'visible', timeout: 5000 });
  const beforeCount = await page.locator('[data-testid^="canvas-tile-"]').count();
  await button.click();
  const tiles = page.locator('[data-testid^="canvas-tile-"]');
  await tiles.nth(beforeCount).waitFor({ state: 'visible', timeout: 5000 });
  const addedTile = tiles.last();
  const testId = await addedTile.getAttribute('data-testid');
  const boundTile = page.locator(`[data-testid="${testId}"]`);
  await boundTile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  return boundTile;
}

async function addLiveHistoryTile(page) {
  await openLibrary(page);
  await page.getByTestId('library-tab-live').click();
  const button = page.getByTestId('add-tile-btn-live.arr.verlauf');
  await button.waitFor({ state: 'visible', timeout: 5000 });
  const beforeCount = await page.locator('[data-testid^="canvas-tile-"]').count();
  await button.click();
  const tiles = page.locator('[data-testid^="canvas-tile-"]');
  await tiles.nth(beforeCount).waitFor({ state: 'visible', timeout: 5000 });
  const addedTile = tiles.last();
  const testId = await addedTile.getAttribute('data-testid');
  const boundTile = page.locator(`[data-testid="${testId}"]`);
  await boundTile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  return boundTile;
}

async function ensureInspectorOpen(page) {
  if (await page.getByTestId('editor-inspector').isVisible()) return;
  const toggleBtn = page.getByTestId('toggle-inspector-button');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await page.waitForSelector('[data-testid="editor-inspector"]', { timeout: 5000 });
  }
}

const SCENARIOS = [
  {
    id: 'vorher-dashboard',
    title: 'Standard-Dashboard im Live-Modus (Vorher-Zustand)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addCrmHistoryTile(page);
      await page.waitForSelector('[data-testid="depth-history-zone"]', { timeout: 10000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'nachher-zeitpunkt-dialog',
    title: 'Zeitpunkt-Dialog zur historischen Analyse (Nachher)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const trigger = page.getByTestId('time-point-trigger');
      await trigger.waitFor({ state: 'visible', timeout: 5000 });
      await trigger.click();
      await page.waitForSelector('[data-testid="time-point-preset-gestern"]', { timeout: 5000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'nachher-zeitpunkt-modus',
    title: 'Dashboard im Zeitpunkt-Modus mit Hinweisen (Nachher)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addCrmHistoryTile(page);
      const trigger = page.getByTestId('time-point-trigger');
      await trigger.waitFor({ state: 'visible', timeout: 5000 });
      await trigger.click();
      await page.waitForSelector('[data-testid="time-point-preset-gestern"]', { timeout: 5000 });
      await page.getByTestId('time-point-preset-gestern').click();
      await page.waitForSelector('[data-testid="time-point-banner"]', { timeout: 5000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'nachher-fadenkreuz',
    title: 'Gemeinsames Fadenkreuz über mehrere Verlaufskacheln (Nachher)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const crmTile = await addCrmHistoryTile(page);
      const liveTile = await addLiveHistoryTile(page);
      await crmTile.scrollIntoViewIfNeeded();
      await crmTile
        .locator('[data-testid="depth-line-chart"]')
        .waitFor({ state: 'visible', timeout: 5000 });
      await liveTile
        .locator('[data-testid="depth-line-chart"]')
        .waitFor({ state: 'visible', timeout: 5000 });
      const hitRects = liveTile.locator('rect[fill="transparent"]');
      const count = await hitRects.count();
      if (count > 0) {
        await hitRects.nth(Math.floor(count / 2)).hover();
        await page.waitForTimeout(300);
        // Sicherstellen, dass Fadenkreuze in beiden Verlaufskacheln aktiv gerendert sind
        await crmTile
          .locator('line[stroke-dasharray="2 3"]')
          .first()
          .waitFor({ state: 'attached', timeout: 3000 });
        await liveTile
          .locator('line[stroke-dasharray="2 3"]')
          .first()
          .waitFor({ state: 'attached', timeout: 3000 });
      }
    },
  },
  {
    id: 'nachher-inspector-zeitfenster',
    title: 'Inspector mit Zeitfenster-Auswahl (Rolling Windows, Nachher)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addCrmHistoryTile(page);
      const addedTile = page.locator('[data-testid^="canvas-tile-"]').last();
      await addedTile.click({ position: { x: 20, y: 20 } });
      await ensureInspectorOpen(page);
      const datenTab = page.getByTestId('inspector-tab-daten');
      await datenTab.waitFor({ state: 'visible', timeout: 5000 });
      await datenTab.click();
      await page.waitForSelector('[data-testid="inspector-time-window"]', { timeout: 5000 });
      await page.waitForTimeout(400);
    },
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${url}/dashboard-vorschau.html`);
      if (res.status === 200) return;
    } catch {}
    await sleep(300);
  }
  throw new Error(`Server nicht erreichbar unter: ${url}`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log(`[Harness 161] Starte vite dev server auf Port ${PORT}...`);
  const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  });

  const stopServer = () => {
    try {
      server.kill('SIGTERM');
    } catch {}
  };
  process.on('exit', stopServer);
  process.on('SIGINT', () => {
    stopServer();
    process.exit(1);
  });

  try {
    await waitForServer(BASE_URL);
    console.log(`[Harness 161] Server läuft auf ${BASE_URL}`);

    const browser = await chromium.launch({ headless: true });
    const records = [];

    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        for (const sc of SCENARIOS) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: theme === 'hell' ? 'light' : 'dark',
            reducedMotion: 'reduce',
            deviceScaleFactor: 1,
          });
          const page = await context.newPage();

          await page.goto(`${BASE_URL}${sc.path}`, { waitUntil: 'networkidle' });
          await page.evaluate((th) => {
            const targetTheme = th === 'hell' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', targetTheme);
            if (targetTheme === 'light') {
              document.documentElement.classList.remove('dark');
              document.documentElement.classList.add('light');
            } else {
              document.documentElement.classList.remove('light');
              document.documentElement.classList.add('dark');
            }
          }, theme);
          const activeThemeAttr = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme'),
          );
          if (activeThemeAttr !== (theme === 'hell' ? 'light' : 'dark')) {
            throw new Error(
              `[Screenshot-Gate 161] Theme-Attribut data-theme="${activeThemeAttr}" entspricht nicht dem geforderten Theme "${theme}".`,
            );
          }
          await page.evaluate(() => document.fonts.ready);
          await sc.prepare(page);

          const overflowPx = await page.evaluate(() => {
            const docEl = document.documentElement;
            const bodyEl = document.body;
            const scrollWidth = Math.max(docEl.scrollWidth, bodyEl.scrollWidth);
            const clientWidth = Math.min(docEl.clientWidth, bodyEl.clientWidth);
            return Math.max(0, scrollWidth - clientWidth);
          });

          if (overflowPx > 0) {
            throw new Error(
              `[Screenshot-Gate 161] Horizontaler Überlauf (${overflowPx} px) in Szenario "${sc.id}" (${vp.name}/${theme}) verletzt das 0-px-Kriterium.`,
            );
          }

          const filename = `${sc.id}-${vp.name}-${theme}.png`;
          const filepath = path.join(OUT_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: false });

          const bytes = fs.readFileSync(filepath);
          const hash = crypto.createHash('sha256').update(bytes).digest('hex');

          records.push({
            scenarioId: sc.id,
            scenarioTitle: sc.title,
            viewport: vp.name,
            theme,
            dimensions: `${vp.width} × ${vp.height} px`,
            overflowPx,
            hash,
            filename,
          });

          console.log(`  ✓ ${filename}: overflow=${overflowPx}px, hash=${hash.slice(0, 12)}...`);
          await context.close();
        }
      }
    }

    await browser.close();

    // Verifikation: Hashes je Viewport/Theme müssen für alle 5 Szenarien unterschiedlich sein
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const rows = records.filter((r) => r.viewport === vp.name && r.theme === theme);
        const unique = new Set(rows.map((r) => r.hash));
        if (unique.size !== rows.length) {
          throw new Error(
            `Kollidierende Screenshots für ${vp.name}/${theme}: ${unique.size} ungleiche Hashes bei ${rows.length} Szenarien`,
          );
        }
      }
    }

    // README generieren
    const markdown = `# Abnahme-Screenshots Auftrag 161 (P10b-2 Analysezeitpunkt, Zeitfenster, Fadenkreuz)

**Erzeugt am:** ${new Date().toISOString()}  
**Auftrag:** 161/164 – Analysezeitpunkt, Zeitfenster je Kachel, gemeinsames Fadenkreuz (P10b-2 / 161R)  
**Viewports:** 1440 × 900 (Desktop), 768 × 1024 (Tablet), 375 × 812 (Mobil)  
**Farbschemata:** Dunkel (Standard) und Hell  
**Horizontales Überlauf-Kriterium:** 0 px Pflicht auf allen Viewports  
**Sichtbarkeits-Kriterium:** Jeder Zustand erzeugt je Viewport/Farbschema einen eigenen SHA-256-Hash (keine identischen Bilder).

## Szenarien

1. **Vorher (Standard-Dashboard):** Standard-Dashboard im Live-Modus (\`vorher-dashboard\`)
2. **Nachher (Zeitpunkt-Dialog):** Dialog zur Auswahl des Zeitpunkts geöffnet (\`nachher-zeitpunkt-dialog\`)
3. **Nachher (Zeitpunkt-Modus):** Dashboard im Zeitpunkt-Modus mit Hinweisen (\`nachher-zeitpunkt-modus\`)
4. **Nachher (Fadenkreuz):** Gemeinsames Fadenkreuz über mehrere Verlaufskacheln (\`nachher-fadenkreuz\`)
5. **Nachher (Inspector-Zeitfenster):** Inspector mit Zeitfenster-Auswahl (\`nachher-inspector-zeitfenster\`)

## Nachweismatrix

| Szenario | Viewport | Thema | Abmessungen | Horizontaler Überlauf | SHA-256-Prüfsumme | Datei |
|---|---|---|---|---|---|---|
${records
  .map(
    (r) =>
      `| ${r.scenarioTitle} | ${r.viewport} | ${r.theme} | ${r.dimensions} | ${r.overflowPx} px | \`${r.hash}\` | \`${r.filename}\` |`,
  )
  .join('\n')}

## Zusammenfassung
- Gesamt-Screenshots: ${records.length} (5 Szenarien × 3 Viewports × 2 Farbschemata)
- Horizontaler Überlauf: **${Math.max(0, ...records.map((r) => r.overflowPx))} px** über alle Durchläufe (Kriterium 0 px: ${records.every((r) => r.overflowPx === 0) ? 'eingehalten' : 'verletzt'}).
- Prüfsummen-Eindeutigkeit: **vollständig eindeutig** je Viewport und Thema nachgewiesen.
`;

    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), markdown, 'utf8');
    console.log(
      `[Harness 161] Erfolgreich! README geschrieben nach docs/screenshots/auftrag-161/README.md`,
    );
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[Harness 161] FEHLER:', err);
  process.exit(1);
});
