import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Executive Dashboard V2 (Auftrag 165 / P12):
// E2E-Vorschautest für Versionshistorie, Vergleich, Wiederherstellen und Import/Export (§2.5 Nr. 27):
// 1. Versionen öffnen über Kopfleiste (data-testid="editor-open-versions")
// 2. Zwei Revisionen vergleichen (Revision 2 und 4) mit sichtbarer Zusammenfassung
// 3. Revision 2 wiederherstellen -> neue Revision 5 oben, alte Revisionen weiter sichtbar
// 4. Export herunterladen und dieselbe Datei importieren -> neues Dashboard in der Auswahl
// 5. Manipulierte Datei (unbekannte Katalog-ID) wird mit deutschem Hinweis abgelehnt

test.describe('Dashboard-Editor V2: Versionshistorie & Austausch Vorschau (P12)', () => {
  test('Versionen vergleichen, wiederherstellen, exportieren und importieren', async ({ page }) => {
    // 1. Vorschau mit Revisionsszenario öffnen
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&versionen=1', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    // 2. Versionsbereich über Kopfleiste öffnen
    const versionsBtn = page.getByTestId('editor-open-versions');
    await expect(versionsBtn).toBeVisible();
    await versionsBtn.click();

    const panel = page.getByTestId('revision-history-panel');
    await expect(panel).toBeVisible();

    // 4 Revisionen müssen sichtbar sein, Revision 4 ist aktuell
    await expect(page.getByTestId('revision-item-4')).toBeVisible();
    await expect(page.getByTestId('revision-item-3')).toBeVisible();
    await expect(page.getByTestId('revision-item-2')).toBeVisible();
    await expect(page.getByTestId('revision-item-1')).toBeVisible();

    const currentBadge = page.getByTestId('revision-item-4').getByTestId('current-revision-badge');
    await expect(currentBadge).toBeVisible();

    // 3. Zwei Versionen vergleichen (Revision 2 & 4)
    const selectModeBtn = page.getByTestId('toggle-select-mode-button');
    await expect(selectModeBtn).toBeVisible();
    await selectModeBtn.click();

    // Zwei Einträge anklicken
    await page.getByTestId('revision-item-2').click();
    await page.getByTestId('revision-item-4').click();

    const compareBtn = page.getByTestId('compare-selected-button');
    await expect(compareBtn).toBeEnabled();
    await compareBtn.click();

    // Diff-Ansicht prüfen
    const diffView = page.getByTestId('revision-diff-view');
    await expect(diffView).toBeVisible();
    const summary = page.getByTestId('diff-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Sektion');

    // Zurück zur Liste
    const backBtn = page.getByTestId('diff-back-button');
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await expect(diffView).not.toBeVisible();

    // 4. Revision 2 wiederherstellen
    const restoreRev2Btn = page.getByTestId('restore-revision-2');
    await expect(restoreRev2Btn).toBeVisible();
    await restoreRev2Btn.click();

    // Wiederherstellen-Dialog erscheint
    const restoreDialog = page.getByTestId('restore-revision-dialog');
    await expect(restoreDialog).toBeVisible();
    await expect(restoreDialog).toContainText('Revision 2 wird als neue Version 5 gespeichert');

    // Bestätigen
    const confirmRestoreBtn = page.getByTestId('confirm-restore-button');
    await expect(confirmRestoreBtn).toBeVisible();
    await confirmRestoreBtn.click();

    // Dialog schließt, Panel schließt nach erfolgreicher Wiederherstellung
    await expect(restoreDialog).not.toBeVisible();

    // Panel erneut öffnen und prüfen: Revision 5 ist jetzt oben und aktuell
    await versionsBtn.click();
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('revision-item-5')).toBeVisible();
    await expect(
      page.getByTestId('revision-item-5').getByTestId('current-revision-badge'),
    ).toBeVisible();
    // Ältere Revisionen weiter vorhanden
    await expect(page.getByTestId('revision-item-4')).toBeVisible();
    await expect(page.getByTestId('revision-item-2')).toBeVisible();

    // 5. Export herunterladen
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-current-button').click(),
    ]);

    const tempDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const exportedFilePath = path.join(tempDir, `test-export-${Date.now()}.json`);
    await download.saveAs(exportedFilePath);

    const exportedContent = fs.readFileSync(exportedFilePath, 'utf-8');
    const parsedExport = JSON.parse(exportedContent);
    expect(parsedExport.format).toBe('leadpilot-dashboard');
    expect(parsedExport.formatVersion).toBe(1);
    expect(parsedExport.dashboard).toBeDefined();

    // Panel schließen
    await page.getByTestId('close-versions-panel').click();
    await expect(panel).not.toBeVisible();

    // 6. Dieselbe Datei importieren
    const switcherBtn = page.getByTestId('dashboard-switcher-button');
    await switcherBtn.click();

    const importMenuItem = page.getByTestId('import-dashboard-menu-item');
    await expect(importMenuItem).toBeVisible();
    await importMenuItem.click();

    const importDialog = page.getByTestId('import-dashboard-dialog');
    await expect(importDialog).toBeVisible();

    // Datei an file input übergeben
    await page.getByTestId('import-file-input').setInputFiles(exportedFilePath);

    // Vorschau-Details müssen erscheinen
    await expect(page.getByTestId('import-preview-details')).toBeVisible();

    // Titel anpassen
    const importedTitle = 'Importiertes Test-Dashboard';
    await page.getByTestId('import-title-input').fill(importedTitle);

    // Importieren bestätigen
    const confirmImportBtn = page.getByTestId('confirm-import-button');
    await expect(confirmImportBtn).toBeEnabled();
    await confirmImportBtn.click();

    // Dialog schließt und neues Dashboard ist aktiv
    await expect(importDialog).not.toBeVisible();
    await expect(switcherBtn).toContainText(importedTitle);

    // 7. Manipulierte Datei (unbekannte Katalog-ID) ablehnen
    await switcherBtn.click();
    await importMenuItem.click();
    await expect(importDialog).toBeVisible();

    const manipulatedData = {
      format: 'leadpilot-dashboard',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      sourceRevision: 1,
      dashboard: {
        title: 'Manipuliertes Dashboard',
        globalTimeframe: 'dieses_jahr',
        tiles: [
          {
            id: 'fake_tile_1',
            catalogId: 'unbekannte.nicht_existente.kpi',
            title: 'Fake Tile',
            presentation: 'zahl',
            size: 'klein',
            layouts: {
              desktop: { x: 0, y: 0, w: 3, h: 2 },
            },
          },
        ],
      },
    };

    const invalidFilePath = path.join(tempDir, `test-invalid-${Date.now()}.json`);
    fs.writeFileSync(invalidFilePath, JSON.stringify(manipulatedData, null, 2), 'utf-8');

    await page.getByTestId('import-file-input').setInputFiles(invalidFilePath);

    // Fehlermeldung muss sichtbar sein
    const errorBanner = page.getByTestId('import-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('nicht gibt');
    await expect(page.getByTestId('confirm-import-button')).toBeDisabled();

    // Dialog schließen
    await page.getByTestId('close-import-dialog').click();
    await expect(importDialog).not.toBeVisible();

    // Aufräumen lokaler Testdateien
    try {
      fs.unlinkSync(exportedFilePath);
      fs.unlinkSync(invalidFilePath);
    } catch {
      // Ignoriere Dateilöschfehler
    }
  });
});
