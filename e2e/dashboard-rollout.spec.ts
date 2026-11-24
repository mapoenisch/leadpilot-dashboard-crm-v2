import { test, expect, type Browser, type Page } from '@playwright/test';
import { passwordSession, type Session } from './helpers/dashboardPreferences';

// Executive Dashboard V2 (Auftrag 174 / P16b §3 Nr. 8): gestufte Umstellung mit lokalem Supabase.
// 1. Organisation A auf Stufe 1 (wie Marc per SQL; hier mit dem lokalen Aufräumschlüssel):
//    ein Nutzer aus A öffnet ohne Session-Override den neuen Editor.
// 2. Organisation B (ohne Stufe) bleibt im alten Editor.
// 3. Rückweg: A zurück auf Stufe 0 -> alter Editor mit Hinweis auf den gesicherten Stand.
// 4. V2-Daten und Revisionen sind nach dem Rückweg vorhanden.
// Läuft in der seriellen Gruppe, weil die Stufe von Organisation A alle ihre Nutzer betrifft.

test.use({ storageState: { cookies: [], origins: [] } });

const MANAGER_A = process.env.E2E_AUTH_EMAIL_MANAGER || 'manager-a@e2e.local';
const ADMIN_A = process.env.E2E_AUTH_EMAIL || 'admin-a@e2e.local';
const ADMIN_B = process.env.E2E_AUTH_EMAIL_B || 'admin-b@e2e.local';
const PASSWORD = process.env.E2E_AUTH_PASSWORD || 'TestPassword123!';
const PASSWORD_B = process.env.E2E_AUTH_PASSWORD_B || PASSWORD;
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function serviceKey(): string {
  return (
    process.env.E2E_CLEANUP_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  );
}

async function rest<T>(s: Session, pathAndQuery: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${s.url}${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: s.anonKey,
      Authorization: `Bearer ${s.token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`${pathAndQuery}: ${response.status} ${await response.text()}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Schreibt mit dem Service-Schlüssel – nur gegen ein lokales Supabase (wie Marcs SQL-Schritt). */
async function asService(s: Session, pathAndQuery: string, init: RequestInit): Promise<void> {
  if (!LOCAL_HOSTS.has(new URL(s.url).hostname)) {
    throw new Error('Stufen dürfen im Test nur lokal gesetzt werden.');
  }
  const key = serviceKey();
  const response = await fetch(`${s.url}${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`${pathAndQuery}: ${response.status} ${await response.text()}`);
}

async function setStufe(s: Session, orgId: string, stufe: number): Promise<void> {
  await asService(s, '/rest/v1/dashboard_editor_rollout?on_conflict=organization_id', {
    method: 'POST',
    body: JSON.stringify({ organization_id: orgId, stufe, notiz: 'E2E Auftrag 174' }),
  });
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  // Kein Session-Override: entscheidend ist allein der Server-Schalter.
  await page.evaluate(() => window.sessionStorage.removeItem('lp_dashboard_editor_v2'));
}

async function openAs(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await login(page, email, password);
  await page.goto('/dashboard');
  return { context, page };
}

interface ReconRow {
  user_id: string;
  v1_revision: number | null;
  v2_revision: number | null;
  v2_dashboard_id: string | null;
  ergebnis_klasse: string;
  entscheidung: string | null;
  entscheidung_gueltig: boolean | null;
}

/** Stellt sicher, dass der Testnutzer umgestellt werden darf (gültige Entscheidung bei Bedarf). */
async function ensureEligible(admin: Session, userId: string): Promise<void> {
  const rows = await rest<ReconRow[]>(admin, '/rest/v1/rpc/dashboard_v1_v2_reconciliation', {
    method: 'POST',
    body: '{}',
  });
  const row = rows.find((r) => r.user_id === userId);
  if (!row || ['gleich', 'nur_v2', 'keine_kopie'].includes(row.ergebnis_klasse)) return;
  if (row.entscheidung && row.entscheidung !== 'spaeter' && row.entscheidung_gueltig) return;
  await rest(admin, '/rest/v1/rpc/dashboard_rollout_decide', {
    method: 'POST',
    body: JSON.stringify({
      p_user_id: userId,
      p_entscheidung: 'v2_behalten',
      p_expected_v1_revision: row.v1_revision,
      p_expected_v2_revision: row.v2_revision,
      p_expected_dashboard_id: row.v2_dashboard_id,
    }),
  });
}

test.describe('Dashboard-Editor: gestufte Umstellung je Organisation (Auftrag 174)', () => {
  test('Stufe 1 für A, B bleibt V1, Rückweg mit Hinweis, V2-Revisionen bleiben', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const manager = await passwordSession(MANAGER_A, PASSWORD);
    const admin = await passwordSession(ADMIN_A, PASSWORD);
    const [membership] = await rest<{ organization_id: string }[]>(
      manager,
      `/rest/v1/organization_members?select=organization_id&user_id=eq.${manager.userId}&status=eq.active&limit=1`,
    );
    const orgA = membership.organization_id;

    await ensureEligible(admin, manager.userId);
    await setStufe(manager, orgA, 1);
    try {
      // 1. Organisation A: neuer Editor ohne Override
      const a = await openAs(browser, MANAGER_A, PASSWORD);
      await expect(a.page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({
        timeout: 30_000,
      });
      await expect(a.page.getByTestId('dashboard-workspace')).toHaveCount(0);

      // 2. Organisation B: alter Editor
      const b = await openAs(browser, ADMIN_B, PASSWORD_B);
      await expect(b.page.getByTestId('dashboard-workspace')).toBeVisible({ timeout: 30_000 });
      await expect(b.page.getByTestId('dashboard-editor-shell-v2')).toHaveCount(0);
      await expect(b.page.getByTestId('dashboard-rueckweg-notice')).toHaveCount(0);
      await b.context.close();

      // V2-Stand vor dem Rückweg festhalten
      const before = await rest<{ id: string; revision: number }[]>(
        manager,
        '/rest/v1/dashboards?select=id,revision&scope=eq.personal&order=created_at.asc',
      );
      expect(before.length).toBeGreaterThan(0);

      // 3. Rückweg: Stufe 0 -> alter Editor mit Hinweis
      await setStufe(manager, orgA, 0);
      await a.page.reload();
      await expect(a.page.getByTestId('dashboard-workspace')).toBeVisible({ timeout: 30_000 });
      await expect(a.page.getByTestId('dashboard-rueckweg-notice')).toContainText(
        'Änderungen im neuen Editor sind hier nicht enthalten.',
      );
      await expect(a.page.getByTestId('dashboard-editor-shell-v2')).toHaveCount(0);

      // 4. V2-Daten und Revisionen unverändert vorhanden
      const after = await rest<{ id: string; revision: number }[]>(
        manager,
        '/rest/v1/dashboards?select=id,revision&scope=eq.personal&order=created_at.asc',
      );
      expect(after).toEqual(before);
      const revisions = await rest<{ revision: number }[]>(
        manager,
        '/rest/v1/rpc/get_dashboard_v2_revisions',
        { method: 'POST', body: JSON.stringify({ p_dashboard_id: before[0].id }) },
      );
      expect(revisions.length).toBeGreaterThan(0);

      // 5. Erneut aktivieren: sofort wieder neuer Editor (Umstellung bleibt fixiert)
      await setStufe(manager, orgA, 1);
      await a.page.reload();
      await expect(a.page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({
        timeout: 30_000,
      });
      await a.context.close();
    } finally {
      // Ausgangszustand: Organisation A ohne Stufe, Umstellung des Testnutzers entfernt.
      await asService(manager, `/rest/v1/dashboard_editor_rollout?organization_id=eq.${orgA}`, {
        method: 'DELETE',
      });
      await asService(
        manager,
        `/rest/v1/dashboard_editor_switches?organization_id=eq.${orgA}&user_id=eq.${manager.userId}`,
        { method: 'DELETE' },
      );
    }
  });
});
