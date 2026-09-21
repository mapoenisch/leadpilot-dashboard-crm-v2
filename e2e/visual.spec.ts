import { test, expect } from '@playwright/test';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`E2E-Abbruch: Umgebungsvariable ${name} ist nicht gesetzt.`);
  }
  return value;
}

test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.includes('/crm/leads')) return;

  await page.goto('/login', { waitUntil: 'networkidle' });
  if (!page.url().endsWith('/login')) {
    await page.getByTestId('logout-button').click();
    await page.waitForURL('**/login');
  }
  await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL'));
  await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await expect(page.getByTestId('logout-button')).toBeAttached();
});

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
