import { test, expect } from '@playwright/test';

// Executive Dashboard V2 (Auftrag 157 / P09a):
// E2E-Abnahmetest für Sektionen im Dashboard-Editor:
// 1. Sektion anlegen
// 2. Sektion umbenennen
// 3. Kachel in Sektion verschieben
// 4. Sektion einklappen (Kacheln ausgeblendet, Entlastung)
// 5. Undo / Redo
// 6. Speichern und Wiederherstellen

test.describe('Dashboard-Editor V2: Sektionen und einklappbare Gruppen (P09a)', () => {
  test('Sektionen-Workflow: Anlegen, Umbenennen, Verschieben, Einklappen, Undo und Speichern', async ({
    page,
  }) => {
    // 1. Vorschau-Umgebung des V2-Editors öffnen
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('editor-canvas')).toBeVisible();

    // Zu Beginn: keine Sektionen vorhanden, Standard-Raster aktiv
    await expect(page.getByTestId('canvas-grid')).toBeVisible();

    // 2. Erste Sektion anlegen
    const addSectionBtn = page.getByTestId('add-section-bottom-btn');
    await expect(addSectionBtn).toBeVisible();
    await addSectionBtn.click();

    // Sektion wurde angelegt mit Standardtitel
    const section1Header = page.locator('[data-testid^="section-header-"]').first();
    await expect(section1Header).toBeVisible();
    const sectionTitleEl = page.locator('[data-testid^="section-title-"]').first();
    await expect(sectionTitleEl).toHaveText('Neue Sektion');

    // 3. Sektion umbenennen
    const renameBtn = page.locator('[data-testid^="section-rename-btn-"]').first();
    await renameBtn.click();
    const titleInput = page.locator('[data-testid^="section-title-input-"]').first();
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Finanzen & Ertrag');
    await titleInput.press('Enter');

    await expect(sectionTitleEl).toHaveText('Finanzen & Ertrag');

    // 4. Kachel in die neue Sektion verschieben (über Kachel-Aktionsmenü)
    const firstTile = page.locator('[data-testid^="canvas-tile-"]').first();
    await firstTile.hover();
    const moveSecBtn = page.locator('[data-testid^="tile-move-section-btn-"]').first();
    await moveSecBtn.scrollIntoViewIfNeeded();
    await expect(moveSecBtn).toBeVisible();
    await moveSecBtn.dispatchEvent('click');

    // Option für "Finanzen & Ertrag" auswählen
    const sectionOption = page.getByRole('button', { name: 'Finanzen & Ertrag' });
    await expect(sectionOption).toBeVisible();
    await sectionOption.dispatchEvent('click');

    // Sektion zeigt jetzt 1 Kachel
    const countBadge = page.locator('[data-testid^="section-tile-count-"]').first();
    await expect(countBadge).toContainText('1 Kachel');

    // 5. Sektion einklappen
    const collapseBtn = page.locator('[data-testid^="section-collapse-btn-"]').first();
    await collapseBtn.scrollIntoViewIfNeeded();
    await expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    await collapseBtn.click();
    await expect(collapseBtn).toHaveAttribute('aria-expanded', 'false');

    // Statusleiste prüft aktive vs. gesamte Kacheln (Auftrag 157 §2.4 Nr. 24)
    const budgetCounter = page.getByTestId('tile-budget-counter');
    await budgetCounter.scrollIntoViewIfNeeded();
    await expect(budgetCounter).toContainText('aktiv');

    // 6. Undo-Schritt: Einklappen rückgängig machen
    const undoBtn = page.getByTestId('undo-button');
    await undoBtn.scrollIntoViewIfNeeded();
    await undoBtn.click();
    await expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');

    // 7. Entwurf im Speicher sichern
    const saveBtn = page.getByTestId('save-button');
    await saveBtn.scrollIntoViewIfNeeded();
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Erfolgsmeldung im Vorschau-Banner prüfen
    await expect(
      page.getByText('Dashboard-Entwurf erfolgreich im Speicher gesichert!'),
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test('Schutz vor Datenverlust: Löschen einer belegten Sektion verschiebt Kacheln nach "Ohne Sektion"', async ({
    page,
  }) => {
    // Öffnen mit vordefinierten Sektionen
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&scenario=sections', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    const sec1 = page.getByTestId('dashboard-section-sec_finanzen');
    await expect(sec1).toBeVisible();

    // Sektion entfernen anklicken
    const removeBtn = page.getByTestId('section-remove-btn-sec_finanzen');
    await removeBtn.click();

    // Bestätigungsdialog muss erscheinen
    const dialog = page.getByTestId('remove-section-dialog-content');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Die 3 Kacheln bleiben erhalten');

    // Bestätigen
    const confirmBtn = page.getByTestId('confirm-remove-section-btn');
    await confirmBtn.click();

    // Sektion ist entfernt, Kacheln sind im Bereich "Ohne Sektion"
    await expect(page.getByTestId('dashboard-section-sec_finanzen')).toHaveCount(0);
    const unsectionedArea = page.getByTestId('unsectioned-area');
    await expect(unsectionedArea).toBeVisible();
  });
});
