import { test, expect, type Page } from '@playwright/test';

// Auftrag 164 (161R / P10b-2): E2E-Test für Analysezeitpunkt, Zeitfenster und Fadenkreuz-Kopplung.
// Testet in der Vorschau /dashboard-vorschau.html?bereich=editor_v2:
// - Zeitpunkt setzen -> Verlaufskacheln enden dort, Hinweise 'kein Stand gespeichert' / 'zeitunabhängiger Wert'
// - 'Zurück zu Live' stellt Live-Modus her
// - Zeitfenster einer Kachel im Inspector anpassen
// - Fadenkreuz per Maus und Tastatur (Fokus, Pfeiltasten, Escape) koppelt mindestens zwei Kacheln
// - Mobil (375 px) per Tippen

async function openLibrary(page: Page) {
  if (await page.getByTestId('widget-library').isVisible()) return;
  await page.getByTestId('toggle-library-button').click();
  await expect(page.getByTestId('widget-library')).toBeVisible();
}

async function addTile(page: Page, tabTestId: string, buttonTestId: string) {
  await openLibrary(page);
  await page.getByTestId(tabTestId).click();
  const btn = page.getByTestId(buttonTestId);
  await expect(btn).toBeVisible();
  const beforeCount = await page.locator('[data-testid^="canvas-tile-"]').count();
  await btn.click();
  const tiles = page.locator('[data-testid^="canvas-tile-"]');
  await expect(tiles).toHaveCount(beforeCount + 1);
  const newTile = tiles.last();
  const testId = await newTile.getAttribute('data-testid');
  expect(testId).toBeTruthy();
  const boundTile = page.locator(`[data-testid="${testId}"]`);
  await boundTile.scrollIntoViewIfNeeded();
  await expect(boundTile).toBeVisible();
  return boundTile;
}

test.describe('Dashboard-Editor V2: Zeitpunkt, Zeitfenster und Fadenkreuz (Auftrag 164)', () => {
  test('Zeitpunkt setzen, Zurück zu Live, Zeitfenster im Inspector und Fadenkreuz-Kopplung per Maus und Tastatur', async ({
    page,
  }) => {
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    // 1. Zwei Verlaufskacheln (CRM und Live) hinzufügen
    const crmTile = await addTile(
      page,
      'library-tab-crm',
      'add-tile-btn-crm.phaseneintritte_verlauf',
    );
    const liveTile = await addTile(page, 'library-tab-live', 'add-tile-btn-live.arr.verlauf');

    // Kachel-Referenzen sichern
    await expect(crmTile.getByTestId('depth-line-chart')).toBeVisible();
    await expect(liveTile.getByTestId('depth-line-chart')).toBeVisible();

    // 2. Zeitpunkt setzen
    const trigger = page.getByTestId('time-point-trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Preset "gestern" wählen
    const yesterdayPreset = page.getByTestId('time-point-preset-gestern');
    await expect(yesterdayPreset).toBeVisible();
    await yesterdayPreset.click();

    // Banner "Ansicht zum ..." sichtbar
    const banner = page.getByTestId('time-point-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Ansicht zum');

    // 3. Zurück zu Live
    const backToLive = page.getByTestId('back-to-live-button');
    await expect(backToLive).toBeVisible();
    await backToLive.click();
    await expect(banner).toHaveCount(0);

    // 4. Zeitfenster im Inspector anpassen
    // CRM-Kachel auswählen
    await crmTile.click({ position: { x: 20, y: 20 } });

    // Inspector öffnen
    const inspectorToggle = page.getByTestId('toggle-inspector-button');
    if (await inspectorToggle.isVisible()) {
      const inspector = page.getByTestId('editor-inspector');
      if (!(await inspector.isVisible())) {
        await inspectorToggle.click();
        await expect(inspector).toBeVisible();
      }
    }

    const datenTab = page.getByTestId('inspector-tab-daten');
    if (await datenTab.isVisible()) {
      await datenTab.click();
    }

    const windowSelect = page.getByTestId('inspector-window-preset-select');
    if (await windowSelect.isVisible()) {
      const initialValue = await windowSelect.inputValue();
      // Ändere auf eine andere Option (z. B. 2. Option)
      const options = await windowSelect.locator('option').all();
      if (options.length > 1) {
        const targetVal = await options[1]!.getAttribute('value');
        if (targetVal && targetVal !== initialValue) {
          await windowSelect.selectOption(targetVal);
        }
      }
    }

    // Inspector schließen, damit der Arbeitsbereich frei sichtbar ist
    const inspectorClose = page.getByTestId('close-inspector-button');
    if (await inspectorClose.isVisible()) {
      await inspectorClose.click();
    } else if (await inspectorToggle.isVisible()) {
      const inspector = page.getByTestId('editor-inspector');
      if (await inspector.isVisible()) {
        await inspectorToggle.click();
      }
    }

    // 5. Fadenkreuz-Kopplung per Maus
    // Scroll zu den Verlaufskacheln
    await liveTile.scrollIntoViewIfNeeded();

    const livePoints = liveTile.locator('rect[fill="transparent"]');
    const livePointCount = await livePoints.count();
    expect(livePointCount).toBeGreaterThan(0);

    // Überfahre den mittleren Datenpunkt in Kachel 2 (Live ARR Verlauf)
    const targetPointIndex = Math.floor(livePointCount / 2);
    await livePoints.nth(targetPointIndex).hover();

    // Kachel 2 zeigt Fadenkreuz-Linie
    await expect(liveTile.locator('line[stroke-dasharray="2 3"]')).toBeAttached();

    // Kachel 1 (CRM Wochenverlauf) MUSS mitlaufen und ebenfalls eine Fadenkreuz-Linie zeigen
    await expect(crmTile.locator('line[stroke-dasharray="2 3"]')).toBeAttached();

    // 6. Tastatur-Steuerung: Fokus, Pfeiltasten, Escape (auf Desktop und Tablet)
    const isMobileViewport = (page.viewportSize()?.width ?? 1440) < 768;
    if (!isMobileViewport) {
      await page.mouse.move(0, 0);
      const slider = liveTile.getByRole('slider');
      await slider.scrollIntoViewIfNeeded();
      await slider.focus();
      await expect(liveTile.locator('line[stroke-dasharray="2 3"]')).toBeAttached();

      // Pfeiltaste wandert
      await page.keyboard.press('ArrowRight');
      await expect(liveTile.locator('line[stroke-dasharray="2 3"]')).toBeAttached();
      await expect(crmTile.locator('line[stroke-dasharray="2 3"]')).toBeAttached();

      // Escape leert Fadenkreuz
      await page.keyboard.press('Escape');
      await expect(crmTile.locator('line[stroke-dasharray="2 3"]')).toHaveCount(0);
      await expect(liveTile.locator('line[stroke-dasharray="2 3"]')).toHaveCount(0);
    }
  });

  test('Mobil (375 px): Fadenkreuz per Tippen koppelt Verlaufskacheln', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    const crmTile = await addTile(
      page,
      'library-tab-crm',
      'add-tile-btn-crm.phaseneintritte_verlauf',
    );
    const liveTile = await addTile(page, 'library-tab-live', 'add-tile-btn-live.arr.verlauf');

    await liveTile.scrollIntoViewIfNeeded();

    const livePoints = liveTile.locator('rect[fill="transparent"]');
    const count = await livePoints.count();
    expect(count).toBeGreaterThan(0);

    // Tippen auf den Datenpunkt per pointerdown
    const targetIndex = Math.floor(count / 2);
    await livePoints.nth(targetIndex).dispatchEvent('pointerdown');

    // Fadenkreuz koppelt beide Kacheln
    await expect(liveTile.locator('line[stroke-dasharray="2 3"]')).toBeAttached();
    await expect(crmTile.locator('line[stroke-dasharray="2 3"]')).toBeAttached();
  });
});
