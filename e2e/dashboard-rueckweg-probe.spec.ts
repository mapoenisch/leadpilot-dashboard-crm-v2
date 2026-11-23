import { test, expect, type Page } from '@playwright/test';
import {
  applyDashboardConfig,
  passwordSession,
  type Session,
} from './helpers/dashboardPreferences';

// Executive Dashboard V2 (Auftrag 173 / P16a §2.2 Nr. 9): Rückweg-Probe mit lokalem Supabase.
// 1. Alter Editor (V1) hat einen bekannten Stand.
// 2. Neuer Editor (V2) wird für die Sitzung aktiviert, die Pilotkopie wird geändert.
// 3. Schalter zurück: V1 zeigt unverändert seinen gesicherten Stand (getrennter Speicherpfad).
// 4. V2-Revisionen bleiben erhalten; erneutes Aktivieren zeigt die Änderung (nichts verloren).
// Der sichtbare Rückweg-Hinweis im alten Editor ist Teil von Auftrag 174 (T4).

test.use({ storageState: { cookies: [], origins: [] } });

const MANAGER_EMAIL = process.env.E2E_AUTH_EMAIL_MANAGER || 'manager-a@e2e.local';
const PASSWORD = process.env.E2E_AUTH_PASSWORD || 'TestPassword123!';

const V1_CONFIG = {
  version: 1,
  tiles: [
    {
      tileId: 'rw-1',
      catalogId: 'baseline.arr',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    },
    {
      tileId: 'rw-2',
      catalogId: 'baseline.umsatz',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    },
  ],
};

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
  return (await response.json()) as T;
}

/** Schaltet den Editor für die Sitzung um; `active` legt fest, welches V2-Dashboard sich öffnet. */
async function setEditor(page: Page, v2: boolean, active?: { key: string; id: string }) {
  await page.evaluate(
    ([on, a]) => {
      window.sessionStorage.setItem('lp_dashboard_editor_v2', String(on));
      if (a) window.sessionStorage.setItem(a.key, a.id);
    },
    [v2, active ?? null] as const,
  );
  await page.goto('/dashboard');
}

test.describe('Dashboard-Editor V2: Rückweg-Probe (P16a)', () => {
  test('V2 aktivieren, ändern, zurückschalten, erneut aktivieren – nichts geht verloren', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const s = await passwordSession(MANAGER_EMAIL, PASSWORD);
    const restoreV1 = await applyDashboardConfig(V1_CONFIG, s);
    let restoreV2: (() => Promise<void>) | null = null;
    try {
      await page.goto('/login');
      await page.fill('#login-email', MANAGER_EMAIL);
      await page.fill('#login-password', PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/login'));

      // 1. Alter Editor zeigt seinen Stand
      await setEditor(page, false);
      await expect(page.getByTestId('dashboard-workspace')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('dashboard-tile')).toHaveCount(2);

      // 2. Neuer Editor: Pilotkopie öffnen und ändern
      await setEditor(page, true);
      await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 20_000 });
      const [copy] = await rest<
        { id: string; revision: number; title: string; config: Record<string, unknown> }[]
      >(
        s,
        '/rest/v1/dashboards?select=id,revision,title,config&scope=eq.personal&order=created_at.asc&limit=1',
      );
      expect(copy).toBeDefined();
      // Aus früheren Specs kann der Nutzer weitere persönliche Dashboards haben; geöffnet wird
      // sonst das zuletzt gewählte. Die Probe bindet den Editor an die V1-Kopie.
      const [membership] = await rest<{ organization_id: string }[]>(
        s,
        `/rest/v1/organization_members?select=organization_id&user_id=eq.${s.userId}&status=eq.active&limit=1`,
      );
      const active = {
        key: `leadpilot:active_dashboard_v2_id:${membership.organization_id}:${s.userId}`,
        id: copy.id,
      };
      const probeTitle = `Rückweg-Probe ${Date.now()}`;
      const [saved] = await rest<{ revision: number }[]>(s, '/rest/v1/rpc/save_dashboard_v2', {
        method: 'POST',
        body: JSON.stringify({
          p_dashboard_id: copy.id,
          p_expected_revision: copy.revision,
          p_title: probeTitle,
          p_config: { ...copy.config, title: probeTitle },
          p_change_summary: 'Rückweg-Probe 173',
        }),
      });
      restoreV2 = async () => {
        await rest(s, '/rest/v1/rpc/save_dashboard_v2', {
          method: 'POST',
          body: JSON.stringify({
            p_dashboard_id: copy.id,
            p_expected_revision: saved.revision,
            p_title: copy.title,
            p_config: copy.config,
            p_change_summary: 'Rückweg-Probe 173 zurückgesetzt',
          }),
        });
      };
      await setEditor(page, true, active);
      await expect(page.getByTestId('dashboard-editor-shell-v2')).toContainText(probeTitle, {
        timeout: 20_000,
      });

      // 3. Schalter zurück: V1 unverändert, keine V2-Änderung sichtbar
      await setEditor(page, false);
      await expect(page.getByTestId('dashboard-workspace')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('dashboard-tile')).toHaveCount(2);
      await expect(page.getByTestId('dashboard-workspace')).not.toContainText(probeTitle);
      const [v1Row] = await rest<{ config: unknown }[]>(
        s,
        '/rest/v1/executive_dashboard_preferences?select=config',
      );
      expect(v1Row.config).toEqual(V1_CONFIG);

      // 4. V2-Revisionen bleiben, erneutes Aktivieren zeigt die Änderung
      const revisions = await rest<{ revision: number; change_summary: string | null }[]>(
        s,
        '/rest/v1/rpc/get_dashboard_v2_revisions',
        { method: 'POST', body: JSON.stringify({ p_dashboard_id: copy.id }) },
      );
      expect(revisions.some((r) => r.change_summary === 'Rückweg-Probe 173')).toBe(true);
      await setEditor(page, true, active);
      await expect(page.getByTestId('dashboard-editor-shell-v2')).toContainText(probeTitle, {
        timeout: 20_000,
      });
    } finally {
      if (restoreV2) await restoreV2();
      await restoreV1(s);
    }
  });
});
