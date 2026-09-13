import { test, expect } from '@playwright/test';

// Alle 41 Pfade aus src/app/routes.tsx (APP_ROUTES). Als Literal, weil der
// e2e-Kontext kein Vite-Define hat (`import.meta.env.DEV`-Guard in routes.tsx
// wirft außerhalb von Vite) — bei Routenänderung hier synchronisieren.
const ROUTES = [
  '/dashboard',
  '/company/profile',
  '/company/highlights',
  '/company/data-basis',
  '/crm/live-simulation',
  '/crm/leads',
  '/crm/companies',
  '/crm/deals',
  '/crm/activities',
  '/company/idea',
  '/company/value-proposition',
  '/company/history',
  '/company/location',
  '/product/features',
  '/product/pricing',
  '/product/performance',
  '/product/roadmap',
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
  '/finance/p-and-l',
  '/finance/balance-sheet',
  '/finance/unit-economics',
  '/organisation/headcount',
  '/organisation/hr',
  '/organisation/team',
  '/strategy/okrs',
  '/strategy/balanced-scorecard',
  '/strategy/growth-drivers',
  '/resources/materials',
  '/legal/articles',
  '/legal/shareholders',
  '/legal/commercial-register',
];

// Gate G31 (Auftrag 046): ersetzt die DOM-Assertions der captureAuftrag0XX-Harnesses.
// Je Route Deep-Link UND Reload: Titel gesetzt, <main> vorhanden, kein 404,
// kein horizontaler Overflow. Routenquelle: src/app/routes.tsx (Single Source).
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
}

async function assertRoute(page, routePath: string, mode: string) {
  const title = await page.title();
  expect(title.length, `${routePath} [${mode}]: document.title gesetzt`).toBeGreaterThan(0);
  await expect(page.locator('main'), `${routePath} [${mode}]: <main> vorhanden`).toBeAttached();
  const bodyText = (await page.locator('body').innerText()) ?? '';
  expect(
    bodyText.includes('Seite nicht gefunden') || bodyText.includes('404'),
    `${routePath} [${mode}]: kein 404`
  ).toBe(false);
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    return Math.max(0, de.scrollWidth - de.clientWidth);
  });
  expect(overflow, `${routePath} [${mode}]: kein H-Overflow`).toBe(0);
}

for (const routePath of ROUTES) {
  test(`route ${routePath} — deeplink + reload`, async ({ page }) => {
    await page.goto(routePath, { waitUntil: 'networkidle' });
    await settle(page);
    await assertRoute(page, routePath, 'deeplink');

    await page.reload({ waitUntil: 'networkidle' });
    await settle(page);
    await assertRoute(page, routePath, 'reload');
  });
}
