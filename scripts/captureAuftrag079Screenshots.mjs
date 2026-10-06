#!/usr/bin/env node
/**
 * Auftrag 079 (Dashboard Teilauftrag 8b, Gesamtabnahme): Bildmatrix und Ablaufnachweise über den
 * vollständigen Katalog im echten App-Ablauf (lokales Supabase, Testbenutzer).
 *
 * Zwei Builds desselben Codes und Datenstands:
 *   BASE_URL  Build mit persönlicher Ansicht (Nachher; seit dem Rollout der Standard-Build)
 *   OFF_URL   Build mit VITE_EXECUTIVE_DASHBOARD_V2=false (Vorher, bisherige Ansicht)
 * 1. Durchgänge aus scripts/lib/acceptanceShotConfigs.ts (vollständiger Katalog in
 *    Standarddarstellung, jede Darstellung in jeder zulässigen Größe) je Breite 1440/768/375:
 *    Bild, SHA-256, Überlauf (Dokument und <main>, 0 px), axe serious/critical inkl. Kontrast (0),
 *    Layoutverschiebung (CLS < 0,1), alle Kacheln aktiv, jede Diagrammkachel mit Datentabelle,
 *    reduzierte Bewegung ohne Übergänge. Erster Durchgang zusätzlich im Bearbeitungsmodus.
 * 2. Vorher/Nachher je Breite: SHA-256 verschieden; Schalter aus ohne neue Ansicht und Detailroute.
 * 3. Tastatur: Bearbeiten, Verschieben, Konfigurator öffnen/schließen (Fokus zurück), Speichern.
 * 4. Touch (375 px): Legende antippen, „Details“ antippen und zurück.
 * Bilder bleiben lokal (.gitignore); das Skript schreibt docs/screenshots/auftrag-079/README.md.
 * Die Konfiguration des Benutzers wird am Ende wiederhergestellt (ohne Ausgangszeile per
 * E2E_CLEANUP_KEY, nur lokal).
 *
 * Aufruf: BASE_URL=… OFF_URL=… SUPABASE_URL=… SUPABASE_ANON_KEY=… E2E_AUTH_EMAIL=… \
 *         E2E_AUTH_PASSWORD=… [E2E_CLEANUP_KEY=…] node scripts/captureAuftrag079Screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import {
  activeTileCount,
  axeSevere,
  deletePreferences,
  login,
  readPreferences,
  savePreferences,
  scrollThrough,
  sessionUserId,
  shiftOf,
  startShiftObserver,
} from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt.`);
  return value;
};
const BASE_URL = env('BASE_URL');
const OFF_URL = env('OFF_URL');
const SUPABASE = { url: env('SUPABASE_URL'), anonKey: env('SUPABASE_ANON_KEY') };
const CREDENTIALS = { email: env('E2E_AUTH_EMAIL'), password: env('E2E_AUTH_PASSWORD') };
const CLEANUP_KEY = process.env.E2E_CLEANUP_KEY ?? null;
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-079');
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const CHART_VIEWS = new Set(['saeulen', 'balken', 'kreis', 'ring', 'linie', 'flaeche']);
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const { activeEntries, batches } = JSON.parse(
  execFileSync('npx', ['tsx', 'scripts/lib/acceptanceShotConfigs.ts'], { cwd: ROOT }).toString(),
);

async function open(browser, baseUrl, state, viewport, route, extra = {}) {
  const context = await browser.newContext({
    baseURL: baseUrl,
    storageState: state,
    viewport,
    reducedMotion: 'reduce',
    ...extra,
  });
  await startShiftObserver(context);
  const page = await context.newPage();
  await page.goto(route, { waitUntil: 'networkidle' });
  return { context, page };
}

const ready = (page) =>
  page.getByTestId('dashboard-workspace').and(page.locator('[aria-busy="false"]')).waitFor();

/** Überlauf des Dokuments und des Scrollbereichs `<main>` (das Layout scrollt `<main>`). */
const overflowPx = (page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector('main');
    return Math.max(
      doc.scrollWidth - doc.clientWidth,
      main ? main.scrollWidth - main.clientWidth : 0,
    );
  });

/** Jede Diagrammkachel bietet „Werte als Tabelle“, jede Tabellenkachel ihre Tabelle. */
const tableAccess = (page) =>
  page.evaluate((chartViews) => {
    const tiles = Array.from(document.querySelectorAll('[data-testid="dashboard-tile"]'));
    const charts = tiles.filter((t) => chartViews.includes(t.getAttribute('data-view')));
    const tables = tiles.filter((t) => t.getAttribute('data-view') === 'tabelle');
    const hasSummary = (t) =>
      Array.from(t.querySelectorAll('summary')).some((s) => s.textContent?.includes('Tabelle'));
    return {
      charts: charts.length,
      chartsWithTable: charts.filter(hasSummary).length,
      tables: tables.length,
      tablesShown: tables.filter((t) => t.querySelector('[data-testid="tile-table"]')).length,
    };
  }, Array.from(CHART_VIEWS));

/** Längste Übergangsdauer an Kacheln und Legenden bei reduzierter Bewegung (Sekunden). */
const maxTransition = (page) =>
  page.evaluate(() => {
    const nodes = document.querySelectorAll(
      '[data-testid="dashboard-tile"], [data-testid="dashboard-tile"] button[aria-pressed]',
    );
    let max = 0;
    for (const node of nodes) {
      for (const part of getComputedStyle(node).transitionDuration.split(',')) {
        const value = part.trim();
        const seconds = value.endsWith('ms') ? parseFloat(value) / 1000 : parseFloat(value);
        if (Number.isFinite(seconds)) max = Math.max(max, seconds);
      }
    }
    return max;
  });

/** Ganzseitiges Bild: `<main>` für die Aufnahme aufklappen, Messwerte stammen von vorher. */
async function shoot(page, viewport, name, prefix) {
  const style = await page.addStyleTag({
    content:
      'html,body,#root,#root>*{height:auto!important;overflow:visible!important}' +
      'main{height:auto!important;overflow:visible!important}',
  });
  const buffer = await page.screenshot({ fullPage: true });
  await style.evaluate((node) => node.remove());
  fs.writeFileSync(path.join(OUT_DIR, `${prefix}-${viewport.width}-${slug(name)}.png`), buffer);
  return sha256(buffer);
}

async function measure(page, viewport, name, prefix) {
  const facts = {
    width: viewport.width,
    name,
    overflowPx: await overflowPx(page),
    axeSevere: await axeSevere(page),
    shift: await shiftOf(page),
  };
  return { ...facts, sha256: await shoot(page, viewport, name, prefix) };
}

async function batchRows(browser, state, setup) {
  const rows = [];
  for (const batch of batches) {
    setup.revision = (
      await savePreferences(setup.page, SUPABASE, batch.config, setup.revision)
    ).revision;
    for (const viewport of WIDTHS) {
      const { context, page } = await open(browser, BASE_URL, state, viewport, '/dashboard');
      await ready(page);
      const tiles = await page.locator('[data-testid="lazy-tile"]').count();
      await scrollThrough(page, viewport);
      rows.push({
        ...(await measure(page, viewport, batch.name, 'nachher')),
        expected: batch.config.tiles.length,
        tiles,
        active: await activeTileCount(page),
        table: await tableAccess(page),
        transition: await maxTransition(page),
      });
      if (batch === batches[0]) {
        await page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
        rows.push(await measure(page, viewport, `${batch.name} Bearbeiten`, 'nachher'));
      }
      await context.close();
    }
  }
  return rows;
}

async function beforeAfter(browser, offState, afterState) {
  const pairs = [];
  for (const viewport of WIDTHS) {
    const shots = {};
    for (const [key, url, state] of [
      ['vorher', OFF_URL, offState],
      ['nachher', BASE_URL, afterState],
    ]) {
      const { context, page } = await open(browser, url, state, viewport, '/dashboard');
      await page.waitForTimeout(500);
      shots[key] = await measure(page, viewport, 'Paar /dashboard', key);
      await context.close();
    }
    pairs.push({ width: viewport.width, ...shots });
  }
  const { context, page } = await open(browser, OFF_URL, offState, WIDTHS[0], '/dashboard');
  const off = { personalView: await page.getByTestId('dashboard-heading').count() };
  await page.goto(`/dashboard/tiles/${batches[0].config.tiles[0].tileId}`, {
    waitUntil: 'networkidle',
  });
  off.detail404 = (await page.locator('main').innerText()).includes('Seite nicht gefunden');
  await context.close();
  return { pairs, off };
}

async function keyboardFlow(browser, state, setup) {
  const { context, page } = await open(browser, BASE_URL, state, WIDTHS[0], '/dashboard');
  await ready(page);
  const order = () =>
    page
      .locator('[data-testid="lazy-tile"]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-tile-id')));
  const press = async (locator) => {
    await locator.focus();
    await page.keyboard.press('Enter');
  };
  const before = await order();
  await press(page.getByRole('button', { name: 'Dashboard bearbeiten' }));
  await press(page.locator('[data-action="runter"]').first());
  const moved = JSON.stringify(await order()) !== JSON.stringify(before);
  // Der Durchgang hat 24 Kacheln: „Kachel hinzufügen“ ist dort gesperrt. Derselbe Konfigurator
  // öffnet sich über „Bearbeiten“ einer Kachel.
  const add = page.locator('[data-action="bearbeiten"]').first();
  await press(add);
  // Der Konfigurator ist ein eigener Lazy-Chunk: auf ihn warten statt sofort zu prüfen.
  const dialogOpened = await page
    .getByRole('dialog')
    .waitFor()
    .then(
      () => true,
      () => false,
    );
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const focusBack = await add.evaluate((node) => node === document.activeElement);
  await press(page.getByRole('button', { name: 'Speichern', exact: true }));
  await page.getByTestId('editor-toolbar').getByRole('status').getByText('Gespeichert.').waitFor();
  const saved = await readPreferences(setup.page, SUPABASE);
  const savedOrder = saved.config.tiles.map((t) => t.tileId);
  setup.revision = saved.revision;
  await context.close();
  return {
    moved,
    dialogOpened,
    focusBack,
    savedMoved: JSON.stringify(savedOrder) !== JSON.stringify(before),
  };
}

async function touchFlow(browser, state) {
  const viewport = WIDTHS[2];
  const { context, page } = await open(browser, BASE_URL, state, viewport, '/dashboard', {
    hasTouch: true,
    isMobile: true,
  });
  await ready(page);
  const ringTile = page.locator('[data-testid="dashboard-tile"][data-view="ring"]').first();
  await ringTile.scrollIntoViewIfNeeded();
  const legend = ringTile.locator('[role="group"] button[aria-pressed]').first();
  await legend.waitFor();
  await legend.tap();
  const legendPressed = (await legend.getAttribute('aria-pressed')) === 'true';
  const first = page.locator('[data-testid="lazy-tile"]').first();
  await first.scrollIntoViewIfNeeded();
  await first.getByRole('button', { name: /^Details zu / }).tap();
  const detailShown = await page
    .getByTestId('tile-detail-heading')
    .waitFor()
    .then(
      () => true,
      () => false,
    );
  await page.getByRole('button', { name: 'Zurück zum Dashboard' }).tap();
  const backShown = await page
    .getByTestId('dashboard-heading')
    .waitFor()
    .then(
      () => true,
      () => false,
    );
  await context.close();
  return { legendPressed, detailShown, backShown };
}

function evaluate(m) {
  const viewRows = m.rows.filter((r) => r.tiles !== undefined);
  const checks = {
    'Vorher/Nachher verschieden': m.pairs.every((p) => p.vorher.sha256 !== p.nachher.sha256),
    'Überlauf 0 px': [...m.rows, ...m.pairs.map((p) => p.nachher)].every((r) => r.overflowPx === 0),
    'axe serious/critical 0': m.rows.every((r) => r.axeSevere.length === 0),
    'CLS < 0,1': m.rows.every((r) => r.shift < 0.1),
    'alle Kacheln da und aktiv': viewRows.every(
      (r) => r.tiles === r.expected && r.active === r.expected,
    ),
    'Datentabelle je Diagramm': viewRows.every(
      (r) => r.table.chartsWithTable === r.table.charts && r.table.tablesShown === r.table.tables,
    ),
    'reduzierte Bewegung ≤ 0,01 ms': viewRows.every((r) => r.transition <= 0.00001),
    'Schalter aus: alte Ansicht, Detailroute 404': m.off.personalView === 0 && m.off.detail404,
    'Tastatur: verschieben, Dialog, Fokus, speichern':
      m.keyboard.moved && m.keyboard.dialogOpened && m.keyboard.focusBack && m.keyboard.savedMoved,
    'Touch: Legende, Details, zurück':
      m.touch.legendPressed && m.touch.detailShown && m.touch.backShown,
  };
  return { checks, ok: Object.values(checks).every(Boolean) };
}

function writeReadme(m, result) {
  const short = (hash) => hash.slice(0, 16);
  const yes = (value) => (value ? 'ja' : 'NEIN');
  const out = [
    '# Auftrag 079 – Gesamtabnahme Executive Dashboard (Bildmatrix und Abläufe)',
    '',
    `Erzeugt: ${m.capturedAt} mit \`scripts/captureAuftrag079Screenshots.mjs\` gegen zwei Builds desselben Codes mit lokalem Supabase: Nachher (Schalter an) und Vorher (Schalter aus, bisherige Ansicht). ${activeEntries} aktive Katalogeinträge in ${batches.length} Durchgängen (${batches.map((b) => `${b.name}: ${b.config.tiles.length}`).join(', ')}). Reduzierte Bewegung emuliert. Bilder bleiben lokal.`,
    '',
    '## Ergebnis',
    '',
    ...Object.entries(result.checks).map(([name, ok]) => `- ${name}: ${yes(ok)}`),
    '',
    `Tastatur: verschoben ${yes(m.keyboard.moved)}, Konfigurator geöffnet ${yes(m.keyboard.dialogOpened)}, Fokus zurück auf „Bearbeiten“ ${yes(m.keyboard.focusBack)}, gespeichert ${yes(m.keyboard.savedMoved)}. Touch: Legende ${yes(m.touch.legendPressed)}, Details ${yes(m.touch.detailShown)}, zurück ${yes(m.touch.backShown)}.`,
    '',
    '## Vorher/Nachher (`/dashboard`)',
    '',
    '| Breite | Vorher (Schalter aus) | Nachher (Schalter an) | verschieden |',
    '|---:|---|---|---|',
    ...m.pairs.map(
      (p) =>
        `| ${p.width} | ${short(p.vorher.sha256)} | ${short(p.nachher.sha256)} | ${yes(p.vorher.sha256 !== p.nachher.sha256)} |`,
    ),
    '',
    '## Durchgänge (Nachher)',
    '',
    '| Breite | Durchgang | Kacheln (aktiv) | Diagramme mit Tabelle | Überlauf | axe serious/critical | CLS | Übergang max. | SHA-256 (gekürzt) |',
    '|---:|---|---|---|---:|---|---:|---:|---|',
    ...m.rows.map(
      (r) =>
        `| ${r.width} | ${r.name} | ${r.tiles === undefined ? '–' : `${r.tiles}/${r.expected} (${r.active})`} | ${r.table ? `${r.table.chartsWithTable}/${r.table.charts}` : '–'} | ${r.overflowPx} px | ${r.axeSevere.length ? r.axeSevere.join(', ') : 'keine'} | ${r.shift} | ${r.transition === undefined ? '–' : `${r.transition * 1000} ms`} | ${short(r.sha256)} |`,
    ),
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), `${out.join('\n')}\n`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  let setup = null;
  let original = null;
  let userId = null;
  let m;
  try {
    const afterState = await login(browser, BASE_URL, CREDENTIALS);
    const offState = await login(browser, OFF_URL, CREDENTIALS);
    const opened = await open(browser, BASE_URL, afterState, WIDTHS[0], '/dashboard');
    original = await readPreferences(opened.page, SUPABASE);
    userId = await sessionUserId(opened.page);
    if (!original.config && !CLEANUP_KEY) {
      throw new Error('Keine Ausgangskonfiguration: E2E_CLEANUP_KEY zum Wiederherstellen setzen.');
    }
    setup = { ...opened, revision: original.revision };

    const rows = await batchRows(browser, afterState, setup);
    setup.revision = (
      await savePreferences(setup.page, SUPABASE, batches[0].config, setup.revision)
    ).revision;
    const { pairs, off } = await beforeAfter(browser, offState, afterState);
    const keyboard = await keyboardFlow(browser, afterState, setup);
    const touch = await touchFlow(browser, afterState);
    m = { capturedAt: new Date().toISOString(), rows, pairs, off, keyboard, touch };
  } finally {
    if (setup && original?.config) {
      // Frisch lesen: ein abgebrochener Ablauf kann zwischendurch gespeichert haben.
      const current = await readPreferences(setup.page, SUPABASE);
      await savePreferences(setup.page, SUPABASE, original.config, current.revision);
    } else if (setup) {
      await deletePreferences(SUPABASE, CLEANUP_KEY, userId);
    }
    await setup?.context.close();
    await browser.close();
  }
  const result = evaluate(m);
  writeReadme(m, result);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
