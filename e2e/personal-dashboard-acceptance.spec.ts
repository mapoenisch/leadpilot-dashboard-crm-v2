import { test, expect, type Browser, type Page } from '@playwright/test';
import {
  applyDashboardConfig,
  insertLiveFeedRow,
  passwordSession,
  readRevision,
} from './helpers/dashboardPreferences';

// Auftrag 079 (Dashboard Teilauftrag 8b, Gesamtabnahme): Nachweise im echten App-Ablauf, die bisher
// nur als Unit-Test vorlagen. T1 zwei Sitzungen desselben Benutzers, T2 Benutzerwechsel im selben
// Browser, T3 Realtime während Ansicht und Bearbeitung, T4 Lazy Loading per Netzwerk. Wie
// personal-dashboard.spec.ts nur mit Build VITE_EXECUTIVE_DASHBOARD_V2=true und seriell
// (`--workers=1`), weil die Abläufe die Präferenz der Testbenutzer schreiben; danach wird der
// Ausgangszustand wiederhergestellt. Live-Feed-Einträge nur gegen ein lokales Supabase.
test.skip(
  process.env.E2E_DASHBOARD_V2 !== 'true',
  'Nur mit Build VITE_EXECUTIVE_DASHBOARD_V2=true (Auftrag 079).',
);

const AUTH_FILE = 'playwright/.auth/user.json';
const TILE = '[data-testid="lazy-tile"]';
const CRM_TABLE = '/rest/v1/imported_funnel_deals';

const tile = (
  tileId: string,
  catalogId: string,
  view: string,
  size: string,
  filterMode: string,
) => ({
  tileId,
  catalogId,
  view,
  size,
  filterMode,
});

const BASE_TILES = [
  tile('acc_live_arr', 'live.arr', 'zahl', 'klein', 'dashboard'),
  tile('acc_live_mrr', 'live.mrr', 'zahl', 'klein', 'dashboard'),
  tile('acc_umsatz', 'baseline.umsatz', 'zahl', 'klein', 'fester_stand'),
  tile('acc_arr_verlauf', 'baseline.arr_verlauf', 'linie', 'mittel', 'fester_stand'),
  // CRM-Kachel: nur dann bietet die Ansicht den Pipeline-Filter an (T2).
  tile('acc_crm_deals_a', 'crm.pipeline_deals', 'zahl', 'klein', 'dashboard'),
];
const CONFIG = { version: 1, tiles: BASE_TILES };

// Lazy Loading: zehn volle Diagrammkacheln schieben die zwei CRM-Kacheln weit unter den Sichtbereich
// (mehr als die Aktivierungsmarge von 300 px). Beide CRM-Kacheln teilen Organisation und Pipeline.
const FILLER = [
  'baseline.arr_verlauf',
  'baseline.leads_quartal',
  'baseline.neukunden_quartal',
  'baseline.headcount_verlauf',
  'baseline.aktivierungsrate',
].flatMap((catalogId, index) => [
  tile(`acc_fill_${index}_a`, catalogId, 'linie', 'voll', 'fester_stand'),
  tile(`acc_fill_${index}_b`, catalogId, 'flaeche', 'voll', 'fester_stand'),
]);
const LAZY_CONFIG = {
  version: 1,
  tiles: [
    ...FILLER,
    tile('acc_crm_deals', 'crm.pipeline_deals', 'zahl', 'klein', 'dashboard'),
    tile('acc_crm_stufen', 'crm.pipeline_stufen_volumen', 'balken', 'mittel', 'dashboard'),
  ],
};

const tileOf = (page: Page, tileId: string) => page.locator(`${TILE}[data-tile-id="${tileId}"]`);

async function openDashboard(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('dashboard-heading')).toBeVisible();
  await expect(page.getByTestId('dashboard-workspace')).toHaveAttribute('aria-busy', 'false');
}

async function tileOrder(page: Page): Promise<string[]> {
  return page
    .locator(TILE)
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-tile-id') ?? ''));
}

async function signedInPage(browser: Browser) {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  return { context, page: await context.newPage() };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt (Auftrag 079).`);
  return value;
}

test.describe('Gesamtabnahme mit fester Konfiguration', () => {
  let restore: (() => Promise<void>) | null = null;
  test.beforeEach(async () => {
    restore = await applyDashboardConfig(CONFIG);
  });
  test.afterEach(async () => {
    await restore?.();
    restore = null;
  });

  test('T1 zwei Sitzungen: Revision, Reload und Konflikt ohne stilles Überschreiben', async ({
    browser,
  }) => {
    const a = await signedInPage(browser);
    const b = await signedInPage(browser);
    try {
      await openDashboard(a.page);
      await openDashboard(b.page);
      const start = await readRevision();

      // B beginnt auf dem alten Stand zu bearbeiten.
      await b.page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
      await b.page
        .getByRole('button', { name: /: Nach unten, / })
        .first()
        .click();

      // A entfernt eine Kachel und speichert: genau eine neue Revision.
      await a.page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
      await a.page
        .getByRole('button', { name: /: Entfernen, / })
        .last()
        .click();
      await a.page.getByRole('button', { name: 'Speichern', exact: true }).click();
      await expect(a.page.getByTestId('editor-toolbar')).toContainText('Gespeichert.');
      expect(await readRevision()).toBe(start + 1);
      const saved = await tileOrder(a.page);
      expect(saved).toHaveLength(BASE_TILES.length - 1);

      // B speichert auf der alten Revision: Konflikt, keine neue Revision, Entwurf bleibt.
      await b.page.getByRole('button', { name: 'Speichern', exact: true }).click();
      const error = b.page.getByTestId('save-error');
      await expect(
        error.getByRole('button', { name: 'Aktuelle Serveransicht laden' }),
      ).toBeVisible();
      expect(await readRevision()).toBe(start + 1);
      await expect(b.page.locator(TILE)).toHaveCount(BASE_TILES.length);

      // B übernimmt die Serverfassung: gleiche Kacheln wie A.
      await error
        .getByRole('button', { name: 'Entwurf verwerfen und Serverfassung übernehmen' })
        .click();
      await expect.poll(() => tileOrder(b.page)).toEqual(saved);

      // Eine dritte Sitzung sieht nach dem Laden den Stand von A.
      await b.page.reload({ waitUntil: 'networkidle' });
      await expect.poll(() => tileOrder(b.page)).toEqual(saved);
      expect(await readRevision()).toBe(start + 1);
    } finally {
      await a.context.close();
      await b.context.close();
    }
  });

  test('T2 Benutzerwechsel: keine Kacheln, Filter und Details des Vorgängers', async ({
    browser,
  }) => {
    // Abmelden widerruft alle Tokens des Benutzers (auth.spec.ts, Fall 4). Deshalb meldet sich B ab
    // und A neu an; der gespeicherte Anmeldezustand von A für die übrigen Specs bleibt gültig.
    const emailB = requireEnv('E2E_AUTH_EMAIL_B');
    const passwordB = requireEnv('E2E_AUTH_PASSWORD_B');
    const restoreB = await applyDashboardConfig(
      {
        version: 1,
        tiles: [
          tile('acc_b_headcount', 'baseline.headcount', 'zahl', 'klein', 'fester_stand'),
          tile('acc_b_crm', 'crm.pipeline_deals', 'zahl', 'klein', 'dashboard'),
        ],
      },
      await passwordSession(emailB, passwordB),
    );
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.goto('/login');
      await page.fill('#login-email', emailB);
      await page.fill('#login-password', passwordB);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await expect(page.getByTestId('dashboard-workspace')).toHaveAttribute('aria-busy', 'false');
      await expect.poll(() => tileOrder(page)).toEqual(['acc_b_headcount', 'acc_b_crm']);
      const pipeline = page
        .getByTestId('dashboard-filters')
        .getByLabel('Pipeline', { exact: true });
      await pipeline.fill('nur-benutzer-b');
      await page.getByRole('button', { name: 'Filter anwenden' }).click();
      await expect(page.getByRole('button', { name: 'Filter anwenden' })).toBeDisabled();

      const logout = page.getByTestId('logout-button');
      await logout.focus();
      await logout.click();
      await page.waitForURL('**/login');
      await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL'));
      await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await expect(page.getByTestId('dashboard-workspace')).toHaveAttribute('aria-busy', 'false');

      await expect.poll(() => tileOrder(page)).toEqual(BASE_TILES.map((t) => t.tileId));
      await expect(
        page.getByTestId('dashboard-filters').getByLabel('Pipeline', { exact: true }),
      ).toHaveValue('');

      await page.goto('/dashboard/tiles/acc_b_headcount', { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { name: 'Kachel nicht gefunden' })).toBeVisible();
    } finally {
      await context.close();
      await restoreB(await passwordSession(emailB, passwordB));
    }
  });

  test('T3 Realtime: neuer Live-Wert in Ansicht und Bearbeitung, ein Channel, keine Neuordnung', async ({
    page,
  }) => {
    const joins: string[] = [];
    page.on('websocket', (ws) => {
      ws.on('framesent', ({ payload }) => {
        // Realtime-Protokoll 2.0: [joinRef, ref, topic, event, payload].
        const frame = JSON.parse(String(payload)) as unknown;
        if (Array.isArray(frame) && frame[3] === 'phx_join') joins.push(String(frame[2]));
      });
    });
    const cleanups: (() => Promise<void>)[] = [];
    try {
      await openDashboard(page);
      const order = await tileOrder(page);
      const arr = tileOf(page, 'acc_live_arr');
      await expect(arr).toHaveAttribute('data-active', 'true');
      await expect.poll(() => joins.length, { timeout: 15_000 }).toBeGreaterThan(0);

      // Ansicht: neuer Wert kommt ohne Reload an.
      cleanups.push(await insertLiveFeedRow('arr', 7_777_777, 'EUR'));
      await expect(arr).toContainText('7,78 Mio.', { timeout: 15_000 });
      expect(await tileOrder(page)).toEqual(order);

      // Bearbeitung mit offenem Entwurf: Wert aktualisiert, Entwurf und Reihenfolge bleiben.
      await page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
      await page
        .getByRole('button', { name: /: Nach unten, / })
        .first()
        .click();
      const draft = await tileOrder(page);
      cleanups.push(await insertLiveFeedRow('mrr', 888_888, 'EUR'));
      await expect(tileOf(page, 'acc_live_mrr')).toContainText('888.888', { timeout: 15_000 });
      expect(await tileOrder(page)).toEqual(draft);
      await expect(page.getByTestId('editor-toolbar')).toContainText('Ungespeicherte Änderungen.');
      await page.getByRole('button', { name: 'Verwerfen' }).click();

      // Zwei Live-Kacheln, Wechsel in die Bearbeitung und zurück: ein einziger Realtime-Channel.
      expect(new Set(joins).size).toBe(1);
    } finally {
      for (const cleanup of cleanups) await cleanup();
    }
  });
});

test.describe('Lazy Loading', () => {
  let restore: (() => Promise<void>) | null = null;
  test.beforeEach(async () => {
    restore = await applyDashboardConfig(LAZY_CONFIG);
  });
  test.afterEach(async () => {
    await restore?.();
    restore = null;
  });

  test('T4 Startbereich sofort, CRM erst nahe Sichtbereich, eine Abfrage je Quelle und Filter', async ({
    page,
  }) => {
    const crmRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes(CRM_TABLE)) crmRequests.push(request.url());
    });
    await openDashboard(page);
    await expect(tileOf(page, FILLER[0].tileId)).toHaveAttribute('data-active', 'true');
    await expect(tileOf(page, 'acc_crm_deals')).toHaveAttribute('data-active', 'false');
    await expect(tileOf(page, 'acc_crm_stufen')).toHaveAttribute('data-active', 'false');
    expect(crmRequests).toHaveLength(0);

    // Nacheinander anfahren: auf 375 px ist die Balkenkachel höher als Sichtbereich plus Marge.
    await tileOf(page, 'acc_crm_deals').scrollIntoViewIfNeeded();
    await expect(tileOf(page, 'acc_crm_deals')).toHaveAttribute('data-active', 'true');
    await tileOf(page, 'acc_crm_stufen').scrollIntoViewIfNeeded();
    await expect(tileOf(page, 'acc_crm_stufen')).toHaveAttribute('data-active', 'true');
    await expect(tileOf(page, 'acc_crm_deals').getByTestId('dashboard-tile')).toHaveAttribute(
      'data-state',
      /^(bereit|veraltet)$/,
    );
    await page.waitForLoadState('networkidle');
    expect(crmRequests).toHaveLength(1);
    const before = await tileOf(page, 'acc_crm_deals').innerText();

    const filters = page.getByTestId('dashboard-filters');
    await filters.getByLabel('Pipeline', { exact: true }).fill('e2e-pipeline');
    await page.getByRole('button', { name: 'Filter anwenden' }).click();
    await expect(page.getByRole('button', { name: 'Filter anwenden' })).toBeDisabled();
    // Kacheln außerhalb des Sichtbereichs übernehmen den Filter erst, wenn sie wieder nahe kommen.
    await tileOf(page, 'acc_crm_deals').scrollIntoViewIfNeeded();
    await expect(tileOf(page, 'acc_crm_deals')).toContainText('Pipeline: e2e-pipeline');
    await page.waitForLoadState('networkidle');
    expect(crmRequests).toHaveLength(2);

    await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
    await tileOf(page, 'acc_crm_deals').scrollIntoViewIfNeeded();
    await expect(tileOf(page, 'acc_crm_deals')).not.toContainText('Pipeline: e2e-pipeline');
    await page.waitForLoadState('networkidle');
    expect(await tileOf(page, 'acc_crm_deals').innerText()).toBe(before);
    expect(crmRequests.length).toBeLessThanOrEqual(3);
  });
});
