#!/usr/bin/env node
/**
 * Auftrag 083 (Korrekturauftrag F15): axe serious/critical über die ganze Seite (Kopfzeile, Sidebar,
 * Simulationsleiste, <main>) in allen 42 Ansichten des 081-Inventars plus der Anmeldeseite, dunkel und hell, 1440/768/375 px.
 * Je Verstoß werden Regel, Selektor, Vorder-/Hintergrundfarbe und Kontrastwert protokolliert, damit
 * die Ursache im Code auffindbar ist. Horizontaler Überlauf von Dokument oder <main> über dem Ausgangsstand des
 * 081-Inventars zählt ebenfalls als Verstoß. Optional zusätzlich Bilder für den Vorher/Nachher-Vergleich.
 *
 * Aufruf: BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… [ONLY=dashboard,s-daten] [SHOTS_DIR=…]
 *         [JSON_OUT=…] node scripts/captureAuftrag083ContrastScan.mjs
 * Exit-Code 1, sobald ein Verstoß gefunden wird oder eine Ansicht nicht öffnet.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt.`);
  return value;
};
const BASE_URL = env('BASE_URL');
const CREDENTIALS = { email: env('E2E_AUTH_EMAIL'), password: env('E2E_AUTH_PASSWORD') };
const ONLY = process.env.ONLY
  ? new Set(
      process.env.ONLY.split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
  : null;
const SHOTS_DIR = process.env.SHOTS_DIR ?? null;
const JSON_OUT = process.env.JSON_OUT ?? null;
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const THEMES = ['dark', 'light'];

/** Die 42 Ansichten stammen aus dem committeten 081-Inventar (eine Quelle für beide Aufträge). */
const inventory = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'docs/reviews/2026-10-06-frontend-inventar.json'), 'utf8'),
);
/** Überlauf je Aufnahme laut 081-Inventar (Dokument und <main>), Schlüssel `id-breite-theme`. */
const BASELINE_OVERFLOW = new Map(
  inventory.shots.map((shot) => [
    `${shot.id}-${shot.width}-${shot.theme}`,
    { document: shot.overflowDocument ?? 0, main: shot.overflowMain ?? 0 },
  ]),
);
/** Kopfzeilen-Titel je Pfad aus der Routenkonfiguration (Header zeigt `meta.title`). */
const ROUTE_TITLES = Object.fromEntries(
  [
    ...fs
      .readFileSync(path.join(ROOT, 'src/app/routes.tsx'), 'utf8')
      .replace(/\s+/g, ' ')
      .matchAll(/path: '([^']+)', title: '([^']+)'/g),
  ].map((m) => [m[1], m[2]]),
);
const VIEWS = [];
for (const shot of inventory.shots) {
  if (VIEWS.some((v) => v.id === shot.id)) continue;
  VIEWS.push({
    id: shot.id,
    route:
      shot.id === 'dashboard-detail'
        ? '/dashboard'
        : new URL(shot.url, 'http://inventar.local').pathname,
    expectedPath: new URL(shot.url, 'http://inventar.local').pathname,
    expectedH1: shot.h1,
    expectedTitle:
      ROUTE_TITLES[new URL(shot.url, 'http://inventar.local').pathname] ??
      (shot.id === 'dashboard-detail' ? null : missingTitle(shot.id)),
    edit: shot.id === 'dashboard-edit',
    detail: shot.id === 'dashboard-detail',
  });
}
function missingTitle(id) {
  throw new Error(`Kein Routentitel für ${id} in src/app/routes.tsx.`);
}
if (VIEWS.length !== 42) throw new Error(`Erwartet 42 Ansichten, gefunden ${VIEWS.length}.`);
// Codex PR #68: Die Anmeldeseite liegt vor allen 42 Ansichten und erbt das gespeicherte Theme
// (Abmelden, abgelaufene Sitzung). Sie wird deshalb ohne Sitzung zusätzlich gescannt.
VIEWS.push({
  id: 'login',
  route: '/login',
  expectedPath: '/login',
  expectedH1: null,
  expectedTitle: null,
  login: true,
});
// Codex PR #68: ein Tippfehler in ONLY darf keinen leeren, scheinbar grünen Lauf ergeben.
if (ONLY) {
  const unknown = [...ONLY].filter((id) => !VIEWS.some((v) => v.id === id));
  if (unknown.length > 0) throw new Error(`Unbekannte Ansichten in ONLY: ${unknown.join(', ')}.`);
  if (ONLY.size === 0) throw new Error('ONLY ist gesetzt, enthält aber keine Ansicht.');
}

async function open(browser, state, viewport, theme, view) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: view.login ? undefined : state,
    viewport,
    reducedMotion: 'reduce',
  });
  // Codex PR #68: Kontext auch dann schließen, wenn Navigation oder eine Prüfung fehlschlägt.
  try {
    // Feste Browserzeit wie im 081-Harness, damit „Stand“-Zeitstempel die Bild-Hashes nicht verändern.
    await context.clock.setFixedTime('2026-10-07T12:00:00.000Z');
    await context.addInitScript((mode) => {
      window.localStorage.setItem('leadpilot-theme', mode);
    }, theme);
    const page = await context.newPage();
    await page.goto(view.route, { waitUntil: 'networkidle' });
    await page
      .locator(view.login ? '#login-email' : 'main')
      .first()
      .waitFor({ timeout: 15000 });
    if (view.login && theme === 'light') {
      // Ein frischer Aufruf von /login setzt kein Theme; nach dem Abmelden innerhalb der App bleibt
      // data-theme am <html> aber erhalten (Codex PR #68). Diesen Zustand hier nachstellen.
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'light';
      });
    }
    if (view.edit) {
      await page
        .getByRole('button', { name: /bearbeiten/i })
        .first()
        .click();
      await page.getByTestId('editor-toolbar').waitFor({ timeout: 10000 });
    }
    if (view.detail) {
      await page
        .getByRole('button', { name: /^details zu/i })
        .first()
        .click();
      await page.getByTestId('tile-detail-page').waitFor({ timeout: 10000 });
    }
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    // Lazy-Inhalte aktivieren: <main> einmal vollständig durchscrollen, dann zurück nach oben.
    await page.evaluate(async () => {
      const main = document.querySelector('main');
      const scroller =
        main && main.scrollHeight > main.clientHeight ? main : document.scrollingElement;
      for (let y = 0; y <= scroller.scrollHeight; y += 400) {
        scroller.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      scroller.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    // Codex PR #68: Zielansicht bestätigen, damit eine Login-, 404- oder Fehlerseite (alle mit <main>)
    // nicht als bestandener Scan zählt. Erwartung aus dem 081-Inventar: Pfad und Überschrift in <main>.
    const identity = await page.evaluate(() => ({
      path: window.location.pathname,
      mainH1: document.querySelector('main h1')?.textContent?.trim() ?? null,
      headerH1: document.querySelector('header h1')?.textContent?.trim() ?? null,
      tiles: document.querySelectorAll('[data-tile-id]').length,
    }));
    if (identity.path !== view.expectedPath)
      throw new Error(`Falsche Ansicht: Pfad ${identity.path}, erwartet ${view.expectedPath}.`);
    if (view.expectedH1 !== null && identity.mainH1 !== view.expectedH1)
      throw new Error(
        `Falsche Ansicht: <main> h1 „${identity.mainH1}“, erwartet „${view.expectedH1}“.`,
      );
    // Kopfzeilen-Titel aus der Routenkonfiguration; die Kachel-Details prüft bereits `tile-detail-page`.
    if (view.expectedTitle !== null && identity.headerH1 !== view.expectedTitle)
      throw new Error(
        `Falsche Ansicht: Kopfzeile „${identity.headerH1}“, erwartet „${view.expectedTitle}“.`,
      );
    if ((view.id === 'dashboard' || view.edit) && identity.tiles === 0)
      throw new Error('Falsche Ansicht: Dashboard ohne Kacheln.');
    const actualTheme = await page.evaluate(
      () => document.documentElement.getAttribute('data-theme') ?? 'dark',
    );
    if (actualTheme !== theme)
      throw new Error(`Theme ${theme} nicht aktiv (gefunden ${actualTheme}).`);
    return { context, page };
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
}

const results = [];
let browser = await chromium.launch();
let state = await login(browser, BASE_URL, CREDENTIALS);
/** Nach einem Browserabsturz neu starten, damit ein Einzelfehler nicht alle Folgeaufnahmen mitreißt. */
async function ensureBrowser() {
  if (browser.isConnected()) return;
  browser = await chromium.launch();
  state = await login(browser, BASE_URL, CREDENTIALS);
}
if (SHOTS_DIR) fs.mkdirSync(SHOTS_DIR, { recursive: true });
let failures = 0;
for (const view of VIEWS) {
  if (ONLY && !ONLY.has(view.id)) continue;
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const name = `${view.id}-${viewport.width}-${theme}`;
      let context;
      try {
        await ensureBrowser();
        const opened = await open(browser, state, viewport, theme, view);
        context = opened.context;
        const axe = await new AxeBuilder({ page: opened.page }).analyze();
        const violations = axe.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .flatMap((v) =>
            v.nodes.map((n) => ({
              rule: v.id,
              target: n.target.join(' '),
              html: n.html.slice(0, 160),
              data: n.any?.[0]?.data
                ? {
                    fg: n.any[0].data.fgColor,
                    bg: n.any[0].data.bgColor,
                    ratio: n.any[0].data.contrastRatio,
                  }
                : null,
            })),
          );
        // Codex PR #68: <main> ist der Scroll-Container (Layout kapselt den Inhalt mit
        // overflow-hidden); Überlauf daher am Dokument und an <main> messen.
        const overflow = await opened.page.evaluate(() => {
          const doc = document.documentElement;
          const main = document.querySelector('main');
          return {
            document: Math.max(0, doc.scrollWidth - doc.clientWidth),
            main: main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0,
          };
        });
        // Bekannter Ausgangsstand aus dem 081-Inventar (Befundregister I06/I07: Live-Simulation und
        // Leads bei 375 px in <main>) ist Aufgabe späterer Pakete; hier zählt nur eine Verschlechterung.
        const baseline = BASELINE_OVERFLOW.get(name) ?? { document: 0, main: 0 };
        for (const scope of ['document', 'main']) {
          if (overflow[scope] > baseline[scope])
            violations.push({
              rule: 'horizontal-overflow',
              target: scope,
              html: `${overflow[scope]}px (Ausgangsstand 081: ${baseline[scope]}px)`,
              data: null,
            });
        }
        let hash = null;
        if (SHOTS_DIR) {
          const buffer = await opened.page.screenshot();
          fs.writeFileSync(path.join(SHOTS_DIR, `${name}.png`), buffer);
          hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
        }
        results.push({
          id: view.id,
          width: viewport.width,
          theme,
          violations,
          overflow,
          baselineOverflow: baseline,
          hash,
        });
        if (violations.length > 0) failures += 1;
        console.log(`${name}: ${violations.length} Verstöße${hash ? ` sha=${hash}` : ''}`);
      } catch (error) {
        failures += 1;
        results.push({ id: view.id, width: viewport.width, theme, failed: String(error.message) });
        console.log(`${name}: FEHLER ${error.message}`);
      } finally {
        await context?.close();
      }
    }
  }
}
await browser.close();
if (JSON_OUT) fs.writeFileSync(JSON_OUT, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Aufnahmen: ${results.length}, mit Verstoß oder Fehler: ${failures}`);
process.exit(failures > 0 ? 1 : 0);
