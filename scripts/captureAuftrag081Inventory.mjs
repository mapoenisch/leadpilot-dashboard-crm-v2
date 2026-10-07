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
import { execFileSync } from 'node:child_process';
import {
  axeSevere,
  deletePreferences,
  savePreferences,
  scrollThrough,
  sessionUserId,
} from './lib/detailShotHelpers.mjs';

/** GET gegen die Supabase-REST-API mit dem Token der Sitzung; wirft bei jedem Status >= 300 (Befund PR #67). */
async function restGet(page, supabase, pathAndQuery, what) {
  const result = await page.evaluate(
    async ({ url, anonKey, pathAndQuery: pq }) => {
      let token = null;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
          token = JSON.parse(localStorage.getItem(key) ?? '{}').access_token ?? null;
        }
      }
      const response = await fetch(`${url}/rest/v1/${pq}`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    },
    { url: supabase.url, anonKey: supabase.anonKey, pathAndQuery },
  );
  if (result.status >= 300) {
    throw new Error(
      `${what} fehlgeschlagen (HTTP ${result.status}): ${JSON.stringify(result.body)}`,
    );
  }
  return result.body;
}

/** Liest die Dashboard-Präferenzen; ein Fehlerstatus gilt nie als „keine Zeile“. */
async function readPreferences(page, supabase) {
  const body = await restGet(
    page,
    supabase,
    'executive_dashboard_preferences?select=organization_id,user_id,revision,config,schema_version,created_at,updated_at',
    'Präferenzen lesen',
  );
  const row = Array.isArray(body) ? body[0] : null;
  return row ? { ...row } : { revision: 0, config: null };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function assertScopedCleanup(url, userId) {
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error(`Aufräumschlüssel nur für lokales Supabase, nicht für ${new URL(url).host}.`);
  }
  if (typeof userId !== 'string' || !UUID.test(userId)) {
    throw new Error('Ungültige Benutzer-ID für das Aufräumen.');
  }
}

/** Stellt die exakte Präferenzzeile (inkl. ursprünglicher Revision und Zeitstempel) wieder her (Befund PR #67 Runde 9). */
async function restorePreferencesRow(supabase, cleanupKey, originalRow) {
  assertScopedCleanup(supabase.url, originalRow.user_id);
  const response = await fetch(
    `${supabase.url}/rest/v1/executive_dashboard_preferences?user_id=eq.${encodeURIComponent(originalRow.user_id)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: cleanupKey,
        Authorization: `Bearer ${cleanupKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        config: originalRow.config,
        schema_version: originalRow.schema_version,
        revision: originalRow.revision,
        created_at: originalRow.created_at,
        updated_at: originalRow.updated_at,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Wiederherstellen der ursprünglichen Präferenzzeile fehlgeschlagen (HTTP ${response.status}): ${await response.text()}`,
    );
  }
}

/** Inventarisierter Testbenutzer: admin-a aus supabase/seed.sql (Organisation A). */
const EXPECTED_IDENTITY = {
  email: 'admin-a@e2e.local',
  userId: '11111111-1111-1111-1111-111111111111',
  organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  role: 'admin',
};

/** Bricht ab, wenn die Sitzung nicht der inventarisierten Identität entspricht (Befund PR #67). */
async function verifyIdentity(page, supabase, email, userId) {
  const members = await restGet(
    page,
    supabase,
    `organization_members?select=organization_id,role&user_id=eq.${encodeURIComponent(userId ?? '')}`,
    'Mitgliedschaft lesen',
  );
  const membership = Array.isArray(members) && members.length === 1 ? members[0] : null;
  const actual = {
    email,
    userId,
    organizationId: membership?.organization_id ?? null,
    role: membership?.role ?? null,
  };
  for (const key of Object.keys(EXPECTED_IDENTITY)) {
    if (actual[key] !== EXPECTED_IDENTITY[key]) {
      throw new Error(
        `Testbenutzer weicht von der inventarisierten Identität ab (${key}: erwartet ${EXPECTED_IDENTITY[key]}, gefunden ${actual[key]}). Lauf abgebrochen.`,
      );
    }
  }
  return actual;
}

/**
 * Verifiziert, dass der lokale Produkt- und Build-Code exakt der Baseline 7fd6e33 entspricht UND
 * dass der unter baseUrl bediente Produktionsbuild exakt aus diesem Stand stammt (Befund PR #67 Runde 8).
 */
async function verifyBuildArtifact(baseUrl) {
  const baselineCommit = '7fd6e33';
  const productPaths = [
    'src/',
    'public/',
    'index.html',
    'vite.config.ts',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.node.json',
    'tailwind.config.ts',
    'postcss.config.js',
  ];
  const productDiff = execFileSync(
    'git',
    ['diff', baselineCommit, '--', ...productPaths],
    { cwd: ROOT },
  )
    .toString()
    .trim();
  if (productDiff.length > 0) {
    throw new Error(
      `Produktcode oder Build-Konfiguration weicht von Baseline ${baselineCommit} ab (${productDiff.split('\n').length} Diff-Zeilen). Baseline-Schreiben abgebrochen.`,
    );
  }

  // Befund 1 PR #67 Runde 9: Quellstand frisch bauen, bevor dist/ und BASE_URL verglichen werden
  execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe' });

  const distHtmlPath = path.join(ROOT, 'dist/index.html');
  if (!fs.existsSync(distHtmlPath)) {
    throw new Error(
      'Lokaler Produktionsbuild (dist/index.html) fehlt auch nach frischem Build.',
    );
  }
  const localDistHtml = fs.readFileSync(distHtmlPath, 'utf8');
  const localEntryMatch = localDistHtml.match(
    /<script type="module" crossorigin src="(\/assets\/[^"]+)"><\/script>/,
  );
  if (!localEntryMatch) {
    throw new Error('Einstiegsskript in dist/index.html konnte nicht ermittelt werden.');
  }
  const entryScriptPath = localEntryMatch[1];
  const localScriptFile = path.join(ROOT, 'dist', entryScriptPath);
  if (!fs.existsSync(localScriptFile)) {
    throw new Error(`Lokale Einstiegsdatei dist${entryScriptPath} existiert nicht.`);
  }
  const localScriptContent = fs.readFileSync(localScriptFile);
  const localScriptSha256 = sha256(localScriptContent);
  const localHtmlSha256 = sha256(Buffer.from(localDistHtml));

  const serverResponse = await fetch(`${baseUrl}/`).catch((err) => {
    throw new Error(`BASE_URL ${baseUrl} nicht erreichbar: ${err.message}`);
  });
  if (!serverResponse.ok) {
    throw new Error(`BASE_URL ${baseUrl} antwortet mit HTTP ${serverResponse.status}.`);
  }
  const servedHtml = await serverResponse.text();
  const servedEntryMatch = servedHtml.match(
    /<script type="module" crossorigin src="(\/assets\/[^"]+)"><\/script>/,
  );
  if (!servedEntryMatch) {
    throw new Error(`Unter ${baseUrl} wurde kein Vite-Einstiegsskript im HTML gefunden.`);
  }
  if (servedEntryMatch[1] !== entryScriptPath) {
    throw new Error(
      `Unter ${baseUrl} wird Einstiegsskript ${servedEntryMatch[1]} bedient, erwartet wird ${entryScriptPath} aus dem lokalen Build der Baseline ${baselineCommit}.`,
    );
  }

  const servedScriptRes = await fetch(`${baseUrl}${entryScriptPath}`);
  if (!servedScriptRes.ok) {
    throw new Error(
      `Einstiegsskript ${entryScriptPath} konnte von ${baseUrl} nicht geladen werden (HTTP ${servedScriptRes.status}).`,
    );
  }
  const servedScriptBuffer = Buffer.from(await servedScriptRes.arrayBuffer());
  const servedScriptSha256 = sha256(servedScriptBuffer);
  if (servedScriptSha256 !== localScriptSha256) {
    throw new Error(
      `Das unter ${baseUrl} ausgelieferte Bundle ${entryScriptPath} hat SHA-256 ${servedScriptSha256.slice(0, 16)}..., weicht aber vom verifizierten Build (${localScriptSha256.slice(0, 16)}...) ab.`,
    );
  }

  return {
    entryScript: entryScriptPath,
    entrySha256: localScriptSha256,
    indexHtmlSha256: localHtmlSha256,
    verifiedServedUrl: baseUrl,
  };
}

/** Anmelden mit expliziter deutscher Browser-Locale für konsistente Datumsformatierung. */
async function loginWithLocale(browser, baseUrl, credentials, locale = 'de-DE') {
  const context = await browser.newContext({ baseURL: baseUrl, locale });
  const page = await context.newPage();
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('#login-email', credentials.email);
  await page.fill('#login-password', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  const state = await context.storageState();
  await context.close();
  return state;
}

/** Standard-Dashboard-Konfiguration (17 Kacheln) lokal aus der App-Logik geladen. */
function defaultDashboardConfig(root) {
  const out = execFileSync(
    'npx',
    [
      'tsx',
      '-e',
      "import { DEFAULT_DASHBOARD_CONFIG } from './src/features/dashboard/model/defaultDashboard.ts'; console.log(JSON.stringify(DEFAULT_DASHBOARD_CONFIG));",
    ],
    { cwd: root },
  );
  return JSON.parse(out.toString());
}

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
const SUPABASE = {
  url: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  anonKey:
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
};
function resolveCleanupKey(url) {
  if (process.env.E2E_CLEANUP_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.E2E_CLEANUP_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  try {
    const u = new URL(url);
    if (LOCAL_HOSTS.has(u.hostname)) {
      const b64url = (obj) =>
        Buffer.from(JSON.stringify(obj))
          .toString('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
      const header = b64url({ alg: 'HS256', typ: 'JWT' });
      const payload = b64url({
        role: 'service_role',
        iss: 'supabase',
        iat: Math.floor(Date.now() / 1000) - 60,
        exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
      });
      const unsigned = `${header}.${payload}`;
      const secret = 'super-secret-jwt-token-with-at-least-32-characters-long';
      const sig = crypto
        .createHmac('sha256', secret)
        .update(unsigned)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      return `${unsigned}.${sig}`;
    }
  } catch {
    /* Ungültige URL oder nicht lokal */
  }
  return null;
}
const CLEANUP_KEY = resolveCleanupKey(SUPABASE.url);

/**
 * Kontrollierte CRM-Daten für Organisation A (admin-a) gemäß supabase/seed.sql (Befund PR #67 Runde 9).
 * Dient der Edge-Function-Interception in openRoute, damit reguläre CRM-Aufnahmen (s-leads, s-companies,
 * s-deals) im Erfolgszustand (Tabelle/Karten, Kennzahlen, Paginierung) statt im SERVER_ERROR-Zustand
 * aufgenommen werden.
 */
const CONTROLLED_CRM_DATA = {
  companies: [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      name: 'Firma A1',
      domain: 'a1.test',
      industry: 'IT',
      city: 'Berlin',
      postalCode: '10115',
      employeeCount: 50,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      name: ' =1+1 Formel-Firma',
      domain: 'calc.test',
      industry: 'IT',
      city: 'Berlin',
      postalCode: '10115',
      employeeCount: 10,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      name: 'Firma A2',
      domain: 'a2.test',
      industry: 'Finanzen',
      city: 'München',
      postalCode: '80331',
      employeeCount: 80,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  contacts: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      companyId: 'c0000000-0000-0000-0000-000000000001',
      email: 'anna.schmidt@a1.test',
      firstName: 'Anna',
      lastName: 'Schmidt',
      jobTitle: 'CEO',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  deals: [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      dealName: 'Enterprise Paket A1',
      stage: 'PROPOSAL',
      amount: 45000,
      closeDate: '2026-11-30',
      pipeline: 'default',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      dealName: ' =2+2 Formel Deal',
      stage: 'LEAD',
      amount: 5000,
      closeDate: '2026-12-31',
      pipeline: 'default',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};
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
  try {
    // Interception für crm-query-export: Bedient reguläre CRM-Aufnahmen kontrolliert im Erfolgszustand (Befund PR #67 Runde 9)
    await context.route('**/functions/v1/crm-query-export**', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
            'Access-Control-Max-Age': '86400',
          },
        });
        return;
      }
      if (request.method() === 'POST') {
        let postData = {};
        try {
          postData = JSON.parse(request.postData() ?? '{}');
        } catch {
          postData = {};
        }
        const resource = postData.resource ?? 'companies';
        const page = Number(postData.page) || 1;
        const pageSize = Number(postData.pageSize) || 20;

        const dataForResource = CONTROLLED_CRM_DATA[resource] ?? [];
        const total = dataForResource.length;
        const from = (page - 1) * pageSize;
        const items = dataForResource.slice(from, from + pageSize);

        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items,
            total,
            page,
            pageSize,
            resource,
          }),
        });
        return;
      }
      await route.continue();
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

    // 1. URL-Validierung (Befund PR #67 Runde 8): Pfad muss exakt übereinstimmen
    const expectedPath = target.detail ? '/dashboard/tiles/std_baseline_arr' : target.route;
    const currentPath = new URL(page.url()).pathname;
    if (currentPath === '/login') {
      throw new Error(
        `Sitzung abgelaufen: Weiterleitung nach /login auf Ziel ${target.id} (${target.route}).`,
      );
    }
    if (currentPath === '/not-found') {
      throw new Error(
        `Route nicht gefunden: Weiterleitung nach /not-found auf Ziel ${target.id} (${target.route}).`,
      );
    }
    if (currentPath !== expectedPath) {
      throw new Error(
        `Unerwarteter Pfad auf Ziel ${target.id}: erwartet ${expectedPath}, erhalten ${currentPath}.`,
      );
    }

    // 2. Abwesenheit von Fehlern (RouteErrorBoundary)
    const hasRouteError = await page.evaluate(() => {
      const errorHeading = document.querySelector('main h2');
      return (
        document.querySelector('[data-testid="not-found-home-link"]') !== null ||
        (errorHeading?.textContent?.includes('Fehler beim Laden der Seite') ?? false)
      );
    });
    if (hasRouteError) {
      throw new Error(
        `RouteErrorBoundary oder 404 gerendert auf Ziel ${target.id} (${expectedPath}).`,
      );
    }

    // 3. Zielspezifischer Seiteninhalt & Bildnachweis
    if (target.imageKey) {
      await page.locator('[data-testid="image-page"]').waitFor({ timeout: 10000 });
      const imageLoaded = await page
        .waitForFunction(
          () => {
            const img = document.querySelector('img.image-page__img');
            return img && img.complete && img.naturalWidth > 0;
          },
          { timeout: 15000 },
        )
        .catch(() => false);
      if (!imageLoaded) {
        throw new Error(
          `Bild nicht vollständig geladen auf Bildseite ${target.id} (${target.imageKey}).`,
        );
      }
    } else if (target.id === 'dashboard' || target.id === 'dashboard-edit') {
      await page
        .locator('[data-testid="dashboard-heading"], [data-testid="dashboard-workspace"]')
        .first()
        .waitFor({ timeout: 10000 });
    } else if (target.id === 's-daten') {
      await page.locator('[data-testid="data-basis-page"]').waitFor({ timeout: 10000 });
    } else if (target.id === 's-standort') {
      await page.locator('[data-testid="location-headquarters"]').waitFor({ timeout: 10000 });
    } else if (target.id === 's-live-simulation') {
      await page.locator('main button[role="tab"]:has-text("Management-Ebene")').waitFor({ timeout: 10000 });
    } else if (target.id === 's-leads') {
      await page.locator('main h2:has-text("Leads")').waitFor({ timeout: 10000 });
      await page.locator('main table, main .crm-v2-mobile-card').first().waitFor({ timeout: 10000 });
    } else if (target.id === 's-companies') {
      await page.locator('main h2:has-text("Unternehmen")').waitFor({ timeout: 10000 });
      await page.locator('main table, main .crm-v2-mobile-card').first().waitFor({ timeout: 10000 });
    } else if (target.id === 's-deals') {
      await page.locator('main h2:has-text("Deal Pipeline")').waitFor({ timeout: 10000 });
      await page.locator('main table, main .crm-v2-mobile-card').first().waitFor({ timeout: 10000 });
    } else if (target.id === 's-activities') {
      await page.locator('main h2:has-text("Aktivitäten")').waitFor({ timeout: 10000 });
    }

    if (['s-leads', 's-companies', 's-deals'].includes(target.id)) {
      const errorState = await page
        .locator('[data-testid="management-chart-error"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (errorState) {
        throw new Error(
          `Fehlerzustand (management-chart-error) auf CRM-Seite ${target.id} gerendert.`,
        );
      }
    }

    await page.waitForTimeout(400);
    return { context, page, consoleErrors };
  } catch (err) {
    await context.close().catch(() => null);
    throw err;
  }
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

  // Validierung: mindestens ein POST zu crm-query-export muss abgefangen worden sein
  if (interceptedPostCount < 1) {
    await context.close();
    throw new Error(
      `Fehlerfall-Prüfung fehlgeschlagen: Kein POST zu crm-query-export abgefangen (interceptedPostCount=${interceptedPostCount}).`,
    );
  }

  for (const { label, name, expectedPath } of [
    {
      label: 'danach Unternehmenssteckbrief',
      name: /unternehmenssteckbrief/i,
      expectedPath: '/company/profile',
    },
    {
      label: 'danach Sales Funnel',
      name: /sales funnel/i,
      expectedPath: '/sales/funnel',
    },
  ]) {
    const link = page.getByRole('link', { name }).first();
    await link.waitFor({ state: 'visible', timeout: 5000 });
    await link.click({ timeout: 5000 });
    await page.waitForURL(`**${expectedPath}`, { timeout: 5000 });
    const currentPath = new URL(page.url()).pathname;
    if (currentPath !== expectedPath) {
      await context.close();
      throw new Error(
        `Fehlerfall-Navigation fehlgeschlagen: Erwartete URL ${expectedPath}, erhalten ${currentPath}.`,
      );
    }
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
    `Ausgelieferter Build: \`${data.buildArtifact?.entryScript ?? '–'}\` (SHA-256: \`${data.buildArtifact?.entrySha256 ? data.buildArtifact.entrySha256.slice(0, 16) : '–'}\`), verifiziert gegen lokale Baseline \`${data.baselineCommit ?? data.commit}\`.`,
    `Testbenutzer: \`${data.testUser?.email}\` (Rolle ${data.testUser?.role}, Organisation \`${data.testUser?.organizationId}\`), Identität vor dem Lauf gegen die Seed-Daten geprüft.`,
    `Dashboard-Konfiguration: Standardansicht (${data.dashboardConfig?.tileCount ?? 17} Kacheln, Quelle: \`${data.dashboardConfig?.source ?? 'standard'}\`).`,
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

  const defaultConfig = defaultDashboardConfig(ROOT);
  let browser = null;
  let restore = null;
  let setupContext = null;
  let dashboardConfigInfo = null;
  let testIdentity = null;
  let buildArtifact = null;
  let pendingCanonicalPayload = null;
  let runSuccess = false;
  let runHadError = false;

  try {
    // 1. Verifiziere Baseline-Code und den ausgelieferten Build (Befund PR #67 Runde 8)
    buildArtifact = await verifyBuildArtifact(BASE_URL);

    browser = await chromium.launch();
    const state = await loginWithLocale(browser, BASE_URL, CREDENTIALS);

    // Dashboard-Konfiguration für die Baseline fixieren (Befund PR #67 Runde 4)
    setupContext = await browser.newContext({ baseURL: BASE_URL, storageState: state });
    const setupPage = await setupContext.newPage();
    await setupPage.goto('/dashboard', { waitUntil: 'networkidle' });
    const userId = await sessionUserId(setupPage);
    // Identität vor jeder Änderung prüfen (Befund PR #67 Runde 7)
    testIdentity = await verifyIdentity(setupPage, SUPABASE, CREDENTIALS.email, userId);
    const originalPrefs = await readPreferences(setupPage, SUPABASE);

    if (originalPrefs.config) {
      const saved = await savePreferences(
        setupPage,
        SUPABASE,
        defaultConfig,
        originalPrefs.revision,
      );
      restore = {
        type: 'restore_exact_row',
        originalRow: originalPrefs,
        page: setupPage,
        userId,
      };
      dashboardConfigInfo = {
        source: 'installed_standard',
        version: defaultConfig.version,
        tileCount: defaultConfig.tiles.length,
        tileIds: defaultConfig.tiles.map((t) => t.tileId),
        revision: saved.revision,
        restoredAfterRun: false, // Erst nach erfolgreichem Cleanup auf true setzen (Befund PR #67 Runde 8)
      };
    } else {
      restore = {
        type: 'delete_if_created',
        userId,
        page: setupPage,
      };
      dashboardConfigInfo = {
        source: 'default_unpersisted',
        version: defaultConfig.version,
        tileCount: defaultConfig.tiles.length,
        tileIds: defaultConfig.tiles.map((t) => t.tileId),
        revision: 0,
        restoredAfterRun: false,
      };
    }

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
            const expectedPath = target.detail ? '/dashboard/tiles/std_baseline_arr' : target.route;
            if (metrics.url !== expectedPath) {
              throw new Error(
                `Gemessene URL ${metrics.url} weicht von erwarteter Route ${expectedPath} ab.`,
              );
            }
            if (target.imageKey && (!metrics.image || metrics.image.naturalWidth <= 0)) {
              throw new Error(
                `Bildmaße auf Bildseite ${target.id} ungültig: ${JSON.stringify(metrics.image)}`,
              );
            }
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

    const scriptContent = fs.readFileSync(
      path.join(ROOT, 'scripts/captureAuftrag081Inventory.mjs'),
    );
    const harnessSha256 = sha256(scriptContent);
    const baselineCommit = '7fd6e33';
    const productVersion = '2.4.0';
    const headCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT })
      .toString()
      .trim();

    // Verifiziere, dass der aktuelle Produktcode exakt der Baseline entspricht (Befund PR #67 Runde 6/8)
    const productPaths = [
      'src/',
      'public/',
      'index.html',
      'vite.config.ts',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'tsconfig.node.json',
      'tailwind.config.ts',
      'postcss.config.js',
    ];
    const productDiff = execFileSync('git', ['diff', baselineCommit, '--', ...productPaths], { cwd: ROOT })
      .toString()
      .trim();
    if (productDiff.length > 0) {
      throw new Error(
        `Produktstand weicht von der behaupteten Baseline ${baselineCommit} ab (${productDiff.split('\n').length} Diff-Zeilen). Baseline-Schreiben abgebrochen.`,
      );
    }

    const failed = shots.filter((s) => s.failed).length;
    const summary = { expected, ok: shots.length - failed, failed };
    const payload = {
      baselineCommit,
      productVersion,
      harness: {
        script: 'scripts/captureAuftrag081Inventory.mjs',
        sha256: harnessSha256,
        headAtExecution: headCommit,
      },
      buildArtifact,
      testUser: testIdentity,
      dashboardConfig: dashboardConfigInfo,
      commit: baselineCommit,
      baseUrl: BASE_URL,
      capturedAt: new Date().toISOString(),
      summary,
      shots,
      pipelineError,
    };

    // Teilläufe und fehlerhafte Läufe nie in die kanonische Baseline schreiben (Befund PR #67):
    // Diagnoseausgabe landet in test-results/ (nicht versioniert).
    const complete = !ONLY && failed === 0 && summary.ok === expected;
    const diagDir = path.join(ROOT, 'test-results/auftrag-081');
    fs.mkdirSync(diagDir, { recursive: true });

    if (!complete) {
      const diagOut = path.join(
        diagDir,
        ONLY ? 'inventar.teillauf.json' : 'inventar.fehlerlauf.json',
      );
      fs.writeFileSync(diagOut, `${JSON.stringify(payload, null, 1)}\n`);
      console.log(
        `\n${ONLY ? `Teillauf (ONLY=${[...ONLY].join(',')})` : 'Unvollständiger Lauf'}: ${summary.ok} von ${expected} Aufnahmen, fehlgeschlagen ${failed}. Kanonische Baseline unverändert. Diagnose: ${path.relative(ROOT, diagOut)}`,
      );
      if (failed > 0 || summary.ok !== expected) {
        runHadError = true;
        process.exitCode = 1;
      }
      return;
    }

    // Vollständiger Lauf: zunächst temporär stagen, kanonische Dateien noch NICHT überschreiben (Befund PR #67 Runde 8)
    const stageJsonOut = path.join(diagDir, 'inventar.stage.json');
    fs.writeFileSync(stageJsonOut, `${JSON.stringify(payload, null, 1)}\n`);
    pendingCanonicalPayload = payload;
    runSuccess = true;
  } finally {
    let restoreError = null;
    if (restore?.type === 'restore_exact_row') {
      try {
        if (!CLEANUP_KEY) {
          throw new Error('Kein Cleanup-Key für revisionsgetreue Wiederherstellung verfügbar.');
        }
        await restorePreferencesRow(SUPABASE, CLEANUP_KEY, restore.originalRow);
        const verified = await readPreferences(restore.page, SUPABASE);
        if (verified.revision !== restore.originalRow.revision) {
          throw new Error(
            `Wiederhergestellte Revision ${verified.revision} stimmt nicht mit Original ${restore.originalRow.revision} überein.`,
          );
        }
        if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = true;
        if (pendingCanonicalPayload?.dashboardConfig) {
          pendingCanonicalPayload.dashboardConfig.restoredAfterRun = true;
        }
      } catch (err) {
        console.error('Fehler beim Wiederherstellen der ursprünglichen Präferenzzeile:', err);
        restoreError = err;
      }
    } else if (restore?.type === 'restore') {
      try {
        const current = await readPreferences(restore.page, SUPABASE);
        await savePreferences(restore.page, SUPABASE, restore.config, current.revision);
        if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = true;
        if (pendingCanonicalPayload?.dashboardConfig) {
          pendingCanonicalPayload.dashboardConfig.restoredAfterRun = true;
        }
      } catch (err) {
        console.error('Fehler beim Wiederherstellen der Dashboard-Präferenzen:', err);
        restoreError = err;
      }
    } else if (restore?.type === 'delete_if_created' && CLEANUP_KEY && restore.userId) {
      try {
        const current = await readPreferences(restore.page, SUPABASE);
        if (current.config) {
          await deletePreferences(SUPABASE, CLEANUP_KEY, restore.userId);
        }
        if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = true;
        if (pendingCanonicalPayload?.dashboardConfig) {
          pendingCanonicalPayload.dashboardConfig.restoredAfterRun = true;
        }
      } catch (err) {
        console.error('Fehler beim Aufräumen der Dashboard-Präferenzen:', err);
        restoreError = err;
      }
    } else if (restore?.type === 'delete_if_created') {
      if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = true;
      if (pendingCanonicalPayload?.dashboardConfig) {
        pendingCanonicalPayload.dashboardConfig.restoredAfterRun = true;
      }
    }
    await setupContext?.close().catch(() => null);
    await browser?.close().catch(() => null);

    const diagDir = path.join(ROOT, 'test-results/auftrag-081');
    const stageJsonOut = path.join(diagDir, 'inventar.stage.json');

    const hadRunFailure = ONLY ? runHadError : !runSuccess;

    if (restoreError || hadRunFailure) {
      if (fs.existsSync(stageJsonOut)) {
        fs.renameSync(stageJsonOut, path.join(diagDir, 'inventar.fehlerlauf.json'));
      }
      process.exitCode = 1;
      if (restoreError) throw restoreError;
    } else if (pendingCanonicalPayload) {
      fs.writeFileSync(JSON_OUT, `${JSON.stringify(pendingCanonicalPayload, null, 1)}\n`);
      writeReadme(pendingCanonicalPayload);
      if (fs.existsSync(stageJsonOut)) fs.unlinkSync(stageJsonOut);
      console.log(
        `\n${pendingCanonicalPayload.summary.ok} von ${pendingCanonicalPayload.summary.expected} Aufnahmen, fehlgeschlagen ${pendingCanonicalPayload.summary.failed}, JSON: ${path.relative(ROOT, JSON_OUT)}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
