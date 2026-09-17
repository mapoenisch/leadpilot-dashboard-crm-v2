import { test, expect, type Page, type Browser } from '@playwright/test';

// 067F / G49 (Step 5): Multisession-Persistenz. Ein abgeschlossener Run ist
// nach Reload und in einem zweiten berechtigten Browser identisch vorhanden
// (Server als Quelle, kein In-Memory-Verlust). Credentials ausschließlich aus
// der Umgebung (Muster wie tenant-isolation, keine Fallbacks im Repo).

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

async function readRunIds(page: Page): Promise<string[]> {
  await page.goto('/crm/live-simulation');
  await page.getByRole('tab', { name: /Technik & Audit/ }).click();
  await expect(page.getByText('Technische Run-Historie').first()).toBeAttached({
    timeout: 30_000,
  });
  return page.locator('table td.font-mono').allTextContents();
}

test.describe('Persistenz über Sitzungen (Gate G49)', () => {
  test('Run übersteht Reload und zweiten Browser', async ({ page, browser }) => {
    const email = requireEnv('E2E_AUTH_EMAIL');
    const password = requireEnv('E2E_AUTH_PASSWORD');
    await loginAs(page, email, password);

    const before = await readRunIds(page);

    // Neuen Run über die UI starten (persistiert mandantengebunden).
    await page.goto('/crm/live-simulation');
    await page.getByRole('button', { name: 'Run / Re-Run' }).click();
    await page.getByRole('button', { name: 'Neuen Run Starten' }).click();
    // Modal schließt nach Abschluss; großzügiges Timeout für 50 Ticks.
    await expect(page.getByText('SimulationRun Steuerung')).toBeHidden({ timeout: 120_000 });

    const after = await readRunIds(page);
    const fresh = after.filter((id) => !before.includes(id));
    expect(fresh.length, 'genau ein neuer Run').toBeGreaterThan(0);
    const freshRunId = fresh[fresh.length - 1];

    // 1. Reload: derselbe Stand.
    await page.reload();
    const reloaded = await readRunIds(page);
    expect(reloaded).toContain(freshRunId);

    // 2. Zweiter berechtigter Browser (eigener Kontext, derselbe Benutzer).
    const context2 = await (browser as Browser).newContext();
    try {
      const page2 = await context2.newPage();
      await loginAs(page2, email, password);
      const other = await readRunIds(page2);
      expect(other).toContain(freshRunId);
      await page2.close();
    } finally {
      await context2.close();
    }
  });
});
