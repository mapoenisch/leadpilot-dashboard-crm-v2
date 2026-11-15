import { test, expect, type Page } from '@playwright/test';

// Auftrag 159 (P10a): gemeinsame Zeitsteuerung, echte Pause und ehrlicher Live-Status.
// Ablauf: Editor öffnen, Pause ohne Entwurfsänderung, Live-Kachel während der Pause,
// Fortsetzen, Neuladen startet live; Statusleiste für verbunden/offline/nicht konfiguriert.

async function ensureLibraryOpen(page: Page) {
  if (await page.getByTestId('widget-library').isVisible()) return;
  await page.getByTestId('toggle-library-button').click();
  await expect(page.getByTestId('widget-library')).toBeVisible();
}

/** Fügt die erste Live-Kachel der Bibliothek hinzu. */
async function addLiveTile(page: Page) {
  await ensureLibraryOpen(page);
  await page.getByTestId('library-tab-live').click();
  const addButton = page.locator('[data-testid^="add-tile-btn-live."]').first();
  await expect(addButton).toBeVisible();
  await addButton.click();
}

/** Fügt eine beliebige Stammdaten-Kachel der Bibliothek hinzu. */
async function addBaselineTile(page: Page) {
  await ensureLibraryOpen(page);
  await page.getByTestId('library-tab-alle').click();
  const addButton = page.locator('[data-testid^="add-tile-btn-baseline."]').first();
  await expect(addButton).toBeVisible();
  await addButton.click();
}

test.describe('Dashboard-Editor V2: Zeitsteuerung und Live-Status (P10a)', () => {
  test('Pause friert die Anzeige ein, verändert den Entwurf nicht und Neuladen startet live', async ({
    page,
  }) => {
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    const pauseButton = page.getByTestId('live-pause-button');
    const connection = page.getByTestId('connection-status');

    // Ohne Live-Kachel und ohne echten Feed steht nie „Live“ in der Statusleiste.
    await expect(connection).toHaveAttribute('data-connection', 'kein_live_inhalt');
    await expect(connection).not.toHaveText('Live');
    await expect(pauseButton).toHaveAttribute('aria-pressed', 'false');
    await expect(pauseButton).toContainText('Pausieren');

    // Pause allein erzeugt keinen ungespeicherten Entwurf und keinen Undo-Schritt.
    await pauseButton.click();
    await expect(pauseButton).toHaveAttribute('aria-pressed', 'true');
    await expect(pauseButton).toContainText('Fortsetzen');
    await expect(page.getByTestId('dirty-indicator')).toHaveCount(0);
    await expect(page.getByTestId('undo-button')).toBeDisabled();
    await expect(page.getByTestId('save-button')).toBeDisabled();
    await page.getByTestId('data-timestamp').getByText(/Angehalten seit/).waitFor();

    await pauseButton.click();
    await expect(pauseButton).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('dirty-indicator')).toHaveCount(0);

    // Live-Kachel hinzufügen: der Vorschau-Store ist verbunden.
    await addLiveTile(page);
    await expect(connection).toHaveAttribute('data-connection', 'verbunden');
    await expect(connection).toContainText('Verbunden');
    await expect(page.getByTestId('dirty-indicator')).toBeVisible();

    // Während der Pause hinzugefügte Kachel wird als abweichender Stand gekennzeichnet.
    await pauseButton.click();
    await addBaselineTile(page);
    const addedTile = page.locator('[data-testid^="canvas-tile-"]').last();
    await addedTile.scrollIntoViewIfNeeded();
    await addedTile.click({ position: { x: 12, y: 12 } });
    await expect(
      page.getByTestId('tile-stand-line').filter({ hasText: 'nach Pausenbeginn geladen' }).first(),
    ).toHaveText(/nach Pausenbeginn geladen/);
    await expect(page.getByTestId('data-timestamp')).toContainText('Angehalten seit');

    // Fortsetzen: konsistenter aktueller Stand, Kennzeichnung verschwindet.
    await pauseButton.click();
    await expect(pauseButton).toHaveAttribute('aria-pressed', 'false');
    await expect(
      page.getByTestId('tile-stand-line').filter({ hasText: 'nach Pausenbeginn geladen' }),
    ).toHaveCount(0);
    await expect(connection).toHaveAttribute('data-connection', 'verbunden');

    // Neuladen startet wieder live.
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('live-pause-button')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Statusleiste unterscheidet offline von nicht konfiguriert', async ({ page }) => {
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&live=offline', {
      waitUntil: 'networkidle',
    });
    await addLiveTile(page);
    await expect(page.getByTestId('connection-status')).toHaveAttribute(
      'data-connection',
      'offline',
    );
    await expect(page.getByTestId('connection-status')).toContainText('Getrennt');

    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&live=unconfigured', {
      waitUntil: 'networkidle',
    });
    await addLiveTile(page);
    await expect(page.getByTestId('connection-status')).toHaveAttribute(
      'data-connection',
      'nicht_konfiguriert',
    );
    await expect(page.getByTestId('connection-status')).toContainText('Nicht konfiguriert');
    await expect(page.getByTestId('editor-status-bar')).not.toContainText(/\bLive\b/);
  });

  test('Pause-Knopf ist per Tastatur bedienbar', async ({ page }) => {
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2', { waitUntil: 'networkidle' });
    const pauseButton = page.getByTestId('live-pause-button');
    await pauseButton.focus();
    await page.keyboard.press('Enter');
    await expect(pauseButton).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(pauseButton).toHaveAttribute('aria-pressed', 'false');
  });
});
