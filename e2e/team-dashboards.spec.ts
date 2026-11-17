import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Executive Dashboard V2 (Auftrag 163 / P11b):
// E2E-Test mit lokalem Supabase-Backend (§2.6 Nr. 32):
// 1. Admin legt Team an und ordnet Manager und Viewer zu.
// 2. Manager legt Team-Dashboard an und speichert Änderungen.
// 3. Viewer sieht das Team-Dashboard nur lesend und legt eine persönliche Kopie an.
// 4. Admin entfernt Manager aus dem Team; Managers nächstes Speichern zeigt den Rechteentzug-Dialog
//    und sichert den Entwurf als persönliche Kopie.
// 5. Nutzer ohne Teammitgliedschaft sieht das Dashboard nicht.

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

test.describe('Dashboard-Editor V2: Team-Freigaben Supabase Lifecycle (P11b)', () => {
  const testRunId = Date.now();
  const teamName = `E2E Team ${testRunId}`;
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
        await supabaseAdmin
          .from('dashboards_v2')
          .delete()
          .in('id', createdDashboardIds);
      }
      if (createdTeamId) {
        await supabaseAdmin
          .from('dashboard_teams_v2')
          .delete()
          .eq('id', createdTeamId);
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

  test('Vollständiger Team-Sharing-Lebenszyklus: Anlegen, Berechtigung, Leseansicht, Rechteentzug', async ({
    page,
  }) => {
    test.setTimeout(90000);
    // -------------------------------------------------------------
    // Schritt 1: Admin legt Team an und ordnet Manager & Viewer zu
    // -------------------------------------------------------------
    await loginAs(page, ADMIN_EMAIL);
    await page.goto('/admin/teams');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Dashboard-Teams' })).toBeVisible();

    await page.getByTestId('create-team-button').click();
    await page.getByTestId('team-name-input').fill(teamName);
    await page.getByTestId('team-description-input').fill('E2E Lifecycle Test Team');
    await page.getByTestId('team-form-submit-button').click();

    // Team in Tabelle suchen
    const teamRow = page.locator('tr', { hasText: teamName });
    await expect(teamRow).toBeVisible();

    // Mitglieder verwalten öffnen
    const manageBtn = teamRow.getByRole('button', { name: 'Mitglieder' });
    await manageBtn.click();

    // Manager hinzufügen
    const memberSelect = page.getByTestId('add-team-member-select');
    await expect(memberSelect).toBeVisible();

    // Suche Option mit Manager Email
    const managerOption = memberSelect.locator('option', { hasText: MANAGER_EMAIL });
    managerUserId = await managerOption.getAttribute('value');
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

    // Merke teamId für Aufräumarbeiten
    const supabaseAdmin = createClient(getBaseUrl(), getServiceKey());
    const { data: teamData } = await supabaseAdmin
      .from('dashboard_teams_v2')
      .select('id')
      .eq('name', teamName)
      .maybeSingle();
    if (teamData?.id) {
      createdTeamId = teamData.id;
    }

    await logout(page);

    // -------------------------------------------------------------
    // Schritt 2: Manager legt Team-Dashboard an und speichert
    // -------------------------------------------------------------
    await loginAs(page, MANAGER_EMAIL);
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    const switcherBtn = page.getByTestId('dashboard-switcher-button');
    await switcherBtn.click();
    await page.getByTestId('new-dashboard-menu-item').click();

    const newDialog = page.getByTestId('new-dashboard-dialog');
    await expect(newDialog).toBeVisible();

    // Zielauswahl: Team auswählen
    const targetSelect = page.getByTestId('new-dashboard-target-select');
    await expect(targetSelect).toBeVisible();
    await targetSelect.selectOption({ label: `Team: ${teamName}` });

    // Vorlage und Titel
    await page.getByTestId('template-card-sales').click();
    const dashboardTitle = `Team Sales ${testRunId}`;
    await page.getByTestId('new-dashboard-title-input').fill(dashboardTitle);
    await page.getByTestId('create-dashboard-submit-button').click();

    await expect(newDialog).not.toBeVisible();
    await expect(switcherBtn).toContainText(`Team: ${teamName}`);
    await expect(switcherBtn).toContainText(dashboardTitle);

    // Änderungen vornehmen und speichern
    const timeframeSelect = page.getByTestId('global-timeframe-select');
    await timeframeSelect.selectOption('letzte_7_tage');
    await expect(page.getByTestId('dirty-indicator')).toBeVisible();

    const saveBtn = page.getByTestId('save-button');
    await saveBtn.click();
    await expect(page.getByTestId('dirty-indicator')).not.toBeVisible();

    // Merke Dashboard-ID
    const { data: dashData } = await supabaseAdmin
      .from('dashboards_v2')
      .select('id')
      .eq('title', dashboardTitle)
      .maybeSingle();
    if (dashData?.id) {
      createdDashboardIds.push(dashData.id);
    }

    await logout(page);

    // -------------------------------------------------------------
    // Schritt 3: Viewer sieht das Dashboard nur lesend und kopiert
    // -------------------------------------------------------------
    await loginAs(page, VIEWER_EMAIL);
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    const viewerSwitcher = page.getByTestId('dashboard-switcher-button');
    await viewerSwitcher.click();

    // Team-Dashboard auswählen
    const teamDashItem = page.locator('[data-testid^="dashboard-item-"]', { hasText: dashboardTitle });
    await expect(teamDashItem).toBeVisible();
    await teamDashItem.click();

    // Leseansicht aktiv: Hinweisbalken sichtbar, Bearbeitung gesperrt
    const notice = page.getByTestId('readonly-notice-banner');
    await expect(notice).toBeVisible();
    await expect(page.getByTestId('title-display')).toBeVisible();
    await expect(page.getByTestId('save-button')).not.toBeVisible();

    // Persönliche Kopie anlegen
    await page.getByTestId('copy-as-personal-button').click();

    // Kopie ist persönlich und editierbar
    await expect(notice).not.toBeVisible();
    await expect(viewerSwitcher).toContainText('Persönlich');
    await expect(viewerSwitcher).toContainText('(Kopie)');
    await expect(page.getByTestId('title-button')).toBeVisible();

    await logout(page);

    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // Schritt 4: Manager verliert Schreibrechte (Rolle -> Viewer); Rechteentzug-Dialog
    // -------------------------------------------------------------
    await loginAs(page, MANAGER_EMAIL);
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    // Manager öffnet das Team-Dashboard im Editor
    const managerSwitcher = page.getByTestId('dashboard-switcher-button');
    await managerSwitcher.click();
    const teamDashItemManager = page.locator('[data-testid^="dashboard-item-"]', { hasText: dashboardTitle });
    await expect(teamDashItemManager).toBeVisible();
    await teamDashItemManager.click();
    await expect(managerSwitcher).toContainText(dashboardTitle);

    // Manager ändert Filter im Entwurf
    const managerTimeframeSelect = page.getByTestId('global-timeframe-select');
    await managerTimeframeSelect.selectOption('letzte_30_tage');
    await expect(page.getByTestId('dirty-indicator')).toBeVisible();

    // Manager verliert Schreibrechte (wird zu Viewer), bleibt aber im Team
    if (managerUserId) {
      const supabaseAdmin = createClient(getBaseUrl(), getServiceKey());
      const { error: roleUpdateError, data: updatedMember } = await supabaseAdmin
        .from('organization_members')
        .update({ role: 'viewer' })
        .eq('user_id', managerUserId)
        .select('role');
      expect(roleUpdateError).toBeNull();
      expect(updatedMember?.[0]?.role).toBe('viewer');
    }

    // Manager klickt im bestehenden Entwurf auf Speichern
    const managerSaveBtn = page.getByTestId('save-button');
    await expect(managerSaveBtn).toBeEnabled();
    await managerSaveBtn.click();

    // Rechteentzug-Dialog muss erscheinen (§2.1 Nr. 7)
    const revokedDialog = page.getByTestId('team-access-revoked-dialog');
    await expect(revokedDialog).toBeVisible();

    // Entwurf als persönliche Kopie sichern
    await page.getByTestId('team-revoked-save-copy-button').click();
    await expect(revokedDialog).not.toBeVisible();
    await expect(page.getByTestId('dashboard-switcher-button')).toContainText('Persönlich');
    await logout(page);

    // -------------------------------------------------------------
    // Schritt 5: Admin entfernt Manager aus Team; Nicht-Mitglied sieht es nicht (§2.6 Nr. 32)
    // -------------------------------------------------------------
    await loginAs(page, ADMIN_EMAIL);
    await page.goto('/admin/teams');
    const manageBtn2 = page.locator('tr', { hasText: teamName }).getByRole('button', { name: 'Mitglieder' });
    await manageBtn2.click();

    if (managerUserId) {
      const removeBtn = page.getByTestId(`remove-member-button-${managerUserId}`);
      await removeBtn.click();
      await expect(page.getByText('verliert sofort den Zugriff auf alle Dashboards dieses Teams')).toBeVisible();
      await page.getByTestId('confirm-remove-member-button').click();
      await expect(page.locator('tr', { hasText: MANAGER_EMAIL })).not.toBeVisible();
    }
    await logout(page);

    // Manager meldet sich wieder an
    await loginAs(page, MANAGER_EMAIL);
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    const noMemberSwitcher = page.getByTestId('dashboard-switcher-button');
    await noMemberSwitcher.click();
    await expect(page.getByText(`Team: ${teamName}`)).not.toBeVisible();
    await logout(page);
  });
});
