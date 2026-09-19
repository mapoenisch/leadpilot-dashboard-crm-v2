import { test, expect, type Page } from '@playwright/test';

// 067I / G52–G55: Route-Tests für Welle G52 (Finanzen, Recht, Strategie),
// Welle G53 (Markt, Kunden, Vertrieb), Welle G54 (Unternehmen, Übersicht,
// Produkt) und Welle G55 (Organisation). Jede Route ist eine echte
// React-Seite: kein Ganzseiten-WebP, genau eine h1, auswählbarer Text,
// Chartzusammenfassung erreichbar. Vor der jeweiligen Welle rot
// (WebP-Platzhalter), danach grün. Nutzt den gespeicherten Auth-State der
// globalen E2E-Einrichtung (alle Routen geschützt).

const G52_ROUTES = [
  '/finance/p-and-l',
  '/finance/balance-sheet',
  '/finance/unit-economics',
  '/legal/articles',
  '/legal/shareholders',
  '/legal/commercial-register',
  '/strategy/okrs',
  '/strategy/balanced-scorecard',
  '/strategy/growth-drivers',
];

// 067I / G53: Zweite Welle — Markt (3), Kunden (4), Vertrieb (4).
const G53_ROUTES = [
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
];

// G52-Re-Review (P1 Login-Redirect): Abgelaufener Auth-State leitet nach
// /login um — dort bestehen WebP/h1 trivially. Deshalb nach jedem goto
// zentral URL + Hauptinhalt-Landmarke prüfen, bevor eine Routen-Assertion zählt.
async function gotoAuthenticatedRoute(page: Page, route: string) {
  await page.goto(route);
  await expect(page, 'kein Login-Redirect').not.toHaveURL(/\/login/);
  await expect(
    page.getByRole('main', { name: 'Hauptinhalt' }),
    'Hauptinhalt-Landmarke',
  ).toBeVisible({ timeout: 15_000 });
}

// 067I / G54: Dritte Welle — Übersicht (2), Unternehmen (3), Produkt (4).
const G54_ROUTES = [
  '/company/profile',
  '/company/highlights',
  '/company/idea',
  '/company/value-proposition',
  '/company/history',
  '/product/features',
  '/product/pricing',
  '/product/performance',
  '/product/roadmap',
];

// 067I / G55: Vierte Welle — Organisation (3) plus routeweite
// Gesamtnachprüfung über alle aufgebauten Wellen.
const G55_ROUTES = [
  '/organisation/headcount',
  '/organisation/hr',
  '/organisation/team',
];

const ALL_SEMANTIC_ROUTES: Array<[string, string]> = [
  ...G52_ROUTES.map((route) => ['G52', route] as [string, string]),
  ...G53_ROUTES.map((route) => ['G53', route] as [string, string]),
  ...G54_ROUTES.map((route) => ['G54', route] as [string, string]),
  ...G55_ROUTES.map((route) => ['G55', route] as [string, string]),
];

for (const [welle, route] of ALL_SEMANTIC_ROUTES) {
  test.describe(`${welle} semantische Route ${route}`, () => {
    test('kein Ganzseiten-WebP', async ({ page }) => {
      await gotoAuthenticatedRoute(page, route);
      await expect(page.locator('img[src$=".webp"]')).toHaveCount(0);
    });
    test('genau eine h1 im Content (Header-h1 ist App-Chrome)', async ({ page }) => {
      await gotoAuthenticatedRoute(page, route);
      await expect(page.locator('main h1')).toHaveCount(1);
    });

    test('Text auswählbar (Tabelle/Liste vorhanden)', async ({ page }) => {
      await gotoAuthenticatedRoute(page, route);
      const content = page.getByRole('main', { name: 'Hauptinhalt' });
      // Lazy-Chunks abwarten, sonst misst innerText das Suspense-Fallback.
      await expect(content.getByRole('heading', { level: 1 })).toBeVisible({
        timeout: 15_000,
      });
      const text = await content.innerText();
      expect(text.trim().length, 'sichtbarer Fließtext').toBeGreaterThan(200);
      const tables = await content.locator('table, dl, ul, section').count();
      expect(tables, 'semantische Struktur').toBeGreaterThan(0);
    });

    test('kein horizontaler Overflow bei 375px', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await gotoAuthenticatedRoute(page, route);
      const content = page.getByRole('main', { name: 'Hauptinhalt' });
      await expect(content.getByRole('heading', { level: 1 })).toBeVisible({
        timeout: 15_000,
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - 375);
      expect(overflow, '0px horizontaler Overflow').toBeLessThanOrEqual(0);
    });
  });
}
