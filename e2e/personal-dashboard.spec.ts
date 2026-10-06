import { test, expect, type Page } from '@playwright/test';
import { applyDashboardConfig } from './helpers/dashboardPreferences';

// Auftrag 077 (Dashboard Teilauftrag 7): Ansicht → Details → Fachübersicht → zurück, Reload und
// unbekannte Kachel im echten App-Ablauf. Die persönliche Ansicht existiert nur in einem Build mit
// VITE_EXECUTIVE_DASHBOARD_V2=true (Entscheidung Marc E1, Standard aus); der reguläre CI-Build hat
// den Schalter aus. Lokal: Build mit Schalter, dann E2E_DASHBOARD_V2=true npx playwright test
// e2e/personal-dashboard.spec.ts --workers=1 (Nachweis im BUILD_LOG). Braucht E2E_SUPABASE_URL,
// E2E_SUPABASE_ANON_KEY und E2E_CLEANUP_KEY wie die übrigen Specs mit Datenbankzugriff.
test.skip(
  process.env.E2E_DASHBOARD_V2 !== 'true',
  'Nur mit Build VITE_EXECUTIVE_DASHBOARD_V2=true (Auftrag 077).',
);

const TILE = '[data-testid="lazy-tile"]';

// Feste Konfiguration: Kennzahl, Kombination, Übersicht und CRM-Kachel mit Pipeline-Filter. Die
// Abläufe schreiben die Präferenz des gemeinsamen Testbenutzers, deshalb läuft die Datei seriell
// (`--workers=1` in CI und Orchestrator); danach wird der Ausgangszustand wiederhergestellt.
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
const CONFIG = {
  version: 1,
  tiles: [
    tile('e2e_umsatz', 'baseline.umsatz', 'zahl', 'klein', 'fester_stand'),
    tile('e2e_marge', 'kombination.ebitda_marge', 'zahl', 'klein', 'fester_stand'),
    tile('e2e_roadmap', 'uebersicht.roadmap', 'uebersicht', 'mittel', 'fester_stand'),
    tile('e2e_stufen', 'crm.pipeline_stufen_volumen', 'balken', 'mittel', 'dashboard'),
  ],
};

let restore: (() => Promise<void>) | null = null;
test.beforeAll(async () => {
  restore = await applyDashboardConfig(CONFIG);
});
test.afterAll(async () => {
  await restore?.();
});

const detailsOf = (page: Page, tileId: string) =>
  page.locator(`${TILE}[data-tile-id="${tileId}"]`).getByRole('button', { name: /^Details zu / });

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

test('Kombination: Formel, Operanden und derselbe Wert wie in der Kachel', async ({ page }) => {
  await openDashboard(page);
  // Lazy Loading: die Kachel erst in den Sichtbereich holen (auf 375 px liegt sie darunter).
  await page.locator(`${TILE}[data-tile-id="e2e_marge"]`).scrollIntoViewIfNeeded();
  const number = page.locator(
    `${TILE}[data-tile-id="e2e_marge"] [data-testid="tile-number"] .sr-only`,
  );
  await expect(number).toHaveText(/%/);
  const tileValue = await number.textContent();
  await detailsOf(page, 'e2e_marge').click();
  await expect(page.getByTestId('detail-combination')).toContainText('Formel:');
  await expect(page.getByTestId('detail-operands').getByRole('row')).toHaveCount(4);
  await expect(page.getByTestId('detail-combination-result')).toHaveText(tileValue!.trim());
  await expect(page.getByTestId('tile-detail-domain-link')).toBeVisible();
});

test('Übersicht: Übersichtsdetails statt Definition und Wert', async ({ page }) => {
  await openDashboard(page);
  await detailsOf(page, 'e2e_roadmap').click();
  await expect(page.getByTestId('tile-overview')).toBeVisible();
  await expect(page.getByTestId('tile-detail-definition')).toHaveCount(0);
  await expect(page.getByTestId('tile-detail-value')).toHaveCount(0);
  await expect(page.getByTestId('tile-detail-domain-link')).toHaveAttribute(
    'href',
    '/product/roadmap',
  );
});

test('CRM: angewendeter Pipeline-Filter reist hin und zurück, auch über Browser-Zurück', async ({
  page,
}) => {
  await openDashboard(page);
  const pipeline = page.getByTestId('dashboard-filters').getByLabel('Pipeline', { exact: true });
  await pipeline.fill('e2e-pipeline');
  await page.getByRole('button', { name: 'Filter anwenden' }).click();
  // Nach dem Anwenden bekommen die Kacheln darüber eine Zeile mehr; auf 375 px verrutscht der
  // Button sonst zwischen Stabilitätsprüfung und Klick (CI-Lauf 37428981698).
  await expect(page.getByRole('button', { name: 'Filter anwenden' })).toBeDisabled();
  // Die Kachel lädt erst sichtbar (Lazy Loading); erst danach steht die Pipeline im Zeitbezug.
  await detailsOf(page, 'e2e_stufen').scrollIntoViewIfNeeded();
  await expect(page.locator(`${TILE}[data-tile-id="e2e_stufen"]`)).toContainText(
    'Pipeline: e2e-pipeline',
  );
  await expect(page.getByTestId('dashboard-workspace')).toHaveAttribute('aria-busy', 'false');
  await detailsOf(page, 'e2e_stufen').click();
  await expect(page.getByTestId('tile-detail-heading')).toBeVisible();
  const filterFact = page.getByTestId('tile-detail-facts').locator('dt', { hasText: 'Filter' });
  await expect(filterFact.locator('xpath=following-sibling::dd')).toHaveText(
    'Pipeline e2e-pipeline',
  );
  await page.getByRole('button', { name: 'Zurück zum Dashboard' }).click();
  await expect(detailsOf(page, 'e2e_stufen')).toBeFocused();
  await expect(
    page.getByTestId('dashboard-filters').getByLabel('Pipeline', { exact: true }),
  ).toHaveValue('e2e-pipeline');

  await detailsOf(page, 'e2e_stufen').click();
  await expect(page.getByTestId('tile-detail-heading')).toBeFocused();
  await page.goBack();
  await expect(detailsOf(page, 'e2e_stufen')).toBeFocused();
  await expect(
    page.getByTestId('dashboard-filters').getByLabel('Pipeline', { exact: true }),
  ).toHaveValue('e2e-pipeline');
});
