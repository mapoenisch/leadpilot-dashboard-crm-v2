import { test, expect, type Page } from '@playwright/test';

// Auftrag 138: Phasenwechsel von Deals sind serverseitig verbindlich.
// Die Spec prüft Persistenz über Reload und zweiten Kontext, die Viewer-Sperre
// und den Konfliktfall gegen einen inzwischen geänderten Serverstand.
// Läuft in der sequentiellen CI-Gruppe (--workers=1), weil dieselben Seed-Deals
// mutiert werden. Nur Desktop: die vier Fälle sind ansichtsunabhängig.

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

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

function serviceHeaders(): Record<string, string> {
  const key = requireEnv('E2E_CLEANUP_KEY');
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function rest(page: Page, method: 'PATCH' | 'POST', path: string, data?: unknown) {
  const url = `${requireEnv('E2E_SUPABASE_URL')}/rest/v1/${path}`;
  return page.request.fetch(url, { method, headers: serviceHeaders(), data });
}

/** Setzt den Seed-Deal auf seinen Ausgangsstand zurück (auch nach Fehlschlägen). */
async function resetDeal(page: Page, dealId: string, stage: string): Promise<void> {
  const res = await rest(page, 'PATCH', `imported_funnel_deals?id=eq.${dealId}`, {
    stage,
    stage_entered_at: null,
  });
  expect(res.ok()).toBe(true);
}

const DEAL_A1 = 'e0000000-0000-0000-0000-000000000001';
const DEAL_FORMULA = 'e0000000-0000-0000-0000-000000000003';
const DEAL_A1_NAME = 'Enterprise Paket A1';
const DEAL_A1_SEED_STAGE = 'PROPOSAL'; // wird als „Angebot erstellt“ angezeigt
const DEAL_FORMULA_SEED_STAGE = 'LEAD'; // wird als „Lead eingegangen“ angezeigt

async function openKanban(page: Page): Promise<void> {
  await page.goto('/crm/deals?ansicht=kanban');
  await expect(page.getByRole('heading', { name: 'Deal Pipeline' })).toBeVisible();
  await expect(page.getByTestId(`deal-card-${DEAL_A1}`)).toBeVisible();
}

async function moveViaMenu(page: Page, dealName: string, targetStage: string): Promise<void> {
  await page.getByRole('button', { name: `${dealName}: Phase ändern` }).click();
  await page.getByRole('menuitem', { name: targetStage, exact: true }).click();
  await expect(page.getByTestId('deal-stage-announcement')).toHaveText(
    `${dealName} nach ${targetStage} verschoben.`,
  );
}

function dealInColumn(page: Page, stage: string, dealId: string) {
  return page.getByTestId(`kanban-column-${stage}`).getByTestId(`deal-card-${dealId}`);
}

test.describe('Deals: serverseitige Phasenpersistenz (Auftrag 138)', () => {
  test.beforeEach(async ({ page }) => {
    await resetDeal(page, DEAL_A1, DEAL_A1_SEED_STAGE);
    await resetDeal(page, DEAL_FORMULA, DEAL_FORMULA_SEED_STAGE);
  });

  test.afterEach(async ({ page }) => {
    await resetDeal(page, DEAL_A1, DEAL_A1_SEED_STAGE);
    await resetDeal(page, DEAL_FORMULA, DEAL_FORMULA_SEED_STAGE);
  });

  test('phase_bleibt_nach_reload: verschobene Phase überlebt einen echten Reload', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Persistenzfälle laufen nur auf Desktop');
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await openKanban(page);

    await expect(dealInColumn(page, 'Angebot erstellt', DEAL_A1)).toBeVisible();
    await moveViaMenu(page, DEAL_A1_NAME, 'Verhandlung');
    await expect(dealInColumn(page, 'Verhandlung', DEAL_A1)).toBeVisible();

    // Echter Seiten-Reload: kein Browser-Speicher, nur der Serverstand zählt.
    await page.reload();
    await expect(page.getByTestId(`deal-card-${DEAL_A1}`)).toBeVisible();
    await expect(dealInColumn(page, 'Verhandlung', DEAL_A1)).toBeVisible();
    await expect(dealInColumn(page, 'Angebot erstellt', DEAL_A1)).toHaveCount(0);
  });

  test('phase_in_zweitem_kontext_sichtbar: Phasenwechsel ist für andere Sitzungen sichtbar', async ({
    page,
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Persistenzfälle laufen nur auf Desktop');
    const password = requireEnv('E2E_AUTH_PASSWORD');
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), password);
    await openKanban(page);

    await moveViaMenu(page, DEAL_A1_NAME, 'Verhandlung');
    await expect(dealInColumn(page, 'Verhandlung', DEAL_A1)).toBeVisible();

    // Zweiter, unabhängiger Browser-Kontext (kein gemeinsamer Cache, kein Storage).
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    try {
      await loginAs(otherPage, requireEnv('E2E_AUTH_EMAIL_MANAGER'), password);
      await openKanban(otherPage);
      await expect(dealInColumn(otherPage, 'Verhandlung', DEAL_A1)).toBeVisible();
      await expect(dealInColumn(otherPage, 'Angebot erstellt', DEAL_A1)).toHaveCount(0);
    } finally {
      await otherContext.close();
    }
  });

  test('viewer_kann_nicht_verschieben: keine Drag- oder Tastaturbedienung, Server weist RPC ab', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Persistenzfälle laufen nur auf Desktop');
    const viewerEmail = requireEnv('E2E_AUTH_EMAIL_VIEWER');
    const password = requireEnv('E2E_AUTH_PASSWORD');
    await loginAs(page, viewerEmail, password);
    await openKanban(page);

    const viewerCard = page.getByTestId(`deal-card-${DEAL_A1}`);
    await expect(viewerCard).toBeVisible();
    await expect(viewerCard).toHaveAttribute('draggable', 'false');
    await expect(page.getByRole('button', { name: `${DEAL_A1_NAME}: Phase ändern` })).toHaveCount(
      0,
    );

    // Direkter RPC-Aufruf als Viewer: serverseitig strikt abgewiesen.
    const anonKey = requireEnv('E2E_SUPABASE_ANON_KEY');
    const supabaseUrl = requireEnv('E2E_SUPABASE_URL');
    const loginRes = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey },
      data: { email: viewerEmail, password },
    });
    const { access_token: viewerToken } = await loginRes.json();
    const rpcRes = await request.post(`${supabaseUrl}/rest/v1/rpc/move_deal_stage`, {
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      data: {
        p_deal_id: DEAL_A1,
        p_expected_stage: DEAL_A1_SEED_STAGE,
        p_new_stage: 'Verhandlung',
      },
    });
    expect(rpcRes.ok()).toBe(false);
    expect((await rpcRes.json()).code).toBe('LP403');

    // Der Deal bleibt unverändert auf dem Seed-Stand.
    await page.reload();
    await expect(dealInColumn(page, 'Angebot erstellt', DEAL_A1)).toBeVisible();
  });

  test('konflikt_zeigt_serverstand: veralteter Client erhält Hinweis und Serverphase', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Persistenzfälle laufen nur auf Desktop');
    await loginAs(page, requireEnv('E2E_AUTH_EMAIL'), requireEnv('E2E_AUTH_PASSWORD'));
    await openKanban(page);
    await expect(dealInColumn(page, 'Angebot erstellt', DEAL_A1)).toBeVisible();

    // Serverstand hinter dem Rücken der offenen Seite ändern (Rohwert VERHANDLUNG).
    const patchRes = await rest(page, 'PATCH', `imported_funnel_deals?id=eq.${DEAL_A1}`, {
      stage: 'VERHANDLUNG',
      stage_entered_at: new Date().toISOString(),
    });
    expect(patchRes.ok()).toBe(true);

    // Veralteter Client versucht zu verschieben → LP409, kein stilles Überschreiben.
    await page.getByRole('button', { name: `${DEAL_A1_NAME}: Phase ändern` }).click();
    await page.getByRole('menuitem', { name: 'Deal gewonnen', exact: true }).click();

    await expect(
      page.getByRole('alert').filter({
        hasText: 'Dieser Deal wurde inzwischen geändert. Die aktuelle Phase wird angezeigt.',
      }),
    ).toBeVisible();

    // Nach dem Fehlschlag zeigt die Seite den Serverstand.
    await expect(dealInColumn(page, 'Verhandlung', DEAL_A1)).toBeVisible();
    await expect(dealInColumn(page, 'Deal gewonnen', DEAL_A1)).toHaveCount(0);
  });
});
