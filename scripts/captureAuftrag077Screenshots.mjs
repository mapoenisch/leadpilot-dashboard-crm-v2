#!/usr/bin/env node
/**
 * Auftrag 077 (Dashboard Teilauftrag 7): Screenshot-, Overflow-, axe-, Layoutverschiebungs- und
 * Ablaufnachweis der Kachel-Details im echten App-Ablauf (lokales Supabase, Testbenutzer).
 *
 * Drei Builds desselben Datenstands:
 *   BASE_URL   Build mit VITE_EXECUTIVE_DASHBOARD_V2=true (Nachher)
 *   OFF_URL    gleicher Code ohne Schalter (muss wie vorher sein)
 *   BEFORE_URL Baseline 7a60dd8 (Vorher)
 * 1. Vorher/Nachher je Breite 1440/768/375: /dashboard und die Detailseiten (vorher 404).
 *    SHA-256 je Paar muss sich unterscheiden.
 * 2. Nachher je Breite: Ansicht mit 24 Kacheln, Bearbeiten (Details gesperrt), Details zu Kennzahl,
 *    Diagramm, Kombination, CRM, Übersicht und unbekannter Kachel: Bild, SHA-256, Überlauf (0 px),
 *    axe serious/critical (0), Layoutverschiebung (CLS < 0,1).
 * 3. Schalter aus: /dashboard hat dieselben Überschriften wie vorher, Detailroute ist 404.
 * 4. Tastaturablauf: Details per Enter, Fokus auf Überschrift, zurück, Fokus auf „Details“.
 * Bilder bleiben lokal (.gitignore); das Skript schreibt docs/screenshots/auftrag-077/README.md.
 * Die Testkonfiguration des Benutzers wird am Ende wiederhergestellt; hatte er anfangs keine,
 * wird sie mit E2E_CLEANUP_KEY (lokaler Aufräumschlüssel) wieder entfernt.
 *
 * Aufruf: BASE_URL=… OFF_URL=… BEFORE_URL=… SUPABASE_URL=… SUPABASE_ANON_KEY=… \
 *         E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag077Screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import {
  axeSevere,
  deletePreferences,
  login,
  mainHeadings,
  overflowOf,
  readPreferences,
  savePreferences,
  scrollThrough,
  sessionUserId,
  shiftOf,
  shotConfig,
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
const BEFORE_URL = env('BEFORE_URL');
const SUPABASE = { url: env('SUPABASE_URL'), anonKey: env('SUPABASE_ANON_KEY') };
const CREDENTIALS = { email: env('E2E_AUTH_EMAIL'), password: env('E2E_AUTH_PASSWORD') };
/** Nur nötig, wenn der Benutzer anfangs keine Präferenzzeile hat (sie wird danach wieder entfernt). */
const CLEANUP_KEY = process.env.E2E_CLEANUP_KEY ?? null;
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-077');
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const DETAILS = [
  { name: 'Details Kennzahl', tileId: 'std_baseline_umsatz' },
  { name: 'Details Diagramm', tileId: 'std_baseline_mrr_paketmix' },
  { name: 'Details Kombination', tileId: 'shot_kombination_ebitda_marge' },
  { name: 'Details CRM', tileId: 'std_crm_pipeline_stufen_volumen' },
  { name: 'Details Übersicht', tileId: 'std_uebersicht_roadmap' },
  { name: 'Details unbekannte Kachel', tileId: 'gibt-es-nicht' },
];
const detailPath = (tileId) => `/dashboard/tiles/${encodeURIComponent(tileId)}`;
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const READY = '[data-testid="tile-detail"], [data-testid="tile-detail-missing"]';

async function open(browser, baseUrl, state, viewport, route) {
  const context = await browser.newContext({ baseURL: baseUrl, storageState: state, viewport });
  await startShiftObserver(context);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route, { waitUntil: 'networkidle' });
  return { context, page };
}

async function shoot(page, viewport, name, prefix) {
  const buffer = await page.screenshot({ fullPage: true });
  const file = `${prefix}-${viewport.width}-${slug(name)}.png`;
  fs.writeFileSync(path.join(OUT_DIR, file), buffer);
  return {
    width: viewport.width,
    name,
    sha256: sha256(buffer),
    overflowPx: await overflowOf(page),
    axeSevere: await axeSevere(page),
    shift: await shiftOf(page),
  };
}

async function afterRows(browser, state) {
  const rows = [];
  for (const viewport of WIDTHS) {
    const view = await open(browser, BASE_URL, state, viewport, '/dashboard');
    await view.page.getByTestId('dashboard-heading').waitFor();
    const tiles = await view.page.locator('[data-testid="lazy-tile"]').count();
    await scrollThrough(view.page, viewport);
    rows.push({ ...(await shoot(view.page, viewport, 'Ansicht 24 Kacheln', 'nachher')), tiles });
    await view.page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
    const blocked = await view.page
      .locator('[data-action="details"][aria-disabled="true"]')
      .count();
    rows.push({ ...(await shoot(view.page, viewport, 'Bearbeiten', 'nachher')), blocked });
    await view.context.close();
    for (const detail of DETAILS) {
      const { context, page } = await open(
        browser,
        BASE_URL,
        state,
        viewport,
        detailPath(detail.tileId),
      );
      await page.locator(READY).first().waitFor();
      await page.waitForLoadState('networkidle');
      rows.push(await shoot(page, viewport, detail.name, 'nachher'));
      await context.close();
    }
  }
  return rows;
}

async function beforeAfterPairs(browser, beforeState, afterState) {
  const pairs = [];
  for (const viewport of WIDTHS) {
    for (const route of ['/dashboard', detailPath('std_baseline_umsatz')]) {
      const shots = {};
      for (const [key, url, state] of [
        ['vorher', BEFORE_URL, beforeState],
        ['nachher', BASE_URL, afterState],
      ]) {
        const { context, page } = await open(browser, url, state, viewport, route);
        await page.waitForTimeout(300);
        shots[key] = await shoot(page, viewport, `Paar ${route}`, key);
        await context.close();
      }
      pairs.push({ width: viewport.width, route, ...shots });
    }
  }
  return pairs;
}

async function switchOffFacts(browser, beforeState, offState) {
  const viewport = WIDTHS[0];
  const before = await open(browser, BEFORE_URL, beforeState, viewport, '/dashboard');
  const off = await open(browser, OFF_URL, offState, viewport, '/dashboard');
  await before.page.waitForTimeout(500);
  await off.page.waitForTimeout(500);
  const facts = {
    headingsBefore: await mainHeadings(before.page),
    headingsOff: await mainHeadings(off.page),
    personalViewOff: await off.page.getByTestId('dashboard-heading').count(),
  };
  await off.page.goto(detailPath('std_baseline_umsatz'), { waitUntil: 'networkidle' });
  facts.detailOff = (await off.page.locator('main').innerText()).includes('Seite nicht gefunden');
  await before.context.close();
  await off.context.close();
  return facts;
}

async function keyboardFlow(browser, state) {
  const { context, page } = await open(browser, BASE_URL, state, WIDTHS[0], '/dashboard');
  const details = page
    .locator('[data-tile-id="std_baseline_umsatz"]')
    .getByRole('button', { name: /^Details zu / });
  await details.focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('tile-detail-heading').waitFor();
  const focusOnHeading = await page.evaluate(
    () => document.activeElement?.getAttribute('data-testid') === 'tile-detail-heading',
  );
  await page.getByRole('button', { name: 'Zurück zum Dashboard' }).focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('dashboard-heading').waitFor();
  await page.waitForFunction(
    () => document.activeElement?.getAttribute('data-action') === 'details',
  );
  const focusBack = await page.evaluate(() =>
    document.activeElement?.closest('[data-tile-id]')?.getAttribute('data-tile-id'),
  );
  await context.close();
  return { focusOnHeading, focusBack };
}

function writeReadme(m) {
  const short = (hash) => hash.slice(0, 16);
  const out = [
    '# Auftrag 077 – Screenshot- und Ablaufnachweis (Kachel-Details, Integration unter /dashboard)',
    '',
    `Erzeugt: ${m.capturedAt} mit \`scripts/captureAuftrag077Screenshots.mjs\` gegen drei Builds mit lokalem Supabase: Nachher (Schalter an), Schalter aus, Vorher (Baseline \`7a60dd8\`). Bilder bleiben lokal.`,
    '',
    '## Ergebnis',
    '',
    `- Vorher/Nachher-Paare unterschiedlich: ${m.pairsDistinct ? 'ja' : 'NEIN'}`,
    `- Größter Seitenüberlauf: ${m.maxOverflowPx} px`,
    `- axe serious/critical gesamt: ${m.axeSevereTotal}`,
    `- Größte Layoutverschiebung (CLS): ${m.maxShift}`,
    `- Ansicht: ${m.rows
      .filter((r) => r.tiles !== undefined)
      .map((r) => `${r.width} px ${r.tiles} Kacheln`)
      .join(', ')}`,
    `- Bearbeiten, gesperrte „Details“: ${m.rows
      .filter((r) => r.blocked !== undefined)
      .map((r) => `${r.width} px ${r.blocked}`)
      .join(', ')}`,
    `- Schalter aus: Überschriften wie vorher ${m.off.headingsEqual ? 'ja' : 'NEIN'}, keine persönliche Ansicht ${m.off.personalViewOff === 0 ? 'ja' : 'NEIN'}, Detailroute 404 ${m.off.detailOff ? 'ja' : 'NEIN'}`,
    `- Tastatur: Fokus auf Überschrift ${m.keyboard.focusOnHeading ? 'ja' : 'NEIN'}, Rückkehr auf „Details“ von \`${m.keyboard.focusBack}\``,
    '',
    '## Vorher/Nachher',
    '',
    '| Breite | Seite | Vorher | Nachher | verschieden |',
    '|---:|---|---|---|---|',
    ...m.pairs.map(
      (p) =>
        `| ${p.width} | \`${p.route}\` | ${short(p.vorher.sha256)} | ${short(p.nachher.sha256)} | ${p.vorher.sha256 !== p.nachher.sha256 ? 'ja' : 'NEIN'} |`,
    ),
    '',
    '## Zustände (Nachher)',
    '',
    '| Breite | Zustand | Überlauf | axe serious/critical | CLS | SHA-256 (gekürzt) |',
    '|---:|---|---:|---|---:|---|',
    ...m.rows.map(
      (r) =>
        `| ${r.width} | ${r.name} | ${r.overflowPx} px | ${r.axeSevere.length ? r.axeSevere.join(', ') : 'keine'} | ${r.shift} | ${short(r.sha256)} |`,
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
  let restore = null;
  try {
    const afterState = await login(browser, BASE_URL, CREDENTIALS);
    const offState = await login(browser, OFF_URL, CREDENTIALS);
    const beforeState = await login(browser, BEFORE_URL, CREDENTIALS);
    // Testkonfiguration (24 Kacheln) setzen; die bisherige Fassung wird am Ende zurückgeschrieben.
    const setup = await open(browser, BASE_URL, afterState, WIDTHS[0], '/dashboard');
    const original = await readPreferences(setup.page, SUPABASE);
    const userId = await sessionUserId(setup.page);
    // Ohne Ausgangszeile muss sie danach wieder fehlen: vorher prüfen, dass das möglich ist.
    if (!original.config && !CLEANUP_KEY) {
      throw new Error('Keine Ausgangskonfiguration: E2E_CLEANUP_KEY zum Wiederherstellen setzen.');
    }
    const saved = await savePreferences(setup.page, SUPABASE, shotConfig(ROOT), original.revision);
    restore = {
      page: setup.page,
      context: setup.context,
      original,
      userId,
      revision: saved.revision,
    };

    const rows = await afterRows(browser, afterState);
    const pairs = await beforeAfterPairs(browser, beforeState, afterState);
    const off = await switchOffFacts(browser, beforeState, offState);
    off.headingsEqual = JSON.stringify(off.headingsBefore) === JSON.stringify(off.headingsOff);
    const keyboard = await keyboardFlow(browser, afterState);
    result = {
      capturedAt: new Date().toISOString(),
      pairsDistinct: pairs.every((pair) => pair.vorher.sha256 !== pair.nachher.sha256),
      maxOverflowPx: Math.max(...rows.map((r) => r.overflowPx)),
      axeSevereTotal: rows.reduce((sum, r) => sum + r.axeSevere.length, 0),
      maxShift: Math.max(...rows.map((r) => r.shift)),
      rows,
      pairs,
      off,
      keyboard,
    };
  } finally {
    if (restore?.original.config) {
      await savePreferences(restore.page, SUPABASE, restore.original.config, restore.revision);
    } else if (restore) {
      await deletePreferences(SUPABASE, CLEANUP_KEY, restore.userId);
    }
    await restore?.context.close();
    await browser.close();
  }
  writeReadme(result);
  console.log(JSON.stringify({ ...result, rows: undefined, pairs: undefined }, null, 2));
  const ok =
    result.pairsDistinct &&
    result.maxOverflowPx === 0 &&
    result.axeSevereTotal === 0 &&
    result.maxShift < 0.1 &&
    result.rows.filter((r) => r.tiles !== undefined).every((r) => r.tiles === 24) &&
    result.rows.filter((r) => r.blocked !== undefined).every((r) => r.blocked === 24) &&
    result.off.headingsEqual &&
    result.off.personalViewOff === 0 &&
    result.off.detailOff &&
    result.keyboard.focusOnHeading &&
    result.keyboard.focusBack === 'std_baseline_umsatz';
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
