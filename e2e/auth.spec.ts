import { test, expect } from '@playwright/test';

// Unauthentifizierter Zustand: storageState für diesen Spec explizit leeren
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('App-seitige Authentifizierung (Gate G42)', () => {
  test('1. Ungemeldeter Aufruf einer geschützten Route leitet zu /login weiter', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Anmeldung zur Plattform' })).toBeVisible();
    await expect(page.getByRole('note', { name: 'Hinweis zum Demo-Modus' })).toBeVisible();
  });

  test('2. Falsche Anmeldedaten zeigen Fehlermeldung und gewähren keinen Zutritt', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'falsch@leadpilot.io');
    await page.fill('#login-password', 'ungueltig123');
    await page.click('button[type="submit"]');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Ungültige Anmeldedaten');
    await expect(page).toHaveURL(/\/login/);
  });

  test('3. Erfolgreiche Anmeldung mit Demo-Credentials leitet zur Zielroute weiter und setzt Session', async ({ page }) => {
    // Rufe gezielt eine tiefere Route auf, um Weiterleitung nach Login zu prüfen
    await page.goto('/crm/leads');
    await expect(page).toHaveURL(/\/login/);

    await page.fill('#login-email', 'demo@leadpilot.io');
    await page.fill('#login-password', 'demo');
    await page.click('button[type="submit"]');

    // Nach Login muss Weiterleitung zu /crm/leads erfolgen
    await expect(page).toHaveURL(/\/crm\/leads/);
    const logoutBtn = page.getByTestId('logout-button');
    await expect(logoutBtn).toBeAttached();

    // Session-Objekt im localStorage verifizieren
    const session = await page.evaluate(() => localStorage.getItem('leadpilot_auth_session'));
    expect(session).toBeTruthy();
    const parsed = JSON.parse(session!);
    expect(parsed.id).toBe('demo-user-id');
    expect(parsed.email).toBe('demo@leadpilot.io');
  });

  test('4. Logout entfernt Session und leitet zurück zu /login weiter', async ({ page }) => {
    // Zuerst anmelden
    await page.goto('/login');
    await page.fill('#login-email', 'demo@leadpilot.io');
    await page.fill('#login-password', 'demo');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Abmelden-Affordance betätigen (wird bei Focus/Hover sichtbar)
    const logoutBtn = page.getByTestId('logout-button');
    await logoutBtn.focus();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verifizieren: Weiterleitung zu /login und Session aus localStorage gelöscht
    await expect(page).toHaveURL(/\/login/);
    const session = await page.evaluate(() => localStorage.getItem('leadpilot_auth_session'));
    expect(session).toBeNull();

    // Folgeversuch geschützter Routenaufruf führt erneut zu /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
