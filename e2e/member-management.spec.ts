import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// G59 (Auftrag 067M, Step 5): E2E-Tests für Mitgliederverwaltung, Einladungen,
// Rollenmatrix, LAST_ACTIVE_ADMIN-Schutz und Zugriffsbeschränkungen.

test.use({ storageState: { cookies: [], origins: [] } });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`E2E-Abbruch: Umgebungsvariable ${name} ist nicht gesetzt.`);
  }
  return value;
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL'));
  await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Mitgliederverwaltung (Gate G59)', () => {
  test('1. Admin sieht Navigationslink und erreicht /admin/members', async ({ page }) => {
    await loginAsAdmin(page);

    // Auf Viewports < 1024px (Mobile & Tablet): Drawer über Menü-Trigger öffnen
    const isMobileViewport = (page.viewportSize()?.width ?? 1440) < 1024;
    if (isMobileViewport) {
      await page.locator('#mobile-menu-trigger').click();
    }

    // Sidebar: Admin-Link ist sichtbar
    const adminNavItem = page.getByTestId('nav-item-admin-members');
    await expect(adminNavItem).toBeVisible();
    await adminNavItem.click();

    await page.waitForURL('**/admin/members');
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1, name: 'Mitgliederverwaltung' }),
    ).toBeVisible();

    // Rollenmatrix ist vorhanden
    await expect(
      page.getByRole('heading', { level: 2, name: 'Rollen und Berechtigungen' }),
    ).toBeVisible();

    // Tabellen für Mitglieder und Einladungen sind vorhanden
    await expect(page.getByRole('region', { name: 'Mitgliederliste', exact: true })).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Ausstehende Einladungen', exact: true }),
    ).toBeVisible();

    // Der eingeloggte Admin ist in der Liste aufgeführt
    await expect(page.getByRole('main').getByText(requireEnv('E2E_AUTH_EMAIL'))).toBeVisible();
  });

  test('2. Admin stellt Einladung aus und widerruft sie', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    const testEmail = `e2e-invite-${Date.now()}@e2e.local`;

    // Einladung absenden
    await page.fill('#invite-email', testEmail);
    await page.selectOption('#invite-role', 'manager');
    await page.getByRole('button', { name: 'Einladung senden' }).click();

    // Erfolgsmeldung prüfen
    const successStatus = page.locator('[role="status"]').filter({ hasText: 'Einladung an' });
    await expect(successStatus).toBeVisible();
    await expect(page.locator('table').getByText(testEmail)).toBeVisible();

    // Weder Token noch Link werden im UI angezeigt
    await expect(page.locator('#invitation-link-input')).toHaveCount(0);
    await expect(page.getByTestId('invitation-link-box')).toHaveCount(0);

    // Einladung widerrufen
    const inviteRow = page.locator('tr', { hasText: testEmail });
    await inviteRow.getByRole('button', { name: 'Widerrufen' }).click();

    // Bestätigungsmodal
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Ja, widerrufen' }).click();

    // Nach Widerruf verschwindet der Eintrag aus der Liste der offenen Einladungen
    const revokeStatus = page.locator('[role="status"]').filter({ hasText: 'widerrufen' });
    await expect(revokeStatus).toBeVisible();
    await expect(page.locator('table', { hasText: testEmail })).toHaveCount(0);
  });

  test('3. Deaktivierung des einzigen Admins scheitert mit LAST_ACTIVE_ADMIN Schutz', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    const adminEmail = requireEnv('E2E_AUTH_EMAIL');
    const memberRow = page.locator('tr', { hasText: adminEmail });
    await memberRow.getByRole('button', { name: 'Deaktivieren' }).click();

    // Bestätigungsmodal öffnet sich
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Ja, deaktivieren' }).click();

    // Fehlermeldung LAST_ACTIVE_ADMIN wird verständlich angezeigt
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(
      'Der letzte aktive Administrator kann nicht deaktiviert werden',
    );

    // Admin bleibt aktiv
    await expect(memberRow.getByText('Aktiv', { exact: true })).toBeVisible();
  });

  test('4. Unangemeldeter Aufruf leitet zu /login weiter', async ({ page }) => {
    await page.goto('/admin/members');
    await expect(page).toHaveURL(/\/login/);
  });

  test('5. Nutzer ohne Organisation sieht keinen Admin-Link und wird geblockt', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL_NOMEMBER'));
    await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
    await page.click('button[type="submit"]');

    // Nomember hat keine Organisation -> ProtectedRoute leitet sofort nach /login zurück
    await page.waitForURL(/\/login/);

    // Direkter Aufrufversuch von /admin/members
    await page.goto('/admin/members');
    await expect(page).toHaveURL(/\/login/);
  });

  test('6. Realer Einladungsfluss: Einladung versenden -> Mail-Link öffnen -> Automatische Annahme & Dashboard-Landing -> Admin sieht neues Mitglied', async ({
    page,
    browser,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    const inviteeEmail = `e2e-realflow-${Date.now()}@e2e.local`;

    // 1. Admin versendet Einladung über die Oberfläche
    await page.fill('#invite-email', inviteeEmail);
    await page.selectOption('#invite-role', 'manager');
    await page.getByRole('button', { name: 'Einladung senden' }).click();

    const successStatus = page.locator('[role="status"]').filter({ hasText: 'erfolgreich versendet' });
    await expect(successStatus).toBeVisible();

    // P1: Keine Tokens oder Links in der Admin-Oberfläche
    await expect(page.locator('#invitation-link-input')).toHaveCount(0);
    await expect(page.getByTestId('invitation-link-box')).toHaveCount(0);

    // 2. Mail-Link simulieren (wie wenn der eingeladene Nutzer seine E-Mail abruft)
    const baseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.E2E_CLEANUP_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

    const supabaseAdmin = createClient(baseUrl, serviceKey);
    const linkRes = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: inviteeEmail,
      options: { redirectTo: 'http://127.0.0.1:4321/dashboard' },
    });
    const actionLink = linkRes.data?.properties?.action_link;
    expect(actionLink).toBeTruthy();

    // 3. Nutzer klickt den Link in einem separaten Browser-Kontext
    const inviteeContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const inviteePage = await inviteeContext.newPage();

    try {
      await inviteePage.goto(actionLink!);
      await inviteePage.waitForURL('**/dashboard', { timeout: 15_000 });
      await expect(inviteePage.getByTestId('logout-button')).toBeVisible();

      // Eingeladener Manager hat keinen Zugriff auf /admin/members
      await expect(inviteePage.getByTestId('nav-item-admin-members')).toHaveCount(0);

      // 4. Admin prüft, dass Mitglied nun aktiv und in der Liste ist
      await page.reload();
      await page.waitForURL('**/admin/members');

      const membersSection = page.getByRole('region', { name: 'Mitgliederliste' });
      const memberRow = membersSection.locator('tr', { hasText: inviteeEmail });
      await expect(memberRow).toBeVisible();
      await expect(memberRow.locator('span', { hasText: 'manager' })).toBeVisible();
      await expect(memberRow.locator('span', { hasText: 'Aktiv' })).toBeVisible();

      const pendingSection = page.getByRole('region', { name: 'Ausstehende Einladungen' });
      await expect(pendingSection.locator('tr', { hasText: inviteeEmail })).toHaveCount(0);
    } finally {
      await inviteeContext.close();
    }
  });

  test('7. P2: Serverseitiges 403 für Manager und Viewer sowie UI-Schutz', async ({
    browser,
  }) => {
    const baseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.E2E_CLEANUP_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

    const supabaseAdmin = createClient(baseUrl, serviceKey);
    const managerEmail = `e2e-manager-${Date.now()}@e2e.local`;
    const password = 'TestPassword123!';

    const { data: adminOrg } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .limit(1)
      .single();

    const { data: userRecord, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: managerEmail,
      password,
      email_confirm: true,
    });
    expect(userErr).toBeNull();

    await supabaseAdmin.from('organization_members').insert({
      organization_id: adminOrg!.organization_id,
      user_id: userRecord!.user.id,
      role: 'manager',
      status: 'active',
    });

    const managerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const managerPage = await managerContext.newPage();

    try {
      await managerPage.goto('/login');
      await managerPage.fill('#login-email', managerEmail);
      await managerPage.fill('#login-password', password);
      await managerPage.click('button[type="submit"]');
      await managerPage.waitForURL('**/dashboard');

      // Manager sieht keinen Admin-Link
      await expect(managerPage.getByTestId('nav-item-admin-members')).toHaveCount(0);

      // Direkter UI-Aufruf von /admin/members zeigt 403 ForbiddenView
      await managerPage.goto('/admin/members');
      await expect(
        managerPage.getByRole('heading', { name: 'Zugriff verweigert (403)' }),
      ).toBeVisible();

      // Manager versucht API-Aufruf an /functions/v1/manage-members (Server-Schutz)
      const token = await managerPage.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || '{}');
              if (parsed.access_token) return parsed.access_token;
            } catch {
              // ignore
            }
          }
        }
        return null;
      });

      expect(token).toBeTruthy();

      const apiRes = await fetch(`${baseUrl}/functions/v1/manage-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          action: 'invite',
          email: 'unauthorized@e2e.local',
          role: 'viewer',
        }),
      });

      expect(apiRes.status).toBe(403);
      const errBody = await apiRes.json();
      expect(errBody.code).toBe('FORBIDDEN');
    } finally {
      await managerContext.close();
      await supabaseAdmin.from('organization_members').delete().eq('user_id', userRecord!.user.id);
      await supabaseAdmin.auth.admin.deleteUser(userRecord!.user.id);
    }
  });

  test('8. P2: Direkt-RPC-Bypass von accept_organization_invitation durch authenticated wird abgewiesen', async () => {
    const baseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

    const client = createClient(baseUrl, anonKey);
    const { data: authRes } = await client.auth.signInWithPassword({
      email: requireEnv('E2E_AUTH_EMAIL'),
      password: requireEnv('E2E_AUTH_PASSWORD'),
    });
    expect(authRes.session).toBeTruthy();

    const { data, error } = await client.rpc('accept_organization_invitation', {
      p_user_id: authRes.user!.id,
      p_user_email: authRes.user!.email!,
    });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error?.code).toBe('42501');
  });

  test('9. P2: E-Mail-Mismatch bei Einladungsannahme wird mit 403 FORBIDDEN abgewiesen', async () => {
    const baseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.E2E_CLEANUP_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

    const supabaseAdmin = createClient(baseUrl, serviceKey);
    const targetEmail = `target-${Date.now()}@e2e.local`;

    const { data: adminOrg } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .limit(1)
      .single();

    const { data: adminUser } = await supabaseAdmin
      .from('organization_members')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    const { data: inv, error: invErr } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        organization_id: adminOrg!.organization_id,
        email: targetEmail,
        role: 'viewer',
        status: 'pending',
        invited_by: adminUser!.user_id,
      })
      .select()
      .single();

    expect(invErr).toBeNull();

    const client = createClient(baseUrl, anonKey);
    const { data: authRes } = await client.auth.signInWithPassword({
      email: requireEnv('E2E_AUTH_EMAIL'),
      password: requireEnv('E2E_AUTH_PASSWORD'),
    });

    const res = await fetch(`${baseUrl}/functions/v1/manage-members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authRes.session!.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        action: 'acceptInvitation',
        invitationId: inv.id,
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');

    await supabaseAdmin.from('organization_invitations').delete().eq('id', inv.id);
  });
});
