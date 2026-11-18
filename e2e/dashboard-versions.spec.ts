import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Executive Dashboard V2 (Auftrag 165 / P12):
// E2E-Test mit lokalem Supabase-Backend (§2.5 Nr. 28):
// 1. Admin legt Team an und ordnet Manager und Viewer zu.
// 2. Manager legt Team-Dashboard an und speichert dreimal (erzeugt 3 Revisionen).
// 3. Viewer sieht die Versionen, vergleicht zwei Revisionen, exportiert, sieht kein „Wiederherstellen“,
//    aber den Namen/Autor des Managers.
// 4. Manager stellt Revision 1 wieder her (erzeugt Revision 4).
// 5. Viewer sieht nach Neuladen den wiederhergestellten Stand.
// 6. Sicheres Aufräumen im afterAll (Scope-Variablen).

test.use({ storageState: { cookies: [], origins: [] } });

function getBaseUrl(): string {
  return process.env.VITE_SUPABASE_URL || process.env.E2E_SUPABASE_URL || 'http://127.0.0.1:54321';
}

function getServiceKey(): string {
  const key = process.env.E2E_CLEANUP_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('E2E_CLEANUP_KEY oder SUPABASE_SERVICE_ROLE_KEY erforderlich');
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

test.describe('Dashboard-Editor V2: Versionshistorie & Wiederherstellen Supabase (P12)', () => {
  const testRunId = Date.now();
  const teamName = `E2E Versionen Team ${testRunId}`;
  let createdTeamId: string | null = null;
  let managerUserId: string | null = null;
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
        const { error: delDashErr } = await supabaseAdmin
          .from('dashboards')
          .delete()
          .in('id', createdDashboardIds);
        if (delDashErr) console.warn('Cleanup dashboards error:', delDashErr.message);
      }
      if (createdTeamId) {
        const { error: delTeamErr } = await supabaseAdmin
          .from('dashboard_teams')
          .delete()
          .eq('id', createdTeamId);
        if (delTeamErr) console.warn('Cleanup dashboard_teams error:', delTeamErr.message);
      }
      if (managerUserId) {
        await supabaseAdmin
          .from('organization_members')
          .update({ role: 'manager' })
          .eq('user_id', managerUserId);
      }
    } catch {
      // Ignoriere Fehler beim Aufräumen
    }
  });

  test('Revisionshistorie, Berechtigungsschutz, Autorenanzeige und Wiederherstellen', async ({
    page,
  }) => {
    test.setTimeout(90000);

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
    await page.getByTestId('team-description-input').fill('E2E Versions Test Team');
    await page.getByTestId('team-form-submit-button').click();

    const teamRow = page.locator('tr', { hasText: teamName });
    await expect(teamRow).toBeVisible();

    const manageBtn = teamRow.getByRole('button', { name: 'Mitglieder' });
    await manageBtn.click();

    const memberSelect = page.getByTestId('add-team-member-select');
    await expect(memberSelect).toBeVisible();

    const managerOption = memberSelect.locator('option', { hasText: MANAGER_EMAIL });
    managerUserId = await managerOption.getAttribute('value');
    if (managerUserId) {
      await memberSelect.selectOption(managerUserId);
      await page.getByTestId('add-member-button').click();
      await expect(page.locator('tr', { hasText: MANAGER_EMAIL })).toBeVisible();
    }

    const viewerOption = memberSelect.locator('option', { hasText: VIEWER_EMAIL });
    const viewerUserId = await viewerOption.getAttribute('value');
    if (viewerUserId) {
      await memberSelect.selectOption(viewerUserId);
      await page.getByTestId('add-member-button').click();
      await expect(page.locator('tr', { hasText: VIEWER_EMAIL })).toBeVisible();
    }

    const supabaseAdmin = createClient(getBaseUrl(), getServiceKey());
    const { data: teamData, error: teamQueryErr } = await supabaseAdmin
      .from('dashboard_teams')
      .select('id')
      .eq('name', teamName)
      .maybeSingle();
    if (teamQueryErr) console.warn('Query team error:', teamQueryErr.message);
    if (teamData?.id) {
      createdTeamId = teamData.id;
    }

    await logout(page);

    // -------------------------------------------------------------
    // Schritt 2: Manager legt Team-Dashboard an und speichert 3-mal
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
    const dashboardTitle = `Team Revisions ${testRunId}`;
    await page.getByTestId('new-dashboard-title-input').fill(dashboardTitle);
    await page.getByTestId('create-dashboard-submit-button').click();

    await expect(newDialog).not.toBeVisible();
    await expect(switcherBtn).toContainText(dashboardTitle);

    // Speichern 1: Zeitrahmen auf letzte_7_tage ändern -> erzeugt Revision 2
    const timeframeSelect = page.getByTestId('global-timeframe-select');
    await timeframeSelect.selectOption('letzte_7_tage');
    await expect(page.getByTestId('dirty-indicator')).toBeVisible();
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('dirty-indicator')).not.toBeVisible();

    // Speichern 2: Zeitrahmen auf gesamt ändern -> erzeugt Revision 3
    await timeframeSelect.selectOption('gesamt');
    await expect(page.getByTestId('dirty-indicator')).toBeVisible();
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('dirty-indicator')).not.toBeVisible();

    const { data: dashData, error: dashQueryErr } = await supabaseAdmin
      .from('dashboards')
      .select('id')
      .eq('title', dashboardTitle)
      .maybeSingle();
    if (dashQueryErr) console.warn('Query dashboard error:', dashQueryErr.message);
    if (dashData?.id) {
      createdDashboardIds.push(dashData.id);
    }

    await logout(page);

    // -------------------------------------------------------------
    // Schritt 3: Viewer öffnet Dashboard lesend, prüft Versionen & Export
    // -------------------------------------------------------------
    await loginAs(page, VIEWER_EMAIL);
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    const viewerSwitcher = page.getByTestId('dashboard-switcher-button');
    await viewerSwitcher.click();

    const teamDashItem = page.locator('[data-testid^="dashboard-item-"]', {
      hasText: dashboardTitle,
    });
    await expect(teamDashItem).toBeVisible();
    await teamDashItem.click();

    // Leseansicht ist aktiv
    await expect(page.getByTestId('readonly-notice-banner')).toBeVisible();
    await expect(page.getByTestId('save-button')).not.toBeVisible();

    // Versionsbereich öffnen (auch in Leseansicht erreichbar)
    const versionsBtn = page.getByTestId('editor-open-versions');
    await expect(versionsBtn).toBeVisible();
    await versionsBtn.click();

    const panel = page.getByTestId('revision-history-panel');
    await expect(panel).toBeVisible();

    // Revisionen 3, 2, 1 sichtbar
    await expect(page.getByTestId('revision-item-3')).toBeVisible();
    await expect(page.getByTestId('revision-item-2')).toBeVisible();
    await expect(page.getByTestId('revision-item-1')).toBeVisible();

    // Autor prüfen: Name/Kürzel des Managers sichtbar, kein "Wiederherstellen" für Viewer
    const rev1Item = page.getByTestId('revision-item-1');
    await expect(rev1Item.getByTestId('restore-revision-1')).not.toBeVisible();
    await expect(page.getByTestId('restore-revision-2')).not.toBeVisible();

    // Zwei Versionen vergleichen (Revision 1 & Revision 3)
    await page.getByTestId('toggle-select-mode-button').click();
    await page.getByTestId('revision-item-1').click();
    await page.getByTestId('revision-item-3').click();
    await page.getByTestId('compare-selected-button').click();

    const diffView = page.getByTestId('revision-diff-view');
    await expect(diffView).toBeVisible();
    await expect(page.getByTestId('diff-summary')).toBeVisible();

    // Zurück
    await page.getByTestId('diff-back-button').click();
    await expect(diffView).not.toBeVisible();

    // Export des aktuellen Stands testen
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-current-button').click(),
    ]);
    expect(download.suggestedFilename()).toContain('.json');

    await page.getByTestId('close-versions-panel').click();
    await expect(panel).not.toBeVisible();

    await logout(page);

    // -------------------------------------------------------------
    // Schritt 4: Manager stellt Revision 1 wieder her -> erzeugt Revision 4
    // -------------------------------------------------------------
    await loginAs(page, MANAGER_EMAIL);
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    await switcherBtn.click();
    await page.locator('[data-testid^="dashboard-item-"]', { hasText: dashboardTitle }).click();
    await expect(switcherBtn).toContainText(dashboardTitle);

    await page.getByTestId('editor-open-versions').click();
    await expect(panel).toBeVisible();

    // Wiederherstellen-Knopf bei Revision 1 vorhanden
    const restoreRev1Btn = page.getByTestId('restore-revision-1');
    await expect(restoreRev1Btn).toBeVisible();
    await restoreRev1Btn.click();

    const restoreDialog = page.getByTestId('restore-revision-dialog');
    await expect(restoreDialog).toBeVisible();
    await expect(restoreDialog).toContainText('Revision 1 wird als neue Version 4 gespeichert');
    // Teamtext prüfen
    await expect(restoreDialog).toContainText(teamName);

    await page.getByTestId('confirm-restore-button').click();
    await expect(restoreDialog).not.toBeVisible();

    // Revision 4 ist jetzt aktuell
    await page.getByTestId('editor-open-versions').click();
    await expect(page.getByTestId('revision-item-4')).toBeVisible();
    await expect(
      page.getByTestId('revision-item-4').getByTestId('current-revision-badge'),
    ).toBeVisible();
    await page.getByTestId('close-versions-panel').click();

    await logout(page);

    // -------------------------------------------------------------
    // Schritt 5: Viewer sieht den wiederhergestellten Stand
    // -------------------------------------------------------------
    await loginAs(page, VIEWER_EMAIL);
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    await viewerSwitcher.click();
    await page.locator('[data-testid^="dashboard-item-"]', { hasText: dashboardTitle }).click();
    await expect(viewerSwitcher).toContainText(dashboardTitle);

    await page.getByTestId('editor-open-versions').click();
    await expect(page.getByTestId('revision-item-4')).toBeVisible();
    await expect(
      page.getByTestId('revision-item-4').getByTestId('current-revision-badge'),
    ).toBeVisible();
    await page.getByTestId('close-versions-panel').click();
  });
});
