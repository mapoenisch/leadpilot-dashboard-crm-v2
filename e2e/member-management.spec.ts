import { test, expect, type Page } from '@playwright/test';

// G59 (Auftrag 067M, Step 5): E2E-Tests für Mitgliederverwaltung, Einladungen,
// Rollenmatrix, LAST_ACTIVE_ADMIN-Schutz und Zugriffsbeschränkungen.

test.use({ storageState: { cookies: [], origins: [] } });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`E2E-Abbruch: Umgebungsvariable ${name} ist nicht gesetzt.`);
  }
  return value;
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL'));
  await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Mitgliederverwaltung (Gate G59)', () => {
  test('1. Admin sieht Navigationslink und erreicht /admin/members', async ({ page }) => {
    await loginAsAdmin(page);

    // Auf Viewports < 1024px (Mobile & Tablet): Drawer über Menü-Trigger öffnen
    const isMobileViewport = (page.viewportSize()?.width ?? 1440) < 1024;
    if (isMobileViewport) {
      await page.locator('#mobile-menu-trigger').click();
    }

    // Sidebar: Admin-Link ist sichtbar
    const adminNavItem = page.getByTestId('nav-item-admin-members');
    await expect(adminNavItem).toBeVisible();
    await adminNavItem.click();

    await page.waitForURL('**/admin/members');
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1, name: 'Mitgliederverwaltung' }),
    ).toBeVisible();

    // Rollenmatrix ist vorhanden
    await expect(
      page.getByRole('heading', { level: 2, name: 'Rollen und Berechtigungen' }),
    ).toBeVisible();

    // Tabellen für Mitglieder und Einladungen sind vorhanden
    await expect(page.getByRole('region', { name: 'Mitgliederliste', exact: true })).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Ausstehende Einladungen', exact: true }),
    ).toBeVisible();

    // Der eingeloggte Admin ist in der Liste aufgeführt
    await expect(page.getByRole('main').getByText(requireEnv('E2E_AUTH_EMAIL'))).toBeVisible();
  });

  test('2. Admin stellt Einladung aus und widerruft sie', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    const testEmail = `e2e-invite-${Date.now()}@e2e.local`;

    // Einladung absenden
    await page.fill('#invite-email', testEmail);
    await page.selectOption('#invite-role', 'manager');
    await page.getByRole('button', { name: 'Einladung senden' }).click();

    // Erfolgsmeldung prüfen
    const successStatus = page.locator('[role="status"]').filter({ hasText: 'Einladung an' });
    await expect(successStatus).toBeVisible();
    await expect(page.locator('table').getByText(testEmail)).toBeVisible();

    // Einladung widerrufen
    const inviteRow = page.locator('tr', { hasText: testEmail });
    await inviteRow.getByRole('button', { name: 'Widerrufen' }).click();

    // Bestätigungsmodal
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Ja, widerrufen' }).click();

    // Nach Widerruf verschwindet der Eintrag aus der Liste der offenen Einladungen
    const revokeStatus = page.locator('[role="status"]').filter({ hasText: 'widerrufen' });
    await expect(revokeStatus).toBeVisible();
    await expect(page.locator('table', { hasText: testEmail })).toHaveCount(0);
  });

  test('3. Deaktivierung des einzigen Admins scheitert mit LAST_ACTIVE_ADMIN Schutz', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    const adminEmail = requireEnv('E2E_AUTH_EMAIL');
    const memberRow = page.locator('tr', { hasText: adminEmail });
    await memberRow.getByRole('button', { name: 'Deaktivieren' }).click();

    // Bestätigungsmodal öffnet sich
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Ja, deaktivieren' }).click();

    // Fehlermeldung LAST_ACTIVE_ADMIN wird verständlich angezeigt
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(
      'Der letzte aktive Administrator kann nicht deaktiviert werden',
    );

    // Admin bleibt aktiv
    await expect(memberRow.getByText('Aktiv', { exact: true })).toBeVisible();
  });

  test('4. Unangemeldeter Aufruf leitet zu /login weiter', async ({ page }) => {
    await page.goto('/admin/members');
    await expect(page).toHaveURL(/\/login/);
  });

  test('5. Nutzer ohne Organisation sieht keinen Admin-Link und wird geblockt', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL_NOMEMBER'));
    await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
    await page.click('button[type="submit"]');

    // Nomember hat keine Organisation -> ProtectedRoute leitet sofort nach /login zurück
    await page.waitForURL(/\/login/);

    // Direkter Aufrufversuch von /admin/members
    await page.goto('/admin/members');
    await expect(page).toHaveURL(/\/login/);
  });
});
