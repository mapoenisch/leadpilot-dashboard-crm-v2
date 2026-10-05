#!/usr/bin/env node
/**
 * Auftrag 076 (Dashboard Teilauftrag 6): Screenshot-, Overflow-, axe-, Höhen- und Ablaufnachweis
 * der KPI-Kombinationen auf /dashboard-vorschau.html?bereich=editor (ohne Anmeldung, Testdaten).
 *
 * 1. Vorher/Nachher: Höchstbelegung (`&kacheln=24`) auf 1440/768/375 px gegen BEFORE_URL (Basis
 *    4088ee3, ohne Kombinationen) und BASE_URL (mit drei Kombinationskacheln). SHA-256 je Paar
 *    muss sich unterscheiden.
 * 2. Je Breite: Ansicht (24 Kacheln mit Kombinationen, bereit und nicht berechenbar), Bearbeiten,
 *    Konfigurator mit gesperrtem Partner, mit gewählter Kombination und mit nicht berechenbarer
 *    Kombination, Ansicht nach dem Speichern: Bild, SHA-256, Seitenüberlauf (0 px), axe.
 * 3. Tastaturablauf: erste Kennzahl, Partner, Verwerfen beim Wechsel, Hinzufügen, Escape, Speichern.
 * 4. Höhe jeder ganzen Kachel bei 24 Kacheln: Laden → bereit bzw. nicht berechenbar unverändert.
 * Bilder bleiben lokal (.gitignore); das Skript schreibt docs/screenshots/auftrag-076/README.md.
 *
 * Aufruf: BASE_URL=http://localhost:4173 BEFORE_URL=http://localhost:4174 \
 *         node scripts/captureAuftrag076Screenshots.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fullLazyRows } from './lib/dashboardShotHelpers.mjs';
import { combinationFlow, combinationHeightRows } from './lib/combinationShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';
const BEFORE_URL = process.env.BEFORE_URL ?? 'http://localhost:4174';
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-076');
const PAGE = '/dashboard-vorschau.html';
const EDITOR = `${PAGE}?bereich=editor`;
const FULL = `${EDITOR}&kacheln=24`;
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const WORKSPACE = '[data-testid="dashboard-workspace"]';
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const overflowOf = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function open(browser, viewport, url) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator(WORKSPACE).waitFor();
  return { context, page };
}

/** Alle Kacheln aktivieren (Lazy) und zurück an den Anfang. */
async function scrollThrough(page, viewport) {
  const steps = Math.ceil(
    (await page.evaluate(() => document.body.scrollHeight)) / viewport.height,
  );
  for (let i = 0; i < steps + 1; i += 1) {
    await page.mouse.wheel(0, viewport.height * 0.9);
    await page.waitForTimeout(150);
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function severeAxe(page) {
  const axe = await new AxeBuilder({ page }).include(WORKSPACE).analyze();
  return axe.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id);
}

function stepper(page, viewport) {
  return async (name) => {
    const file = `${viewport.width}-${name}.png`;
    const image = await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
    return {
      width: viewport.width,
      name,
      overflowPx: await overflowOf(page),
      axeSevere: await severeAxe(page),
      file,
      sha256: sha256(image),
    };
  };
}

async function beforeAfter(browser) {
  const pairs = [];
  for (const viewport of WIDTHS) {
    const shots = {};
    for (const [label, url] of [
      ['vorher', `${BEFORE_URL}${FULL}`],
      ['nachher', `${BASE_URL}${FULL}`],
    ]) {
      const { context, page } = await open(browser, viewport, url);
      await scrollThrough(page, viewport);
      const file = `${viewport.width}-seite-${label}.png`;
      const image = await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
      shots[label] = { file, sha256: sha256(image), overflowPx: await overflowOf(page) };
      await context.close();
    }
    pairs.push({ width: viewport.width, ...shots });
  }
  return pairs;
}

async function flows(browser) {
  const rows = [];
  const facts = [];
  for (const viewport of WIDTHS) {
    // Ansicht mit Höchstbelegung: Kombinationen bereit, als Ring und nicht berechenbar.
    const full = await open(browser, viewport, `${BASE_URL}${FULL}`);
    await scrollThrough(full.page, viewport);
    const comboStates = await full.page
      .locator('[data-testid="dashboard-tile"]')
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => n.querySelector('[data-testid="tile-formula"]'))
          .map((n) => ({
            state: n.dataset.state,
            view: n.dataset.view,
            badge: n.querySelector('[data-testid="tile-state-badge"]')?.textContent ?? '',
          })),
      );
    rows.push(await stepper(full.page, viewport)('ansicht-24'));
    await full.context.close();

    const { context, page } = await open(browser, viewport, `${BASE_URL}${EDITOR}`);
    const step = stepper(page, viewport);
    await page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
    await page.getByRole('button', { name: 'Kachel hinzufügen' }).first().waitFor();
    rows.push(await step('bearbeiten'));
    const result = await combinationFlow(page, step);
    rows.push(...result.rows);
    facts.push({ width: viewport.width, comboStates, ...result.facts });
    await context.close();
  }
  return { rows, facts };
}

const short = (hash) => `\`${hash.slice(0, 16)}\``;

function writeReadme(m) {
  const f = m.facts[0] ?? {};
  const out = [
    '# Screenshot-Matrix Auftrag 076 (Dashboard Teilauftrag 6, geführte KPI-Kombinationen)',
    '',
    'Erzeugt mit `scripts/captureAuftrag076Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `4088ee3` (ohne Kombinationen), Nachher = dieser Stand. Testdaten (Kombinationen über `computeCombination`, CAC-Aufschlag absichtlich mit Nenner 0), Speicher-Ersatz im Arbeitsspeicher, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).',
    '',
    `- Aufnahme: ${m.capturedAt}`,
    `- Vorher/Nachher-Paare verschieden: ${m.pairsDistinct ? 'ja' : 'nein'}`,
    `- Größter horizontaler Seitenüberlauf: ${m.maxOverflowPx} px`,
    `- axe-Verstöße serious/critical: ${m.axeSevereTotal}`,
    `- Kombinationskacheln in der Ansicht (Zustand/Darstellung/Badge): ${f.comboStates?.map((c) => `${c.state}/${c.view}/${c.badge || '–'}`).join(', ')}`,
    `- Ansage nach erster Kennzahl: „${f.offer}“`,
    `- Gesperrter Partner deaktiviert: ${m.facts.every((x) => x.blockedDisabled) ? 'ja' : 'nein'}; Text: „${f.blockedReason}“`,
    `- Ansage nach Wahl (Pfeiltaste): „${f.chosen}“; Fokus danach auf: „${f.focusAfterPick}“`,
    `- Formel in der Vorschau: „${f.previewFormula}“`,
    `- Ansage beim Wechsel der ersten Kennzahl: „${f.dropped}“; Formelzeilen danach in der Vorschau: ${f.previewAfterDrop}`,
    `- Hinzufügen per Tastatur: Kacheln ${m.facts.map((x) => `${x.width}: ${x.tilesBefore}→${x.tilesAfterMarge}`).join(', ')}`,
    `- Nicht berechenbar (Vorschau): „${f.notComputable}“`,
    `- Escape schließt den Konfigurator (oberster Dialog): ${m.facts.every((x) => x.escapeClosed) ? 'ja' : 'nein'}`,
    `- Speichern: „Gespeichert.“ und Rückkehr in die Ansicht: ${m.facts.every((x) => x.saved) ? 'ja' : 'nein'}; Kombinationskacheln danach: ${f.savedStates?.join(', ')}`,
    '',
    `- Höhe ganzer Kacheln bei 24 Kacheln, Laden → Endzustand (Abweichungen je Breite): ${m.heights.map((h) => `${h.width}: ${h.tileCount} Kacheln, Endzustände ${h.finalStates.join('/')}, Abweichungen ${h.diff.length}, Raster ${h.gridLoading}/${h.gridReady} px`).join('; ')}`,
    `- Kombinationskacheln (Laden/Ende in px): ${m.heights.map((h) => `${h.width}: ${h.combos.map((c) => `${c.id} ${c.loading}/${c.final}`).join(', ')}`).join('; ')}`,
    `- Höchstbelegung 24 Kacheln, aktiv beim Start / nach dem Scrollen: ${m.full.map((x) => `${x.width}: ${x.initial}/${x.scrolled} von ${x.total}`).join(', ')}`,
    '',
    '## Vorher/Nachher (ganze Seite, 24 Kacheln)',
    '',
    '| Breite | Vorher | Nachher | Überlauf nachher |',
    '|---:|---|---|---:|',
    ...m.pairs.map(
      (p) =>
        `| ${p.width} | ${short(p.vorher.sha256)} | ${short(p.nachher.sha256)} | ${p.nachher.overflowPx} px |`,
    ),
    '',
    '## Zustände',
    '',
    '| Breite | Zustand | Überlauf | axe serious/critical | SHA-256 (gekürzt) |',
    '|---:|---|---:|---|---|',
    ...m.rows.map(
      (r) =>
        `| ${r.width} | ${r.name} | ${r.overflowPx} px | ${r.axeSevere.length ? r.axeSevere.join(', ') : 'keine'} | ${short(r.sha256)} |`,
    ),
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), `${out.join('\n')}\n`);
}

const CTX = { BASE_URL, PAGE, EDITOR, WIDTHS, OUT_DIR, WORKSPACE, sha256, overflowOf };

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  let result;
  try {
    const pairs = await beforeAfter(browser);
    const { rows, facts } = await flows(browser);
    const heights = await combinationHeightRows(browser, CTX);
    const full = await fullLazyRows(browser, CTX);
    result = {
      capturedAt: new Date().toISOString(),
      pairsDistinct: pairs.every((pair) => pair.vorher.sha256 !== pair.nachher.sha256),
      maxOverflowPx: Math.max(
        ...rows.map((row) => row.overflowPx),
        ...pairs.map((pair) => pair.nachher.overflowPx),
      ),
      axeSevereTotal: rows.reduce((sum, row) => sum + row.axeSevere.length, 0),
      pairs,
      rows,
      facts,
      heights,
      full,
    };
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(os.tmpdir(), 'auftrag-076-manifest.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  writeReadme(result);
  console.log(JSON.stringify({ ...result, pairs: undefined, rows: undefined }, null, 2));
  const ok =
    result.pairsDistinct &&
    result.maxOverflowPx === 0 &&
    result.axeSevereTotal === 0 &&
    result.facts.every(
      (f) =>
        f.comboStates.map((c) => c.state).join() === 'bereit,nicht_berechenbar,bereit' &&
        f.comboStates[1]?.badge === 'Nicht berechenbar' &&
        /1 Kombination/.test(f.offer) &&
        f.blockedDisabled &&
        /Zeitbasis/.test(f.blockedReason) &&
        /EBITDA-Marge/.test(f.chosen) &&
        /^EBITDA-Marge/.test(f.focusAfterPick) &&
        f.previewFormula === 'Formel: EBITDA ÷ Umsatzerlöse × 100' &&
        /verworfen/.test(f.dropped) &&
        f.previewAfterDrop === 0 &&
        f.tilesAfterMarge === f.tilesBefore + 1 &&
        /ist 0/.test(f.notComputable) &&
        f.escapeClosed &&
        f.saved,
    ) &&
    result.heights.every(
      (h) =>
        h.tileCount === 24 && h.loadingAll && h.diff.length === 0 && h.gridLoading === h.gridReady,
    ) &&
    result.full.every((f) => f.tiles === 24 && f.total === 24 && f.scrolled === 24);
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
