import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Auftrag 171 (P15a §2.3 Nr. 12): Kiosk-Modus.
// Teil A läuft gegen die Vorschau (Beispieldaten, keine Anmeldung): Rotation, Pause per Tastatur,
// fremde IDs, simulierter Token-Ablauf, Offline über context.setOffline, Barrierefreiheit.
// Teil B läuft gegen die echte App mit Supabase: Kiosk aus dem Editor öffnen, Token-Erneuerung,
// Offline und echter Sitzungsablauf (ungültiges Refresh-Token im Storage) → Hinweis, danach keine
// Netzwerkanfragen mehr an Supabase.

const PREVIEW = '/dashboard-vorschau.html?bereich=kiosk';
const IDS = 'ids=preview_thresholds_dashboard,preview_v2_dashboard,fremd_dashboard';

test.describe('Kiosk – Vorschau (P15a)', () => {
  test('rotiert nur lesbare Dashboards, Pause per Leertaste und Schaltfläche', async ({ page }) => {
    await page.clock.install();
    await page.goto(`${PREVIEW}&${IDS}&intervall=30`);
    const title = page.getByTestId('kiosk-title');
    await expect(title).toHaveText('Schwellenwerte & Alarme (Vorschau)');
    await expect(page.getByTestId('kiosk-position')).toHaveText('1 / 2');
    await expect(page.getByTestId('kiosk-skipped-notice')).toContainText('1 Dashboard');
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toHaveCount(0);
    await expect(page.getByTestId('save-button')).toHaveCount(0);

    await page.clock.fastForward(31_000);
    await expect(title).toHaveText('Executive Dashboard (V2 Beta)');

    await page.keyboard.press('Space');
    await expect(page.getByTestId('kiosk-root')).toHaveAttribute('data-paused', 'true');
    await expect(page.getByTestId('kiosk-pause-button')).toHaveText(/Weiter/);
    await page.clock.fastForward(5 * 60_000);
    await expect(title).toHaveText('Executive Dashboard (V2 Beta)');

    await page.getByTestId('kiosk-pause-button').click();
    await expect(page.getByTestId('kiosk-rotation-state')).toHaveText(/Wechsel alle 30 s|Bedienung/);
    await page.mouse.move(5, 5);
    await page.keyboard.press('Space'); // Fokus liegt auf der Schaltfläche → sie schaltet selbst
    await page.keyboard.press('Space');
    await expect(page.getByTestId('kiosk-pause-button')).toHaveAttribute('aria-pressed', 'false');
  });

  test('simulierter Token-Ablauf blendet alles aus und zeigt den Hinweis', async ({ page }) => {
    await page.goto(`${PREVIEW}&${IDS}&ablauf=3`);
    await expect(page.getByTestId('dashboard-tile').first()).toBeVisible();
    await expect(page.getByTestId('kiosk-session-expired')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('kiosk-session-expired')).toContainText(
      'Sitzung abgelaufen – bitte neu anmelden',
    );
    await expect(page.getByTestId('kiosk-last-valid-data')).toContainText(/\d\d:\d\d Uhr/);
    await expect(page.getByTestId('dashboard-tile')).toHaveCount(0);
    await expect(page.getByText('Schwellenwerte & Alarme (Vorschau)')).toHaveCount(0);
  });

  test('offline: Hinweis, Live-Werte veraltet; online: Hinweis verschwindet', async ({
    page,
    context,
  }) => {
    await page.goto(`${PREVIEW}&ids=preview_thresholds_dashboard`);
    await expect(page.getByTestId('dashboard-tile').first()).toBeVisible();
    await context.setOffline(true);
    const banner = page.getByTestId('kiosk-offline-banner');
    await expect(banner).toHaveText(/Offline seit \d\d:\d\d – Daten werden nicht aktualisiert/);
    await expect(page.getByTestId('kiosk-connection')).toHaveAttribute('data-offline', 'true');
    const liveTile = page.getByTestId('dashboard-tile').filter({ hasText: 'Angebote' });
    await expect(liveTile).toHaveAttribute('data-state', 'veraltet');
    // Stammdaten bleiben gültig (keine erfundene Veraltung)
    const baselineTile = page.getByTestId('dashboard-tile').filter({ hasText: 'ARR (Normal' });
    await expect(baselineTile).toHaveAttribute('data-state', 'bereit');
    await context.setOffline(false);
    await expect(banner).toHaveCount(0);
  });

  for (const theme of ['dunkel', 'hell'] as const) {
    test(`a11y Kiosk (${theme}) — keine critical/serious-Verstöße in der Kiosk-Leiste`, async ({
      page,
    }) => {
      await page.goto(`${PREVIEW}&${IDS}&theme=${theme}`);
      await expect(page.getByTestId('kiosk-status-bar')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('[data-testid="kiosk-status-bar"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBe(0);
    });
  }
});

// ---------------------------------------------------------------------------------------------
// Teil B: echte App, echte Supabase-Sitzung (eigene Anmeldung, damit Token-Änderungen keine
// anderen Tests berühren).

const EMAIL = process.env.E2E_AUTH_EMAIL || 'admin-a@e2e.local';
const PASSWORD = process.env.E2E_AUTH_PASSWORD || 'TestPassword123!';

async function editStoredSession(
  page: Page,
  change: { expireNow?: boolean; invalidRefresh?: boolean },
): Promise<string> {
  return page.evaluate((c) => {
    const key = Object.keys(window.localStorage).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (!key) throw new Error('Keine Supabase-Sitzung im Storage');
    const session = JSON.parse(window.localStorage.getItem(key) ?? '{}');
    if (c.expireNow) session.expires_at = Math.floor(Date.now() / 1000) - 10;
    if (c.invalidRefresh) session.refresh_token = 'ungueltig-e2e';
    window.localStorage.setItem(key, JSON.stringify(session));
    // Supabase prüft die Sitzung beim Sichtbarwerden des Tabs erneut
    document.dispatchEvent(new Event('visibilitychange'));
    return String(session.access_token ?? '').slice(-12);
  }, change);
}

test.describe('Kiosk – echte Sitzung (P15a)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Erneuerung hält die Anzeige; Ablauf stoppt alle Anfragen', async ({ page, context }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      window.sessionStorage.setItem('lp_dashboard_editor_v2', 'true');
    });
    await page.goto('/login');
    await page.fill('#login-email', EMAIL);
    await page.fill('#login-password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 20_000 });

    // Einstieg aus dem Editor
    await page.getByTestId('kiosk-launch-button').click();
    await expect(page.getByTestId('kiosk-launch-dialog')).toBeVisible();
    await page.getByTestId('kiosk-launch-submit').click();
    await page.waitForURL(/\/dashboard\/kiosk\?ids=/);
    await expect(page.getByTestId('kiosk-status-bar')).toBeVisible();
    await expect(page.getByTestId('kiosk-title')).not.toHaveText('Kiosk', { timeout: 15_000 });
    await expect(page.getByTestId('logout-button')).toHaveCount(0); // ohne App-Menüs

    // Token-Erneuerung: abgelaufenes Access-Token, gültiges Refresh-Token → neue Sitzung
    const before = await editStoredSession(page, { expireNow: true });
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const key = Object.keys(window.localStorage).find((k) => k.endsWith('-auth-token'));
            const s = JSON.parse(window.localStorage.getItem(key ?? '') ?? '{}');
            return String(s.access_token ?? '').slice(-12);
          }),
        { timeout: 15_000 },
      )
      .not.toBe(before);
    await expect(page.getByTestId('kiosk-session-expired')).toHaveCount(0);
    await expect(page.getByTestId('kiosk-status-bar')).toBeVisible();

    // Offline
    await context.setOffline(true);
    await expect(page.getByTestId('kiosk-offline-banner')).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByTestId('kiosk-offline-banner')).toHaveCount(0);

    // Ablauf: Refresh-Token ungültig → Supabase meldet Abmeldung → Hinweis
    await editStoredSession(page, { expireNow: true, invalidRefresh: true });
    await expect(page.getByTestId('kiosk-session-expired')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('dashboard-tile')).toHaveCount(0);

    const supabaseHost = new URL(process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321').host;
    const after: string[] = [];
    page.on('request', (req) => {
      if (new URL(req.url()).host === supabaseHost) after.push(`${req.method()} ${req.url()}`);
    });
    await page.waitForTimeout(6_000);
    expect(after, after.join('\n')).toEqual([]);
    await expect(page.getByTestId('kiosk-session-expired')).toBeVisible();
  });
});
