import { test, expect, type Page } from '@playwright/test';

// 067G / G50 (Step 5): Responsiveness während Worker-Runs. Der reproduzierbare
// Produktpfad rechnet ausschließlich im Web Worker — die Oberfläche bleibt
// während der Berechnung bedienbar (kein Main-Thread-Block). Der Fortschritt
// stammt aus echten Berechnungseinheiten (worker-progress-Badge).
// Credentials ausschließlich aus der Umgebung (keine Fallbacks im Repo).

test.use({ storageState: { cookies: [], origins: [] } });

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

test.describe('Worker-Responsiveness (Gate G50)', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    const supabaseUrl = process.env.E2E_SUPABASE_URL;
    const cleanupKey = process.env.E2E_CLEANUP_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && cleanupKey) {
      await page.request.delete(`${supabaseUrl}/rest/v1/simulation_runs?scenario_id=eq.scenario-base-2026`, {
        headers: {
          apikey: cleanupKey,
          Authorization: `Bearer ${cleanupKey}`,
        },
      });
    }
  });

  test('UI bleibt während eines Worker-Runs bedienbar', async ({ page }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await page.goto('/crm/live-simulation');

    // Run starten (läuft im Worker).
    await page.getByRole('button', { name: 'Run / Re-Run' }).click();
    await page.getByRole('button', { name: 'Neuen Run Starten' }).click();

    // Echter Fortschritt wird sichtbar (Badge aus Berechnungseinheiten).
    const badge = page.getByTestId('worker-progress');
    await expect(badge).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('worker-progress-units')).toContainText(/\d+\/\d+/, {
      timeout: 30_000,
    });

    // Während der Berechnung bleibt die UI bedienbar (Tier-Wechsel + Modal).
    await page.getByRole('tab', { name: /Technik & Audit/ }).click();
    await expect(page.getByText('Technische Run-Historie').first()).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('tab', { name: /Management-Ebene/ }).click();

    // Run läuft zu Ende (Modal schließt, kein Worker-Leak hindert Abschluss).
    await expect(page.getByText('SimulationRun Steuerung')).toBeHidden({ timeout: 120_000 });
    await expect(badge).toBeHidden({ timeout: 15_000 });
  });
});
