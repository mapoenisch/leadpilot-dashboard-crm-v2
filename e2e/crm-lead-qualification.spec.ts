import { test, expect, type Page } from '@playwright/test';

// Auftrag 139: BANT-Qualifizierung ist serverseitig verbindlich.
// Der Test prüft, dass gespeicherte Werte einen echten Reload überleben
// und die Qualifizierungsmenge in der Liste nachgeladen wird.
// Läuft in der sequentiellen CI-Gruppe (--workers=1), weil der Seed-Kontakt
// mutiert wird. Nur Desktop: der Fall ist ansichtsunabhängig.

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

const CONTACT_ANNA = 'd0000000-0000-0000-0000-000000000001';
const CONTACT_ANNA_NAME = 'Anna Schmidt';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`E2E-Abbruch: Umgebungsvariable ${name} ist nicht gesetzt.`);
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

function serviceHeaders(): Record<string, string> {
  const key = requireEnv('E2E_CLEANUP_KEY');
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function deleteQualification(page: Page): Promise<void> {
  const url = `${requireEnv('E2E_SUPABASE_URL')}/rest/v1/lead_qualifications?contact_id=eq.${CONTACT_ANNA}`;
  const res = await page.request.fetch(url, {
    method: 'DELETE',
    headers: serviceHeaders(),
  });
  expect(res.ok()).toBe(true);
}

async function openLeadDrawer(page: Page): Promise<void> {
  await page.goto('/crm/leads?tab=contacts');
  const qualifyBtn = page.getByRole('button', {
    name: `Lead ${CONTACT_ANNA_NAME} qualifizieren`,
  });
  await expect(qualifyBtn).toBeVisible();
  await qualifyBtn.click();
  await expect(page.getByRole('heading', { name: 'Lead-Qualifizierung' })).toBeVisible();
}

test.describe('Lead-Qualifizierung: serverseitige BANT-Persistenz (Auftrag 139)', () => {
  test.afterEach(async ({ page }) => {
    await deleteQualification(page);
  });

  test('bant_bleibt_nach_reload: gespeicherte BANT-Werte überleben Reload', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop-1440', 'Persistenzfall läuft nur auf Desktop');

    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await openLeadDrawer(page);

    // BANT setzen: Budget + Timeline an, Notiz schreiben
    await page.getByRole('button', { name: /Budget vorhanden/ }).click();
    await page.getByRole('button', { name: /Zeitplan/ }).click();
    await page.getByLabel(/Qualifizierungsnotizen/).fill('E2E-Notiz: Budget geklärt, Go-live Q1.');

    // Explizit speichern (kein Autosave mehr)
    await page.getByTestId('qualification-save-btn').click();
    await expect(page.getByText('Qualifizierung gespeichert.')).toBeVisible();

    // Echter Reload: Werte müssen aus der Datenbank kommen
    await page.reload();
    await openLeadDrawer(page);

    await expect(page.getByRole('button', { name: /Budget vorhanden/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: /Zeitplan/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByLabel(/Qualifizierungsnotizen/)).toHaveValue(
      'E2E-Notiz: Budget geklärt, Go-live Q1.',
    );

    // Listen-Status: Kontakt ist als qualifiziert markiert
    await page.keyboard.press('Escape');
    await expect(page.getByText('Qualifiziert').first()).toBeVisible();
  });
});
