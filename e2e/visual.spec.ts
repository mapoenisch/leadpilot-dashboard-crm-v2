import { test, expect } from '@playwright/test';

// Gate G31 (Auftrag 046): ersetzt die SHA-256-Screenshot-Matrix der
// captureAuftrag0XX-Harnesses durch toHaveScreenshot mit expliziter Toleranz
// (maxDiffPixelRatio 0.02, siehe playwright.config.ts). Volle Seite, weil der
// alte Harness ebenfalls Full-Height capturte.
const ROUTES = ['/dashboard', '/crm/leads', '/finance/p-and-l', '/market/overview', '/resources/materials'];

for (const routePath of ROUTES) {
  test(`visual ${routePath}`, async ({ page }) => {
    await page.goto(routePath, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot({ fullPage: true });
  });
}
