#!/usr/bin/env node
/**
 * Auftrag 074 (Dashboard Teilauftrag 5): Screenshot-, Overflow-, axe-, Netzwerk- und Ablaufnachweis
 * des Arbeitsbereichs auf /dashboard-vorschau.html?bereich=editor (ohne Anmeldung, Testdaten,
 * Speicher-Ersatz im Arbeitsspeicher).
 *
 * 1. Vorher/Nachher: ganze Vorschauseite auf 1440/768/375 px gegen BEFORE_URL (Basis 6484368, ohne
 *    Arbeitsbereich) und BASE_URL (mit Arbeitsbereich). SHA-256 je Paar muss sich unterscheiden.
 * 2. Je Breite: Ansicht, Bearbeiten, Konfigurationsfenster mit Bild, SHA-256, Seitenüberlauf (0 px)
 *    und axe serious/critical.
 * 3. Lazy: Konfigurator-Modul erst beim Öffnen; auf 375 px sind beim Start nicht alle Kacheln aktiv,
 *    nach dem Scrollen alle; Layoutverschiebung (CLS) beim Scrollen.
 * 4. Ablauf mit Tastatur: Verschieben mit Fokus und Ansage, Hinzufügen, Speichern mit Fehler,
 *    Konflikt (drei Wege) und Erfolg.
 * Bilder bleiben lokal (.gitignore); das Skript schreibt docs/screenshots/auftrag-074/README.md.
 *
 * Aufruf: BASE_URL=http://localhost:4173 BEFORE_URL=http://localhost:4174 \
 *         node scripts/captureAuftrag074Screenshots.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { dialogRows, dragCheck, fullLazyRows, heightRows } from './lib/dashboardShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';
const BEFORE_URL = process.env.BEFORE_URL ?? 'http://localhost:4174';
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-074');
const PAGE = '/dashboard-vorschau.html';
const EDITOR = `${PAGE}?bereich=editor`;
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
  return { context, page };
}

const counter = async (page) => {
  const text = (await page.getByTestId('aktivierte-kacheln').textContent()) ?? '';
  const [, n, m] = /(\d+) von (\d+)/.exec(text) ?? [];
  return { active: Number(n), total: Number(m) };
};

async function severeAxe(page) {
  const axe = await new AxeBuilder({ page }).include(WORKSPACE).analyze();
  return axe.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id);
}

async function beforeAfter(browser) {
  const pairs = [];
  for (const viewport of WIDTHS) {
    const shots = {};
    for (const [label, url] of [
      ['vorher', `${BEFORE_URL}${PAGE}`],
      ['nachher', `${BASE_URL}${EDITOR}`],
    ]) {
      const { context, page } = await open(browser, viewport, url);
      if (label === 'nachher') await page.locator(WORKSPACE).waitFor();
      else await page.getByTestId('dashboard-test-tile').waitFor();
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
  const lazy = [];
  for (const viewport of WIDTHS) {
    const requests = [];
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    page.on('request', (request) => requests.push(request.url()));
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (!entry.hadRecentInput) window.__cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`${BASE_URL}${EDITOR}`, { waitUntil: 'networkidle' });
    await page.locator(WORKSPACE).waitFor();
    const initial = await counter(page);
    // Schriftwechsel beim Seitenaufbau gehört nicht zur Aktivierung: Zähler danach zurücksetzen.
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.__cls = 0;
    });
    // Scrollen: nicht sichtbare Kacheln werden aktiv; Layoutverschiebung dabei messen.
    const steps = Math.ceil(
      (await page.evaluate(() => document.body.scrollHeight)) / viewport.height,
    );
    for (let i = 0; i < steps + 1; i += 1) {
      await page.mouse.wheel(0, viewport.height * 0.9);
      await page.waitForTimeout(150);
    }
    await page.waitForLoadState('networkidle');
    const scrolled = await counter(page);
    const cls = await page.evaluate(() => window.__cls);
    await page.evaluate(() => window.scrollTo(0, 0));
    const beforeConfigurator = requests.filter((url) => /TileConfigurator/.test(url)).length;

    const shot = async (name) => {
      const file = `${viewport.width}-${name}.png`;
      const image = await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
      return { file, sha256: sha256(image) };
    };
    const step = async (name, extra = {}) => ({
      width: viewport.width,
      name,
      overflowPx: await overflowOf(page),
      axeSevere: await severeAxe(page),
      ...(await shot(name)),
      ...extra,
    });

    rows.push(await step('ansicht'));
    await page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
    await page
      .getByRole('button', { name: /Nach unten, Position 1 von/ })
      .first()
      .waitFor();
    rows.push(await step('bearbeiten'));

    // Tastatur: Nach unten verschieben, Fokus bleibt auf der Schaltfläche, Ansage nennt die Position.
    const down = page.getByRole('button', { name: /Nach unten, Position 1 von/ }).first();
    await down.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') ?? '',
    );
    const live =
      (await page.locator('[role="status"][aria-live="polite"]').first().textContent()) ?? '';

    const dragOk = await dragCheck(page, viewport.width);

    // Konfigurator: erst beim Öffnen geladen; Escape gibt den Fokus zurück.
    const trigger = page.getByRole('button', { name: 'Kachel hinzufügen' }).first();
    await trigger.focus();
    await trigger.click();
    await page.getByRole('dialog').waitFor();
    const afterConfigurator = requests.filter((url) => /TileConfigurator/.test(url)).length;
    await page.getByRole('radio', { name: /ARR/ }).first().check();
    await page.getByTestId('configurator-preview').waitFor();
    // Die Einblendung des Fensters (150 ms) ist keine Ruhelage: erst danach messen und aufnehmen.
    await page.waitForTimeout(400);
    rows.push(await step('konfigurator'));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.waitForTimeout(100);
    const returnedFocus = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? '',
    );

    // Hinzufügen übernimmt die Kachel in die Arbeitskopie.
    const tilesBefore = await page.getByRole('listitem').count();
    await trigger.click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('radio', { name: /ARR/ }).first().check();
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    const tilesAfter = await page.getByRole('listitem').count();

    // Lange Texte: Titel mit 80 und Pipeline mit 64 Zeichen ohne Leerzeichen brechen um.
    await trigger.click();
    await page.getByRole('dialog').waitFor();
    await page.getByLabel('Kennzahl suchen').fill('Pipeline');
    await page
      .getByRole('radio', { name: /Pipeline/ })
      .first()
      .check();
    await page.getByLabel('Eigener Titel (optional)').fill('W'.repeat(80));
    await page.getByLabel(/Eigene Pipeline/).fill('P'.repeat(64));
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.waitForTimeout(400);
    rows.push(await step('langtexte'));
    const tilesWithLong = await page.getByRole('listitem').count();

    // Speichern mit Fehler: Entwurf bleibt, Text verständlich.
    await page.getByRole('radio', { name: 'Technischer Fehler' }).check();
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.getByTestId('save-error').waitFor();
    const errorText = (await page.getByTestId('save-error').textContent()) ?? '';
    const draftKept = (await page.getByRole('listitem').count()) === tilesWithLong;
    rows.push(await step('speicherfehler'));

    // Konflikt: drei Wege, nichts wird still überschrieben.
    await page.getByRole('radio', { name: 'Konflikt' }).check();
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.getByRole('button', { name: 'Aktuelle Serveransicht laden' }).waitFor();
    const takeVisible = await page
      .getByRole('button', { name: 'Entwurf verwerfen und Serverfassung übernehmen' })
      .isVisible();
    await page.getByRole('button', { name: 'Aktuelle Serveransicht laden' }).click();
    const forceButton = page.getByRole('button', {
      name: 'Trotzdem speichern (ersetzt die neuere Fassung)',
    });
    await forceButton.waitFor();
    rows.push(await step('konflikt'));
    await forceButton.click();
    await page.getByText('Gespeichert.').first().waitFor();
    const savedBack = await page.getByRole('button', { name: 'Dashboard bearbeiten' }).isVisible();

    lazy.push({
      width: viewport.width,
      initialActive: initial.active,
      total: initial.total,
      scrolledActive: scrolled.active,
      cls: Number(cls.toFixed(4)),
      configuratorBefore: beforeConfigurator,
      configuratorAfter: afterConfigurator,
      focusedAfterMove: focused,
      announcement: live.trim(),
      returnedFocus,
      tilesBefore,
      tilesAfter,
      errorText: errorText.trim(),
      draftKept,
      dragOk,
      takeVisible,
      savedBack,
    });
    await context.close();
  }
  return { rows, lazy };
}

const short = (hash) => `\`${hash.slice(0, 16)}\``;

function writeReadme(m) {
  const out = [
    '# Screenshot-Matrix Auftrag 074 (Dashboard Teilauftrag 5, Raster, Editor und Konfigurationsfenster)',
    '',
    'Erzeugt mit `scripts/captureAuftrag074Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `6484368` (Testkachel und Galerie), Nachher = dieser Stand (`?bereich=editor`, nur Arbeitsbereich). Testdaten, Speicher-Ersatz im Arbeitsspeicher, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).',
    '',
    `- Aufnahme: ${m.capturedAt}`,
    `- Vorher/Nachher-Paare verschieden: ${m.pairsDistinct ? 'ja' : 'nein'}`,
    `- Größter horizontaler Seitenüberlauf: ${m.maxOverflowPx} px`,
    `- axe-Verstöße serious/critical: ${m.axeSevereTotal}`,
    `- Konfigurator-Modul vor dem Öffnen angefragt: ${m.lazy.map((l) => `${l.width}: ${l.configuratorBefore}`).join(', ')}; nach dem Öffnen: ${m.lazy.map((l) => `${l.width}: ${l.configuratorAfter}`).join(', ')}`,
    `- Aktivierte Kacheln beim Start / nach dem Scrollen: ${m.lazy.map((l) => `${l.width}: ${l.initialActive}/${l.scrolledActive} von ${l.total}`).join(', ')}`,
    `- Layoutverschiebung (CLS) beim Scrollen: ${m.lazy.map((l) => `${l.width}: ${l.cls}`).join(', ')}`,
    `- Fokus nach „Nach unten“ bleibt auf der Schaltfläche: ${m.lazy.every((l) => /Nach unten/.test(l.focusedAfterMove)) ? 'ja' : 'nein'}; Ansage: ${m.lazy[0]?.announcement}`,
    `- Escape im Konfigurator gibt den Fokus zurück an: ${[...new Set(m.lazy.map((l) => l.returnedFocus))].join(' / ')}`,
    `- Ziehen über den Griff ordnet neu (DOM-Reihenfolge): ${m.lazy.map((l) => `${l.width}: ${l.dragOk === null ? 'kein Griff' : l.dragOk ? 'ja' : 'nein'}`).join(', ')}`,
    `- Hinzufügen: Kacheln ${m.lazy.map((l) => `${l.width}: ${l.tilesBefore}→${l.tilesAfter}`).join(', ')}`,
    `- Speicherfehler: Text „${m.lazy[0]?.errorText}“, Entwurf bleibt: ${m.lazy.every((l) => l.draftKept) ? 'ja' : 'nein'}`,
    `- Konflikt: drei Wege sichtbar, danach „Gespeichert.“ und Rückkehr in die Ansicht: ${m.lazy.every((l) => l.takeVisible && l.savedBack) ? 'ja' : 'nein'}`,
    '',
    `- Höhe ganzer Kacheln und des Rasters, Laden → bereit und Skelett → bereit (Abweichungen je Breite): ${m.heights.map((h) => `${h.width}: ${h.tileCount} Kacheln, laden ${h.loadingDiff.length}, Skelett ${h.skeletonDiff.length}, Raster ${h.gridLoading}/${h.gridSkeleton}/${h.gridReady} px`).join('; ')}`,
    '',
    `- Höchstbelegung 24 Kacheln, aktiv beim Start / nach dem Scrollen: ${m.full.map((f) => `${f.width}: ${f.initial}/${f.scrolled} von ${f.total}`).join(', ')}`,
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
    const { rows: flowRows, lazy } = await flows(browser);
    const rows = [...flowRows, ...(await dialogRows(browser, CTX))];
    const heights = await heightRows(browser, CTX);
    const full = await fullLazyRows(browser, CTX);
    result = {
      baseUrl: BASE_URL,
      beforeUrl: BEFORE_URL,
      capturedAt: new Date().toISOString(),
      pairsDistinct: pairs.every((pair) => pair.vorher.sha256 !== pair.nachher.sha256),
      maxOverflowPx: Math.max(
        ...rows.map((row) => row.overflowPx),
        ...pairs.map((pair) => pair.nachher.overflowPx),
      ),
      axeSevereTotal: rows.reduce((sum, row) => sum + row.axeSevere.length, 0),
      pairs,
      rows,
      lazy,
      heights,
      full,
    };
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(os.tmpdir(), 'auftrag-074-manifest.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  writeReadme(result);
  console.log(JSON.stringify({ ...result, pairs: undefined }, null, 2));
  const small = result.lazy.find((l) => l.width === 375);
  const ok =
    result.pairsDistinct &&
    result.maxOverflowPx === 0 &&
    result.axeSevereTotal === 0 &&
    result.lazy.every(
      (l) =>
        l.configuratorBefore === 0 &&
        l.configuratorAfter > 0 &&
        l.scrolledActive === l.total &&
        /Nach unten/.test(l.focusedAfterMove) &&
        /Position 2/.test(l.announcement) &&
        l.tilesAfter === l.tilesBefore + 1 &&
        l.draftKept &&
        l.dragOk !== false &&
        (l.width < 768 || l.dragOk === true) &&
        l.takeVisible &&
        l.savedBack &&
        l.cls < 0.01,
    ) &&
    result.heights.every(
      (h) =>
        h.readyAll &&
        h.loadingAll &&
        h.skeletonAll &&
        h.loadingDiff.length === 0 &&
        h.skeletonDiff.length === 0 &&
        h.gridReady === h.gridLoading &&
        h.gridReady === h.gridSkeleton,
    ) &&
    result.full.every(
      (f) => f.tiles === 24 && f.total === 24 && f.scrolled === 24 && f.initial < 24,
    ) &&
    small !== undefined &&
    small.initialActive < small.total;
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
