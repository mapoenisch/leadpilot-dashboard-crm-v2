import { test, expect, type Page } from '@playwright/test';

// 067Q / G63: Run-Steuerung im echten Browser-Worker gegen lokales Supabase.
// 1. Admin pausiert → Reload → gespeicherte Pause fortsetzen → Run abgeschlossen,
//    Pausen-Snapshot atomar entfernt.
// 2. Admin bricht ab → Wiederholen (gleicher Seed) → Run abgeschlossen.
// 3. Viewer sieht gespeicherte Pausen nur lesend, ohne Aktionen.
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

function serviceHeaders() {
  const key = requireEnv('E2E_CLEANUP_KEY');
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function rest(page: Page, method: 'GET' | 'DELETE' | 'POST', path: string, data?: unknown) {
  const url = `${requireEnv('E2E_SUPABASE_URL')}/rest/v1/${path}`;
  return page.request.fetch(url, { method, headers: serviceHeaders(), data });
}

/**
 * Startet einen Run und klickt `buttonName` in der Steuerleiste des Dialogs,
 * sobald der Button erscheint. Ein 50-Tick-Lauf rechnet im Worker in unter
 * einer Sekunde — ein Playwright-Klick mit Retry käme zu spät. Der Klick läuft
 * trotzdem durch den echten Pfad UI → Store → Coordinator → Worker; der Worker
 * nimmt den Befehl an der nächsten Tick-Grenze an.
 */
async function startRunAndClick(page: Page, buttonName: string): Promise<void> {
  await page.goto('/crm/live-simulation');
  await page.getByRole('button', { name: 'Run / Re-Run' }).click();
  await expect(page.getByText('SimulationRun Steuerung')).toBeVisible();
  await page.evaluate((name) => {
    const tryClick = () => {
      const button = [...document.querySelectorAll('[role="dialog"] button')].find(
        (b) => b.textContent?.trim() === name,
      );
      if (!button) return false;
      (button as HTMLButtonElement).click();
      return true;
    };
    const observer = new MutationObserver(() => {
      if (tryClick()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, buttonName);
  await page.getByRole('button', { name: 'Neuen Run Starten' }).click();
}

// Organisation A aus supabase/seed.sql (admin-a, manager-a, viewer-a).
const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function modal(page: Page) {
  return page.getByRole('dialog');
}

test.describe('Run-Steuerung (Gate G63)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await rest(page, 'DELETE', 'simulation_run_pauses?run_id=neq.__none__');
    await rest(page, 'DELETE', 'simulation_runs?scenario_id=eq.scenario-base-2026');
  });

  test('Pause → Reload → Fortsetzen aus gespeichertem Snapshot', async ({ page }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await startRunAndClick(page, 'Pausieren');
    await expect(modal(page).getByTestId('run-control-status')).toHaveText('Run pausiert', {
      timeout: 30_000,
    });
    const units = await modal(page).getByTestId('run-control-units').textContent();
    const [tick, total] = (units ?? '').split('/').map(Number);
    expect(tick).toBeGreaterThan(0);
    expect(tick).toBeLessThan(total);

    // Pause ist atomar gespeichert (serverseitig, mit Hash).
    await expect
      .poll(
        async () =>
          (
            await (
              await rest(page, 'GET', 'simulation_run_pauses?select=run_id,tick,snapshot_hash')
            ).json()
          ).length,
        {
          timeout: 15_000,
        },
      )
      .toBe(1);
    const [pause] = await (
      await rest(page, 'GET', 'simulation_run_pauses?select=run_id,tick,snapshot_hash')
    ).json();
    expect(pause.tick).toBe(tick);
    expect(pause.snapshot_hash).toMatch(/^[0-9a-f]{64}$/);

    // Reload beendet den Worker; die gespeicherte Pause bleibt fortsetzbar.
    await page.reload();
    const panel = page.getByTestId('paused-runs');
    await expect(panel).toContainText(`${pause.run_id} · Tick ${tick}/${total}`, {
      timeout: 30_000,
    });
    await panel.getByRole('button', { name: `Run ${pause.run_id} fortsetzen` }).click();

    // Abschluss abwarten: Run persistiert (COMPLETED), Fehleranzeige bleibt leer.
    await expect
      .poll(
        async () =>
          (
            await (
              await rest(page, 'GET', `simulation_runs?run_id=eq.${pause.run_id}&select=status`)
            ).json()
          ).map((r: { status: string }) => r.status),
        { timeout: 120_000 },
      )
      .toEqual(['COMPLETED']);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByTestId('worker-progress')).toBeHidden({ timeout: 30_000 });
    await expect(panel).toBeHidden();
    const left = await (await rest(page, 'GET', 'simulation_run_pauses?select=run_id')).json();
    expect(left).toEqual([]);
  });

  test('Abbrechen → Wiederholen mit gleichem Seed', async ({ page }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await startRunAndClick(page, 'Abbrechen');
    await expect(modal(page).getByTestId('run-control-status')).toHaveText('Run abgebrochen');
    await expect(modal(page).getByRole('alert')).toHaveCount(0);

    await modal(page).getByRole('button', { name: 'Wiederholen' }).click();
    // Retry läuft mit demselben Seed bis zum Ende und wird persistiert.
    await expect
      .poll(
        async () =>
          (
            await (
              await rest(
                page,
                'GET',
                'simulation_runs?scenario_id=eq.scenario-base-2026&select=status',
              )
            ).json()
          ).map((r: { status: string }) => r.status),
        { timeout: 120_000 },
      )
      .toEqual(['COMPLETED']);
    await expect(modal(page).getByTestId('run-control-bar')).toBeHidden({ timeout: 30_000 });
    await expect(modal(page).getByRole('alert')).toHaveCount(0);
  });

  test('Viewer sieht gespeicherte Pausen nur lesend', async ({ page }) => {
    // Pause direkt (Service-Role) für Organisation A des Seeds (viewer-a@e2e.local).
    const orgId = ORG_A;
    const created = await rest(page, 'POST', 'simulation_run_pauses', {
      run_id: 'run-viewer-e2e',
      organization_id: orgId,
      scenario_version_id: 'v',
      tick: 5,
      target_ticks: 50,
      snapshot: { runId: 'run-viewer-e2e', organizationId: orgId, tick: 5, targetTicks: 50 },
      snapshot_hash: 'a'.repeat(64),
    });
    expect(created.ok()).toBe(true);

    await loginAs(page, requireEnv('E2E_AUTH_EMAIL_VIEWER'), requireEnv('E2E_AUTH_PASSWORD'));
    await page.goto('/crm/live-simulation');
    const panel = page.getByTestId('paused-runs');
    await expect(panel).toContainText('run-viewer-e2e · Tick 5/50', { timeout: 30_000 });
    await expect(panel).toContainText('nur Lesezugriff');
    await expect(panel.getByRole('button')).toHaveCount(0);
  });
});
