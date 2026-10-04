#!/usr/bin/env node
/**
 * Auftrag 073 (Dashboard Teilauftrag 4): Screenshot-, Overflow-, axe- und Netzwerknachweis der
 * Kachelgalerie auf /dashboard-vorschau.html (ohne Anmeldung, feste Testdaten).
 *
 * 1. Vorher/Nachher: ganze Vorschauseite auf 1440/768/375 px gegen BEFORE_URL (Basis 92180d3,
 *    nur Testkachel) und BASE_URL (mit Galerie). SHA-256 je Paar muss sich unterscheiden.
 * 2. Nachher je Kachel: Bild, SHA-256, horizontaler Seitenüberlauf (0 px), axe serious/critical.
 * 3. Hover/Fokus je Diagrammart: erste Legenden-Schaltfläche fokussiert, Ablesezeile gefüllt.
 * 4. Netzwerk: `?ansicht=zahl` lädt kein Diagrammmodul, `?ansicht=ring` nur Kreis/Ring.
 * Bilder bleiben lokal (.gitignore); das Skript schreibt die Matrix docs/screenshots/auftrag-073/README.md.
 *
 * Voraussetzung: zwei Vorschau-Builds mit VITE_DASHBOARD_PREVIEW=true (`npx vite preview`).
 * Aufruf: BASE_URL=http://localhost:4173 BEFORE_URL=http://localhost:4174 \
 *         node scripts/captureAuftrag073Screenshots.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';
const BEFORE_URL = process.env.BEFORE_URL ?? 'http://localhost:4174';
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-073');
const PAGE = '/dashboard-vorschau.html';
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const CHART_MODULES = /(Depth3dBarChart|Depth3dDonutChart|DepthLineChart|DepthAreaChart)[-.]/;
const CHART_TESTIDS = [
  'depth-bar-chart',
  'depth-hbar-chart',
  'depth-donut-chart',
  'depth-line-chart',
  'depth-area-chart',
];

const GALLERY = 'section[aria-labelledby="kachelgalerie"]';
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const overflowOf = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Wartet, bis alle Diagramme geladen sind; nur die absichtlich ladende Kachel bleibt Platzhalter. */
async function waitForGallery(page) {
  await page.getByTestId('dashboard-tile').first().waitFor();
  await page.waitForFunction(
    () => {
      const loading = [...document.querySelectorAll('[data-testid="dashboard-tile"]')].filter(
        (tile) =>
          tile.getAttribute('data-state') !== 'laden' &&
          tile.querySelector('[aria-label$="Darstellung wird geladen"]'),
      );
      return loading.length === 0;
    },
    null,
    { timeout: 20000 },
  );
}

async function beforeAfter(browser) {
  const pairs = [];
  for (const viewport of WIDTHS) {
    const shots = {};
    for (const [label, url] of [
      ['vorher', BEFORE_URL],
      ['nachher', BASE_URL],
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${url}${PAGE}`, { waitUntil: 'networkidle' });
      await page.getByTestId('dashboard-test-tile').waitFor();
      if (label === 'nachher') await waitForGallery(page);
      const file = `${viewport.width}-seite-${label}.png`;
      const image = await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
      shots[label] = { file, sha256: sha256(image), overflowPx: await overflowOf(page) };
      await context.close();
    }
    pairs.push({ width: viewport.width, ...shots });
  }
  return pairs;
}

async function tiles(browser) {
  const rows = [];
  const focus = [];
  for (const viewport of WIDTHS) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}${PAGE}`, { waitUntil: 'networkidle' });
    await waitForGallery(page);
    const overflowPx = await overflowOf(page);
    const axe = await new AxeBuilder({ page })
      .include('section[aria-labelledby="kachelgalerie"]')
      .analyze();
    const severe = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const all = page.getByTestId('dashboard-tile');
    const count = await all.count();
    for (let index = 0; index < count; index += 1) {
      const tile = all.nth(index);
      const view = await tile.getAttribute('data-view');
      const state = await tile.getAttribute('data-state');
      const size = await tile.getAttribute('data-size');
      const file = `${viewport.width}-kachel-${String(index + 1).padStart(2, '0')}-${view}-${state}.png`;
      const image = await tile.screenshot({ path: path.join(OUT_DIR, file) });
      rows.push({
        width: viewport.width,
        index: index + 1,
        view,
        size,
        state,
        file,
        sha256: sha256(image),
      });
    }
    for (const testId of CHART_TESTIDS) {
      const tile = page
        .locator(GALLERY)
        .getByTestId('dashboard-tile')
        .filter({ has: page.getByTestId(testId) })
        .first();
      const chart = tile.getByTestId(testId).first();
      const legend = chart.getByRole('button').first();
      const slider = chart.getByRole('slider').first();
      if ((await legend.count()) > 0) await legend.focus();
      else await slider.focus();
      const readout = (await chart.getByTestId('chart-readout').textContent()) ?? '';
      const file = `${viewport.width}-fokus-${testId}.png`;
      const image = await tile.screenshot({ path: path.join(OUT_DIR, file) });
      focus.push({
        width: viewport.width,
        testId,
        readout: readout.trim(),
        file,
        sha256: sha256(image),
      });
    }
    rows.push({
      width: viewport.width,
      summary: true,
      overflowPx,
      axeSevere: severe.map((v) => v.id),
    });
    await context.close();
  }
  return { rows, focus };
}

async function network(browser) {
  const result = {};
  for (const view of ['zahl', 'ring']) {
    const context = await browser.newContext({ viewport: WIDTHS[0] });
    const page = await context.newPage();
    const modules = new Set();
    page.on('request', (request) => {
      const match = CHART_MODULES.exec(request.url());
      if (match) modules.add(match[1]);
    });
    await page.goto(`${BASE_URL}${PAGE}?ansicht=${view}`, { waitUntil: 'networkidle' });
    await waitForGallery(page);
    result[view] = {
      testTileVisible: (await page.getByTestId('dashboard-test-tile').count()) > 0,
      chartModules: [...modules].sort(),
    };
    await context.close();
  }
  return result;
}

const short = (hash) => `\`${hash.slice(0, 16)}\``;

function writeReadme(m) {
  const out = [
    '# Screenshot-Matrix Auftrag 073 (Dashboard Teilauftrag 4, Kachelrahmen und Diagramme)',
    '',
    'Erzeugt mit `scripts/captureAuftrag073Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `92180d3` (nur Testkachel), Nachher = dieser Stand (Testkachel und Kachelgalerie). Feste Testdaten, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).',
    '',
    `- Aufnahme: ${m.capturedAt}`,
    `- Vorher/Nachher-Paare verschieden: ${m.pairsDistinct ? 'ja' : 'nein'}`,
    `- Größter horizontaler Seitenüberlauf: ${m.maxOverflowPx} px (auf 375 px scrollt nur das Diagramm innerhalb der Kachel, Designfreigabe)`,
    `- axe-Verstöße serious/critical in der Galerie: ${m.axeSevereTotal}`,
    `- Fokus je Diagrammart füllt die Ablesezeile (Wert, Einheit, Kategorie, Zeitraum): ${m.focusReadoutsFilled ? 'ja' : 'nein'}`,
    `- Netzwerk \`?ansicht=zahl\`: Testkachel ausgeblendet, geladene Diagrammmodule: ${m.network.zahl.chartModules.join(', ') || 'keine'}`,
    `- Netzwerk \`?ansicht=ring\`: Testkachel ausgeblendet, geladene Diagrammmodule: ${m.network.ring.chartModules.join(', ') || 'keine'}`,
    '',
    '## Vorher/Nachher (ganze Seite)',
    '',
    '| Breite | Vorher | Nachher | Überlauf nachher |',
    '|---:|---|---|---:|',
    ...m.pairs.map(
      (p) =>
        `| ${p.width} | ${short(p.vorher.sha256)} | ${short(p.nachher.sha256)} | ${p.nachher.overflowPx} px |`,
    ),
    '',
    '## Fokus je Diagrammart (Galerie)',
    '',
    '| Breite | Diagramm | Ablesezeile | SHA-256 (gekürzt) |',
    '|---:|---|---|---|',
    ...m.focus.map(
      (f) => `| ${f.width} | ${f.testId} | ${f.readout.replace(/\|/g, '/')} | ${short(f.sha256)} |`,
    ),
    '',
    '## Kacheln',
    '',
    'Die Ring-Kacheln Nr. 7 und 8 sind absichtlich identisch (getrennte SVG-IDs); gleiche Hashes sind dort erwartet.',
    '',
    '| Breite | Nr. | Darstellung | Größe | Zustand | SHA-256 (gekürzt) |',
    '|---:|---:|---|---|---|---|',
    ...m.rows
      .filter((r) => !r.summary)
      .map(
        (r) =>
          `| ${r.width} | ${r.index} | ${r.view} | ${r.size} | ${r.state} | ${short(r.sha256)} |`,
      ),
    '',
    '| Breite | Seitenüberlauf | axe serious/critical |',
    '|---:|---:|---|',
    ...m.rows
      .filter((r) => r.summary)
      .map(
        (r) =>
          `| ${r.width} | ${r.overflowPx} px | ${r.axeSevere.length ? r.axeSevere.join(', ') : 'keine'} |`,
      ),
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), `${out.join('\n')}\n`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  let result;
  try {
    const pairs = await beforeAfter(browser);
    const { rows, focus } = await tiles(browser);
    const net = await network(browser);
    const summaries = rows.filter((row) => row.summary);
    result = {
      baseUrl: BASE_URL,
      beforeUrl: BEFORE_URL,
      capturedAt: new Date().toISOString(),
      pairsDistinct:
        pairs.length === WIDTHS.length &&
        pairs.every((pair) => pair.vorher.sha256 !== pair.nachher.sha256),
      maxOverflowPx: Math.max(
        ...summaries.map((row) => row.overflowPx),
        ...pairs.map((pair) => pair.nachher.overflowPx),
      ),
      axeSevereTotal: summaries.reduce((sum, row) => sum + row.axeSevere.length, 0),
      focusReadoutsFilled: focus.every(
        (row) => row.readout && !row.readout.startsWith('Datenpunkt'),
      ),
      network: net,
      networkOk:
        !net.zahl.testTileVisible &&
        net.zahl.chartModules.length === 0 &&
        !net.ring.testTileVisible &&
        net.ring.chartModules.join() === 'Depth3dDonutChart',
      pairs,
      focus,
      rows,
    };
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(os.tmpdir(), 'auftrag-073-manifest.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  writeReadme(result);
  console.log(
    JSON.stringify({ ...result, pairs: undefined, focus: undefined, rows: undefined }, null, 2),
  );
  const ok =
    result.pairsDistinct &&
    result.maxOverflowPx === 0 &&
    result.axeSevereTotal === 0 &&
    result.focusReadoutsFilled &&
    result.networkOk;
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
