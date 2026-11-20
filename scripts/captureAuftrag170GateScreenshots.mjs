#!/usr/bin/env node
/**
 * Auftrag 170: Dashboard-Editor: Vergleich, zeitbezogene Verknüpfung, Heatmap, Erwartungsband (P14b).
 * Screenshot-Harness für die Abnahmematrix (§2.3 Nr. 15), Szenario ?bereich=editor_v2&vergleich=1:
 * 1. editor-uebersicht-vergleich: Vorschau-Dashboard mit allen Zusatzdarstellungen
 * 2. kachel-vergleich-vorperiode: Linie mit gestrichelter Vorperiode
 * 3. kachel-vergleich-teilhistorie: Vorjahr mit Hinweis „Vergleich unvollständig: Daten ab …“
 * 4. kachel-zweite-reihe: zweite Reihe mit eigener Achse (andere Einheit)
 * 5. kachel-erwartungsband: Band 10.–90. Perzentil mit Erklärsatz
 * 6. kachel-heatmap-phasen: Heatmap Phase × Woche mit schraffierten Leerzellen
 * 7. kachel-heatmap-wochentage: Heatmap Woche × Wochentag mit Legende
 * 8. inspector-vergleichen: Inspector-Abschnitt „Vergleichen“
 * 9. inspector-sperrgrund-heatmap: Sperrgrund bei Darstellung Heatmap
 *
 * Viewports: 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes.
 * Schreibt docs/screenshots/auftrag-170/README.md (Bilddateien bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-170');
const PORT = 3170;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 768, height: 1024, name: '768' },
  { width: 375, height: 812, name: '375' },
];

const THEMES = ['dunkel', 'hell'];

const b64url = (val) => Buffer.from(JSON.stringify(val)).toString('base64url');

async function mockAdminAndTeams(context) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: '11111111-1111-1111-1111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin-a@e2e.local',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
    sub: user.id,
    email: user.email,
    role: 'authenticated',
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
  })}.mock`;

  await context.addInitScript(
    ({ t, u }) => {
      window.sessionStorage.setItem('lp_dashboard_editor_v2', 'true');
      const authData = {
        access_token: t,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock-refresh',
        user: u,
      };
      for (const k of [
        'sb-127.0.0.1-auth-token',
        'sb-localhost-auth-token',
        'sb-leadpilot-crm-auth-token',
      ]) {
        window.localStorage.setItem(k, JSON.stringify(authData));
      }
    },
    { t: token, u: user },
  );
}

async function ensureInspectorOpen(page) {
  if (await page.getByTestId('editor-inspector').isVisible()) return;
  const toggleBtn = page.getByTestId('toggle-inspector-button');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await page.waitForSelector('[data-testid="editor-inspector"]', { timeout: 5000 });
  }
}

const SCENARIO_PATH = '/dashboard-vorschau.html?bereich=editor_v2&vergleich=1';

async function openShell(page) {
  await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
}

function tileScenario(id, title, tileId, selector) {
  return {
    id,
    title,
    path: SCENARIO_PATH,
    prepare: async (page) => {
      await openShell(page);
      const tile = page.getByTestId(`canvas-tile-${tileId}`);
      await tile.scrollIntoViewIfNeeded();
      await tile.locator(`[data-testid="${selector}"]`).first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      return tile;
    },
  };
}

function inspectorScenario(id, title, tileId, selector) {
  return {
    id,
    title,
    path: SCENARIO_PATH,
    prepare: async (page) => {
      await openShell(page);
      const tile = page.getByTestId(`canvas-tile-${tileId}`);
      await tile.scrollIntoViewIfNeeded();
      await tile.click();
      await ensureInspectorOpen(page);
      await page.getByTestId('inspector-tab-daten').click();
      const section = page.getByTestId('inspector-compare-section');
      await section.scrollIntoViewIfNeeded();
      await page.waitForSelector(`[data-testid="${selector}"]`, { timeout: 5000 });
      await page.waitForTimeout(300);
      return section;
    },
  };
}

const SCENARIOS = [
  {
    id: 'editor-uebersicht-vergleich',
    title: 'Editor-Übersicht: Vergleich, zweite Reihe, Band und Heatmaps',
    path: SCENARIO_PATH,
    prepare: async (page) => {
      await openShell(page);
      await page.waitForSelector('[data-testid="depth-compare-line"]', { timeout: 10000 });
      await page.waitForTimeout(300);
      return null;
    },
  },
  tileScenario(
    'kachel-vergleich-vorperiode',
    'Kachel: Vorperiode als gestrichelte Linie',
    'preview_compare_1',
    'depth-compare-line',
  ),
  tileScenario(
    'kachel-vergleich-teilhistorie',
    'Kachel: Vorjahr mit Hinweis auf Teilhistorie',
    'preview_compare_2',
    'depth-line-note-partial',
  ),
  tileScenario(
    'kachel-zweite-reihe',
    'Kachel: zweite Reihe mit eigener Achse',
    'preview_compare_3',
    'depth-second-series-line',
  ),
  tileScenario(
    'kachel-erwartungsband',
    'Kachel: Erwartungsband 10.–90. Perzentil',
    'preview_compare_4',
    'expectation-band',
  ),
  tileScenario(
    'kachel-heatmap-phasen',
    'Kachel: Heatmap Phase × Woche',
    'preview_compare_5',
    'depth-heatmap-chart',
  ),
  tileScenario(
    'kachel-heatmap-wochentage',
    'Kachel: Heatmap Woche × Wochentag',
    'preview_compare_6',
    'heatmap-legend',
  ),
  inspectorScenario(
    'inspector-vergleichen',
    'Inspector: Abschnitt Vergleichen',
    'preview_compare_1',
    'inspector-compare-select',
  ),
  inspectorScenario(
    'inspector-sperrgrund-heatmap',
    'Inspector: Sperrgrund bei Heatmap',
    'preview_compare_6',
    'inspector-compare-blocked',
  ),
];

let serverProcess = null;

async function startServer() {
  console.log(`[Harness 170] Starte Vite-Preview-Server auf Port ${PORT}...`);
  return new Promise((resolve, reject) => {
    serverProcess = spawn(
      'npx',
      ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'],
      {
        cwd: ROOT,
        stdio: 'inherit',
      },
    );
    serverProcess.on('error', reject);

    const check = async () => {
      for (let i = 0; i < 30; i++) {
        try {
          const res = await fetch(`${BASE_URL}/dashboard-vorschau.html`);
          if (res.ok) {
            console.log(`[Harness 170] Server läuft auf ${BASE_URL}`);
            resolve();
            return;
          }
        } catch {
          /* wait */
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      reject(new Error(`Server auf ${BASE_URL} nicht rechtzeitig erreichbar.`));
    };
    check();
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('[Harness 170] Beende Preview-Server...');
    serverProcess.kill('SIGTERM');
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await startServer();

  const records = [];

  try {
    const browser = await chromium.launch();

    for (const sc of SCENARIOS) {
      console.log(`\n[Szenario] ${sc.title} (${sc.id})`);
      for (const vp of VIEWPORTS) {
        for (const theme of THEMES) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            reducedMotion: 'reduce',
          });
          await mockAdminAndTeams(context);

          const page = await context.newPage();
          await page.goto(`${BASE_URL}${sc.path}`, { waitUntil: 'networkidle' });
          await page.evaluate((th) => {
            const target = th === 'hell' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', target);
            if (target === 'light') {
              document.documentElement.classList.remove('dark');
              document.documentElement.classList.add('light');
            } else {
              document.documentElement.classList.remove('light');
              document.documentElement.classList.add('dark');
            }
          }, theme);
          await page.evaluate(() => document.fonts.ready);
          const target = await sc.prepare(page, vp);

          const overflowPx = await page.evaluate(() => {
            const docEl = document.documentElement;
            const bodyEl = document.body;
            const scrollWidth = Math.max(docEl.scrollWidth, bodyEl.scrollWidth);
            const clientWidth = Math.min(docEl.clientWidth, bodyEl.clientWidth);
            return Math.max(0, scrollWidth - clientWidth);
          });

          if (overflowPx > 0) {
            throw new Error(
              `[Screenshot-Gate 170] Horizontaler Überlauf (${overflowPx} px) in Szenario "${sc.id}" (${vp.name}/${theme}) verletzt das 0-px-Kriterium.`,
            );
          }

          const filename = `${sc.id}-${vp.name}-${theme}.png`;
          const filepath = path.join(OUT_DIR, filename);
          if (target) await target.screenshot({ path: filepath });
          else await page.screenshot({ path: filepath, fullPage: false });

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

    // Verifikation: Hashes je Viewport/Theme müssen für alle Szenarien unterschiedlich sein
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
    const markdown = `# Abnahme-Screenshots Auftrag 170 (P14b Vergleich, Verknüpfung, Heatmap, Erwartungsband)

**Erzeugt am:** ${new Date().toISOString()}  
**Auftrag:** 170 – Dashboard-Editor: Vergleichszeitraum, zeitbezogene Verknüpfung, Heatmap, Erwartungsbänder (P14b)  
**Szenario:** \`${SCENARIO_PATH}\` (Testdaten)  
**Viewports:** 1440 × 900 (Desktop), 768 × 1024 (Tablet), 375 × 812 (Mobil)  
**Farbschemata:** Dunkel (Standard) und Hell  
**Horizontales Überlauf-Kriterium:** 0 px Pflicht auf allen Viewports  
**Sichtbarkeits-Kriterium:** Jeder Zustand erzeugt je Viewport/Farbschema einen eigenen SHA-256-Hash. Kachel- und Inspector-Szenarien werden als Ausschnitt des jeweiligen Elements aufgenommen.

## Szenarien (§2.3 Nr. 15)

${SCENARIOS.map((s, i) => `${i + 1}. **${s.title}** (\`${s.id}\`)`).join('\n')}

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
- Gesamt-Screenshots: ${records.length} (${SCENARIOS.length} Szenarien × 3 Viewports × 2 Farbschemata)
- Horizontaler Überlauf: **${Math.max(0, ...records.map((r) => r.overflowPx))} px** über alle Durchläufe (Kriterium 0 px: ${records.every((r) => r.overflowPx === 0) ? 'eingehalten' : 'verletzt'}).
- Prüfsummen-Eindeutigkeit: je Viewport und Thema ${SCENARIOS.length} distinkte Hashes.
`;

    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), markdown, 'utf8');
    console.log(
      `\n[Harness 170] Erfolgreich! README geschrieben nach docs/screenshots/auftrag-170/README.md`,
    );
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[Harness 170] FEHLER:', err);
  process.exit(1);
});
