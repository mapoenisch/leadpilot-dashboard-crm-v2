#!/usr/bin/env node
/**
 * Auftrag 133: Screenshot-Gate-Nachweis für den interaktiven „What-If“-Hebelrechner
 * (/finance/unit-economics mit What-If Cockpit, Presets und Sensitivitäts-Diagrammen)
 * bei 1440/768/375 px, beide Themes (dark/light mit data-theme).
 * Misst Überlauf (Dokument, #main-content), Inhaltshöhe, SHA-256 des Bildes;
 * Schreibt die textuelle Matrix docs/screenshots/auftrag-133/README.md.
 * Vergleicht echten Baseline-Build (1592fcd) auf Port 3001 gegen Head auf Port 3000.
 * Aufruf: node scripts/captureAuftrag133Gate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-133');
const HEAD_URL = process.env.HEAD_URL ?? 'http://127.0.0.1:3000';
const BASELINE_URL = process.env.BASELINE_URL ?? 'http://127.0.0.1:3001';
const BASELINE_DIR = process.env.BASELINE_DIR ?? '/tmp/leadpilot-baseline-133/dist';

const EMAIL = process.env.E2E_AUTH_EMAIL ?? 'admin-a@e2e.local';
const PASSWORD = process.env.E2E_AUTH_PASSWORD ?? 'TestPassword123!';
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];

const SCENARIOS = [
  {
    id: 'unit-economics-standard',
    title: '/finance/unit-economics (Baseline-Zustand des What-If-Hebelrechners)',
    prepare: async (page, side) => {
      const baseUrl = side === 'vorher' ? BASELINE_URL : HEAD_URL;
      await page.goto(`${baseUrl}/finance/unit-economics`);
      await page.waitForSelector('.finanz-seite', { timeout: 15000 });
      if (side === 'nachher') {
        const cockpit = page.locator('[data-testid="what-if-cockpit"]');
        await cockpit.waitFor({ state: 'visible', timeout: 10000 });
        await cockpit.scrollIntoViewIfNeeded();
      } else {
        await page.evaluate(() => {
          const el = document.querySelector('.finanz-seite');
          if (el) el.scrollIntoView({ block: 'end' });
        });
      }
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'unit-economics-growth-preset',
    title: '/finance/unit-economics (Preset "Wachstums-Offensive" aktiv mit Budget- und Win-Rate-Delta)',
    prepare: async (page, side) => {
      const baseUrl = side === 'vorher' ? BASELINE_URL : HEAD_URL;
      await page.goto(`${baseUrl}/finance/unit-economics`);
      await page.waitForSelector('.finanz-seite', { timeout: 15000 });
      if (side === 'nachher') {
        const growthBtn = page.locator('[data-testid="preset-btn-growth"]');
        await growthBtn.waitFor({ state: 'visible', timeout: 5000 });
        await growthBtn.scrollIntoViewIfNeeded();
        await growthBtn.click();
        await page.waitForTimeout(400);
      } else {
        await page.evaluate(() => {
          const el = document.querySelector('.finanz-seite');
          if (el) el.scrollIntoView({ block: 'end' });
        });
      }
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'unit-economics-tables',
    title: '/finance/unit-economics (Eingeblendete barrierefreie Wertetabellen für Verlauf und Sensitivitäts-Tornado)',
    prepare: async (page, side) => {
      const baseUrl = side === 'vorher' ? BASELINE_URL : HEAD_URL;
      await page.goto(`${baseUrl}/finance/unit-economics`);
      await page.waitForSelector('.finanz-seite', { timeout: 15000 });
      if (side === 'nachher') {
        const projBtn = page.locator('[data-testid="what-if-projection-chart"] button').first();
        await projBtn.waitFor({ state: 'visible', timeout: 5000 });
        await projBtn.scrollIntoViewIfNeeded();
        await projBtn.click();
        const tornadoBtn = page.locator('[data-testid="what-if-tornado-chart"] button').first();
        await tornadoBtn.waitFor({ state: 'visible', timeout: 5000 });
        await tornadoBtn.scrollIntoViewIfNeeded();
        await tornadoBtn.click();
        await page.waitForSelector('[data-testid="what-if-projection-table"]', { timeout: 5000 });
        await page.waitForSelector('[data-testid="what-if-tornado-table"]', { timeout: 5000 });
      } else {
        await page.evaluate(() => {
          const el = document.querySelector('.finanz-seite');
          if (el) el.scrollIntoView({ block: 'end' });
        });
      }
      await page.waitForTimeout(300);
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
        refresh_token: 'mock-refresh-token',
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
        organization_id: '00000000-0000-4000-8000-000000000001',
        role: 'admin',
        status: 'active',
        organizations: { status: 'active' },
      });
    }
    if (url.pathname.includes('/rest/v1/organizations')) {
      return json(route, [
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'LeadPilot Test GmbH',
          slug: 'leadpilot-test',
        },
      ]);
    }
    if (url.pathname.includes('/rest/v1/user_profiles')) {
      return json(route, [
        {
          id: user.id,
          organization_id: '00000000-0000-4000-8000-000000000001',
          role: 'admin',
          full_name: 'Max Mustermann',
        },
      ]);
    }
    const single = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return json(route, single ? null : []);
  });
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

let headProcess = null;
let baselineProcess = null;

async function ensureServersRunning() {
  // 1. Head Server auf Port 3000
  const isHeadUp = await checkUrl(HEAD_URL);
  if (!isHeadUp) {
    console.log(`[Server] Starte Vite Preview für Head auf ${HEAD_URL} …`);
    headProcess = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '3000', '--strictPort'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
  }

  // 2. Baseline Server auf Port 3001
  const isBaselineUp = await checkUrl(BASELINE_URL);
  if (!isBaselineUp) {
    if (!fs.existsSync(BASELINE_DIR)) {
      throw new Error(`Baseline-Verzeichnis nicht gefunden: ${BASELINE_DIR}. Wurde 1592fcd gebaut?`);
    }
    console.log(`[Server] Starte Vite Preview für Baseline (1592fcd) auf ${BASELINE_URL} …`);
    baselineProcess = spawn(
      'npx',
      ['vite', 'preview', '--host', '127.0.0.1', '--port', '3001', '--strictPort', '--outDir', BASELINE_DIR],
      {
        cwd: ROOT,
        stdio: 'inherit',
      },
    );
  }

  const start = Date.now();
  while (Date.now() - start < 20000) {
    const headReady = await checkUrl(HEAD_URL);
    const baselineReady = await checkUrl(BASELINE_URL);
    if (headReady && baselineReady) {
      console.log(`[Server] Beide Preview-Server bereit (${HEAD_URL} & ${BASELINE_URL})`);
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout beim Warten auf Preview-Server`);
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

try {
  await ensureServersRunning();
} catch (err) {
  console.error('[Server Error]', err);
  process.exit(1);
}

const browser = await launchBrowser();
const rows = [];
const SIDES = ['vorher', 'nachher'];

for (const side of SIDES) {
  const currentBaseUrl = side === 'vorher' ? BASELINE_URL : HEAD_URL;

  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
      });
      await mockSupabaseAuthAndData(ctx);

      const page = await ctx.newPage();

      // 1. Anmeldung an der Plattform
      try {
        await page.goto(`${currentBaseUrl}/login`);
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
        await scen.prepare(page, side);

        // Theme nach Navigation nochmals sicherstellen
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

if (headProcess) headProcess.kill();
if (baselineProcess) baselineProcess.kill();

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

let tableMd = `| Szenario | Breite | Theme | Vorher SHA-256 (1592fcd) | Nachher SHA-256 (Head) | Diff? | Überlauf Vorher | Überlauf Nachher | Status |\n`;
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

const readmeContent = `# Auftrag 133: Screenshot-Gate-Nachweis

**Route:** \`/finance/unit-economics\`
**Baseline:** \`1592fcd\` (origin/main Build in \`/tmp/leadpilot-baseline-133/dist\`) auf Port 3001
**Nachher:** \`claude/auftrag-133-what-if-hebelrechner\` (Head Build) auf Port 3000
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
  if (hasCountMismatch) {
    console.error(`  - Erwartet: ${EXPECTED_COMPARISONS} Vergleiche, tatsächlich: ${totalCompared}`);
  }
  if (hasUnchangedImages) {
    console.error(`  - Unveränderte Bildpaare gefunden: ${totalCompared - diffCount}`);
  }
  if (hasOverflow) {
    console.error(`  - Maximaler horizontaler Überlauf: ${maxOverflow} px`);
  }
  process.exit(1);
}

console.log(
  `\n✅ Screenshot-Gate erfolgreich! Matrix geschrieben nach docs/screenshots/auftrag-133/README.md`,
);
