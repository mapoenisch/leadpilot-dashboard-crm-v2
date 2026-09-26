#!/usr/bin/env node
/**
 * Auftrag 068 / Gate G66: Design-Gate für die 32 Inhaltsseiten, Login und Sidebar.
 *
 * Erzeugt Screenshots auf 1440/768/375 px gegen das lokale Supabase (Login mit dem
 * Seed-Admin), misst horizontalen Überlauf und schreibt SHA-256-Hashes nach
 * docs/screenshots/auftrag-068/<label>/manifest.json. Bilder bleiben lokal
 * (.gitignore), nur die Ergebnis-Matrix wird committet.
 *
 * Aufruf: node scripts/captureAuftrag068Screenshots.mjs <label>   (z. B. before | after)
 * Voraussetzung: lokales Supabase läuft (`supabase start`, `db reset` mit Seed),
 * Dev-Server auf BASE_URL (Standard http://localhost:3000) mit VITE_SUPABASE_*.
 *
 * Ohne Docker/Supabase: SUPABASE_MOCK=1 fängt die Supabase-Aufrufe im Browser ab
 * (Passwort-Login, aktive Admin-Mitgliedschaft, sonst leere Antworten). Der
 * Dev-Server läuft dann mit VITE_SUPABASE_URL=http://supabase.mock und einem
 * beliebigen VITE_SUPABASE_ANON_KEY. Die 32 Inhaltsseiten lesen ihre Werte aus
 * src/domain/* und sind davon unabhängig; nur Layout und Login brauchen die Sitzung.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LABEL = process.argv[2] ?? 'after';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_AUTH_EMAIL ?? 'admin-a@e2e.local';
const MOCK = process.env.SUPABASE_MOCK === '1';
const PASSWORD = process.env.E2E_AUTH_PASSWORD ?? (MOCK ? 'mock-passwort' : undefined);
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-068', LABEL);

export const ROUTES = [
  '/finance/p-and-l',
  '/finance/balance-sheet',
  '/finance/unit-economics',
  '/legal/articles',
  '/legal/shareholders',
  '/legal/commercial-register',
  '/strategy/okrs',
  '/strategy/balanced-scorecard',
  '/strategy/growth-drivers',
  '/market/overview',
  '/market/competition',
  '/market/swot',
  '/customers/icp',
  '/customers/persona',
  '/customers/segments',
  '/customers/top-customers',
  '/sales/funnel',
  '/sales/sla',
  '/sales/channels',
  '/sales/planning',
  '/company/profile',
  '/company/highlights',
  '/company/idea',
  '/company/value-proposition',
  '/company/history',
  '/product/features',
  '/product/pricing',
  '/product/performance',
  '/product/roadmap',
  '/organisation/headcount',
  '/organisation/hr',
  '/organisation/team',
];

const VIEWPORTS = [
  { key: '1440', width: 1440, height: 900 },
  { key: '768', width: 768, height: 1024 },
  { key: '375', width: 375, height: 812 },
];

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Supabase-Attrappe für Gate-Läufe ohne Docker (nur Auth + leere Daten). */
async function mockSupabase(context) {
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

/** Überlauf im Dokument und im scrollenden Hauptbereich (#main-content). */
const measureOverflow = (page) =>
  page.evaluate(() => {
    const doc = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const main = document.getElementById('main-content');
    const inner = main ? main.scrollWidth - main.clientWidth : 0;
    return Math.max(doc, inner);
  });

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const slug = (route) => route.replace(/^\//, '').replace(/\//g, '_') || 'root';

async function main() {
  if (!PASSWORD) throw new Error('E2E_AUTH_PASSWORD fehlt (Seed-Passwort des lokalen Supabase).');
  const only = process.env.ROUTES ? process.env.ROUTES.split(',') : ROUTES;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const manifest = [];
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    if (MOCK) await mockSupabase(context);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const loginFile = path.join(OUT_DIR, `login_${vp.key}.png`);
    await page.screenshot({ path: loginFile, fullPage: true });
    const loginOverflow = await measureOverflow(page);
    manifest.push({
      route: '/login',
      viewport: vp.key,
      sha256: sha256(loginFile),
      overflowPx: loginOverflow,
    });

    await page.getByLabel(/E-Mail/i).fill(EMAIL);
    await page.getByLabel(/Passwort/i).fill(PASSWORD);
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });

    // Sidebar mit Logo: unter 1024 px ist sie ein Drawer und wird dafür geöffnet.
    await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20_000 });
    const trigger = page.locator('#mobile-menu-trigger');
    if (await trigger.isVisible()) {
      await trigger.click();
      await page.locator('#mobile-sidebar-drawer img[alt="LeadPilot Logo"]').waitFor();
    }
    await page.waitForTimeout(400);
    const sidebarFile = path.join(OUT_DIR, `sidebar_${vp.key}.png`);
    await page.screenshot({ path: sidebarFile });
    manifest.push({
      route: '/sidebar',
      viewport: vp.key,
      sha256: sha256(sidebarFile),
      overflowPx: await measureOverflow(page),
    });

    for (const route of only) {
      await page.goto(`${BASE_URL}${route}`);
      await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(400);
      const overflowPx = await measureOverflow(page);
      const file = path.join(OUT_DIR, `${slug(route)}_${vp.key}.png`);
      await page.screenshot({ path: file, fullPage: true });
      manifest.push({ route, viewport: vp.key, sha256: sha256(file), overflowPx });
      console.log(`${vp.key} ${route} overflow=${overflowPx}px`);
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const overflow = manifest.filter((entry) => entry.overflowPx > 0);
  console.log(`\n${manifest.length} Screenshots, ${overflow.length} mit horizontalem Überlauf.`);
  // Nachher-Lauf: jedes Paar muss sich vom Vorher-Lauf unterscheiden (SHA-256).
  let unchanged = [];
  const beforeFile = path.join(ROOT, 'docs/screenshots/auftrag-068/before/manifest.json');
  if (LABEL !== 'before') {
    if (!fs.existsSync(beforeFile)) {
      console.error('Vorher-Manifest fehlt: zuerst mit Label "before" gegen v2.3.0 laufen lassen.');
      process.exit(1);
    }
    const before = new Map(
      JSON.parse(fs.readFileSync(beforeFile, 'utf8')).map((e) => [`${e.route}|${e.viewport}`, e]),
    );
    unchanged = manifest.filter(
      (entry) => before.get(`${entry.route}|${entry.viewport}`)?.sha256 === entry.sha256,
    );
    for (const entry of unchanged) console.error(`unverändert: ${entry.route} @${entry.viewport}`);
    console.log(`${unchanged.length} Paare mit identischem SHA-256 gegenüber "before".`);
  }
  process.exit(overflow.length === 0 && unchanged.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
