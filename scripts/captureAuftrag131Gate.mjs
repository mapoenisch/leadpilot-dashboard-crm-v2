#!/usr/bin/env node
/**
 * Auftrag 131: Screenshot-Gate-Nachweis für Vertriebs-Funnel
 * (/vertrieb/funnel in Plan-, Live- und Vergleichsansicht)
 * bei 1440/768/375 px, beide Themes (dark/light mit data-theme).
 * Misst Überlauf (Dokument, #main-content), Inhaltshöhe, SHA-256 des Bildes;
 * schreibt die textuelle Matrix docs/screenshots/auftrag-131/README.md.
 * Aufruf: node scripts/captureAuftrag131Gate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-131');
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const VORHER_URL = process.env.VORHER_URL ?? 'http://127.0.0.1:3001';
const EMAIL = process.env.E2E_AUTH_EMAIL ?? 'admin-a@e2e.local';
const PASSWORD = process.env.E2E_AUTH_PASSWORD ?? 'TestPassword123!';
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];

const MOCK_DEALS = [
  {
    id: 'd-001',
    dealName: 'Acme Cloud Migration Enterprise',
    stage: 'WON',
    amount: 65000,
    closeDate: '2026-06-30',
    pipeline: 'Core Sales',
  },
  {
    id: 'd-002',
    dealName: 'Beta ERP Rollout Phase 2',
    stage: 'PROPOSAL',
    amount: 45000,
    closeDate: '2026-07-15',
    pipeline: 'Core Sales',
    daysInStage: 29, // Triggert Bottleneck
  },
  {
    id: 'd-003',
    dealName: 'Gamma AI Pilot Accelerator',
    stage: 'QUALIFIED_LEAD',
    amount: 25000,
    closeDate: '2026-08-30',
    pipeline: 'Core Sales',
  },
  {
    id: 'd-004',
    dealName: 'Delta Security Audit & Compliance',
    stage: 'LEAD',
    amount: 18000,
    closeDate: '2026-09-15',
    pipeline: 'Core Sales',
  },
];

const MOCK_CONTACTS = [
  {
    id: 'c-001',
    companyId: 'comp-001',
    email: 'm.mustermann@acme.de',
    name: 'Maximilian Mustermann',
  },
  { id: 'c-002', companyId: 'comp-002', email: 's.schmidt@beta.de', name: 'Sabine Schmidt' },
  { id: 'c-003', companyId: 'comp-003', email: 'k.weber@gamma.de', name: 'Klaus Weber' },
  { id: 'c-004', companyId: 'comp-004', email: 'l.becker@delta.de', name: 'Laura Becker' },
  { id: 'c-005', companyId: 'comp-005', email: 't.hoffmann@zeta.de', name: 'Thomas Hoffmann' },
];

const SCENARIOS = [
  {
    id: 'funnel-plan',
    title: '/sales/funnel?daten=plan (Plan 2025 Faktenblatt-Ansicht)',
    prepare: async (page, url = BASE_URL) => {
      await page.goto(`${url}/sales/funnel?daten=plan`);
      await page.waitForSelector('.funnel-seite', { timeout: 15000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'funnel-live',
    title: '/sales/funnel?daten=live (Operative CRM-Pipeline mit Bottleneck-Alert)',
    prepare: async (page, url = BASE_URL) => {
      await page.goto(`${url}/sales/funnel?daten=live`);
      await page.waitForSelector('.funnel-seite', { timeout: 15000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'funnel-vergleich',
    title:
      '/sales/funnel?daten=vergleich (Parallele Plan-vs-Live Gegenüberstellung mit Delta-Pills)',
    prepare: async (page, url = BASE_URL) => {
      await page.goto(`${url}/sales/funnel?daten=vergleich`);
      await page.waitForSelector('.funnel-seite', { timeout: 15000 });
      await page.waitForTimeout(400);
    },
  },
];

fs.mkdirSync(OUT, { recursive: true });

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

async function mockSupabaseAuthAndData(context) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: '00000000-0000-4000-8000-000000000068',
    aud: 'authenticated',
    role: 'authenticated',
    email: EMAIL,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
    sub: user.id,
    email: EMAIL,
    role: 'authenticated',
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
  })}.mock`;

  const json = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      },
      body: JSON.stringify(body),
    });

  await context.route(/http:\/\/(127\.0\.0\.1|localhost):54321\/.*/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    }
    if (url.pathname.includes('/auth/v1/token')) {
      return json(route, {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'mock-refresh',
        user,
      });
    }
    if (url.pathname.includes('/auth/v1/user')) {
      return json(route, user);
    }
    if (url.pathname.includes('/auth/v1/logout')) {
      return route.fulfill({ status: 204 });
    }
    if (url.pathname.includes('/rest/v1/organization_members')) {
      return json(route, {
        organization_id: '00000000-0000-4000-8000-0000000000a1',
        role: 'admin',
        status: 'active',
        organizations: { status: 'active' },
      });
    }
    if (url.pathname.includes('/functions/v1/crm-query-export')) {
      let post = {};
      try {
        post = request.postDataJSON() || {};
      } catch {}
      const isDeals = post.resource === 'deals';
      const items = isDeals ? MOCK_DEALS : MOCK_CONTACTS;
      return json(route, {
        items,
        total: items.length,
        page: 1,
        pageSize: 1000,
        resource: isDeals ? 'deals' : 'contacts',
      });
    }
    const single = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return json(route, single ? null : []);
  });
}

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch {
    const fallback =
      '/Users/marcpoenisch/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
    if (fs.existsSync(fallback)) {
      return await chromium.launch({ executablePath: fallback });
    }
    throw new Error('Chromium executable not found');
  }
}

const browser = await launchBrowser();
const rows = [];
const SIDES = ['vorher', 'nachher'];

for (const side of SIDES) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
        locale: 'de-DE',
        timezoneId: 'Europe/Berlin',
      });

      await mockSupabaseAuthAndData(ctx);

      const page = await ctx.newPage();
      const currentUrl = side === 'vorher' ? VORHER_URL : BASE_URL;

      // 1. Anmeldung an der Plattform
      try {
        await page.goto(`${currentUrl}/login`);
        await page.waitForLoadState('networkidle');

        const emailInput = page.locator('input#login-email, input[type="email"]');
        if (await emailInput.count()) {
          await emailInput.fill(EMAIL);
          await page.locator('input#login-password, input[type="password"]').fill(PASSWORD);
          await page.click('button[type="submit"]');
          await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10000 });
        }
      } catch (err) {
        console.warn(`[Login Notice] (${side}):`, err.message);
      }

      // 2. Theme global setzen
      await page.evaluate((th) => {
        document.documentElement.dataset.theme = th;
        document.documentElement.setAttribute('data-theme', th);
        if (th === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
      }, theme);

      // 3. Szenarien durchlaufen
      for (const scen of SCENARIOS) {
        if (side === 'vorher') {
          // Echte Baseline (b8fe084) auf VORHER_URL ohne URL-Parameter-Umschaltung
          await page.goto(`${currentUrl}/sales/funnel`);
          await page.waitForSelector('.funnel-seite', { timeout: 15000 });
          await page.waitForTimeout(400);
        } else {
          // Neuer Nachher-Stand mit Umschalter, Live- und Vergleichsmodus
          await scen.prepare(page, currentUrl);
        }

        // Theme nach Navigation sicherstellen
        await page.evaluate((th) => {
          document.documentElement.dataset.theme = th;
          document.documentElement.setAttribute('data-theme', th);
          if (th === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
          }
        }, theme);

        // Überlauf & Metriken ermitteln
        const metrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const main = document.querySelector('#main-content') ?? document.querySelector('main');
          const docOverflow = Math.max(0, docEl.scrollWidth - docEl.clientWidth);
          const bodyOverflow = Math.max(0, body.scrollWidth - body.clientWidth);
          const mainOverflow = main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0;
          return {
            overflowPx: Math.max(docOverflow, bodyOverflow, mainOverflow),
            scrollHeight: Math.max(docEl.scrollHeight, body.scrollHeight),
          };
        });

        const filename = `${side}_${scen.id}_${width}_${theme}.png`;
        const filepath = path.join(OUT, filename);
        await page.screenshot({ path: filepath, fullPage: true });

        const bytes = fs.readFileSync(filepath);
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');

        rows.push({
          side,
          theme,
          width,
          scenId: scen.id,
          scenTitle: scen.title,
          filename,
          hash,
          overflowPx: metrics.overflowPx,
          scrollHeight: metrics.scrollHeight,
        });

        console.log(
          `[Captured] ${side} ${scen.id} ${width}px ${theme} -> overflow: ${metrics.overflowPx}px, height: ${metrics.scrollHeight}px`,
        );
      }

      await ctx.close();
    }
  }
}

await browser.close();

// Matrix aufbereiten
const vorherMap = new Map();
const nachherMap = new Map();

for (const r of rows) {
  const key = `${r.scenId}_${r.width}_${r.theme}`;
  if (r.side === 'vorher') {
    vorherMap.set(key, r);
  } else {
    nachherMap.set(key, r);
  }
}

let tableMd = `| Szenario | Breite | Theme | Vorher SHA-256 (b8fe084) | Nachher SHA-256 (Head) | Diff? | Überlauf Vorher | Überlauf Nachher | Status |\n`;
tableMd += `|---|---|---|---|---|---|---|---|---|\n`;

let totalCompared = 0;
let diffCount = 0;
let maxOverflow = 0;

for (const scen of SCENARIOS) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const key = `${scen.id}_${width}_${theme}`;
      const v = vorherMap.get(key);
      const n = nachherMap.get(key);
      if (!v || !n) continue;

      totalCompared++;
      const isDiff = v.hash !== n.hash;
      if (isDiff) diffCount++;
      const ov = Math.max(v.overflowPx, n.overflowPx);
      if (ov > maxOverflow) maxOverflow = ov;

      const diffBadge = isDiff ? '✅ geändert' : 'gleich';
      const statusBadge = ov === 0 ? '🟢 Pass (0 px)' : `🔴 Fail (${ov} px)`;

      tableMd += `| \`${scen.id}\` | ${width} px | ${theme} | \`${v.hash.slice(0, 12)}…\` | \`${n.hash.slice(0, 12)}…\` | ${diffBadge} | ${v.overflowPx} px | ${n.overflowPx} px | ${statusBadge} |\n`;
    }
  }
}

const EXPECTED_COMPARISONS = 18;
const hasCountMismatch = totalCompared !== EXPECTED_COMPARISONS;
const hasUnchangedImages = diffCount !== totalCompared;
const hasOverflow = maxOverflow > 0;
const isGatePassed = !hasCountMismatch && !hasUnchangedImages && !hasOverflow;

const readmeContent = `# Auftrag 131: Screenshot-Gate-Nachweis

**Route:** \`/vertrieb/funnel\`  
**Baseline:** \`b8fe084\` (origin/main) auf Port 3001  
**Nachher:** \`claude/auftrag-131-vertrieb-funnel-live\` auf Port 3000  
**Datum:** ${new Date().toISOString().slice(0, 10)}  
**Ergebnis:** ${diffCount}/${totalCompared} Bildpaare mit beabsichtigter Änderung, maximaler Überlauf: **${maxOverflow} px**.
**Status:** **${isGatePassed ? 'PASS' : 'FAIL'}**

## Screenshot-Vergleichsmatrix

${tableMd}

## Fazit

- Gerenderte Bildpaare: ${totalCompared}/${EXPECTED_COMPARISONS} (${hasCountMismatch ? 'FEHLER: Unvollständige Bildanzahl' : 'Vollständig'}).
- Visuelle Differenz: ${diffCount}/${totalCompared} Bildpaare mit beabsichtigter Änderung (${hasUnchangedImages ? 'FEHLER: Nicht alle Paare verändert' : '100% geändert'}).
- Überlauf über alle Viewports und Themes: ${maxOverflow === 0 ? '**exakt 0 px** (kein horizontaler Überlauf)' : `**FEHLER: ${maxOverflow} px Überlauf gemessen**`}.
- Gate-Gesamtergebnis: **${isGatePassed ? 'PASS' : 'FAIL'}**.
`;

fs.writeFileSync(path.join(OUT, 'README.md'), readmeContent, 'utf-8');

if (!isGatePassed) {
  console.error(`\n❌ Screenshot-Gate fehlgeschlagen!`);
  if (hasCountMismatch)
    console.error(
      `  - Erwartet: ${EXPECTED_COMPARISONS} Vergleiche, tatsächlich: ${totalCompared}`,
    );
  if (hasUnchangedImages)
    console.error(`  - Unveränderte Bildpaare gefunden: ${totalCompared - diffCount}`);
  if (hasOverflow) console.error(`  - Maximaler horizontaler Überlauf: ${maxOverflow} px`);
  process.exit(1);
}

console.log(
  `\n✅ Screenshot-Gate erfolgreich! Matrix geschrieben nach docs/screenshots/auftrag-131/README.md`,
);
