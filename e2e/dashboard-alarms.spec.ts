import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Executive Dashboard V2 (Auftrag 168 / P13c §2.4 Nr. 22):
// E2E-Integrationstest mit echtem Supabase-Backend:
// 1. Admin legt Team an und weist Manager und Viewer zu.
// 2. Manager legt Team-Dashboard an, konfiguriert Schwellenwert und aktiviert Alarm.
// 3. Test ruft evaluate_dashboard_alarms via Service-Role auf -> Alarmereignis entsteht.
// 4. Glocke im Kopf zeigt Zähler 1.
// 5. Viewer loggt sich ein, öffnet /dashboard/alarme und quittiert den Alarm mit Kommentar.
// 6. Manager ruft /dashboard/alarme auf und sieht die Quittierung mit Viewer-E-Mail und Zeitstempel.
// 7. Sicheres Aufräumen in afterAll.

test.use({ storageState: { cookies: [], origins: [] } });

function getBaseUrl(): string {
  return process.env.VITE_SUPABASE_URL || process.env.E2E_SUPABASE_URL || 'http://127.0.0.1:54321';
}

function getServiceKey(): string {
  const key =
    process.env.E2E_CLEANUP_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  return key;
}

const ADMIN_EMAIL = process.env.E2E_AUTH_EMAIL || 'admin-a@e2e.local';
const MANAGER_EMAIL = process.env.E2E_AUTH_EMAIL_MANAGER || 'manager-a@e2e.local';
const VIEWER_EMAIL = process.env.E2E_AUTH_EMAIL_VIEWER || 'viewer-a@e2e.local';
const PASSWORD = process.env.E2E_AUTH_PASSWORD || 'TestPassword123!';

async function loginAs(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  await page.goto('/dashboard');
  await page.waitForURL('**/dashboard');
}

async function logout(page: Page): Promise<void> {
  const logoutBtn = page.getByTestId('logout-button');
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await page.waitForURL('**/login');
  } else {
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/login');
  }
}

async function ensureInspectorOpen(page: Page): Promise<void> {
  if (await page.getByTestId('editor-inspector').isVisible()) return;
  const toggleBtn = page.getByTestId('toggle-inspector-button');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await expect(page.getByTestId('editor-inspector')).toBeVisible();
  }
}

test.describe('Dashboard-Editor V2: Alarme Integration Supabase (P13c)', () => {
  const testRunId = Date.now();
  const teamName = `E2E Alarme Team ${testRunId}`;
  let createdTeamId: string | null = null;
  const createdDashboardIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('lp_dashboard_editor_v2', 'true');
    });
  });

  test.afterAll(async () => {
    try {
      const supabaseAdmin = createClient(getBaseUrl(), getServiceKey());
      if (createdDashboardIds.length > 0) {
        await supabaseAdmin
          .from('dashboard_alarm_rules')
          .delete()
          .in('dashboard_id', createdDashboardIds);
        await supabaseAdmin
          .from('dashboards')
          .delete()
          .in('id', createdDashboardIds);
      }
      if (createdTeamId) {
        const { error: delTeamErr } = await supabaseAdmin
          .from('dashboard_teams')
          .delete()
          .eq('id', createdTeamId);
        if (delTeamErr) console.warn('Cleanup dashboard_teams error:', delTeamErr.message);
      }
    } catch (cleanupErr: unknown) {
      console.warn('Cleanup error:', cleanupErr);
    }
  });

  test('Manager legt Alarm an, evaluate_dashboard_alarms erzeugt Event, Viewer quittiert, Manager sieht Quittierung', async ({
    page,
  }) => {
    test.setTimeout(120000);
    page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('BROWSER ERR:', err.message));
    const supabaseAdmin = createClient(getBaseUrl(), getServiceKey());

    // -------------------------------------------------------------
    // Schritt 1: Admin legt Team an und ordnet Manager & Viewer zu
    // -------------------------------------------------------------
    await loginAs(page, ADMIN_EMAIL);
    await page.goto('/admin/teams');
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Dashboard-Teams' }),
    ).toBeVisible();

    await page.getByTestId('create-team-button').click();
    await page.getByTestId('team-name-input').fill(teamName);
    await page.getByTestId('team-description-input').fill('E2E Alarme Test Team');
    await page.getByTestId('team-form-submit-button').click();

    const teamRow = page.locator('tr', { hasText: teamName });
    await expect(teamRow).toBeVisible();

    const manageBtn = teamRow.getByRole('button', { name: 'Mitglieder' });
    await manageBtn.click();

    const memberSelect = page.getByTestId('add-team-member-select');
    await expect(memberSelect).toBeVisible();

    // Manager hinzufügen
    const managerOption = memberSelect.locator('option', { hasText: MANAGER_EMAIL });
    const managerUserId = await managerOption.getAttribute('value');
    if (managerUserId) {
      await memberSelect.selectOption(managerUserId);
      await page.getByTestId('add-member-button').click();
      await expect(page.locator('tr', { hasText: MANAGER_EMAIL })).toBeVisible();
    }

    // Viewer hinzufügen
    const viewerOption = memberSelect.locator('option', { hasText: VIEWER_EMAIL });
    const viewerUserId = await viewerOption.getAttribute('value');
    if (viewerUserId) {
      await memberSelect.selectOption(viewerUserId);
      await page.getByTestId('add-member-button').click();
      await expect(page.locator('tr', { hasText: VIEWER_EMAIL })).toBeVisible();
    }

    // Team-ID ermitteln
    const { data: teamData, error: teamErr } = await supabaseAdmin
      .from('dashboard_teams')
      .select('id')
      .eq('name', teamName)
      .maybeSingle();
    if (teamErr) console.warn('Query dashboard_teams error:', teamErr.message);
    if (teamData?.id) createdTeamId = teamData.id;

    await logout(page);

    // -------------------------------------------------------------
    // Schritt 2: Manager legt Team-Dashboard an, konfiguriert Schwellenwert und Alarm
    // -------------------------------------------------------------
    await loginAs(page, MANAGER_EMAIL);
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    const switcherBtn = page.getByTestId('dashboard-switcher-button');
    await switcherBtn.click();
    await page.getByTestId('new-dashboard-menu-item').click();

    const newDialog = page.getByTestId('new-dashboard-dialog');
    await expect(newDialog).toBeVisible();

    const targetSelect = page.getByTestId('new-dashboard-target-select');
    await expect(targetSelect).toBeVisible();
    await targetSelect.selectOption({ label: `Team: ${teamName}` });

    await page.getByTestId('template-card-sales').click();
    const dashboardTitle = `Team Alarme ${testRunId}`;
    await page.getByTestId('new-dashboard-title-input').fill(dashboardTitle);
    await page.getByTestId('create-dashboard-submit-button').click();

    await expect(newDialog).not.toBeVisible();
    await expect(switcherBtn).toContainText(dashboardTitle);

    // Dashboard-ID für spätere Überprüfung und Aufräumen abrufen
    const { data: dashData } = await supabaseAdmin
      .from('dashboards')
      .select('id')
      .eq('title', dashboardTitle)
      .maybeSingle();
    expect(dashData?.id).toBeTruthy();
    const dashId = dashData!.id;
    createdDashboardIds.push(dashId);

    // Erste Kachel auswählen
    const firstTile = page.locator('[data-testid^="canvas-tile-"]').first();
    await expect(firstTile).toBeVisible();
    const tileIdAttr = await firstTile.getAttribute('data-tile-id');
    const tileId = tileIdAttr || 'tile-pipeline-deals';
    await firstTile.click();

    // Inspector öffnen und Schwellenwert konfigurieren
    await ensureInspectorOpen(page);
    const tabThresholds = page.getByTestId('inspector-tab-schwellenwerte');
    await expect(tabThresholds).toBeVisible();
    await tabThresholds.click();

    // Schwellenwert-Überwachung aktivieren
    const enableToggle = page.getByTestId('threshold-enable-toggle');
    await expect(enableToggle).toBeVisible();
    await enableToggle.check();

    const warnInput = page.getByTestId('threshold-warnung-input');
    await expect(warnInput).toBeVisible();
    await warnInput.fill('0');

    const applyBtn = page.getByTestId('threshold-apply-btn');
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    // Dashboard speichern
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('dirty-indicator')).not.toBeVisible();

    // Jetzt Alarm aktivieren
    const alarmCheckbox = page.getByTestId('alarm-toggle-checkbox');
    await expect(alarmCheckbox).toBeVisible();
    await expect(alarmCheckbox).toBeEnabled();
    await alarmCheckbox.click();

    const statusBadge = page.getByTestId('alarm-status-badge');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toContainText('Aktiv');

    // -------------------------------------------------------------
    // Schritt 3: Backend Worker-Evaluation per Service-Role ausführen
    // -------------------------------------------------------------
    // Regel in DB auffinden
    const { data: ruleRows, error: ruleErr } = await supabaseAdmin
      .from('dashboard_alarm_rules')
      .select('*')
      .eq('dashboard_id', dashId)
      .eq('tile_id', tileId);
    expect(ruleErr).toBeNull();
    expect(ruleRows && ruleRows.length > 0).toBeTruthy();
    const rule = ruleRows![0];

    // Mindestdauer auf 1 setzen und Initialzustand als "normal" vorbereiten
    await supabaseAdmin
      .from('dashboard_alarm_rules')
      .update({ mindestdauer_laeufe: 1 })
      .eq('id', rule.id);

    await supabaseAdmin
      .from('dashboard_alarm_state')
      .upsert({
        rule_id: rule.id,
        organization_id: rule.organization_id,
        bestaetigte_stufe: 'normal',
        beobachtete_stufe: 'warnung',
        beobachtete_laeufe: 1,
        letzte_auswertung: new Date().toISOString(),
      });

    // evaluate_dashboard_alarms aufrufen
    const { data: evalRes, error: evalErr } = await supabaseAdmin.rpc('evaluate_dashboard_alarms');
    expect(evalErr).toBeNull();

    // Prüfen, dass Alarmereignis in der DB erzeugt wurde
    const { data: eventRows, error: eventErr } = await supabaseAdmin
      .from('dashboard_alarm_events')
      .select('*')
      .eq('rule_id', rule.id)
      .order('created_at', { ascending: false });
    expect(eventErr).toBeNull();
    console.log('EVAL RES:', JSON.stringify(evalRes));
    console.log('EVENT ROWS:', JSON.stringify(eventRows));
    expect(eventRows && eventRows.length > 0).toBeTruthy();
    const createdEventId = eventRows![0].id;

    // -------------------------------------------------------------
    // Schritt 4: Glocke im Kopf prüfen
    // -------------------------------------------------------------
    await page.reload({ waitUntil: 'networkidle' });
    const headerBell = page.getByTestId('header-alarm-bell');
    await expect(headerBell).toBeVisible();
    const bellBadge = page.getByTestId('alarm-bell-badge');
    await expect(bellBadge).toBeVisible();
    await expect(bellBadge).toHaveText(/[1-9]\d*/);

    await logout(page);

    // -------------------------------------------------------------
    // Schritt 5: Viewer loggt sich ein, öffnet /dashboard/alarme und quittiert
    // -------------------------------------------------------------
    await loginAs(page, VIEWER_EMAIL);
    await page.goto('/dashboard/alarme');

    const alarmListContainer = page.getByTestId('alarm-list-container');
    await expect(alarmListContainer).toBeVisible();

    const eventItem = page.locator(`[data-testid="alarm-event-item"][data-event-id="${createdEventId}"]`);
    await expect(eventItem).toBeVisible();
    await expect(eventItem).toContainText('warnung');

    const ackBtn = page.getByTestId(`alarm-ack-btn-${createdEventId}`);
    await expect(ackBtn).toBeVisible();
    await ackBtn.click();

    const dialog = page.getByTestId('alarm-acknowledge-dialog');
    await expect(dialog).toBeVisible();

    const commentInput = page.getByTestId('alarm-ack-comment-input');
    await commentInput.fill('Viewer kümmert sich um Deals');

    const submitBtn = page.getByTestId('alarm-ack-submit-btn');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(dialog).toBeHidden();

    // Quittierung mit Viewer-E-Mail und Kommentar verifizieren
    await expect(eventItem).toContainText(VIEWER_EMAIL);
    await expect(eventItem).toContainText('Viewer kümmert sich um Deals');

    await logout(page);

    // -------------------------------------------------------------
    // Schritt 6: Manager ruft /dashboard/alarme auf und sieht Quittierung
    // -------------------------------------------------------------
    await loginAs(page, MANAGER_EMAIL);
    await page.goto('/dashboard/alarme');

    const managerEventItem = page.locator(`[data-testid="alarm-event-item"][data-event-id="${createdEventId}"]`);
    await expect(managerEventItem).toBeVisible();
    await expect(managerEventItem).toContainText(VIEWER_EMAIL);
    await expect(managerEventItem).toContainText('Viewer kümmert sich um Deals');
  });
});
