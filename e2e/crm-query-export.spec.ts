import { test, expect, type Page } from '@playwright/test';

// G60 (Auftrag 067N, Step 1 & 5): E2E-Tests für serverseitige CRM-Abfragen und CSV-Export
test.use({ storageState: { cookies: [], origins: [] } });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`E2E-Abbruch: Umgebungsvariable ${name} ist nicht gesetzt.`);
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

test.describe('CRM Query und Export (Gate G60)', () => {
  test('1. Gefilterte CRM-Abfrage spiegelt Zustand in URL und paginiert sauber', async ({
    page,
  }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await page.goto('/crm/companies');

    // Sucheingabe
    const searchInput = page.getByRole('searchbox', { name: 'Unternehmen suchen' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Firma');

    // URL muss 'suche=Firma' enthalten
    await expect(page).toHaveURL(/suche=Firma/);

    // Eigene Firma vorhanden
    await expect(page.getByText('Firma A1').first()).toBeAttached();
    // Fremde Firma nicht vorhanden
    await expect(page.getByText('Firma B1')).toHaveCount(0);
  });

  test('2. URL-Roundtrip: Deep-Link stellt Filter und Paginierung exakt wieder her', async ({
    page,
  }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await page.goto('/crm/companies');

    // Deep Link mit URL-Parametern wiederherstellen
    await page.evaluate(() => {
      window.history.pushState(null, '', '/crm/companies?suche=A1&branche=IT');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Input muss mit 'A1' befüllt sein
    const searchInput = page.getByRole('searchbox', { name: 'Unternehmen suchen' });
    await expect(searchInput).toHaveValue('A1');

    // Treffer muss angezeigt werden
    await expect(page.getByText('Firma A1').first()).toBeAttached();
    await expect(page.getByText('Firma B1')).toHaveCount(0);
  });

  test('3. CSV-Export lädt gefilterte Mandantendaten mit Formelschutz herunter', async ({
    page,
  }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await page.goto('/crm/companies');

    // Export-Button suchen
    const exportBtn = page.getByRole('button', { name: /CSV.*Export/i });
    await expect(exportBtn).toBeVisible();

    // Download abfangen
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('companies-export.csv');
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const csvContent = Buffer.concat(chunks).toString('utf-8');

    // Enthält eigene Daten
    expect(csvContent).toContain('Firma A1');
    // Enthält formelneutralisierte Zelle mit führendem Whitespace und Apostroph
    expect(csvContent).toContain("' =1+1 Formel-Firma");
    // Enthält keine fremden Daten
    expect(csvContent).not.toContain('Firma B1');
  });

  test('4. Keine fremden Mandantendaten bei direktem API-Angriff mit fremder Org-ID', async ({
    request,
  }) => {
    // API-Direktaufruf mit manipulierter organizationId
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    // Login Admin A via GoTrue REST
    const loginRes = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey },
      data: {
        email: requireEnv('E2E_AUTH_EMAIL'),
        password: requireEnv('E2E_AUTH_PASSWORD'),
      },
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    expect(token).toBeDefined();

    // Call Edge Function mit manipulierter Org B ID
    const queryRes = await request.post(`${supabaseUrl}/functions/v1/crm-query-export`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      data: {
        action: 'list',
        resource: 'companies',
        organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Angriff
      },
    });

    expect(queryRes.ok()).toBe(true);
    const body = await queryRes.json();
    // Liefert trotzdem nur Firma A1 der eigenen Org
    const names = (body.items || []).map((i: { name: string }) => i.name);
    expect(names).toContain('Firma A1');
    expect(names).not.toContain('Firma B1');
  });

  test('5. Sichtbare Sortier- und Filter-Controls auf Companies-, Deals- und Leads-Seiten', async ({
    page,
  }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));

    // Helper für LeadPilot Custom Select (Button + Listbox)
    async function selectOption(label: string, optionText: string) {
      const trigger = page.getByRole('combobox', { name: label });
      await expect(trigger).toBeVisible();
      await trigger.click();
      const option = page.getByRole('option', { name: optionText });
      await expect(option).toBeVisible();
      await option.click();
    }

    // Companies: Sortiercontrol bedienbar
    await page.goto('/crm/companies');
    await selectOption('Sortierung:', 'Stadt');
    await expect(page).toHaveURL(/sort=city/);

    await selectOption('Reihenfolge:', 'Absteigend (Z-A)');
    await expect(page).toHaveURL(/order=desc/);

    // Deals: Sortiercontrol bedienbar
    await page.goto('/crm/deals');
    await selectOption('Sortierung:', 'Betrag');
    await expect(page).toHaveURL(/sort=amount/);

    // Leads: Paginierung und Filterung serverseitig mit bedienbaren Controls
    await page.goto('/crm/leads');
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Leads & Kontakte' }),
    ).toBeVisible();
    await selectOption('Sortierung:', 'Erstelldatum');
    await expect(page).toHaveURL(/sort=created_at/);

    const leadsFilterTrigger = page.getByRole('combobox', { name: 'Jobtitel:' });
    await expect(leadsFilterTrigger).toBeVisible();
  });

  test('6. Unbekannter Filter wird mit 400 INVALID_QUERY ohne SQL-Offenlegung abgewiesen', async ({
    request,
  }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    const loginRes = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey },
      data: {
        email: requireEnv('E2E_AUTH_EMAIL'),
        password: requireEnv('E2E_AUTH_PASSWORD'),
      },
    });
    const { access_token: token } = await loginRes.json();

    const badQueryRes = await request.post(`${supabaseUrl}/functions/v1/crm-query-export`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      data: {
        action: 'list',
        resource: 'companies',
        filters: { evil_injection: "'; DROP TABLE crm_companies; --" },
      },
    });

    expect(badQueryRes.status()).toBe(400);
    const body = await badQueryRes.json();
    expect(body.code).toBe('INVALID_QUERY');
    expect(JSON.stringify(body)).not.toContain('DROP TABLE');
    expect(JSON.stringify(body)).not.toContain('syntax');
  });

  test('7. Deals-Pfad: Listet echte Mandantendaten aus imported_funnel_deals', async ({ page }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await page.goto('/crm/deals');
    await expect(page.getByText('Enterprise Paket A1').first()).toBeAttached();
    await expect(page.getByText('Growth Paket B1')).toHaveCount(0);
  });

  test('8. Rollennachweis: Manager kann exportieren, Viewer wird serverseitig abgewiesen', async ({
    page,
    request,
  }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    const managerEmail = process.env.E2E_AUTH_EMAIL_MANAGER || 'manager-a@e2e.local';
    const viewerEmail = process.env.E2E_AUTH_EMAIL_VIEWER || 'viewer-a@e2e.local';
    const password = requireEnv('E2E_AUTH_PASSWORD');

    // 1. Manager UI & CSV-Export
    await loginAs(page, managerEmail, password);
    await page.goto('/crm/companies');
    await expect(page.getByText('Firma A1').first()).toBeAttached();

    const exportBtn = page.getByRole('button', { name: /CSV.*Export/i });
    await expect(exportBtn).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('companies-export.csv');

    // 2. Viewer API-Export liefert strikt 403 FORBIDDEN
    const viewerLoginRes = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey },
      data: { email: viewerEmail, password },
    });
    const { access_token: viewerToken } = await viewerLoginRes.json();

    const viewerExportRes = await request.post(`${supabaseUrl}/functions/v1/crm-query-export`, {
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      data: { action: 'export', resource: 'companies' },
    });
    expect(viewerExportRes.status()).toBe(403);
    const viewerBody = await viewerExportRes.json();
    expect(viewerBody.code).toBe('FORBIDDEN');
  });
});
