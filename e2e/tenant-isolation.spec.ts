import { test, expect, type Page } from '@playwright/test';

// G45 (Auftrag 067B, Step 6 — freigegebene E2E-Anpassung): Mandantentrennung
// auf UI-Ebene. Zwei echte Supabase-Benutzer je einer Organisation; jeder
// sieht ausschließlich eigene Mandantendaten (RLS-durchgesetzt, kein Mock).

test.use({ storageState: { cookies: [], origins: [] } });

const PASSWORD = process.env.E2E_AUTH_PASSWORD || 'Testpasswort1!';
const PASSWORD_B = process.env.E2E_AUTH_PASSWORD_B || PASSWORD;

async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Mandantentrennung (Gate G45)', () => {
  test('1. Org-A-Admin sieht nur eigene Companies', async ({ page }) => {
    await loginAs(page, 'admin-a@tenant-test.local', PASSWORD);
    await page.goto('/crm/companies');
    // toBeAttached statt toBeVisible: Doppel-DOM (PR-A11Y-12, Fix in 067J)
    // versteckt je Viewport eine Variante per CSS; Datenpräsenz zählt.
    // toHaveCount(0) fordert Fremd-Freiheit in beiden DOMs.
    await expect(page.getByText('Firma A1').first()).toBeAttached();
    await expect(page.getByText('Firma B1')).toHaveCount(0);
  });

  test('2. Org-B-Admin sieht nur eigene Companies', async ({ page }) => {
    await loginAs(page, 'admin-b@tenant-test.local', PASSWORD_B);
    await page.goto('/crm/companies');
    await expect(page.getByText('Firma B1').first()).toBeAttached();
    await expect(page.getByText('Firma A1')).toHaveCount(0);
  });
});
