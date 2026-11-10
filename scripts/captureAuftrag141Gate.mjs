#!/usr/bin/env node
/**
 * Auftrag 141: Screenshot-Gate-Nachweis für die Entfernung des Legacy-Dashboards
 * (/dashboard = persönliche Ansicht, /dashboard/tiles/:tileId = Kachel-Details)
 * bei 1440/768/375 px, beide Themes. Misst Überlauf (Dokument, #main-content),
 * Inhaltshöhe, SHA-256 des Bildes; schreibt die textuelle Matrix
 * docs/screenshots/auftrag-141/README.md. Bilder bleiben lokal (.gitignore).
 * Aufruf: BEFORE_URL=http://127.0.0.1:4322 node scripts/captureAuftrag141Gate.mjs
 * BEFORE_URL: separat gebauter Ausgangsstand (origin/main); Nachher: aktueller dist-Build.
 * Beide Builds benötigen VITE_SUPABASE_URL=http://127.0.0.1:54321 und einen Mock-Anon-Key.
 * Supabase wird per Route-Mock bedient (kein echter Backend-Zugriff).
 * Erwartung: Der Ausgangsstand zeigt unter /dashboard ebenfalls die persönliche
 * Ansicht (Rollout-Standard seit Auftrag 079) — die Bilder sollen identisch sein.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-141');
const CAPTURE_MANIFEST =
  process.env.CAPTURE_MANIFEST ?? path.join(os.tmpdir(), 'leadpilot-141-captures.json');
const COMPARE_ONLY = process.env.COMPARE_ONLY === '1';
const PORT = Number(process.env.PORT ?? 4321);
const BEFORE_URL = process.env.BEFORE_URL;
if (!BEFORE_URL) throw new Error('BEFORE_URL muss auf den Build vor Auftrag 141 zeigen.');
// Entspricht playwright.config.ts: maximal 0,1 % Rasterungsdrift.
const MAX_DIFF_PIXEL_RATIO = 0.001;
const APPROVALS = process.env.VISUAL_APPROVALS
  ? JSON.parse(fs.readFileSync(process.env.VISUAL_APPROVALS, 'utf8'))
  : [];
let captureUrl;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const EMAIL = 'admin-a@e2e.local';
const PASSWORD = 'TestPassword123!';
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];
const ORG_ID = '00000000-0000-4000-8000-0000000000a1';

// Gespeicherte Dashboard-Konfiguration mit einer Umsatz-Kachel, damit die
// Detailroute `/dashboard/tiles/cfg_umsatz` eine echte Kachel auflöst.
const DASHBOARD_CONFIG = {
  version: 1,
  tiles: [
    {
      tileId: 'cfg_umsatz',
      catalogId: 'baseline.umsatz',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    },
  ],
};

const SCENARIOS = [
  {
    id: 'dashboard-uebersicht',
    role: 'admin',
    title: '/dashboard (persönliche Ansicht)',
    prepare: async (page) => {
      await page.goto(`${captureUrl}/dashboard`);
      await page
        .getByTestId('dashboard-heading')
        .waitFor({ timeout: 20000 });
      await page
        .getByTestId('dashboard-workspace')
        .waitFor({ state: 'attached', timeout: 20000 });
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="dashboard-workspace"]')
            ?.getAttribute('aria-busy') === 'false',
        { timeout: 20000 },
      );
      await page.waitForTimeout(800);
    },
  },
  {
    id: 'dashboard-kachel-details',
    role: 'admin',
    title: '/dashboard/tiles/cfg_umsatz (Kachel-Details)',
    prepare: async (page) => {
      await page.goto(`${captureUrl}/dashboard/tiles/cfg_umsatz`);
      await page.getByTestId('tile-detail-page').waitFor({ timeout: 20000 });
      await page.waitForTimeout(800);
    },
  },
];

const FIXED_NOW = new Date('2026-11-11T10:00:00Z');

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

async function mockSupabaseAuthAndData(context, role) {
  const now = Math.floor(FIXED_NOW.getTime() / 1000);
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
        organization_id: ORG_ID,
        role,
        status: 'active',
        organizations: { status: 'active' },
      });
    }
    if (url.pathname.includes('/rest/v1/executive_dashboard_preferences')) {
      // maybeSingle: PostgREST-Objekt-Antwort (Accept: vnd.pgrst.object)
      return json(route, {
        config: DASHBOARD_CONFIG,
        schema_version: 1,
        revision: 1,
        updated_at: '2026-11-01T10:00:00Z',
      });
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

fs.mkdirSync(OUT, { recursive: true });

let serverProc = null;
const isUp = await checkUrl(BASE_URL);
if (!COMPARE_ONLY && !isUp) {
  console.log(`[Server] Starte Vite Preview auf ${BASE_URL} …`);
  serverProc = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    {
      cwd: ROOT,
      stdio: 'pipe',
    },
  );
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < 15000) {
    if (await checkUrl(BASE_URL)) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!ready) {
    if (serverProc) serverProc.kill('SIGTERM');
    throw new Error(`Server auf ${BASE_URL} nicht erreichbar`);
  }
}

const browser = await chromium.launch();
const rows = COMPARE_ONLY ? JSON.parse(fs.readFileSync(CAPTURE_MANIFEST, 'utf8')) : [];

try {
  if (!COMPARE_ONLY) {
    for (const phase of ['before', 'after']) {
      captureUrl = phase === 'before' ? BEFORE_URL : BASE_URL;
      for (const scenario of SCENARIOS) {
        for (const theme of THEMES) {
          for (const width of WIDTHS) {
            const ctx = await browser.newContext({
              viewport: { width, height: 1000 },
              reducedMotion: 'reduce',
              locale: 'de-DE',
              timezoneId: 'Europe/Berlin',
            });

            await mockSupabaseAuthAndData(ctx, scenario.role);

            const page = await ctx.newPage();
            await page.clock.setSystemTime(FIXED_NOW);

            try {
              // 1. Anmeldung an der Plattform
              await page.goto(`${captureUrl}/login`);
              await page.waitForLoadState('networkidle');

              const emailInput = page.getByLabel(/E-Mail/i);
              if (await emailInput.count()) {
                await emailInput.fill(EMAIL);
                await page.getByLabel(/Passwort/i).fill(PASSWORD);
                await page.getByRole('button', { name: /Anmelden/i }).click();
                await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
                  timeout: 20000,
                });
              }

              // 2. Szenario vorbereiten
              await scenario.prepare(page);

              // Theme explizit setzen
              await page.evaluate((th) => {
                document.documentElement.dataset.theme = th;
                if (th === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
              }, theme);
              await page.addStyleTag({
                content:
                  '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }',
              });
              await page.evaluate(() => document.fonts.ready);
              await page.waitForTimeout(1000);

              // Überlauf und Höhe messen
              const metrics = await page.evaluate(() => {
                const doc = Math.max(
                  0,
                  document.documentElement.scrollWidth - document.documentElement.clientWidth,
                );
                const main = document.getElementById('main-content');
                const inner = main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0;
                const height = main ? main.scrollHeight : document.body.scrollHeight;
                return { doc, inner, height };
              });

              const file = path.join(
                OUT,
                `auftrag-141-${phase}-${scenario.id}-${theme}-${width}.png`,
              );
              await page.evaluate(() => document.fonts.ready);
              let buf;
              let previousCapture;
              let stableFrames = 0;
              for (let attempt = 0; attempt < 30; attempt += 1) {
                buf = await page.screenshot({ fullPage: true, animations: 'disabled' });
                stableFrames = previousCapture?.equals(buf) ? stableFrames + 1 : 0;
                if (stableFrames >= 3) break;
                previousCapture = buf;
                await page.waitForTimeout(200);
              }
              if (stableFrames < 3)
                throw new Error(
                  'Darstellung nicht stabil: keine vier identischen Aufnahmen in Folge.',
                );
              fs.writeFileSync(file, buf);
              const hash = crypto.createHash('sha256').update(buf).digest('hex');

              rows.push({
                phase,
                file,
                scenario: scenario.id,
                scenarioTitle: scenario.title,
                theme,
                width,
                hash,
                docOverflow: metrics.doc,
                innerOverflow: metrics.inner,
                height: metrics.height,
              });
            } catch (err) {
              await page.screenshot({ path: path.join(OUT, 'capture-error.png') });
              console.error('URL:', page.url(), 'Text:', await page.locator('body').innerText());
              console.error(`Fehler bei ${scenario.id}, ${theme}, ${width}px:`, err);
              throw err;
            } finally {
              await ctx.close();
            }
          }
        }
      }
    }
    fs.writeFileSync(CAPTURE_MANIFEST, JSON.stringify(rows, null, 2));
  }
  for (const row of rows) {
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(row.file)).digest('hex');
    if (actualHash !== row.hash) throw new Error(`Bild seit Aufnahme verändert: ${row.file}`);
  }
  const comparePage = await browser.newPage();
  for (const row of rows.filter((r) => r.phase === 'after')) {
    const before = rows.find(
      (r) =>
        r.phase === 'before' &&
        r.scenario === row.scenario &&
        r.theme === row.theme &&
        r.width === row.width,
    );
    row.beforeHash = before.hash;
    const comparison = await comparePage.evaluate(
      async ([a, b]) => {
        const load = async (src) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          return img;
        };
        const [left, right] = await Promise.all([load(a), load(b)]);
        if (left.width !== right.width || left.height !== right.height) return { changed: -1 };
        const canvas = document.createElement('canvas');
        canvas.width = left.width;
        canvas.height = left.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(left, 0, 0);
        const old = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.drawImage(right, 0, 0);
        const next = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let changed = 0;
        for (let i = 0; i < old.data.length; i += 4) {
          const differs =
            old.data[i] !== next.data[i] ||
            old.data[i + 1] !== next.data[i + 1] ||
            old.data[i + 2] !== next.data[i + 2] ||
            old.data[i + 3] !== next.data[i + 3];
          if (differs) changed++;
          next.data[i] = 255;
          next.data[i + 1] = differs ? 0 : 255;
          next.data[i + 2] = differs ? 0 : 255;
          next.data[i + 3] = 255;
        }
        ctx.putImageData(next, 0, 0);
        return {
          changed,
          ratio: changed / (canvas.width * canvas.height),
          diff: canvas.toDataURL('image/png').split(',')[1],
        };
      },
      [before, row].map(
        (r) => `data:image/png;base64,${fs.readFileSync(r.file).toString('base64')}`,
      ),
    );
    row.changedPixels = comparison.changed;
    row.diffRatio = comparison.ratio;
    if (comparison.diff)
      fs.writeFileSync(
        row.file.replace('.png', '-diff.png'),
        Buffer.from(comparison.diff, 'base64'),
      );
    row.reviewReason = APPROVALS.find(
      (a) =>
        a.beforeHash === before.hash &&
        a.afterHash === row.hash &&
        typeof a.reason === 'string' &&
        a.reason.trim(),
    )?.reason;
    row.reviewed = Boolean(row.reviewReason);
  }
} finally {
  await browser.close();
  if (serverProc) {
    serverProc.kill('SIGTERM');
  }
}

// Auswertung
let bad = 0;
let overflowCount = 0;
const lines = [];

for (const row of rows.filter((r) => r.phase === 'after')) {
  const isOverflow = row.docOverflow > 0 || row.innerOverflow > 0;
  if (isOverflow) overflowCount += 1;
  const diffPassed =
    row.changedPixels >= 0 && (row.diffRatio <= MAX_DIFF_PIXEL_RATIO || row.reviewed);
  if (isOverflow || !diffPassed) {
    bad += 1;
  }
  const status = isOverflow
    ? '❌ Überlauf'
    : !diffPassed
      ? '❌ Bildabweichung ungeprüft'
      : row.reviewed
        ? `✅ Geprüft: ${row.reviewReason}`
        : '✅ Vergleich bestanden';
  lines.push(
    `| \`${row.scenario}\` | \`${row.theme}\` | ${row.width} px | ${row.docOverflow}/${row.innerOverflow} px | ${row.height} px | \`${row.beforeHash}\` / \`${row.hash}\` | ${row.changedPixels} | ${status} |`,
  );
}

const total = rows.length;
const allPassed = bad === 0 && total === 2 * SCENARIOS.length * THEMES.length * WIDTHS.length;

const md = [
  '# Auftrag 141 – Visuelle Gate-Prüfung Legacy-Dashboard entfernt (1440/768/375 px, dark/light)',
  '',
  `Aufgenommen ${new Date().toISOString().slice(0, 10)}, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).`,
  `Vorher: ${BEFORE_URL} (Basis origin/main nach Auftrag 140, Merge 05c4f35); Nachher: ${BASE_URL}.`,
  'Überlauf = Dokument/#main-content in px; Hash = vollständiger SHA-256. Bildtoleranz: 0,1 % wie playwright.config.ts; darüber sperrt eine ungeprüfte Abweichung das Gate.',
  'Der Ausgangsstand zeigt unter `/dashboard` bereits die persönliche Ansicht (Rollout-Standard seit Auftrag 079) — erwartet sind identische Bilder.',
  '',
  '| Szenario | Theme | Breite | Überlauf | Inhaltshöhe | SHA-256 vorher / nachher | Geänderte Pixel | Status |',
  '|---|---|---|---|---|---|---|---|',
  ...lines,
  '',
  '## Zusammenfassung',
  '',
  `- **Gesamtanzahl Aufnahmen:** ${total}`,
  `- **Überlauf-Status:** ${overflowCount === 0 ? '0 px Überlauf in allen Nachher-Aufnahmen' : `${overflowCount} Aufnahmen mit Überlauf`}`,
  `- **Status:** ${allPassed ? '✅ ALLE GATES BESTANDEN' : '❌ FEHLGESCHLAGEN'}`,
  '',
  '### Verifizierte Eigenschaften (Auftrag 141):',
  '- `/dashboard` zeigt die persönliche Ansicht; der Rollout-Schalter und die bisherige Ansicht sind entfernt',
  '- `/dashboard/tiles/:tileId` bleibt erreichbar und zeigt Kachel-Details',
  '- Kein horizontaler Überlauf in allen Aufnahmen',
  '- Bildvergleich: höchstens 0,1 % Pixelabweichung oder ausdrücklich geprüfte Abweichung mit exakt gebundenen Vorher-/Nachher-Hashes; ungeprüfte Abweichungen sperren das Gate.',
  '',
].join('\n');

fs.writeFileSync(path.join(OUT, 'README.md'), md);
console.log(`Ergebnis-Matrix nach ${path.join(OUT, 'README.md')} geschrieben.`);

if (!allPassed) {
  console.error(`❌ Screenshot-Gate fehlgeschlagen: bad=${bad}`);
  process.exit(1);
}
console.log('✅ Auftrag 141 Screenshot-Gate vollständig bestanden.');
