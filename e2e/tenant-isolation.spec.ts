import { test, expect, type Page } from '@playwright/test';

// G45 (Auftrag 067B, Step 6 — freigegebene E2E-Anpassung): Mandantentrennung
// auf UI-Ebene. Zwei echte Supabase-Benutzer je einer Organisation; jeder
// sieht ausschließlich eigene Mandantendaten (RLS-durchgesetzt, kein Mock).

test.use({ storageState: { cookies: [], origins: [] } });

// Credentials ausschließlich aus der Umgebung (keine Fallbacks im Repo).
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`E2E-Abruch: Umgebungsvariable ${name} ist nicht gesetzt.`);
  }
  return value;
}

async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Mandantentrennung (Gate G45)', () => {
  // Zurückgestellt bis 067N / Gate G60: Gate G47 lässt für Nicht-Demo-Organisationen
  // bei aktiver synthetischer Quelle nur fail-closed SYNTHETIC_NOT_ALLOWED zu.
  // Echte Mandantenquelle für Firmen folgt erst in 067N/G60 (dort wieder aktivieren).
  // Die Datenbankebene (RLS) bleibt durch supabase/tests/tenant_isolation.sql (pgTAP) abgedeckt.
  test.fixme('1. Org-A-Admin sieht nur eigene Companies', async ({ page }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await page.goto('/crm/companies');
    // toBeAttached statt toBeVisible: Doppel-DOM (PR-A11Y-12, Fix in 067J)
    // versteckt je Viewport eine Variante per CSS; Datenpräsenz zählt.
    // toHaveCount(0) fordert Fremd-Freiheit in beiden DOMs.
    await expect(page.getByText('Firma A1').first()).toBeAttached();
    await expect(page.getByText('Firma B1')).toHaveCount(0);
  });

  // Zurückgestellt bis 067N / Gate G60: Gate G47 lässt für Nicht-Demo-Organisationen
  // bei aktiver synthetischer Quelle nur fail-closed SYNTHETIC_NOT_ALLOWED zu.
  // Echte Mandantenquelle für Firmen folgt erst in 067N/G60 (dort wieder aktivieren).
  // Die Datenbankebene (RLS) bleibt durch supabase/tests/tenant_isolation.sql (pgTAP) abgedeckt.
  test.fixme('2. Org-B-Admin sieht nur eigene Companies', async ({ page }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL_B'), requireEnv('E2E_AUTH_PASSWORD_B'));
    await page.goto('/crm/companies');
    await expect(page.getByText('Firma B1').first()).toBeAttached();
    await expect(page.getByText('Firma A1')).toHaveCount(0);
  });

  test('3. Ohne gültige Organisationssitzung führt jede geschützte Route zu /login', async ({
    page,
  }) => {
    // G45-Nacharbeit: Benutzer ohne Mitgliedschaft (analog suspendiert —
    // Provider bildet keine Sitzung) passiert ProtectedRoute nicht.
    await page.goto('/login');
    await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL_NOMEMBER'));
    await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
    await page.click('button[type="submit"]');
    // Supabase-Login erfolgreich, aber ohne Org-Sitzung bleibt /login.
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
