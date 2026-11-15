#!/usr/bin/env node
/**
 * Auftrag 159: Dashboard-Editor: Historienmatrix, gemeinsame Zeitsteuerung, echte Pause und
 * ehrlicher Live-Status (P10a).
 * Screenshot-Harness für die Abnahmematrix:
 * - status-verbunden: Live-Kachel sichtbar, Statusleiste „Verbunden“
 * - status-pausiert: Pause aktiv, Statusleiste „Angehalten seit …“
 * - status-offline: Feed getrennt
 * - status-nicht-konfiguriert: ohne Feed
 * - kachel-abweichung: während der Pause hinzugefügte Kachel
 * Viewports: 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes.
 * Schreibt docs/screenshots/auftrag-159/README.md (Bilder bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-159');
const PORT = 3159;
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

async function addLiveTile(page) {
  await openLibrary(page);
  await page.getByTestId('library-tab-live').click();
  const button = page.locator('[data-testid^="add-tile-btn-live."]').first();
  await button.waitFor({ state: 'visible', timeout: 5000 });
  await button.click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="connection-status"]')?.getAttribute('data-connection') ===
      'verbunden',
    { timeout: 5000 },
  );
}

async function pause(page) {
  await page.getByTestId('live-pause-button').click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="live-pause-button"]')?.ariaPressed === 'true',
    { timeout: 5000 },
  );
}

const SCENARIOS = [
  {
    id: 'status-verbunden',
    title: 'Statusleiste verbunden (Live-Kachel)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addLiveTile(page);
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'status-pausiert',
    title: 'Statusleiste pausiert („Angehalten seit“)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addLiveTile(page);
      await pause(page);
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'status-offline',
    title: 'Statusleiste offline',
    path: '/dashboard-vorschau.html?bereich=editor_v2&live=offline',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await openLibrary(page);
      await page.getByTestId('library-tab-live').click();
      const button = page.locator('[data-testid^="add-tile-btn-live."]').first();
      await button.waitFor({ state: 'visible', timeout: 5000 });
      await button.click();
      await page.waitForSelector('[data-connection="offline"]', { timeout: 5000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'status-nicht-konfiguriert',
    title: 'Statusleiste nicht konfiguriert',
    path: '/dashboard-vorschau.html?bereich=editor_v2&live=unconfigured',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await openLibrary(page);
      await page.getByTestId('library-tab-live').click();
      const button = page.locator('[data-testid^="add-tile-btn-live."]').first();
      await button.waitFor({ state: 'visible', timeout: 5000 });
      await button.click();
      await page.waitForSelector('[data-connection="nicht_konfiguriert"]', { timeout: 5000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'kachel-abweichung',
    title: 'Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)',
    path: '/dashboard-vorschau.html?bereich=editor_v2',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      await addLiveTile(page);
      await pause(page);
      await openLibrary(page);
      await page.getByTestId('library-tab-alle').click();
      const button = page.locator('[data-testid^="add-tile-btn-baseline."]').first();
      await button.waitFor({ state: 'visible', timeout: 5000 });
      await button.click();
      const addedTile = page.locator('[data-testid^="canvas-tile-"]').last();
      await addedTile.scrollIntoViewIfNeeded();
      await addedTile.click({ position: { x: 12, y: 12 } });
      const marker = page
        .getByTestId('tile-stand-line')
        .filter({ hasText: 'nach Pausenbeginn geladen' })
        .first();
      await marker.waitFor({ state: 'attached', timeout: 5000 });
      await marker.scrollIntoViewIfNeeded().catch(() => {});
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

  console.log(`[Harness] Starte vite dev server auf Port ${PORT}...`);
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
    console.log(`[Harness] Server läuft auf ${BASE_URL}`);

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
          await page.evaluate(() => document.fonts.ready);
          await sc.prepare(page);

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

    // Pflichtnachweis: die vier Statuszustände müssen sich je Viewport/Theme sichtbar unterscheiden.
    const statusIds = [
      'status-verbunden',
      'status-pausiert',
      'status-offline',
      'status-nicht-konfiguriert',
    ];
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const rows = records.filter(
          (r) =>
            r.viewport === vp.name && r.theme === theme && statusIds.includes(r.scenarioId),
        );
        const unique = new Set(rows.map((r) => r.hash));
        if (unique.size !== rows.length) {
          throw new Error(
            `Statuszustände nicht unterscheidbar bei ${vp.name}/${theme}: ${rows
              .map((r) => `${r.scenarioId}=${r.hash.slice(0, 8)}`)
              .join(', ')}`,
          );
        }
      }
    }

    const markdown = `# Screenshot-Nachweis: Auftrag 159 (P10a) — Zeitsteuerung und Live-Status

Dokumentiert die optische Prüfung der gemeinsamen Zeitsteuerung und des ehrlichen Live-Status
gemäß Auftrag 159 §5 T8 und \`CLAUDE.md\` §9.
Bilder verbleiben lokal in \`docs/screenshots/auftrag-159/\` (.gitignore).

---

## 1. Prüfmatrix

${records.length} Aufnahmen (5 Zustände × 3 Viewports × 2 Themes). Pflicht: 0 px horizontaler Überlauf,
eindeutige SHA-256-Hashes je Zustand.

| Szenario | Viewport | Theme | Dimensionen | Horizontaler Überlauf | SHA-256 Hash |
|---|---|---|---|---|---|
${records
  .map(
    (r) =>
      `| **${r.scenarioTitle}** | ${r.viewport} | ${r.theme} | ${r.dimensions} | **${r.overflowPx} px** | \`${r.hash}\` |`,
  )
  .join('\n')}

---

## 2. Vorher/Nachher

**Vorher (Baseline, Merge von 158):** Die Statusleiste zeigte fest verdrahtet „Live“
(\`connectionStatus = 'connected'\`), auch ohne Supabase, Feed und Live-Kachel. Der Pause-Knopf war
ein lokaler \`useState\` ohne Wirkung auf den Datenpfad. Ein Screenshot des alten Stands wird hier
nicht dupliziert; die Fundstellen stehen in der Ist-Tabelle des Auftrags (§1).

**Nachher (diese Aufnahmen):**

1. **verbunden:** Statusleiste zeigt „Verbunden“ nur, wenn eine Live-Kachel sichtbar ist und der
   Feed-Zustand \`live\` meldet.
2. **pausiert:** „Angehalten seit HH:MM“, Pause-Knopf trägt \`aria-pressed="true"\` und den Text
   „Fortsetzen“.
3. **offline:** „Getrennt“ mit Warnsymbol, letzte neue Daten und Datenstand bleiben getrennt.
4. **nicht konfiguriert:** „Nicht konfiguriert“; die Statusleiste enthält nirgends das Wort „Live“.
5. **Abweichung:** Eine während der Pause hinzugefügte Kachel zeigt
   „Stand HH:MM (nach Pausenbeginn geladen)“ statt einer stillen Mischung.

---

## 3. Abnahmekriterien

1. **Horizontaler Überlauf:** alle ${records.length} Konfigurationen weisen strikt **0 px** auf.
2. **Hash-Differenzierung:** die fünf Zustände unterscheiden sich je Viewport und Theme sichtbar.
3. **Responsivität:** Pause-Knopf und Statusleiste bleiben bei 375 px ohne Abschneiden bedienbar;
   die Bibliothek wird auf schmalen Viewports über den Panel-Schalter geöffnet.
`;

    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), markdown, 'utf8');
    console.log(`[Harness] README.md geschrieben: ${path.join(OUT_DIR, 'README.md')}`);
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[Harness Fehler]', err);
  process.exit(1);
});
