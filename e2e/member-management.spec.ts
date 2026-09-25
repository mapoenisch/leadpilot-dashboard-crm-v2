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

function getBaseUrl(): string {
  return process.env.VITE_SUPABASE_URL || process.env.E2E_SUPABASE_URL || 'http://127.0.0.1:54321';
}

function getAnonKey(): string {
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.E2E_SUPABASE_ANON_KEY;
  if (!key) throw new Error('VITE_SUPABASE_ANON_KEY oder E2E_SUPABASE_ANON_KEY erforderlich');
  return key;
}

function getServiceKey(): string {
  const key = process.env.E2E_CLEANUP_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('E2E_CLEANUP_KEY oder SUPABASE_SERVICE_ROLE_KEY erforderlich');
  return key;
}

async function fetchInviteLinkFromMailCatcher(email: string, timeoutMs = 15000): Promise<string> {
  const mailUrl = process.env.MAILPIT_URL || process.env.INBUCKET_URL || 'http://127.0.0.1:54324';
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // 1. Mailpit API
    try {
      const searchRes = await fetch(`${mailUrl}/api/v1/search?query=to:${encodeURIComponent(email)}`);
      if (searchRes.ok) {
        const data = await searchRes.json();
        const msg = data.messages?.[0];
        if (msg) {
          const detailRes = await fetch(`${mailUrl}/api/v1/message/${msg.ID}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            const content = `${detail.Text || ''}\n${detail.HTML || ''}`;
            const match = content.match(/https?:\/\/[^\s"'<>]+(?:\/auth\/v1\/verify|\/verify)\?[^\s"'<>]+/);
            if (match) {
              return match[0].replace(/&amp;/g, '&');
            }
          }
        }
      }
    } catch {
      // Weiter mit Fallback
    }

    // 2. Inbucket API Fallback
    try {
      const mailbox = email.split('@')[0];
      const inbucketRes = await fetch(`${mailUrl}/api/v1/mailbox/${encodeURIComponent(mailbox)}`);
      if (inbucketRes.ok) {
        const messages = await inbucketRes.json();
        if (Array.isArray(messages) && messages.length > 0) {
          const latest = messages[messages.length - 1];
          const msgDetail = await fetch(`${mailUrl}/api/v1/mailbox/${encodeURIComponent(mailbox)}/${latest.id}`);
          if (msgDetail.ok) {
            const detail = await msgDetail.json();
            const content = `${detail.body?.text || ''}\n${detail.body?.html || ''}`;
            const match = content.match(/https?:\/\/[^\s"'<>]+(?:\/auth\/v1\/verify|\/verify)\?[^\s"'<>]+/);
            if (match) {
              return match[0].replace(/&amp;/g, '&');
            }
          }
        }
      }
    } catch {
      // Retry
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Keine Einladungs-E-Mail für ${email} im Mail-Catcher innerhalb von ${timeoutMs}ms gefunden.`);
}

async function ensureE2EUsers(): Promise<void> {
  const serviceKey = getServiceKey();
  const supabaseAdmin = createClient(getBaseUrl(), serviceKey);

  const adminEmail = requireEnv('E2E_AUTH_EMAIL');
  const password = requireEnv('E2E_AUTH_PASSWORD');
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  let adminUser = usersData?.users.find((u) => u.email === adminEmail);

  if (!adminUser) {
    const { data: created } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Admin Demo Org' },
    });
    adminUser = created.user;
  }

  // Demo Organisation sicherstellen
  const { data: orgs } = await supabaseAdmin.from('organizations').select('id, status');
  let orgId = orgs?.find((o) => o.status === 'active')?.id;
  if (!orgId) {
    if (orgs && orgs.length > 0) {
      orgId = orgs[0].id;
      await supabaseAdmin.from('organizations').update({ status: 'active' }).eq('id', orgId);
    } else {
      const { data: newOrg } = await supabaseAdmin
        .from('organizations')
        .insert({
          id: '00000000-0000-0000-0000-000000000001',
          name: 'LeadPilot Technologies GmbH',
          mode: 'live',
          status: 'active',
        })
        .select('id')
        .single();
      orgId = newOrg!.id;
    }
  }

  // Mitgliedschaft von admin-a sicherstellen
  const { data: member } = await supabaseAdmin
    .from('organization_members')
    .select('role, status')
    .eq('user_id', adminUser!.id)
    .maybeSingle();

  if (!member) {
    await supabaseAdmin.from('organization_members').insert({
      organization_id: orgId,
      user_id: adminUser!.id,
      role: 'admin',
      status: 'active',
    });
  } else if (member.role !== 'admin' || member.status !== 'active') {
    await supabaseAdmin
      .from('organization_members')
      .update({ role: 'admin', status: 'active' })
      .eq('user_id', adminUser!.id);
  }

  // nomember User sicherstellen
  const nomemberEmail = process.env.E2E_AUTH_EMAIL_NOMEMBER;
  if (nomemberEmail) {
    const hasNomember = usersData?.users.find((u) => u.email === nomemberEmail);
    if (!hasNomember) {
      await supabaseAdmin.auth.admin.createUser({
        email: nomemberEmail,
        password,
        email_confirm: true,
      });
    }
  }
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL'));
  await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Mitgliederverwaltung (Gate G59)', () => {
  test.beforeAll(async () => {
    await ensureE2EUsers();
  });
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
    // 067R / G64: kein verschachteltes main, keine doppelte Sprungmarken-ID.
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.locator('#main-content')).toHaveCount(1);
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

    // 2. Original-Link direkt aus dem lokalen Mail-Catcher abrufen (keine Service-Role im Nutzerfluss)
    const actionLink = await fetchInviteLinkFromMailCatcher(inviteeEmail);
    expect(actionLink).toBeTruthy();

    // 3. Nutzer klickt den Original-Link in einem separaten Browser-Kontext
    const inviteeContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const inviteePage = await inviteeContext.newPage();

    try {
      await inviteePage.goto(actionLink);
      await inviteePage.waitForURL(
        (url) => url.pathname.includes('/dashboard') || url.pathname.includes('/login'),
        { timeout: 15_000 },
      );
      if (!inviteePage.url().includes('/dashboard')) {
        await inviteePage.waitForURL('**/dashboard', { timeout: 15_000 });
      }
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
      const serviceKey = getServiceKey();
      const supabaseAdmin = createClient(getBaseUrl(), serviceKey);
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const createdUser = usersData?.users.find((u) => u.email === inviteeEmail);
      if (createdUser) {
        await supabaseAdmin.from('organization_members').delete().eq('user_id', createdUser.id);
        await supabaseAdmin.auth.admin.deleteUser(createdUser.id);
      }
    }
  });

  test('7. P2: Serverseitiges 403 für Manager und Viewer sowie UI-Schutz', async ({
    browser,
  }) => {
    const baseUrl = getBaseUrl();
    const anonKey = getAnonKey();
    const serviceKey = getServiceKey();
    const supabaseAdmin = createClient(baseUrl, serviceKey);

    const { data: adminOrg } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .limit(1)
      .single();
    expect(adminOrg).toBeTruthy();

    const rolesToTest = ['manager', 'viewer'] as const;

    for (const testRole of rolesToTest) {
      const userEmail = `e2e-${testRole}-${Date.now()}@e2e.local`;
      const password = 'TestPassword123!';

      const { data: userRecord, error: userErr } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password,
        email_confirm: true,
      });
      expect(userErr).toBeNull();

      await supabaseAdmin.from('organization_members').insert({
        organization_id: adminOrg!.organization_id,
        user_id: userRecord!.user.id,
        role: testRole,
        status: 'active',
      });

      const userContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const userPage = await userContext.newPage();

      try {
        await userPage.goto('/login');
        await userPage.fill('#login-email', userEmail);
        await userPage.fill('#login-password', password);
        await userPage.click('button[type="submit"]');
        await userPage.waitForURL('**/dashboard');

        // Rolle sieht keinen Admin-Link
        await expect(userPage.getByTestId('nav-item-admin-members')).toHaveCount(0);

        // Direkter UI-Aufruf von /admin/members zeigt 403 ForbiddenView
        await userPage.goto('/admin/members');
        await expect(
          userPage.getByRole('heading', { name: 'Zugriff verweigert (403)' }),
        ).toBeVisible();

        // Rolle versucht API-Aufruf an /functions/v1/manage-members (Server-Schutz)
        const token = await userPage.evaluate(() => {
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
            email: `unauthorized-${testRole}@e2e.local`,
            role: 'viewer',
          }),
        });

        expect(apiRes.status).toBe(403);
        const errBody = await apiRes.json();
        expect(errBody.code).toBe('FORBIDDEN');
      } finally {
        await userContext.close();
        await supabaseAdmin.from('organization_members').delete().eq('user_id', userRecord!.user.id);
        await supabaseAdmin.auth.admin.deleteUser(userRecord!.user.id);
      }
    }
  });

  test('8. P2: Direkt-RPC-Bypass von accept_organization_invitation durch authenticated wird abgewiesen', async () => {
    const baseUrl = getBaseUrl();
    const anonKey = getAnonKey();

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
    const baseUrl = getBaseUrl();
    const anonKey = getAnonKey();
    const serviceKey = getServiceKey();

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

  test('10. P1: Zwei Organisationen mit derselben Empfänger-E-Mail: Annahme ohne ID liefert 400 AMBIGUOUS_INVITATION, konkrete Annahme bindet an Organisation A, Annahme B scheitert mit 409, übergebene Rollen/Orgs werden ignoriert', async () => {
    const baseUrl = getBaseUrl();
    const anonKey = getAnonKey();
    const serviceKey = getServiceKey();
    const supabaseAdmin = createClient(baseUrl, serviceKey);

    const testEmail = `multi-e2e-${Date.now()}@e2e.local`;
    const testPassword = 'TestPassword123!';

    // 1. Zwei unterschiedliche Organisationen ermitteln
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('status', 'active')
      .limit(2);
    expect(orgs).toBeTruthy();
    expect(orgs!.length).toBeGreaterThanOrEqual(2);

    const orgAId = orgs![0].id;
    const orgBId = orgs![1].id;

    const { data: adminUser } = await supabaseAdmin
      .from('organization_members')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();
    expect(adminUser).toBeTruthy();

    // 2. Auth-User für den Testempfänger anlegen
    const { data: userRecord, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    expect(userErr).toBeNull();
    expect(userRecord.user).toBeTruthy();

    const invAId = crypto.randomUUID();
    const invBId = crypto.randomUUID();

    try {
      // 3. Beide Organisationen erstellen eine offene Einladung für dieselbe E-Mail
      const { error: errA } = await supabaseAdmin.from('organization_invitations').insert({
        id: invAId,
        organization_id: orgAId,
        email: testEmail,
        role: 'manager',
        status: 'pending',
        invited_by: adminUser!.user_id,
        created_at: new Date(Date.now() - 60000).toISOString(),
      });
      expect(errA).toBeNull();

      const { error: errB } = await supabaseAdmin.from('organization_invitations').insert({
        id: invBId,
        organization_id: orgBId,
        email: testEmail,
        role: 'viewer',
        status: 'pending',
        invited_by: adminUser!.user_id,
        created_at: new Date().toISOString(),
      });
      expect(errB).toBeNull();

      // 4. Testnutzer an AuthService anmelden
      const client = createClient(baseUrl, anonKey);
      const { data: authRes } = await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      expect(authRes.session).toBeTruthy();
      const token = authRes.session!.access_token;

      // 5. Test a: Annahme ohne invitationId MUSS mit 400 AMBIGUOUS_INVITATION scheitern
      const resNoId = await fetch(`${baseUrl}/functions/v1/manage-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          action: 'acceptInvitation',
        }),
      });
      expect(resNoId.status).toBe(400);
      const bodyNoId = await resNoId.json();
      expect(bodyNoId.code).toBe('AMBIGUOUS_INVITATION');

      // 6. Test b: Annahme mit konkreter ID von Einladung A gelingt;
      // Manipulationsversuch (Übermittlung von role: admin und organisationId: orgBId im Body) wird ignoriert
      const resA = await fetch(`${baseUrl}/functions/v1/manage-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          action: 'acceptInvitation',
          invitationId: invAId,
          role: 'admin',
          organizationId: orgBId,
        }),
      });
      expect(resA.status).toBe(200);
      const bodyA = await resA.json();
      expect(bodyA.status).toBe('accepted');
      expect(bodyA.role).toBe('manager'); // Rolle aus DB, NICHT aus Body!
      expect(bodyA.organizationId).toBe(orgAId); // Org aus DB, NICHT aus Body!

      // 7. Mitgliedschaft in Org A prüfen
      const { data: memberRecord } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id, role, status')
        .eq('user_id', userRecord.user.id)
        .single();
      expect(memberRecord).toBeTruthy();
      expect(memberRecord!.organization_id).toBe(orgAId);
      expect(memberRecord!.role).toBe('manager');
      expect(memberRecord!.status).toBe('active');

      // 8. Test c: Versuch, Einladung B anzunehmen, scheitert mit 409 CANNOT_CHANGE_ORGANIZATION
      const resB = await fetch(`${baseUrl}/functions/v1/manage-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          action: 'acceptInvitation',
          invitationId: invBId,
        }),
      });
      expect(resB.status).toBe(409);
      const bodyB = await resB.json();
      expect(bodyB.code).toBe('CANNOT_CHANGE_ORGANIZATION');
    } finally {
      await supabaseAdmin.from('organization_members').delete().eq('user_id', userRecord.user.id);
      await supabaseAdmin.from('organization_invitations').delete().eq('email', testEmail);
      await supabaseAdmin.auth.admin.deleteUser(userRecord.user.id);
    }
  });
});
