import { test, expect } from '@playwright/test';

// G45 (Auftrag 067B, Step 6 — freigegebene E2E-Anpassung): Supabase-Auth statt
// Demo-Login. Credentials aus Env (lokale E2E-Defaults, keine Secrets im Repo).

// Unauthentifizierter Zustand: storageState für diesen Spec explizit leeren
test.use({ storageState: { cookies: [], origins: [] } });

const E2E_EMAIL = process.env.E2E_AUTH_EMAIL || 'admin-a@tenant-test.local';
const E2E_PASSWORD = process.env.E2E_AUTH_PASSWORD || 'Testpasswort1!';

test.describe('Supabase-Authentifizierung (Gate G45)', () => {
  test('1. Ungemeldeter Aufruf einer geschützten Route leitet zu /login weiter', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Anmeldung zur Plattform' })).toBeVisible();
    await expect(page.getByRole('note', { name: 'Hinweis zur Anmeldung' })).toBeVisible();
  });

  test('2. Falsche Anmeldedaten zeigen Fehlermeldung und gewähren keinen Zutritt', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'falsch@leadpilot.io');
    await page.fill('#login-password', 'ungueltig123');
    await page.click('button[type="submit"]');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Ungültige Anmeldedaten');
    await expect(page).toHaveURL(/\/login/);
  });

  test('3. Erfolgreiche Anmeldung leitet zur Zielroute weiter und setzt Supabase-Session', async ({
    page,
  }) => {
    await page.goto('/crm/leads');
    await expect(page).toHaveURL(/\/login/);

    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/crm\/leads/);
    const logoutBtn = page.getByTestId('logout-button');
    await expect(logoutBtn).toBeAttached();

    // Supabase-Session im localStorage (sb-*-auth-token), keine Demo-Session
    const token = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      return keys.find((key) => key.startsWith('sb-') && key.endsWith('-auth-token')) ?? null;
    });
    expect(token).toBeTruthy();
    const legacy = await page.evaluate(() => localStorage.getItem('leadpilot_auth_session'));
    expect(legacy).toBeNull();
  });

  test('4. Logout entfernt Session und leitet zurück zu /login weiter', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    const logoutBtn = page.getByTestId('logout-button');
    await logoutBtn.focus();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    await expect(page).toHaveURL(/\/login/);

    // Folgeversuch geschützter Routenaufruf führt erneut zu /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
