import { test, expect } from '@playwright/test';
import { applyDashboardConfig, readPreferencesRow } from './helpers/dashboardPreferences';

// Auftrag 079, Rollout (Entscheidung Marc E2): Die persönliche Ansicht ist Standard; nur ein Build
// mit VITE_EXECUTIVE_DASHBOARD_V2=false schaltet zurück auf die bisherige Ansicht. Nachweis der
// Rückschaltung: bisherige Ansicht unter /dashboard, Detailroute unbekannt, gespeicherte
// persönliche Konfiguration unverändert (gleiche Revision, gleicher Inhalt). Dass die neue Ansicht
// genau diese Zeile wieder anzeigt, belegen personal-dashboard*.spec.ts im Standard-Build.
// Läuft nur mit dem Rückschalt-Build (CI-Schritt bzw. Orchestrator setzen E2E_DASHBOARD_ROLLBACK).
test.skip(
  process.env.E2E_DASHBOARD_ROLLBACK !== 'true',
  'Nur mit Build VITE_EXECUTIVE_DASHBOARD_V2=false (Auftrag 079).',
);

const CONFIG = {
  version: 1,
  tiles: [
    {
      tileId: 'rollback_umsatz',
      catalogId: 'baseline.umsatz',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    },
  ],
};

let restore: (() => Promise<void>) | null = null;
test.beforeAll(async () => {
  restore = await applyDashboardConfig(CONFIG);
});
test.afterAll(async () => {
  await restore?.();
});

test('Rückschaltung zeigt die bisherige Ansicht und lässt die gespeicherte Konfiguration unberührt', async ({
  page,
}) => {
  const before = await readPreferencesRow();
  expect(before?.config).toEqual(CONFIG);

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Executive Dashboard' })).toBeVisible();
  await expect(page.getByTestId('dashboard-heading')).toHaveCount(0);
  await expect(page.locator('[data-testid="lazy-tile"]')).toHaveCount(0);

  await page.goto('/dashboard/tiles/rollback_umsatz', { waitUntil: 'networkidle' });
  await expect(page.locator('main')).toContainText('Seite nicht gefunden');

  expect(await readPreferencesRow()).toEqual(before);
});
