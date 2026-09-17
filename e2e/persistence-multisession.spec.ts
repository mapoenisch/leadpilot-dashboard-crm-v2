import { test, expect, type Page, type Browser } from '@playwright/test';

// 067F / G49 (Step 5 + Nacharbeit P1): Multisession-Persistenz. Abgeschlossene
// Runs sind nach Reload und in einem zweiten berechtigten Browser identisch
// vorhanden (Server als Quelle, kein In-Memory-Verlust). Ein einziger Fluss
// deckt alle drei Wege ab (Run, Re-Run, Reproduktion) und bleibt damit
// deutlich unter dem fachlichen Limit von 10 Runs je Szenario.
// Credentials ausschließlich aus der Umgebung (Muster wie tenant-isolation,
// keine Fallbacks im Repo).

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

async function openRunModal(page: Page): Promise<void> {
  await page.goto('/crm/live-simulation');
  await page.getByRole('button', { name: 'Run / Re-Run' }).click();
  await expect(page.getByText('SimulationRun Steuerung')).toBeVisible();
}

async function waitRunDone(page: Page): Promise<void> {
  // Modal schließt nach Abschluss; großzügiges Timeout für 50 Ticks.
  await expect(page.getByText('SimulationRun Steuerung')).toBeHidden({ timeout: 120_000 });
}

function newestRunId(before: string[], after: string[]): string {
  const fresh = after.filter((id) => !before.includes(id));
  expect(fresh.length, 'genau ein neuer Run').toBeGreaterThan(0);
  return fresh[fresh.length - 1];
}

test.describe('Persistenz über Sitzungen (Gate G49)', () => {
  test('Run, Re-Run und Reproduktion überstehen Reload und zweiten Browser', async ({
    page,
    browser,
  }) => {
    const email = requireEnv('E2E_AUTH_EMAIL');
    const password = requireEnv('E2E_AUTH_PASSWORD');
    await loginAs(page, email, password);
    const known: string[] = await readRunIds(page);

    // Weg 1: Run.
    await openRunModal(page);
    await page.getByRole('button', { name: 'Neuen Run Starten' }).click();
    await waitRunDone(page);
    const runId = newestRunId(known, await readRunIds(page));
    known.push(runId);
    await page.reload();
    expect(await readRunIds(page)).toContain(runId);

    // Weg 2: Re-Run.
    await openRunModal(page);
    await page.getByRole('button', { name: 'Re-Run Ausführen' }).click();
    await waitRunDone(page);
    const reRunId = newestRunId(known, await readRunIds(page));
    known.push(reRunId);
    await page.reload();
    expect(await readRunIds(page)).toContain(reRunId);

    // Weg 3: Reproduktion.
    await openRunModal(page);
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(reRunId) }).click();
    await page.getByRole('button', { name: 'Reproduzieren' }).click();
    await waitRunDone(page);
    const reproducedId = newestRunId(known, await readRunIds(page));

    await page.reload();
    const reloaded = await readRunIds(page);
    expect(reloaded).toContain(runId);
    expect(reloaded).toContain(reRunId);
    expect(reloaded).toContain(reproducedId);

    // Zweiter berechtigter Browser (eigener Kontext, derselbe Benutzer).
    const context2 = await (browser as Browser).newContext();
    try {
      const page2 = await context2.newPage();
      await loginAs(page2, email, password);
      const other = await readRunIds(page2);
      expect(other).toContain(runId);
      expect(other).toContain(reRunId);
      expect(other).toContain(reproducedId);
      await page2.close();
    } finally {
      await context2.close();
    }
  });
});
