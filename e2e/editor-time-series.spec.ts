import { test, expect, type Page } from '@playwright/test';

// Auftrag 160 (P10b-1): Server-Zeitreihen für den Dashboard-Editor.
// Testet Verlaufskacheln im Editor: Bibliothek, Hinzufügen, CRM-Historienbeginn mitten im Fenster,
// Live-Verlauf mit Lücken, Tabellenansicht, Pause und Inspector-Hinweise.

async function ensureLibraryOpen(page: Page) {
  if (await page.getByTestId('widget-library').isVisible()) return;
  await page.getByTestId('toggle-library-button').click();
  await expect(page.getByTestId('widget-library')).toBeVisible();
}

async function ensureLibraryClosed(page: Page) {
  if (await page.getByTestId('widget-library').isVisible()) {
    const closeBtn = page.getByTestId('close-library-button');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      const toggleBtn = page.getByTestId('toggle-library-button');
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click();
      }
    }
    await expect(page.getByTestId('widget-library')).toHaveCount(0);
  }
}

async function ensureInspectorOpen(page: Page) {
  if (await page.getByTestId('editor-inspector').isVisible()) return;
  const toggleBtn = page.getByTestId('toggle-inspector-button');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await expect(page.getByTestId('editor-inspector')).toBeVisible();
  }
}

async function ensureInspectorClosed(page: Page) {
  if (await page.getByTestId('editor-inspector').isVisible()) {
    const closeBtn = page.getByTestId('close-inspector-button');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      const toggleBtn = page.getByTestId('toggle-inspector-button');
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click();
      }
    }
    await expect(page.getByTestId('editor-inspector')).toHaveCount(0);
  }
}

test.describe('Dashboard-Editor V2: Zeitreihen-Kacheln (Auftrag 160 / P10b-1)', () => {
  test('Verlaufskacheln aus Bibliothek hinzufügen, Lücken und Historienbeginn darstellen', async ({
    page,
  }) => {
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    // 1. Bibliothek öffnen und prüfen
    await ensureLibraryOpen(page);
    await page.getByTestId('library-tab-crm').click();

    const crmAddBtn = page.getByTestId('add-tile-btn-crm.phaseneintritte_verlauf');
    await expect(crmAddBtn).toBeVisible();

    const crmHistory = page.getByTestId('library-history-crm.phaseneintritte_verlauf');
    await expect(crmHistory).toContainText('je Woche');
    await expect(crmHistory).toContainText('Letzte 12 Wochen');

    // 2. CRM-Verlaufskachel hinzufügen
    await crmAddBtn.click();
    const crmTileInitial = page.locator('[data-testid^="canvas-tile-"]').last();
    await crmTileInitial.scrollIntoViewIfNeeded();
    await expect(crmTileInitial).toBeVisible();
    const crmTestId = await crmTileInitial.getAttribute('data-testid');
    const crmTile = page.locator(`[data-testid="${crmTestId}"]`);

    // CRM-Kachel hat "vor Aufzeichnungsbeginn"-Zone
    await expect(crmTile.getByTestId('depth-history-zone')).toBeVisible();

    // Standzeile zeigt "Verlauf Letzte 12 Wochen"
    await expect(crmTile.getByTestId('tile-stand-line')).toContainText('Verlauf Letzte 12 Wochen');

    // 3. Live-Verlaufskachel hinzufügen
    await page.getByTestId('library-tab-live').click();
    const liveAddBtn = page.getByTestId('add-tile-btn-live.arr.verlauf');
    await expect(liveAddBtn).toBeVisible();
    await liveAddBtn.click();

    const liveTileInitial = page.locator('[data-testid^="canvas-tile-"]').last();
    await liveTileInitial.scrollIntoViewIfNeeded();
    await expect(liveTileInitial).toBeVisible();
    const liveTestId = await liveTileInitial.getAttribute('data-testid');
    const liveTile = page.locator(`[data-testid="${liveTestId}"]`);

    // Live-Kachel hat Datenpunkte
    await expect(liveTile.getByTestId('depth-line-point').first()).toBeVisible();

    // Bibliothek schließen, damit der Arbeitsbereich auf mobilen Viewports volle Breite hat
    await ensureLibraryClosed(page);

    // 4. Inspector für CRM-Kachel öffnen und prüfen
    await crmTile.scrollIntoViewIfNeeded();
    await crmTile.getByTestId('tile-stand-line').click();
    await ensureInspectorOpen(page);
    await expect(page.getByTestId('editor-inspector')).toBeVisible();

    // Daten-Tab öffnen
    const dataTabBtn = page
      .locator('[data-testid="inspector-tab-daten"], button:has-text("Daten")')
      .first();
    if (await dataTabBtn.isVisible()) {
      await dataTabBtn.click();
    }

    await expect(page.getByTestId('inspector-resolution-text')).toHaveText('je Woche');
    await expect(page.getByTestId('inspector-timeframe-text')).toHaveText('Letzte 12 Wochen');

    const pipelineHint = page.getByTestId('inspector-pipeline-hint');
    await expect(pipelineHint).toBeVisible();
    await expect(pipelineHint).toContainText('aktuelle_pipeline_des_deals');
    await expect(pipelineHint).toContainText('ON DELETE CASCADE');

    // 5. Ansicht auf Tabelle wechseln
    const darstellungTabBtn = page
      .locator('[data-testid="inspector-tab-darstellung"], button:has-text("Darstellung")')
      .first();
    if (await darstellungTabBtn.isVisible()) {
      await darstellungTabBtn.click();
    }
    const tableViewBtn = page.getByTestId('view-option-tabelle');
    if (await tableViewBtn.isVisible()) {
      await tableViewBtn.click();
      if (page.viewportSize() && page.viewportSize()!.width < 1024) {
        await ensureInspectorClosed(page);
      }
      await crmTile.scrollIntoViewIfNeeded();
      await expect(crmTile.getByTestId('tile-table')).toBeVisible();
      await expect(crmTile.getByText('vor Aufzeichnungsbeginn').first()).toBeVisible();
    }

    // 6. Pause prüfen
    const pauseButton = page.getByTestId('live-pause-button');
    await pauseButton.click();
    await expect(pauseButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('data-timestamp')).toContainText('Angehalten seit');
  });
});
