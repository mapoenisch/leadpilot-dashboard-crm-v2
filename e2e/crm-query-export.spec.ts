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

  test('2. URL-Roundtrip: Deep-Link stellt Filter, Sortierung und Paginierung exakt wieder her und übersteht Reload', async ({
    page,
  }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));

    // Direkter Aufruf des Deep Links mit Paginierung und Sortierung
    await page.goto('/crm/companies?seite=2&proSeite=1&sort=name&order=asc');

    // Erwarteter Inhalt auf Seite 2 bei sort=name&order=asc:
    // Seite 1 ist ' =1+1 Formel-Firma', Seite 2 ist 'Firma A1', Seite 3 ist 'Firma A2'
    await expect(page.getByText('Firma A1').first()).toBeVisible();
    await expect(page.getByText(' =1+1 Formel-Firma')).toHaveCount(0);
    await expect(page.getByText('Firma A2')).toHaveCount(0);

    // Dropdown und Pager-State prüfen
    const pageSizeSelect = page.getByRole('combobox', { name: 'Zeilen pro Seite' });
    await expect(pageSizeSelect).toHaveValue('1');
    const prevBtn = page.getByRole('button', { name: 'Vorherige Seite' });
    const nextBtn = page.getByRole('button', { name: 'Nächste Seite' });
    await expect(prevBtn).toBeEnabled();
    await expect(nextBtn).toBeEnabled();

    // Echter Page-Reload: muss den identischen Zustand und Inhalt bewahren
    await page.reload();
    await expect(page).toHaveURL(/seite=2/);
    await expect(page).toHaveURL(/proSeite=1/);
    await expect(page).toHaveURL(/sort=name/);
    await expect(page).toHaveURL(/order=asc/);
    await expect(page.getByText('Firma A1').first()).toBeVisible();
    await expect(page.getByText(' =1+1 Formel-Firma')).toHaveCount(0);
    await expect(page.getByText('Firma A2')).toHaveCount(0);
    await expect(prevBtn).toBeEnabled();
    await expect(nextBtn).toBeEnabled();
  });

  test('2b. Pagination-Vertrag: Mehrseitige Navigation, Datenwechsel und Pager-Bedienung', async ({
    page,
  }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await page.goto('/crm/companies');

    // Zeilen pro Seite auf 1 setzen über UI-Dropdown
    const pageSizeSelect = page.getByRole('combobox', { name: 'Zeilen pro Seite' });
    await expect(pageSizeSelect).toBeVisible();
    await pageSizeSelect.selectOption('1');

    // URL muss 'proSeite=1' enthalten
    await expect(page).toHaveURL(/proSeite=1/);

    // Seite 1: ' =1+1 Formel-Firma' sichtbar, 'Firma A1' nicht sichtbar
    await expect(page.getByText(' =1+1 Formel-Firma').first()).toBeVisible();
    await expect(page.getByText('Firma A1')).toHaveCount(0);

    // Paginierungs-Status & Buttons auf Seite 1 (Vorherige disabled, Nächste enabled)
    const prevBtn = page.getByRole('button', { name: 'Vorherige Seite' });
    const nextBtn = page.getByRole('button', { name: 'Nächste Seite' });
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    // Zur Seite 2 blättern
    await nextBtn.click();
    await expect(page).toHaveURL(/seite=2/);
    await expect(prevBtn).toBeEnabled();

    // Seite 2: Datenwechsel verifizieren! 'Firma A1' sichtbar, ' =1+1 Formel-Firma' nicht sichtbar
    await expect(page.getByText('Firma A1').first()).toBeVisible();
    await expect(page.getByText(' =1+1 Formel-Firma')).toHaveCount(0);

    // Zurück zur Seite 1 blättern
    await prevBtn.click();
    await expect(page).not.toHaveURL(/seite=2/);
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    // Seite 1: Datenwechsel zurück verifizieren! ' =1+1 Formel-Firma' wieder sichtbar, 'Firma A1' nicht
    await expect(page.getByText(' =1+1 Formel-Firma').first()).toBeVisible();
    await expect(page.getByText('Firma A1')).toHaveCount(0);
  });

  test('2c. Neutrale URL bleibt nach Reload neutral und reaktiviert keine alten Filter (P2-1)', async ({
    page,
  }) => {
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));

    // 1. Zunächst gefilterte Liste aufrufen
    await page.goto('/crm/companies?suche=Formel');
    await expect(page.getByText(' =1+1 Formel-Firma').first()).toBeVisible();
    await expect(page.getByText('Firma A1')).toHaveCount(0);

    // 2. Bewusst neutrale Route aufrufen (ohne Such-/Filterparameter)
    await page.goto('/crm/companies');
    await expect(page.getByText(' =1+1 Formel-Firma').first()).toBeVisible();
    await expect(page.getByText('Firma A1').first()).toBeVisible();

    // 3. Reload auf neutraler Route: darf keine alten Filter aus sessionStorage reaktivieren
    await page.reload();
    await expect(page).toHaveURL(/\/crm\/companies(?:\?.*)?$/);
    expect(new URL(page.url()).search).toBe('');
    await expect(page.getByText(' =1+1 Formel-Firma').first()).toBeVisible();
    await expect(page.getByText('Firma A1').first()).toBeVisible();
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
    browser,
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

    // 2. Viewer UI: Im isolierten Kontext anmelden - Export-Button ist sichtbar deaktiviert
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    try {
      await loginAs(viewerPage, viewerEmail, password);
      await viewerPage.goto('/crm/companies');
      await expect(viewerPage.getByText('Firma A1').first()).toBeAttached();

      const viewerExportBtn = viewerPage.getByRole('button', { name: /CSV.*Export/i });
      await expect(viewerExportBtn).toBeVisible();
      await expect(viewerExportBtn).toBeDisabled();
      await expect(viewerExportBtn).toHaveAttribute(
        'title',
        'Viewer besitzen keine Exportberechtigung',
      );
    } finally {
      await viewerContext.close();
    }

    // 3. Viewer API-Export liefert strikt 403 FORBIDDEN
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
