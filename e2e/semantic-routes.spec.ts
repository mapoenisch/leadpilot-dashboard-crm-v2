import { test, expect, type Page } from '@playwright/test';

// 067I / G52 (Step 1): Roter Route-Test für Welle G52 (Finanzen, Recht,
// Strategie). Jede Route ist eine echte React-Seite: kein Ganzseiten-WebP,
// genau eine h1, auswählbarer Text, Chartzusammenfassung erreichbar.
// Vor der Welle rot (WebP-Platzhalter), danach grün. Nutzt den gespeicherten
// Auth-State der globalen E2E-Einrichtung (alle Routen geschützt).

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

for (const route of G52_ROUTES) {
  test.describe(`G52 semantische Route ${route}`, () => {
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
