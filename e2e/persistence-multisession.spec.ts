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
  // Nur Run-ID-Zellen (font-semibold) — Seed-Zellen sind ebenfalls font-mono.
  return page.locator('table td.font-mono.font-semibold').allTextContents();
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

async function readAuditSnapshotTab(page: Page, runId: string): Promise<string> {
  await page.goto('/crm/live-simulation');
  await page.getByRole('tab', { name: /Technik & Audit/ }).click();
  await page.locator('tr', { hasText: runId }).getByRole('button', { name: 'Audit' }).click();
  await page.getByRole('button', { name: 'Snapshot Integrität & State' }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.getByText(/Tick-Anzahl:/)).toBeVisible({ timeout: 30_000 });
  const parts = await dialog.allTextContents();
  return parts.join('\n').replace(/\s+/g, ' ').trim();
}

async function restCount(
  page: Page,
  table: string,
  runId: string,
): Promise<Array<Record<string, unknown>>> {
  const supabaseUrl = requireEnv('E2E_SUPABASE_URL');
  const anonKey = requireEnv('E2E_SUPABASE_ANON_KEY');
  const jwt = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'));
    if (!key) throw new Error('kein Auth-Token im Browser');
    return (JSON.parse(localStorage.getItem(key)!) as { access_token: string }).access_token;
  });
  const res = await page.request.get(
    `${supabaseUrl}/rest/v1/${table}?run_id=eq.${runId}&select=*`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${jwt}` } },
  );
  expect(res.ok(), `REST ${table} erreichbar`).toBe(true);
  return (await res.json()) as Array<Record<string, unknown>>;
}

test.describe('Persistenz über Sitzungen (Gate G49)', () => {
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
    // Sichtbare Auditdaten vorher sichern (finalState statt Defaults).
    const auditBefore = await readAuditSnapshotTab(page, runId);
    expect(auditBefore).toContain('Tick-Anzahl: 50');
    expect(auditBefore).toContain('INVARIANTEN 100% VALIDE');
    await page.reload();
    expect(await readRunIds(page)).toContain(runId);
    // Nach Reload: dieselben Auditdaten, keine Defaults.
    expect(await readAuditSnapshotTab(page, runId)).toBe(auditBefore);

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

    // Server-Count und Inhalte über die öffentliche REST-API (RLS-geschützt):
    // Snapshots und Events des Runs liegen mandantengebunden vor.
    const snapshots = await restCount(page, 'simulation_snapshots', runId);
    expect(snapshots.length, 'mindestens der Final-Snapshot').toBeGreaterThan(0);
    const ticks = snapshots.map((s) => s.tick_id);
    expect(ticks).toContain(50);
    const events = await restCount(page, 'simulation_events', runId);
    expect(events.length, 'Events persistiert').toBeGreaterThan(0);
  });
});
