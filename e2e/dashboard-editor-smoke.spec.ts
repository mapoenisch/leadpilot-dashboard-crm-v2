import { test, expect, type Browser, type Locator, type Page } from '@playwright/test';
import { passwordSession, type Session } from './helpers/dashboardPreferences';

// Executive Dashboard V2 (Auftrag 174a): Nacharbeit aus dem Hosted-Smoke-Test, in der angemeldeten
// App-Hülle mit lokalem Supabase, Organisation A auf Stufe 1 und ohne Client-Override.
// 1. Telefon (375 px, Touch): Kachel ändern, „Speichern“ per Touch, Änderung nach Neuladen da;
//    zweiter Entwurf per Tastatur abbrechen – V2 bleibt, auch nach Neuladen (L6, F2).
// 2. Desktop: Resize mit Entwurf 1440 → 1059 → 375 → 1440 hält Editor bedienbar, Info erscheint
//    nicht ungefragt, Desktop-Ansicht kehrt zurück; Panel-Editor-Button ohne Handler ausgeblendet;
//    „Abbrechen“ mit Änderung verwirft nur den Entwurf (L1, L3, L7, F1, F2).
// Schreibt nur lokale synthetische Daten des Seed-Nutzers und stellt den Ausgangsstand wieder her.
// Läuft in der seriellen Gruppe, weil die Stufe von Organisation A alle ihre Nutzer betrifft.

test.use({ storageState: { cookies: [], origins: [] } });

const MANAGER_A = process.env.E2E_AUTH_EMAIL_MANAGER || 'manager-a@e2e.local';
const ADMIN_A = process.env.E2E_AUTH_EMAIL || 'admin-a@e2e.local';
const PASSWORD = process.env.E2E_AUTH_PASSWORD || 'TestPassword123!';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const OVERRIDE_KEY = 'lp_dashboard_editor_v2';

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

async function asService<T = unknown>(
  s: Session,
  pathAndQuery: string,
  init: RequestInit,
): Promise<T> {
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
      Prefer: 'resolution=merge-duplicates,return=representation',
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`${pathAndQuery}: ${response.status} ${await response.text()}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
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

/** Organisation A auf Stufe 1; räumt nur die Zeilen weg, die der Test selbst angelegt hat. */
async function withStufe1(run: (manager: Session) => Promise<void>): Promise<void> {
  const manager = await passwordSession(MANAGER_A, PASSWORD);
  const admin = await passwordSession(ADMIN_A, PASSWORD);
  const [membership] = await rest<{ organization_id: string }[]>(
    manager,
    `/rest/v1/organization_members?select=organization_id&user_id=eq.${manager.userId}&status=eq.active&limit=1`,
  );
  const orgA = membership.organization_id;
  const rollout = await asService<{ stufe: number }[]>(
    manager,
    `/rest/v1/dashboard_editor_rollout?select=stufe&organization_id=eq.${orgA}`,
    { method: 'GET' },
  );
  const switches = await asService<unknown[]>(
    manager,
    `/rest/v1/dashboard_editor_switches?select=user_id&organization_id=eq.${orgA}&user_id=eq.${manager.userId}`,
    { method: 'GET' },
  );
  await ensureEligible(admin, manager.userId);
  await asService(manager, '/rest/v1/dashboard_editor_rollout?on_conflict=organization_id', {
    method: 'POST',
    body: JSON.stringify({ organization_id: orgA, stufe: 1, notiz: 'E2E Auftrag 174a' }),
  });
  try {
    await run(manager);
  } finally {
    if (rollout.length === 0) {
      await asService(manager, `/rest/v1/dashboard_editor_rollout?organization_id=eq.${orgA}`, {
        method: 'DELETE',
      });
    } else {
      await asService(manager, '/rest/v1/dashboard_editor_rollout?on_conflict=organization_id', {
        method: 'POST',
        body: JSON.stringify({ organization_id: orgA, stufe: rollout[0].stufe }),
      });
    }
    if (switches.length === 0) {
      await asService(
        manager,
        `/rest/v1/dashboard_editor_switches?organization_id=eq.${orgA}&user_id=eq.${manager.userId}`,
        { method: 'DELETE' },
      );
    }
  }
}

async function openEditor(
  browser: Browser,
  viewport: { width: number; height: number },
  hasTouch: boolean,
) {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    viewport,
    hasTouch,
  });
  const page = await context.newPage();
  await page.goto('/login');
  await page.fill('#login-email', MANAGER_A);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  // Kein Session-Override: entscheidend ist allein der Server-Schalter.
  await page.evaluate((key) => window.sessionStorage.removeItem(key), OVERRIDE_KEY);
  await page.goto('/dashboard');
  await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 30_000 });
  return { context, page };
}

/** Sichtbar im Viewport und tatsächlich das oberste Element an seiner Mitte (nicht nur kein Überlauf). */
async function expectReachable(page: Page, locator: Locator): Promise<void> {
  await expect(locator).toBeInViewport({ ratio: 1 });
  const hit = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return Boolean(top && (top === el || el.contains(top)));
  });
  expect(hit).toBe(true);
  const vw = await page.evaluate(() => document.documentElement.clientWidth);
  const box = await locator.boundingBox();
  expect(box && box.x + box.width).toBeLessThanOrEqual(vw + 0.5);
}

/** L2/L4: Jeder Kachelinhalt ist in seiner Rasterfläche eingefasst (scrollt dort, statt überzustehen). */
async function expectTilesContained(page: Page): Promise<void> {
  const problems = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="editor-canvas"] [role="gridcell"]')].flatMap(
      (cell) => {
        const body = cell.querySelector('[data-testid^="tile-body-"]');
        if (!body) return [`${cell.getAttribute('data-tile-id')}: kein Kachelbereich`];
        const c = cell.getBoundingClientRect();
        const b = body.getBoundingClientRect();
        const style = getComputedStyle(body);
        const inside =
          b.top >= c.top - 1 &&
          b.bottom <= c.bottom + 1 &&
          b.right <= c.right + 1 &&
          b.left >= c.left - 1;
        return inside && style.overflowY !== 'visible'
          ? []
          : [`${cell.getAttribute('data-tile-id')}: ${Math.round(b.bottom - c.bottom)} px`];
      },
    ),
  );
  expect(problems).toEqual([]);
}

async function storedPersonal(s: Session) {
  return rest<{ id: string; revision: number; config: { tiles: { id: string }[] } }[]>(
    s,
    '/rest/v1/dashboards?select=id,revision,config&scope=eq.personal&order=created_at.asc',
  );
}

test.describe('Dashboard-Editor V2: Nacharbeit Smoke-Test (Auftrag 174a)', () => {
  test('375 px: Speichern per Touch, Abbrechen per Tastatur, V2 bleibt nach Neuladen', async ({
    browser,
  }) => {
    // Viewports setzt der Test selbst; ein Lauf genügt.
    test.skip(test.info().project.name !== 'desktop-1440', 'Viewport wird im Test gesetzt');
    test.setTimeout(150_000);
    await withStufe1(async (manager) => {
      const [before] = await storedPersonal(manager);
      const { context, page } = await openEditor(browser, { width: 375, height: 812 }, true);
      const sizeBtn = page.locator('[data-testid^="tile-size-btn-"]').first();
      const tileId = (await sizeBtn.getAttribute('data-testid'))!.replace('tile-size-btn-', '');
      const sizeBtnOf = (p: Page) => p.getByTestId(`tile-size-btn-${tileId}`);
      const originalLabel = (await sizeBtn.getAttribute('aria-label'))!;

      // Erster Entwurf: Größe ändern, Speichern per Touch
      await sizeBtn.tap();
      await expect(page.getByTestId('dirty-indicator')).toBeVisible();
      const changedLabel = (await sizeBtn.getAttribute('aria-label'))!;
      expect(changedLabel).not.toBe(originalLabel);
      const save = page.getByTestId('save-button');
      const cancel = page.getByTestId('cancel-button');
      await save.scrollIntoViewIfNeeded();
      await expectReachable(page, save);
      await expectReachable(page, cancel);
      await save.tap();
      await expect(page.getByTestId('dirty-indicator')).toHaveCount(0, { timeout: 15_000 });
      await expect
        .poll(async () => (await storedPersonal(manager))[0].revision, { timeout: 15_000 })
        .toBe(before.revision + 1);

      // Nach Neuladen: gespeicherte Änderung vorhanden, weiterhin V2
      await page.reload();
      await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 30_000 });
      await expect(sizeBtnOf(page)).toHaveAttribute('aria-label', changedLabel);

      // Zweiter Entwurf: per Tastatur zu „Abbrechen“, Entwurf verwerfen
      await sizeBtnOf(page).tap();
      await expect(page.getByTestId('dirty-indicator')).toBeVisible();
      await page.getByTestId('cancel-button').focus();
      await expectReachable(page, page.getByTestId('cancel-button'));
      await page.keyboard.press('Enter');
      await page.getByRole('button', { name: 'Verwerfen und weiter' }).click();
      await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();
      await expect(page.getByTestId('dirty-indicator')).toHaveCount(0);
      await expect(sizeBtnOf(page)).toHaveAttribute('aria-label', changedLabel);
      expect(await page.evaluate((k) => window.sessionStorage.getItem(k), OVERRIDE_KEY)).toBeNull();
      await page.reload();
      await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('dashboard-workspace')).toHaveCount(0);
      expect((await storedPersonal(manager))[0].revision).toBe(before.revision + 1);

      // Ausgangsstand wiederherstellen (Größe zurückdrehen und speichern)
      for (let i = 0; i < 4; i++) {
        if ((await sizeBtnOf(page).getAttribute('aria-label')) === originalLabel) break;
        await sizeBtnOf(page).tap();
      }
      await expect(sizeBtnOf(page)).toHaveAttribute('aria-label', originalLabel);
      await page.getByTestId('save-button').tap();
      await expect(page.getByTestId('dirty-indicator')).toHaveCount(0, { timeout: 15_000 });
      await context.close();
    });
  });

  test('Desktop: Resize mit Entwurf bleibt bedienbar, Abbrechen verwirft nur den Entwurf', async ({
    browser,
  }) => {
    // Viewports setzt der Test selbst; ein Lauf genügt.
    test.skip(test.info().project.name !== 'desktop-1440', 'Viewport wird im Test gesetzt');
    test.setTimeout(150_000);
    await withStufe1(async (manager) => {
      const [before] = await storedPersonal(manager);
      const { context, page } = await openEditor(browser, { width: 1440, height: 900 }, false);
      const shell = page.getByTestId('dashboard-editor-shell-v2');
      const canvas = page.getByTestId('editor-canvas');
      const select = page.getByTestId('global-timeframe-select');
      const original = await select.inputValue();
      await select.selectOption(original === 'jahr' ? 'quartal' : 'jahr');
      await expect(page.getByTestId('dirty-indicator')).toBeVisible();

      // L2/L4: Kacheln eingefasst – im Bearbeitungsmodus und in der Vorschau
      await expectTilesContained(page);
      await page.getByTestId('preview-mode-button').click();
      await expectTilesContained(page);
      await page.getByTestId('preview-mode-button').click();

      // F1: ohne Panel-Editor-Handler keine funktionslose Aktion, Kacheleinstellungen bleiben
      await page
        .locator('[role="gridcell"]')
        .first()
        .click({ position: { x: 40, y: 12 } });
      await expect(page.getByTestId('editor-inspector')).toBeVisible();
      await expect(page.getByTestId('inspector-tile-content')).toBeVisible();
      await expect(page.getByTestId('open-panel-editor-btn')).toHaveCount(0);

      // 1059 px: Arbeitsfläche behält bedienbare Breite, Aktionen erreichbar
      await page.setViewportSize({ width: 1059, height: 800 });
      await expect
        .poll(async () => (await canvas.boundingBox())?.width ?? 0)
        .toBeGreaterThanOrEqual(600);
      await expect(page.locator('[data-testid="editor-inspector"][data-sheet="true"]')).toHaveCount(
        0,
      );
      await expectReachable(page, page.getByTestId('save-button'));
      await expect(page.getByTestId('dirty-indicator')).toBeVisible();

      // 375 px: keine ungefragte Dashboard-Info als Vollbild-Blatt, Aktionen erreichbar
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(shell).toHaveAttribute('data-panel-mode', 'blatt');
      await expect(page.getByTestId('editor-inspector')).toHaveCount(0);
      await expect(page.getByTestId('widget-library')).toHaveCount(0);
      await page.getByTestId('save-button').scrollIntoViewIfNeeded();
      await expectReachable(page, page.getByTestId('save-button'));
      await expectReachable(page, page.getByTestId('cancel-button'));
      await expect(page.getByTestId('dirty-indicator')).toBeVisible();

      // Zurück auf 1440 px: wie Direktaufruf (Desktop-Ansicht, Info offen), Entwurf erhalten
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(canvas).toHaveAttribute('data-breakpoint', 'desktop');
      await expect(page.getByTestId('editor-inspector')).toBeVisible();
      await expect(page.getByTestId('dirty-indicator')).toBeVisible();

      // F2: Abbrechen mit Änderung -> Entwurf verworfen, V2 bleibt (auch nach Neuladen)
      await page.getByTestId('cancel-button').click();
      await page.getByRole('button', { name: 'Verwerfen und weiter' }).click();
      await expect(shell).toBeVisible();
      await expect(page.getByTestId('dirty-indicator')).toHaveCount(0);
      await expect(select).toHaveValue(original);
      // Abbrechen ohne Änderung
      await page.getByTestId('cancel-button').click();
      await expect(shell).toBeVisible();
      expect(await page.evaluate((k) => window.sessionStorage.getItem(k), OVERRIDE_KEY)).toBeNull();
      await page.reload();
      await expect(shell).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('dashboard-workspace')).toHaveCount(0);

      // Gespeicherter Stand unverändert
      const [after] = await storedPersonal(manager);
      expect(after.revision).toBe(before.revision);
      expect(after.config).toEqual(before.config);
      await context.close();
    });
  });
});
