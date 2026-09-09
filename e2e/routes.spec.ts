import { test, expect } from '@playwright/test';
import { APP_ROUTES } from '../src/app/routes';

// Gate G31 (Auftrag 046): ersetzt die DOM-Assertions der captureAuftrag0XX-Harnesses.
// Je Route Deep-Link UND Reload: Titel gesetzt, <main> vorhanden, kein 404,
// kein horizontaler Overflow. Routenquelle: src/app/routes.tsx (Single Source).
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  // eslint-disable-next-line no-restricted-properties
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

for (const route of APP_ROUTES) {
  test(`route ${route.path} — deeplink + reload`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    await settle(page);
    await assertRoute(page, route.path, 'deeplink');

    await page.reload({ waitUntil: 'networkidle' });
    await settle(page);
    await assertRoute(page, route.path, 'reload');
  });
}
