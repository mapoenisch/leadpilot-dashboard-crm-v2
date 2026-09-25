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
const PASSWORD = process.env.E2E_AUTH_PASSWORD;
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
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const loginFile = path.join(OUT_DIR, `login_${vp.key}.png`);
    await page.screenshot({ path: loginFile, fullPage: true });
    manifest.push({ route: '/login', viewport: vp.key, sha256: sha256(loginFile), overflowPx: 0 });

    await page.getByLabel(/E-Mail/i).fill(EMAIL);
    await page.getByLabel(/Passwort/i).fill(PASSWORD);
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });

    for (const route of only) {
      await page.goto(`${BASE_URL}${route}`);
      await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(400);
      const overflowPx = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
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
  process.exit(overflow.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
