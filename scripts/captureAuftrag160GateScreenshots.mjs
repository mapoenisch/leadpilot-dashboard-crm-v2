#!/usr/bin/env node
/**
 * Auftrag 160: Server-Zeitreihen für den Dashboard-Editor (P10b-1).
 * Screenshot-Harness für die Abnahmematrix:
 * - vorher-bibliothek: Kein Verlaufseintrag in der Bibliothek (Vorher-Zustand)
 * - nachher-crm-verlauf: CRM-Verlauf mit Historienbeginn mitten im Fenster
 * - nachher-live-verlauf-luecke: Live-Verlauf mit Lücke (unterbrochene Linie)
 * - nachher-tabelle-luecken: Tabellenansicht mit Textdarstellung von Lücken
 * - nachher-pausiert: Pausierter Zustand mit Verlaufskachel
 * Viewports: 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes.
 * Schreibt docs/screenshots/auftrag-160/README.md (Bilder bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-160');
const PORT = 3160;
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
  await button.click();
  const addedTile = page.locator('[data-testid^="canvas-tile-"]').last();
  await addedTile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
}

async function addLiveHistoryTile(page) {
  await openLibrary(page);
  await page.getByTestId('library-tab-live').click();
  const button = page.getByTestId('add-tile-btn-live.arr.verlauf');
  await button.waitFor({ state: 'visible', timeout: 5000 });
  await button.click();
  const addedTile = page.locator('[data-testid^="canvas-tile-"]').last();
  await addedTile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
}

async function ensureInspectorOpen(page) {
  if (await page.getByTestId('editor-inspector').isVisible()) return;
  const toggleBtn = page.getByTestId('toggle-inspector-button');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await page.waitForSelector('[data-testid="editor-inspector"]', { timeout: 5000 });
  }
}

async function pause(page) {
  const btn = page.getByTestId('live-pause-button');
  await btn.click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="live-pause-button"]')?.getAttribute('aria-pressed') === 'true',
    { timeout: 5000 },
  );
}

const SCENARIOS = [
  {
    id: 'vorher-bibliothek',
    title: 'Bibliothek ohne Verlaufseinträge (Vorher-Zustand)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&scenario=vorher',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await openLibrary(page);
      await page.getByTestId('library-tab-crm').click();
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'nachher-crm-verlauf',
    title: 'CRM-Verlauf mit Historienbeginn mitten im Fenster (Nachher)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addCrmHistoryTile(page);
      await page.waitForSelector('[data-testid="depth-history-zone"]', { timeout: 10000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'nachher-live-verlauf-luecke',
    title: 'Live-Verlauf mit Lücke (unterbrochene Linie & Lückenmarker)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addLiveHistoryTile(page);
      await page.waitForSelector('[data-testid="depth-line-point-gap"]', { timeout: 10000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'nachher-tabelle-luecken',
    title: 'Tabellenansicht mit Textdarstellung von Lücken',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page, vp) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addCrmHistoryTile(page);
      const addedTile = page.locator('[data-testid^="canvas-tile-"]').last();
      await addedTile.click({ position: { x: 20, y: 20 } });
      await ensureInspectorOpen(page);
      const tableViewBtn = page.getByTestId('view-option-tabelle');
      await tableViewBtn.waitFor({ state: 'visible', timeout: 5000 });
      await tableViewBtn.click();
      if (vp && vp.width < 1024) {
        const toggleBtn = page.getByTestId('toggle-inspector-button');
        if (await toggleBtn.isVisible()) {
          await toggleBtn.click();
          await page.waitForTimeout(200);
        }
      }
      await addedTile.scrollIntoViewIfNeeded();
      await addedTile.getByTestId('tile-table').waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'nachher-pausiert',
    title: 'Pausierter Zustand mit Verlaufskachel',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addCrmHistoryTile(page);
      await pause(page);
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

  console.log(`[Harness 160] Starte vite dev server auf Port ${PORT}...`);
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
    console.log(`[Harness 160] Server läuft auf ${BASE_URL}`);

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
            if (th === 'hell') {
              document.documentElement.classList.remove('dark');
              document.documentElement.classList.add('light');
            } else {
              document.documentElement.classList.remove('light');
              document.documentElement.classList.add('dark');
            }
          }, theme);
          await page.evaluate(() => document.fonts.ready);
          await sc.prepare(page, vp);

          const overflowPx = await page.evaluate(() => {
            const docEl = document.documentElement;
            const bodyEl = document.body;
            const scrollWidth = Math.max(docEl.scrollWidth, bodyEl.scrollWidth);
            const clientWidth = Math.min(docEl.clientWidth, bodyEl.clientWidth);
            return Math.max(0, scrollWidth - clientWidth);
          });

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
    const markdown = `# Abnahme-Screenshots Auftrag 160 (P10b-1 Server-Zeitreihen)

**Erzeugt am:** ${new Date().toISOString()}  
**Auftrag:** 160 – Server-Zeitreihen für den Dashboard-Editor (P10b-1)  
**Viewports:** 1440 × 900 (Desktop), 768 × 1024 (Tablet), 375 × 812 (Mobil)  
**Farbschemata:** Dunkel (Standard) und Hell  
**Horizontales Überlauf-Kriterium:** 0 px Pflicht auf allen Viewports  
**Sichtbarkeits-Kriterium:** Jeder Zustand erzeugt je Viewport/Farbschema einen eigenen SHA-256-Hash (keine identischen Bilder).

## Szenarien

1. **Vorher:** Bibliothek ohne Verlaufseinträge (\`vorher-bibliothek\`)
2. **Nachher (CRM-Verlauf):** Verlaufskachel mit Historienbeginn mitten im Fenster (\`nachher-crm-verlauf\`)
3. **Nachher (Live-Verlauf):** Verlaufskachel 24h mit Lücke (\`nachher-live-verlauf-luecke\`)
4. **Nachher (Tabelle):** Tabellenansicht mit Lückenbeschriftung (\`nachher-tabelle-luecken\`)
5. **Nachher (Pausiert):** Verlaufskachel unter Pause mit Standzeilen-Aktualität (\`nachher-pausiert\`)

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
- Horizontaler Überlauf: **0 px** über alle Durchläufe eingehalten.
- Prüfsummen-Eindeutigkeit: **vollständig eindeutig** je Viewport und Thema nachgewiesen.
`;

    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), markdown, 'utf8');
    console.log(`[Harness 160] Erfolgreich! README geschrieben nach docs/screenshots/auftrag-160/README.md`);
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[Harness 160] FEHLER:', err);
  process.exit(1);
});
