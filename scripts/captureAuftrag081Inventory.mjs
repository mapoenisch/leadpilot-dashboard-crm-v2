#!/usr/bin/env node
/**
 * Auftrag 081 (Frontend-Qualität, Arbeitspaket 0): reproduzierbare Ausgangslage vor jeder Änderung.
 *
 * Gegen einen Build mit lokalem Supabase und Testbenutzer:
 * 1. Jede Route der Inventarliste (Dashboard, Bearbeiten, Details, CRM, Datenbasis, Standort und
 *    alle 32 Bildseiten) bei 1440/768/375 px, dunkel und hell; Dashboard und Funnel zusätzlich 320 px.
 *    Lazy-Inhalte werden vorher durch Scrollen von <main> aktiviert. Je Aufnahme: Bild des ersten
 *    Bildschirms und des ganzen Inhalts, SHA-256, Inhaltshöhe, Überlauf (Dokument, <main>), axe
 *    serious/critical getrennt für <main> und die ganze Seite (Kopfzeile, Sidebar, Kontoaktionen),
 *    erster Tab-Fokus ab Dokumentanfang, Dashboard: Kachelhöhen und Kennzahlwerte im ersten
 *    Bildschirm, Bildseiten: Darstellungsmaßstab des Bildes.
 * 2. Fehlerfall Pipeline: crm-query-export antwortet kontrolliert mit 500, danach Navigation zu
 *    Unternehmenssteckbrief und Funnel. Erfasst Adresse, Überschrift, Anzeige und Konsolenfehler.
 * Bilder bleiben lokal (.gitignore). Messwerte: docs/reviews/2026-10-06-frontend-inventar.json.
 * Fehlt eine erwartete Aufnahme oder schlägt eine fehl, endet der Lauf mit Exit-Code 1.
 *
 * Nur Matrix aus vorhandenem JSON neu schreiben: README_ONLY=1 node scripts/captureAuftrag081Inventory.mjs
 * Aufruf: BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag081Inventory.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { axeSevere, login, scrollThrough } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt.`);
  return value;
};
const README_ONLY = process.env.README_ONLY === '1';
const BASE_URL = README_ONLY ? null : env('BASE_URL');
const CREDENTIALS = README_ONLY
  ? null
  : { email: env('E2E_AUTH_EMAIL'), password: env('E2E_AUTH_PASSWORD') };
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-081');
const JSON_OUT = path.join(ROOT, 'docs/reviews/2026-10-06-frontend-inventar.json');
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const NARROW = { width: 320, height: 640 };
const THEMES = ['dark', 'light'];
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** Interaktive Ansichten; Bildseiten werden aus src/app/routes.tsx ergänzt. */
const INTERACTIVE = [
  { id: 'dashboard', route: '/dashboard', narrow: true },
  { id: 'dashboard-edit', route: '/dashboard', edit: true },
  { id: 'dashboard-detail', route: '/dashboard', detail: true },
  { id: 's-daten', route: '/company/data-basis' },
  { id: 's-standort', route: '/company/location' },
  { id: 's-live-simulation', route: '/crm/live-simulation' },
  { id: 's-leads', route: '/crm/leads' },
  { id: 's-companies', route: '/crm/companies' },
  { id: 's-deals', route: '/crm/deals' },
  { id: 's-activities', route: '/crm/activities' },
];

function imagePageRoutes() {
  const routes = fs
    .readFileSync(path.join(ROOT, 'src/app/routes.tsx'), 'utf8')
    .replace(/\s+/g, ' ');
  const pages = fs
    .readFileSync(path.join(ROOT, 'src/app/routePages.tsx'), 'utf8')
    .replace(/\s+/g, ' ');
  const files = Object.fromEntries(
    [...pages.matchAll(/const (\w+) = React\.lazy\(\(\) => import\('@\/([^']+)'\)/g)].map((m) => [
      m[1],
      `src/${m[2]}.tsx`,
    ]),
  );
  const paths = Object.fromEntries(
    [...routes.matchAll(/id: '([^']+)', path: '([^']+)'/g)].map((m) => [m[1], m[2]]),
  );
  const result = [];
  for (const [, id, component] of pages.matchAll(/\{ id: '([^']+)', component: (\w+) \}/g)) {
    const file = files[component];
    if (!file || !fs.existsSync(path.join(ROOT, file))) continue;
    const key = fs.readFileSync(path.join(ROOT, file), 'utf8').match(/<ImagePage page="([^"]+)"/);
    if (key) result.push({ id, route: paths[id], imageKey: key[1], narrow: id === 's-funnel' });
  }
  return result;
}

async function openRoute(browser, state, viewport, theme, target) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: state,
    viewport,
    reducedMotion: 'reduce',
    locale: 'de-DE',
  });
  await context.addInitScript((mode) => {
    try {
      window.localStorage.setItem('leadpilot-theme', mode);
    } catch {
      /* Storage nicht verfügbar */
    }
  }, theme);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on(
    'console',
    (msg) => msg.type() === 'error' && consoleErrors.push(msg.text().slice(0, 160)),
  );
  await page.goto(target.route, { waitUntil: 'networkidle' });
  await page.locator('main').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await scrollThrough(page, viewport);
  if (target.edit) {
    await page
      .getByRole('button', { name: /bearbeiten/i })
      .first()
      .click();
    await page.getByTestId('editor-toolbar').waitFor({ timeout: 10000 });
  }
  if (target.detail) {
    await page
      .getByRole('button', { name: /^details zu/i })
      .first()
      .click();
    await page.getByTestId('tile-detail-page').waitFor({ timeout: 10000 });
    await page.waitForLoadState('networkidle');
  }
  await page.waitForTimeout(400);
  return { context, page, consoleErrors };
}

/** Messwerte, die nicht vom Bild abhängen. */
async function measure(page, viewport) {
  return page.evaluate((vp) => {
    const main = document.querySelector('main');
    const doc = document.documentElement;
    const inFirstScreen = (el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= vp.height && r.width > 0;
    };
    const tiles = Array.from(document.querySelectorAll('[data-testid="dashboard-tile"]'));
    const numbers = Array.from(document.querySelectorAll('[data-testid="tile-number"]'));
    const img = document.querySelector('.image-page__img');
    const hint = document.querySelector('[data-testid="image-page-hint"]');
    return {
      url: location.pathname,
      h1: document.querySelector('main h1')?.textContent?.trim() ?? null,
      mainScrollHeight: main?.scrollHeight ?? null,
      overflowDocument: Math.max(0, doc.scrollWidth - doc.clientWidth),
      overflowMain: main ? Math.max(0, main.scrollWidth - main.clientWidth) : null,
      tiles: tiles.length,
      tileHeights: tiles.map((t) => Math.round(t.getBoundingClientRect().height)),
      numbersInFirstScreen: numbers.filter(inFirstScreen).length,
      firstNumberTop: numbers.length ? Math.round(numbers[0].getBoundingClientRect().top) : null,
      image: img
        ? {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            renderedWidth: Math.round(img.getBoundingClientRect().width),
            scale: img.naturalWidth
              ? Math.round((img.getBoundingClientRect().width / img.naturalWidth) * 1000) / 1000
              : null,
            hintVisible: hint ? getComputedStyle(hint).display !== 'none' : false,
          }
        : null,
    };
  }, viewport);
}

/**
 * Erster Tab-Druck ab Dokumentanfang: wohin geht der Fokus, ist er sichtbar, hat er einen Rahmen?
 * `blur()` allein setzt den Startpunkt der Tab-Reihenfolge nicht zurück (Editor und Details wurden
 * per Klick geöffnet, Codex PR #67). Deshalb wird ein Hilfselement an den Anfang von <body> gesetzt,
 * fokussiert und nach dem Tab wieder entfernt.
 */
async function firstFocus(page) {
  await page.evaluate(() => {
    const anchor = document.createElement('span');
    anchor.tabIndex = -1;
    anchor.id = 'auftrag-081-focus-start';
    document.body.prepend(anchor);
    anchor.focus();
  });
  await page.keyboard.press('Tab');
  await page.evaluate(() => document.getElementById('auftrag-081-focus-start')?.remove());
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { target: null };
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      target: `${el.tagName.toLowerCase()} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}`,
      visible: r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight,
      outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0,
      ring: s.boxShadow !== 'none',
    };
  });
}

/** axe serious/critical auf der ganzen Seite, einschließlich Kopfzeile, Sidebar und Kontoaktionen. */
async function axeSeverePage(page) {
  const axe = await new AxeBuilder({ page }).analyze();
  return axe.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id);
}

async function capture(page, viewport, name) {
  const first = await page.screenshot();
  fs.writeFileSync(path.join(OUT_DIR, `${name}-first.png`), first);
  // Auftrag 079-Muster: Höhen- und Overflow-Begrenzung für fullPage temporär aufheben,
  // damit der gesamte scrollende Hauptinhalt ohne Viewport-Verzerrung aufgenommen wird (Codex PR #67).
  const style = await page.addStyleTag({
    content:
      'html,body,#root,#root>*{height:auto!important;overflow:visible!important}' +
      'main{height:auto!important;overflow:visible!important}',
  });
  const full = await page.screenshot({ fullPage: true });
  await style.evaluate((node) => node.remove());
  fs.writeFileSync(path.join(OUT_DIR, `${name}-full.png`), full);
  return { first: sha256(first).slice(0, 16), full: sha256(full).slice(0, 16) };
}

async function pipelineErrorCase(browser, state) {
  const viewport = WIDTHS[0];
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: state,
    viewport,
    reducedMotion: 'reduce',
    locale: 'de-DE',
  });
  let interceptedPostCount = 0;
  // OPTIONS-Preflight mit gültigen CORS-Headern passieren lassen, nur den POST kontrolliert
  // mit 500 beantworten, damit der echte Serverfehler-Pfad statt CORS-Fehler getestet wird (Codex PR #67).
  await context.route('**/functions/v1/crm-query-export**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          'Access-Control-Max-Age': '86400',
        },
      });
      return;
    }
    if (request.method() === 'POST') {
      interceptedPostCount++;
      await route.fulfill({
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'SERVER_ERROR',
          error: 'Ein interner Serverfehler ist aufgetreten.',
        }),
      });
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on(
    'console',
    (msg) => msg.type() === 'error' && consoleErrors.push(msg.text().slice(0, 200)),
  );
  const steps = [];
  const snap = async (label) => {
    await page.waitForTimeout(1500);
    const headerTitle = await page
      .locator('header h1, .app-header h1')
      .first()
      .textContent({ timeout: 2000 })
      .catch(() => null);
    const mainTitle = await page
      .locator('main h1')
      .first()
      .textContent({ timeout: 2000 })
      .catch(() => null);
    steps.push({
      label,
      url: new URL(page.url()).pathname,
      headerH1: headerTitle?.trim() ?? null,
      mainH1: mainTitle?.trim() ?? null,
      h1: headerTitle?.trim() ?? mainTitle?.trim() ?? null,
      mainText: (
        await page
          .locator('main')
          .first()
          .innerText()
          .catch(() => '')
      ).slice(0, 300),
    });
  };
  await page.goto('/crm/deals', { waitUntil: 'networkidle' });
  await snap('Pipeline mit 500');
  fs.writeFileSync(path.join(OUT_DIR, 'fehler-pipeline-500.png'), await page.screenshot());
  for (const [label, name] of [
    ['danach Unternehmenssteckbrief', /unternehmenssteckbrief/i],
    ['danach Sales Funnel', /sales funnel/i],
  ]) {
    await page
      .getByRole('link', { name })
      .first()
      .click({ timeout: 5000 })
      .catch(() => null);
    await snap(label);
  }
  fs.writeFileSync(
    path.join(OUT_DIR, 'fehler-pipeline-nach-navigation.png'),
    await page.screenshot(),
  );
  const maxDepth = consoleErrors.filter((e) => /Maximum update depth/i.test(e)).length;
  await context.close();
  return {
    steps,
    interceptedPostCount,
    consoleErrors: consoleErrors.slice(0, 10),
    maxUpdateDepthErrors: maxDepth,
  };
}

/** Ergebnismatrix aus den Messwerten; Bilder bleiben lokal. */
function writeReadme(data) {
  const list = (ids) => (ids.length ? ids.join(', ') : '0');
  const focusCell = (f) =>
    f.target
      ? `${f.target}${f.visible && (f.outline || f.ring) ? '' : ' (ohne sichtbaren Rahmen)'}`
      : '–';
  const rows = data.shots.map((s) =>
    s.failed
      ? `| ${s.id} | ${s.width} | ${s.theme} | – | – | – | – | – | – | Fehler: ${s.failed} |`
      : `| ${s.id} | ${s.width} | ${s.theme} | ${s.mainScrollHeight} | \`${s.hashes.first}\` / \`${s.hashes.full}\` | ${s.overflowDocument} / ${s.overflowMain} | ${list(s.axe)} | ${list(s.axePage)} | ${focusCell(s.focus)} | ${s.image ? `Bild ${s.image.scale}` : `Werte im 1. Bildschirm: ${s.numbersInFirstScreen}`} |`,
  );
  const readme = [
    '# Auftrag 081 – Ausgangslage Frontend (Arbeitspaket 0)',
    '',
    `Produkt-Baseline: \`${data.baselineCommit ?? data.commit}\` (Release v2.4.0), aufgenommen ${data.capturedAt.slice(0, 10)} mit`,
    `\`${data.harness?.script ?? 'scripts/captureAuftrag081Inventory.mjs'}\` (Harness SHA-256: \`${data.harness?.sha256 ? data.harness.sha256.slice(0, 16) : '–'}\`).`,
    'Keine Vorher/Nachher-Paare: Paket 0 ändert keinen Produktcode, diese Aufnahmen sind die',
    'Vorher-Seite für die folgenden Pakete. Bilder nur lokal; Bewertung im',
    '[Befundregister](../../reviews/2026-10-06-frontend-befundregister.md).',
    '',
    `Aufnahmen: ${data.summary.ok} von ${data.summary.expected} erwartet, fehlgeschlagen: ${data.summary.failed}.`,
    'axe (serious/critical) läuft zweimal: nur `<main>` und die ganze Seite mit Kopfzeile, Sidebar',
    'und Kontoaktionen. Der erste Tab-Fokus wird ab Dokumentanfang gemessen (Browser-Locale: `de-DE`).',
    '',
    '| Ansicht | Breite | Theme | Höhe `<main>` | SHA-256 erster Bildschirm / ganz (16) | Überlauf Dokument / `<main>` px | axe `<main>` | axe ganze Seite | erster Tab-Fokus | Messung |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme);
}

async function main() {
  if (README_ONLY) {
    writeReadme(JSON.parse(fs.readFileSync(JSON_OUT, 'utf8')));
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const state = await login(browser, BASE_URL, CREDENTIALS);
  const images = imagePageRoutes();
  if (images.length !== 32) throw new Error(`32 Bildseiten erwartet, gefunden: ${images.length}`);
  const targets = [...INTERACTIVE, ...images].filter((t) => !ONLY || ONLY.has(t.id));
  const expected = targets.reduce((n, t) => n + (t.narrow ? 4 : 3) * THEMES.length, 0);
  const shots = [];
  for (const target of targets) {
    const viewports = target.narrow ? [...WIDTHS, NARROW] : WIDTHS;
    for (const viewport of viewports) {
      for (const theme of THEMES) {
        const name = `${target.id}-${viewport.width}-${theme}`;
        let context = null;
        try {
          const opened = await openRoute(browser, state, viewport, theme, target);
          context = opened.context;
          const { page, consoleErrors } = opened;
          const metrics = await measure(page, viewport);
          const axe = await axeSevere(page);
          const axePage = await axeSeverePage(page);
          const hashes = await capture(page, viewport, name);
          const focus = await firstFocus(page);
          shots.push({
            id: target.id,
            imageKey: target.imageKey ?? null,
            width: viewport.width,
            theme,
            ...metrics,
            axe,
            axePage,
            focus,
            consoleErrors: consoleErrors.length,
            hashes,
          });
          console.log(
            `${name}: h=${metrics.mainScrollHeight} overflow=${metrics.overflowDocument}/${metrics.overflowMain} axe=${axe.length}/${axePage.length}`,
          );
        } catch (error) {
          const failed = error.message.split('\n')[0];
          shots.push({ id: target.id, width: viewport.width, theme, failed });
          console.log(`${name}: FEHLER ${failed}`);
        } finally {
          await context?.close();
        }
      }
    }
  }
  const pipelineError = ONLY ? null : await pipelineErrorCase(browser, state);
  await browser.close();
  const scriptContent = fs.readFileSync(path.join(ROOT, 'scripts/captureAuftrag081Inventory.mjs'));
  const harnessSha256 = sha256(scriptContent);
  const baselineCommit = '7fd6e33';
  const productVersion = '2.4.0';
  const headCommit = (await import('node:child_process'))
    .execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT })
    .toString()
    .trim();
  const failed = shots.filter((s) => s.failed).length;
  const summary = { expected, ok: shots.length - failed, failed };
  fs.writeFileSync(
    JSON_OUT,
    `${JSON.stringify(
      {
        baselineCommit,
        productVersion,
        harness: {
          script: 'scripts/captureAuftrag081Inventory.mjs',
          sha256: harnessSha256,
          headAtExecution: headCommit,
        },
        commit: baselineCommit,
        baseUrl: BASE_URL,
        capturedAt: new Date().toISOString(),
        summary,
        shots,
        pipelineError,
      },
      null,
      1,
    )}\n`,
  );
  writeReadme(JSON.parse(fs.readFileSync(JSON_OUT, 'utf8')));
  console.log(
    `\n${summary.ok} von ${expected} Aufnahmen, fehlgeschlagen ${failed}, JSON: ${path.relative(ROOT, JSON_OUT)}`,
  );
  if (failed > 0 || summary.ok !== expected) {
    console.error(
      'Inventur unvollständig: mindestens eine erwartete Aufnahme fehlt oder schlug fehl.',
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
