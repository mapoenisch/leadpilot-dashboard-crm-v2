#!/usr/bin/env node
/**
 * Auftrag 069 / Gate G67: Bild-zu-Bild-Gate für die 32 statischen Inhaltsseiten.
 *
 * Vergleicht den neuen Stand pixelweise mit v2.2.0 (1440/768 px), prüft die
 * Kacheln auf 375 px, die unsichtbare Textschicht, horizontalen Überlauf und
 * dass interaktive Seiten, Login und Sidebar gegenüber der Baseline unverändert
 * sind. Bilder bleiben lokal (.gitignore), das Ergebnis steht in
 * docs/screenshots/auftrag-069/manifest.json und README.md.
 *
 * Drei Dev-Server (gleiche Env: VITE_SUPABASE_URL=http://supabase.mock,
 * VITE_SUPABASE_ANON_KEY=beliebig):
 *   REF_URL      v2.2.0 (Worktree von Tag v2.2.0)          Standard http://localhost:3100
 *   BASELINE_URL Ausgangsstand 61e70dc (v2.3.1 + PR #36)    Standard http://localhost:3200
 *   BASE_URL     neuer Stand                               Standard http://localhost:3000
 *
 * Aufruf: node scripts/captureAuftrag069Screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF_URL = process.env.REF_URL ?? 'http://localhost:3100';
const BASELINE_URL = process.env.BASELINE_URL ?? 'http://localhost:3200';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-069');
const EMAIL = 'admin-a@e2e.local';
const PASSWORD = 'mock-passwort';
const MAX_DIFF = 0.005; // G67-2/3: ≤ 0,5 % abweichende Pixel
const MIN_ZOOM = 1.6; // G67-4
const ONLY = process.env.ROUTES ? process.env.ROUTES.split(',') : null;
const V231_COMMIT = '1bbe32da01d8b4b1b00b3a85e7d3c8108ce338e2';

// Route → data-testid des Bildes (identisch in v2.2.0 und im neuen Stand).
export const PAGES = {
  '/market/overview': 'market-dach-webp',
  '/market/competition': 'market-competition-webp',
  '/market/swot': 'market-swot-webp',
  '/customers/icp': 'customers-icp-webp',
  '/customers/persona': 'customers-persona-webp',
  '/customers/segments': 'customers-segments-webp',
  '/customers/top-customers': 'customers-top10-webp',
  '/sales/funnel': 'sales-funnel-webp',
  '/sales/sla': 'sales-sla-webp',
  '/sales/channels': 'sales-channels-webp',
  '/sales/planning': 'sales-planning-webp',
  '/finance/p-and-l': 'finance-pnl-webp',
  '/finance/balance-sheet': 'finance-balance-sheet-webp',
  '/finance/unit-economics': 'finance-unit-economics-webp',
  '/organisation/headcount': 'organisation-headcount-webp',
  '/organisation/hr': 'organisation-hr-webp',
  '/organisation/team': 'organisation-team-webp',
  '/strategy/okrs': 'strategy-okrs-webp',
  '/strategy/balanced-scorecard': 'strategy-bsc-webp',
  '/strategy/growth-drivers': 'strategy-growth-webp',
  '/legal/articles': 'legal-articles-webp',
  '/legal/shareholders': 'legal-shareholders-webp',
  '/legal/commercial-register': 'legal-register-webp',
  '/company/profile': 'overview-profile-webp',
  '/company/highlights': 'overview-highlights-webp',
  '/company/idea': 'company-idea-webp',
  '/company/value-proposition': 'company-value-proposition-webp',
  '/company/history': 'company-history-webp',
  '/product/features': 'product-features-webp',
  '/product/pricing': 'product-pricing-webp',
  '/product/performance': 'product-performance-webp',
  '/product/roadmap': 'product-roadmap-webp',
};

// G67-7: bleiben unverändert gegenüber der Baseline.
const UNCHANGED_ROUTES = [
  '/company/data-basis',
  '/company/location',
  '/crm/leads',
  '/crm/companies',
  '/crm/deals',
  '/crm/activities',
];

const VIEWPORTS = [
  { key: '1440', width: 1440, height: 900 },
  { key: '768', width: 768, height: 1024 },
  { key: '375', width: 375, height: 812 },
];

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Supabase-Attrappe wie in Auftrag 068 (Passwort-Login, Admin, sonst leer). */
async function mockSupabase(context) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: '00000000-0000-4000-8000-000000000069',
    aud: 'authenticated',
    role: 'authenticated',
    email: EMAIL,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: '2026-09-26T00:00:00.000Z',
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
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body),
    });
  await context.route('http://supabase.mock/**', async (route) => {
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
    if (url.pathname.startsWith('/auth/v1/token')) {
      return json(route, {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'mock-refresh',
        user,
      });
    }
    if (url.pathname.startsWith('/auth/v1/user')) return json(route, user);
    if (url.pathname.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204 });
    if (url.pathname.startsWith('/rest/v1/organization_members')) {
      return json(route, {
        organization_id: '00000000-0000-4000-8000-0000000000a1',
        role: 'admin',
        status: 'active',
        organizations: { status: 'active' },
      });
    }
    const single = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return json(route, single ? null : []);
  });
}

/** Neuer Stand und Baseline: Supabase-Login über die Attrappe. */
async function openSupabaseApp(browser, vp, baseUrl) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: 'reduce',
  });
  await mockSupabase(context);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`);
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/E-Mail/i).fill(EMAIL);
  await page.getByLabel(/Passwort/i).fill(PASSWORD);
  await page.getByRole('button', { name: /Anmelden/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
  return { context, page };
}

/** v2.2.0: lokaler Demo-Login (Sitzung in localStorage). */
async function openV220App(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      'leadpilot_auth_session',
      JSON.stringify({ id: 'demo-user-id', email: 'demo@leadpilot.io' }),
    );
  });
  return { context, page: await context.newPage() };
}

async function waitForImage(page, testId) {
  const locator = page.locator(`[data-testid="${testId}"]`);
  await locator.waitFor({ state: 'visible', timeout: 20_000 });
  await locator.evaluate((img) =>
    img.complete && img.naturalWidth > 0
      ? true
      : new Promise((resolve) => img.addEventListener('load', () => resolve(true), { once: true })),
  );
  await page.waitForTimeout(200);
  return locator;
}

const measureOverflow = (page) =>
  page.evaluate(() => {
    const doc = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const main = document.getElementById('main-content');
    const inner = main ? main.scrollWidth - main.clientWidth : 0;
    return Math.max(doc, inner);
  });

const rectOf = (locator) =>
  locator.evaluate((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });

/**
 * Der Kopfbereich über dem Inhalt ist seit v2.2.0 anders hoch (768 px: 23,75 px).
 * Liegt das Bild dadurch auf einem anderen Bruchteil eines Pixels, rastert Chromium
 * es an den Kanten anders. Für den Vergleich wird das neue Bild um < 1 px auf
 * denselben Bruchteil wie in v2.2.0 geschoben; der Versatz selbst steht im
 * Manifest (refRect/curRect).
 */
const frac = (value) => value - Math.floor(value);
const alignTo = (locator, ref) =>
  locator.evaluate(
    (node, target) => {
      const r = node.getBoundingClientRect();
      const f = (v) => v - Math.floor(v);
      node.style.position = 'relative';
      node.style.left = `${target.fx - f(r.x)}px`;
      node.style.top = `${target.fy - f(r.y)}px`;
    },
    { fx: frac(ref.x), fy: frac(ref.y) },
  );

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const slug = (route) => route.replace(/^\//, '').replace(/\//g, '_');

/** Pixelvergleich im Browser (Canvas), ohne neue Abhängigkeit. */
async function diffPngs(page, fileA, fileB) {
  const a = fs.readFileSync(fileA).toString('base64');
  const b = fs.readFileSync(fileB).toString('base64');
  return page.evaluate(
    async ([dataA, dataB]) => {
      const load = (data) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = `data:image/png;base64,${data}`;
        });
      const [imgA, imgB] = await Promise.all([load(dataA), load(dataB)]);
      if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
        return {
          sizeA: `${imgA.width}x${imgA.height}`,
          sizeB: `${imgB.width}x${imgB.height}`,
          ratio: 1,
        };
      }
      const read = (img) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      };
      const pa = read(imgA);
      const pb = read(imgB);
      let diff = 0;
      for (let i = 0; i < pa.length; i += 4) {
        if (
          Math.abs(pa[i] - pb[i]) > 16 ||
          Math.abs(pa[i + 1] - pb[i + 1]) > 16 ||
          Math.abs(pa[i + 2] - pb[i + 2]) > 16
        ) {
          diff += 1;
        }
      }
      const size = `${imgA.width}x${imgA.height}`;
      return { sizeA: size, sizeB: size, ratio: diff / (pa.length / 4) };
    },
    [a, b],
  );
}

async function main() {
  for (const dir of ['v220', 'after', 'baseline']) {
    fs.mkdirSync(path.join(OUT_DIR, dir), { recursive: true });
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const diffPage = await browser.newPage();
  const result = { compare: [], mobile: [], textLayer: [], unchanged: [], tag: null };

  for (const vp of VIEWPORTS) {
    const ref = vp.key === '375' ? null : await openV220App(browser, vp);
    const cur = await openSupabaseApp(browser, vp, BASE_URL);

    for (const [route, testId] of Object.entries(PAGES)) {
      if (ONLY && !ONLY.includes(route)) continue;
      await cur.page.goto(`${BASE_URL}${route}`);
      await cur.page.locator('[data-testid="image-page"]').waitFor({ timeout: 20_000 });
      const overflowPx = await measureOverflow(cur.page);

      // G67-5: Textschicht vorhanden, genau eine h1, optisch unsichtbar.
      const layer = await cur.page.evaluate(() => {
        const node = document.querySelector('[data-testid="image-page-text"]');
        const rect = node?.getBoundingClientRect();
        return {
          h1: document.querySelectorAll('#main-content h1').length,
          textLength: node?.textContent?.length ?? 0,
          width: rect?.width ?? -1,
          height: rect?.height ?? -1,
        };
      });
      result.textLayer.push({ route, viewport: vp.key, ...layer });

      if (ref) {
        await ref.page.goto(`${REF_URL}${route}`);
        const refImg = await waitForImage(ref.page, testId);
        const refFile = path.join(OUT_DIR, 'v220', `${slug(route)}_${vp.key}.png`);
        const refRect = await rectOf(refImg);
        await refImg.screenshot({ path: refFile });

        const curImg = await waitForImage(cur.page, testId);
        const curFile = path.join(OUT_DIR, 'after', `${slug(route)}_${vp.key}.png`);
        const curRect = await rectOf(curImg);
        await alignTo(curImg, refRect);
        await cur.page.waitForTimeout(100);
        await curImg.screenshot({ path: curFile });

        const diff = await diffPngs(diffPage, refFile, curFile);
        result.compare.push({
          route,
          viewport: vp.key,
          size: diff.sizeB,
          refSize: diff.sizeA,
          diffRatio: Number(diff.ratio.toFixed(6)),
          refRect,
          curRect,
          sha256Ref: sha256(refFile),
          sha256After: sha256(curFile),
          overflowPx,
        });
        console.log(
          `${vp.key} ${route} diff=${(diff.ratio * 100).toFixed(3)}% overflow=${overflowPx}px`,
        );
      } else {
        // G67-4: Kacheln auf 375 px.
        const tiles = cur.page.locator('[data-testid="image-page-tiles"]');
        await tiles.waitFor({ state: 'visible', timeout: 20_000 });
        await tiles.locator('img').first().scrollIntoViewIfNeeded();
        await cur.page.waitForTimeout(300);
        const geometry = await cur.page.evaluate(() => {
          const full = document.querySelector('.image-page__full');
          const tileNodes = [...document.querySelectorAll('.image-page__tile')];
          const zoom = tileNodes.map((tile) => {
            const img = tile.querySelector('img');
            return img.getBoundingClientRect().width / tile.getBoundingClientRect().width;
          });
          return {
            fullHidden: getComputedStyle(full).display === 'none',
            tiles: tileNodes.length,
            zoom,
          };
        });
        const tileImgs = await tiles.locator('img').all();
        for (const img of tileImgs) {
          await img.evaluate((node) =>
            node.complete && node.naturalWidth > 0
              ? true
              : new Promise((resolve) =>
                  node.addEventListener('load', () => resolve(true), { once: true }),
                ),
          );
        }
        const file = path.join(OUT_DIR, 'after', `${slug(route)}_375.png`);
        await tiles.screenshot({ path: file });
        result.mobile.push({ route, ...geometry, overflowPx, sha256: sha256(file) });
        console.log(
          `375 ${route} zoom=${geometry.zoom.map((z) => z.toFixed(2)).join('/')} overflow=${overflowPx}px`,
        );
      }
    }
    if (ref) await ref.context.close();
    await cur.context.close();
  }

  // G67-7: interaktive Seiten, Login, Sidebar unverändert gegenüber der Baseline.
  for (const vp of VIEWPORTS) {
    for (const [label, url] of [
      ['baseline', BASELINE_URL],
      ['after', BASE_URL],
    ]) {
      const login = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: 'reduce',
      });
      await mockSupabase(login);
      const loginPage = await login.newPage();
      await loginPage.goto(`${url}/login`);
      await loginPage.waitForLoadState('networkidle');
      await loginPage.screenshot({ path: path.join(OUT_DIR, label, `login_${vp.key}.png`) });
      await login.close();

      const app = await openSupabaseApp(browser, vp, url);
      for (const route of UNCHANGED_ROUTES) {
        await app.page.goto(`${url}${route}`);
        await app.page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20_000 });
        await app.page.waitForLoadState('networkidle');
        await app.page.waitForTimeout(600);
        await app.page.screenshot({
          path: path.join(OUT_DIR, label, `${slug(route)}_${vp.key}.png`),
        });
      }
      await app.context.close();
    }
    for (const name of ['login', ...UNCHANGED_ROUTES.map(slug)]) {
      const before = path.join(OUT_DIR, 'baseline', `${name}_${vp.key}.png`);
      const after = path.join(OUT_DIR, 'after', `${name}_${vp.key}.png`);
      const diff = await diffPngs(diffPage, before, after);
      result.unchanged.push({
        page: name,
        viewport: vp.key,
        identical: sha256(before) === sha256(after),
        diffRatio: Number(diff.ratio.toFixed(6)),
      });
    }
  }
  await browser.close();

  // G67-6: Tag v2.3.1 unverändert.
  const tagCommit = execSync('git rev-parse "v2.3.1^{commit}"', { cwd: ROOT }).toString().trim();
  result.tag = { expected: V231_COMMIT, actual: tagCommit, ok: tagCommit === V231_COMMIT };

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(result, null, 2));

  const failures = [
    ...result.compare
      .filter((e) => e.diffRatio > MAX_DIFF || e.overflowPx > 0)
      .map((e) => `vergleich ${e.route}@${e.viewport}`),
    ...result.mobile
      .filter(
        (e) =>
          !e.fullHidden || e.tiles !== 2 || e.zoom.some((z) => z < MIN_ZOOM) || e.overflowPx > 0,
      )
      .map((e) => `mobile ${e.route}`),
    ...result.textLayer
      .filter((e) => e.h1 !== 1 || e.textLength < 100 || e.width > 1 || e.height > 1)
      .map((e) => `textschicht ${e.route}@${e.viewport}`),
    // Toleranz wie G67-2: CRM-Seiten zeigen die Uhrzeit des Datenstands (Stand: hh:mm:ss).
    ...result.unchanged
      .filter((e) => e.diffRatio > MAX_DIFF)
      .map((e) => `unverändert ${e.page}@${e.viewport}`),
    ...(result.tag.ok ? [] : ['tag v2.3.1']),
  ];
  for (const failure of failures) console.error(`FEHLER: ${failure}`);
  console.log(`\n${failures.length} Abweichungen.`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
