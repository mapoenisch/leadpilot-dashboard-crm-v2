import { test, expect, type Page } from '@playwright/test';

// Auftrag 077 (Dashboard Teilauftrag 7): Ansicht → Details → Fachübersicht → zurück, Reload und
// unbekannte Kachel im echten App-Ablauf. Die persönliche Ansicht existiert nur in einem Build mit
// VITE_EXECUTIVE_DASHBOARD_V2=true (Entscheidung Marc E1, Standard aus); der reguläre CI-Build hat
// den Schalter aus. Lokal: Build mit Schalter, dann E2E_DASHBOARD_V2=true npx playwright test
// e2e/personal-dashboard.spec.ts (Nachweis im BUILD_LOG).
test.skip(
  process.env.E2E_DASHBOARD_V2 !== 'true',
  'Nur mit Build VITE_EXECUTIVE_DASHBOARD_V2=true (Auftrag 077).',
);

const TILE = '[data-testid="lazy-tile"]';

async function openDashboard(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('dashboard-heading')).toBeVisible();
  await expect(page.getByTestId('dashboard-workspace')).toHaveAttribute('aria-busy', 'false');
}

async function firstTile(page: Page) {
  const tile = page.locator(TILE).first();
  const tileId = await tile.getAttribute('data-tile-id');
  expect(tileId).toBeTruthy();
  return { tile, tileId: tileId! };
}

test('Details öffnen, Fachübersicht, Browser-Zurück und Fokus-Rückgabe', async ({ page }) => {
  await openDashboard(page);
  const { tile, tileId } = await firstTile(page);
  await tile.getByRole('button', { name: /^Details zu / }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/tiles/${encodeURIComponent(tileId)}$`));
  await expect(page.getByTestId('tile-detail-heading')).toBeFocused();
  await expect(page.getByTestId('tile-detail-facts')).toBeVisible();

  const domainLink = page.getByTestId('tile-detail-domain-link');
  await expect(domainLink).toBeVisible();
  const target = await domainLink.getAttribute('href');
  await domainLink.click();
  await expect(page).toHaveURL(new RegExp(`${target}$`));

  await page.goBack();
  await expect(page.getByTestId('tile-detail-heading')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
  const details = page
    .locator(`${TILE}[data-tile-id="${tileId}"]`)
    .getByRole('button', { name: /^Details zu / });
  await expect(details).toBeFocused();
});

test('„Zurück zum Dashboard“ per Tastatur', async ({ page }) => {
  await openDashboard(page);
  const { tile, tileId } = await firstTile(page);
  await tile.getByRole('button', { name: /^Details zu / }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tile-detail-heading')).toBeFocused();
  await page.getByRole('button', { name: 'Zurück zum Dashboard' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.locator(`${TILE}[data-tile-id="${tileId}"]`).getByRole('button', { name: /^Details zu / }),
  ).toBeFocused();
});

test('Reload und direkter Aufruf der Detailseite', async ({ page }) => {
  await openDashboard(page);
  const { tileId } = await firstTile(page);
  await page.goto(`/dashboard/tiles/${encodeURIComponent(tileId)}`, { waitUntil: 'networkidle' });
  await expect(page.getByTestId('tile-detail-heading')).toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('tile-detail-heading')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kachel-Details');
});

test('unbekannte Kachel führt verständlich zurück', async ({ page }) => {
  await page.goto('/dashboard/tiles/gibt-es-nicht', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Kachel nicht gefunden' })).toBeFocused();
  await page.getByRole('button', { name: 'Zurück zum Dashboard' }).click();
  await expect(page.getByTestId('dashboard-heading')).toBeFocused();
});

test('Bearbeitungsmodus sperrt „Details“ mit Hinweis', async ({ page }) => {
  await openDashboard(page);
  await page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
  const { tile } = await firstTile(page);
  const details = tile.getByRole('button', { name: /^Details zu / });
  await expect(details).toHaveAttribute('aria-disabled', 'true');
  await expect(tile.getByText('Erst speichern, dann Details öffnen.')).toBeVisible();
  // Playwright klickt `aria-disabled` nicht von selbst: erzwingen, um die Sperre zu prüfen.
  await details.click({ force: true });
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: 'Speichern' })).toBeVisible();
});

test('Zurück-Taste im Editor fragt bei offenen Änderungen nach', async ({ page }) => {
  await page.goto('/finance/p-and-l', { waitUntil: 'networkidle' });
  await openDashboard(page);
  await page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
  await page
    .getByRole('button', { name: /Entfernen/ })
    .first()
    .click();
  // Der Schutz ist erst nach dem Rendern des Schutzeintrags aktiv; ein Mensch drückt nie schneller.
  await expect(page.getByTestId('dashboard-workspace')).toHaveAttribute('data-back-guard', 'true');
  await page.goBack();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await dialog.getByRole('button', { name: 'Hier bleiben' }).click();
  await expect(page.getByRole('button', { name: 'Speichern' })).toBeVisible();
  await page.goBack();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwerfen und weiter' }).click();
  await expect(page).toHaveURL(/\/finance\/p-and-l$/);
});
