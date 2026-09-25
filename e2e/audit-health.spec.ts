// G62 (Auftrag 067P, Step 5): E2E-Tests fuer Audit-Log und Systemdiagnose.
// Prueft: Admin sieht beide Seiten, Viewer/Manager werden abgewiesen (403),
// keine Secrets oder PII in der sichtbaren Darstellung.
import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------- Hilfsfunktionen
async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

const VIEWER_EMAIL    = process.env['E2E_VIEWER_EMAIL']    ?? 'viewer-a@e2e.local';
const VIEWER_PASSWORD  = process.env['E2E_VIEWER_PASSWORD']  ?? 'TestPassword123!';
const MANAGER_EMAIL   = process.env['E2E_MANAGER_EMAIL']   ?? 'manager-a@e2e.local';
const MANAGER_PASSWORD = process.env['E2E_MANAGER_PASSWORD'] ?? 'TestPassword123!';

// ---------------------------------------------------------------- Admin-Tests
test.describe('Admin: Audit-Log und Systemdiagnose', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('Admin sieht Audit-Log-Seite mit Tabelle', async ({ page }) => {
    await page.goto('/admin/audit', { waitUntil: 'networkidle' });
    // 067R / G64: genau ein Hauptbereich (Layout); die Seite ist ein benannter Abschnitt darin.
    await expect(page.getByRole('main')).toHaveCount(1);
    const main = page.getByRole('main').getByRole('region', { name: 'Audit-Log' });
    await expect(main.getByRole('heading', { name: 'Audit-Log' })).toBeVisible();
    await expect(page.getByRole('table', { name: /Audit-Log Einträge/i })).toBeVisible();
    await expect(page.getByRole('search', { name: /Audit-Log Filter/i })).toBeVisible();
  });

  test('Admin sieht Sidebar-Links fuer Audit und Diagnose', async ({ page }) => {
    await page.goto('/admin/audit', { waitUntil: 'networkidle' });
    // Auf kleinen Viewports ist die Sidebar hinter dem Menü-Toggle versteckt
    const menuToggle = page.getByRole('button', { name: /Hauptmenü umschalten/i });
    if (await menuToggle.isVisible().catch(() => false)) {
      await menuToggle.click();
    }
    await expect(page.getByTestId('nav-item-admin-audit')).toBeVisible();
    await expect(page.getByTestId('nav-item-admin-health')).toBeVisible();
  });

  test('Admin sieht Systemdiagnose-Seite mit Diagnose-Button', async ({ page }) => {
    await page.goto('/admin/health', { waitUntil: 'networkidle' });
    // 067R / G64: genau ein Hauptbereich (Layout); die Seite ist ein benannter Abschnitt darin.
    await expect(page.getByRole('main')).toHaveCount(1);
    const main = page.getByRole('main').getByRole('region', { name: 'Systemdiagnose' });
    await expect(main.getByRole('heading', { name: 'Systemdiagnose' })).toBeVisible();
    await expect(page.getByTestId('run-diagnosis-btn')).toBeVisible();
  });

  test('Admin startet Diagnose und sieht Subsystem-Karten', async ({ page }) => {
    await page.goto('/admin/health', { waitUntil: 'networkidle' });
    await page.getByTestId('run-diagnosis-btn').click();
    await expect(page.getByTestId('overall-status-banner')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('subsystem-grid')).toBeVisible();
    await expect(page.getByTestId('subsystem-card-auth')).toBeVisible();
    await expect(page.getByTestId('subsystem-card-database')).toBeVisible();
    await expect(page.getByTestId('subsystem-card-worker')).toBeVisible();
  });

  test('Systemdiagnose enthaelt keine Secrets oder API-Keys', async ({ page }) => {
    await page.goto('/admin/health', { waitUntil: 'networkidle' });
    await page.getByTestId('run-diagnosis-btn').click();
    await expect(page.getByTestId('overall-status-banner')).toBeVisible({ timeout: 15000 });

    const bodyText = (await page.innerText('body') ?? '').toLowerCase();
    // Praezise Credential-Muster (keine deutschen Woerter wie "Secrets" im UI-Text,
    // die als Substring matchen wuerden — vgl. Seitenuntertitel "ohne Secrets oder PII")
    const forbidden = ['eyj', 'service_role', 'anon_key', 'api_key', 'apikey', 'bearer'];
    for (const word of forbidden) {
      expect(bodyText, `Seite enthält verbotenes Wort: "${word}"`).not.toContain(word);
    }
  });

  test('Audit-Log-Eintraege enthalten keine echten Emails', async ({ page }) => {
    await page.goto('/admin/audit', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Daten laden

    const bodyText = (await page.innerText('body') ?? '');
    // Keine echten E-Mail-Adressen (grobes Muster: @xxx.yyy)
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = bodyText.match(emailPattern) ?? [];
    // Nur UI-Texte wie Labels erlaubt, keine Datenbankwerte
    const dataEmails = foundEmails.filter(
      (e) => !['e2e.local', 'example.com'].some((allowed) => e.endsWith(allowed)),
    );
    expect(dataEmails).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- Viewer-Tests (FORBIDDEN)
test.describe('Viewer: Zugriff auf Admin-Seiten verweigert', () => {
  // Ohne Admin-StorageState starten, sonst leitet /login auf /dashboard um
  test.use({ storageState: { cookies: [], origins: [] } });
  test('Viewer wird auf /admin/audit mit 403-Ansicht abgewiesen', async ({ page }) => {
    await loginAs(page, VIEWER_EMAIL, VIEWER_PASSWORD);
    await page.goto('/admin/audit', { waitUntil: 'networkidle' });
    await expect(page.getByRole('alert')).toContainText(/Zugriff verweigert/i);
  });

  test('Viewer wird auf /admin/health mit 403-Ansicht abgewiesen', async ({ page }) => {
    await loginAs(page, VIEWER_EMAIL, VIEWER_PASSWORD);
    await page.goto('/admin/health', { waitUntil: 'networkidle' });
    await expect(page.getByRole('alert')).toContainText(/Zugriff verweigert/i);
  });
});

// ---------------------------------------------------------------- Manager-Tests (FORBIDDEN)
test.describe('Manager: Zugriff auf Admin-Seiten verweigert', () => {
  // Ohne Admin-StorageState starten, sonst leitet /login auf /dashboard um
  test.use({ storageState: { cookies: [], origins: [] } });
  test('Manager wird auf /admin/audit mit 403-Ansicht abgewiesen', async ({ page }) => {
    await loginAs(page, MANAGER_EMAIL, MANAGER_PASSWORD);
    await page.goto('/admin/audit', { waitUntil: 'networkidle' });
    await expect(page.getByRole('alert')).toContainText(/Zugriff verweigert/i);
  });

  test('Manager wird auf /admin/health mit 403-Ansicht abgewiesen', async ({ page }) => {
    await loginAs(page, MANAGER_EMAIL, MANAGER_PASSWORD);
    await page.goto('/admin/health', { waitUntil: 'networkidle' });
    await expect(page.getByRole('alert')).toContainText(/Zugriff verweigert/i);
  });
});
