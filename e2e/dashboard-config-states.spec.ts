import { test, expect, type Page } from '@playwright/test';
import {
  applyDashboardConfig,
  forceStoredRow,
  readPreferencesRow,
} from './helpers/dashboardPreferences';

// Auftrag 121 (Paket I, Punkt 1f): Verhalten der persönlichen Ansicht bei gespeicherten Zuständen,
// die im Alltag selten sind: leere Ansicht, ungültige Konfiguration, Konfiguration aus einer neueren
// Version. Wie die anderen Dashboard-Specs nur im seriellen Lauf mit persönlicher Ansicht
// (`--workers=1`), weil die Abläufe die Präferenz des Testbenutzers schreiben; danach wird der
// Ausgangszustand wiederhergestellt. Ungültige und zukünftige Zeilen lehnt der Server über die RPC
// ab, sie werden deshalb nur lokal mit dem Aufräumschlüssel geschrieben (`forceStoredRow`).
test.skip(
  process.env.E2E_DASHBOARD_V2 !== 'true',
  'Nur im seriellen Dashboard-Lauf mit persönlicher Ansicht (Auftrag 121).',
);

const TILE = '[data-testid="lazy-tile"]';
const VALID_CONFIG = {
  version: 1,
  tiles: [
    {
      tileId: 'cfg_umsatz',
      catalogId: 'baseline.umsatz',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    },
  ],
};

async function openDashboard(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('dashboard-heading')).toBeVisible();
  await expect(page.getByTestId('dashboard-workspace')).toHaveAttribute('aria-busy', 'false');
}

test.describe('Gespeicherte Zustände der persönlichen Ansicht (Auftrag 121)', () => {
  let restore: (() => Promise<void>) | null = null;
  test.afterEach(async () => {
    await restore?.();
    restore = null;
  });

  test('1f-a leere Ansicht: Hinweis statt Kacheln, Bearbeiten bleibt möglich', async ({ page }) => {
    restore = await applyDashboardConfig({ version: 1, tiles: [] });
    await openDashboard(page);
    await expect(page.getByTestId('dashboard-empty')).toContainText(
      'Dein Dashboard enthält noch keine Kacheln.',
    );
    await expect(page.locator(TILE)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Dashboard bearbeiten' })).toBeEnabled();
  });

  test('1f-b ungültige Konfiguration: Hinweis, Standardansicht, Bearbeiten bleibt möglich', async ({
    page,
  }) => {
    restore = await applyDashboardConfig(VALID_CONFIG);
    await forceStoredRow(
      { version: 1, tiles: [{ tileId: 'kaputt', catalogId: 'gibt.es.nicht', view: 1 }] },
      1,
    );
    await openDashboard(page);
    await expect(page.getByText('Deine gespeicherte Ansicht war ungültig.')).toBeVisible();
    // Standardansicht statt leerer Fläche; die gespeicherte Kachel „kaputt“ erscheint nicht.
    await expect(page.locator(TILE).first()).toBeVisible();
    await expect(page.locator(`${TILE}[data-tile-id="kaputt"]`)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Dashboard bearbeiten' })).toBeEnabled();
  });

  test('1f-c Konfiguration aus neuerer Version: Bearbeiten gesperrt, Zeile unverändert', async ({
    page,
  }) => {
    restore = await applyDashboardConfig(VALID_CONFIG);
    await forceStoredRow(VALID_CONFIG, 99);
    const before = await readPreferencesRow();
    await openDashboard(page);
    await expect(page.getByText(/stammt aus einer neueren Version des Dashboards/)).toBeVisible();
    await expect(page.locator(TILE).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dashboard bearbeiten' })).toBeDisabled();
    // Nichts wurde überschrieben: Revision und Konfiguration wie vor dem Öffnen.
    expect(await readPreferencesRow()).toEqual(before);
  });
});
