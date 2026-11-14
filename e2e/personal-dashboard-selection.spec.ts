import { test, expect } from '@playwright/test';

// Executive Dashboard V2 (Auftrag 158 / P09b):
// E2E-Abnahmetest für Dashboard-Auswahl und Vorlagen:
// 1. Auflisten vorhandener Dashboards im Switcher-Menü
// 2. Anlegen aus Vorlage (Vertrieb & Pipeline)
// 3. Wechseln mit ungespeichertem Entwurf (Navigationsschutz)
// 4. Duplizieren eines Dashboards
// 5. Löschen eines Dashboards mit automatischer Aktivierung des Nachfolgers

test.describe('Dashboard-Editor V2: Dashboard-Auswahl und Vorlagen (P09b)', () => {
  test('Auswahl-Workflow: Auflisten, Vorlage anlegen, Schutz bei Entwurf, Duplizieren und Löschen', async ({
    page,
  }) => {
    // 1. Vorschau-Umgebung des V2-Editors öffnen
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('dashboard-switcher-button')).toBeVisible();

    // Zu Beginn: Scope-Badge "Persönlich" und aktives Dashboard
    const switcherBtn = page.getByTestId('dashboard-switcher-button');
    await expect(switcherBtn).toContainText('Persönlich');
    await expect(switcherBtn).toContainText('Executive Dashboard (V2 Beta)');

    // 2. Switcher öffnen und Liste der Dashboards prüfen
    await switcherBtn.click();
    const menu = page.getByTestId('dashboard-switcher-menu');
    await expect(menu).toBeVisible();

    // 3 vorhandene Dashboards sichtbar
    await expect(page.getByTestId('dashboard-item-preview_v2_dashboard')).toBeVisible();
    await expect(page.getByTestId('dashboard-item-preview_sales_dashboard')).toBeVisible();
    await expect(page.getByTestId('dashboard-item-preview_finance_dashboard')).toBeVisible();

    // Aktives Dashboard hat "Geöffnet"-Badge
    const openedBadge = page.getByTestId('current-dashboard-badge');
    await expect(openedBadge).toBeVisible();

    // 3. Neues Dashboard aus Vorlage "Vertrieb & Pipeline" anlegen
    const newMenuItem = page.getByTestId('new-dashboard-menu-item');
    await expect(newMenuItem).toBeVisible();
    await newMenuItem.click();

    // Neu-Dialog öffnet sich
    const newDialog = page.getByTestId('new-dashboard-dialog');
    await expect(newDialog).toBeVisible();

    // Vorlage "sales" wählen
    const salesCard = page.getByTestId('template-card-sales');
    await expect(salesCard).toBeVisible();
    await salesCard.click();

    // Anlegen bestätigen
    const createBtn = page.getByTestId('create-dashboard-submit-button');
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // Dialog schließt, neues Dashboard ist aktiv
    await expect(newDialog).not.toBeVisible();
    await expect(switcherBtn).toContainText('Vertrieb & Pipeline');

    // 4. Wechseln mit ungespeichertem Entwurf (Navigationsschutz)
    // Globalen Zeitraum ändern, um den Entwurf auf "dirty" zu setzen
    const timeframeSelect = page.getByTestId('global-timeframe-select');
    await timeframeSelect.selectOption('letzte_7_tage');
    await expect(page.getByTestId('dirty-indicator')).toBeVisible();

    // Switcher öffnen und zu einem anderen Dashboard wechseln wollen
    await switcherBtn.click();
    await page.getByTestId('dashboard-item-preview_finance_dashboard').click();

    // UnsavedChangesDialog erscheint
    const unsavedDialog = page.getByRole('dialog', { name: /ungespeicherte änderungen/i });
    await expect(unsavedDialog).toBeVisible();

    // "Verwerfen und weiter" anklicken
    const discardBtn = page.getByRole('button', { name: /verwerfen und weiter/i });
    await discardBtn.click();
    await expect(unsavedDialog).not.toBeVisible();

    // Jetzt ist "Finanzen & Unit Economics" aktiv
    await expect(switcherBtn).toContainText('Finanzen & Unit Economics');

    // 5. Dashboard duplizieren
    await switcherBtn.click();
    const dupMenuItem = page.getByTestId('duplicate-dashboard-menu-item');
    await expect(dupMenuItem).toBeVisible();
    await dupMenuItem.click();

    // Duplizieren-Dialog öffnet sich
    const dupDialog = page.getByTestId('duplicate-dashboard-dialog');
    await expect(dupDialog).toBeVisible();

    const dupSubmitBtn = page.getByTestId('duplicate-submit-button');
    await expect(dupSubmitBtn).toBeEnabled();
    await dupSubmitBtn.click();

    await expect(dupDialog).not.toBeVisible();
    // Das duplizierte Dashboard ist aktiv
    await expect(switcherBtn).toContainText('Finanzen & Unit Economics (Kopie)');

    // 6. Dashboard löschen
    await switcherBtn.click();
    const deleteMenuItem = page.getByTestId('delete-dashboard-menu-item');
    await expect(deleteMenuItem).toBeVisible();
    await deleteMenuItem.click();

    // Lösch-Bestätigungsdialog öffnet sich
    const deleteDialog = page.getByTestId('delete-dashboard-dialog');
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog).toContainText('wirklich löschen?');

    const confirmDeleteBtn = page.getByTestId('delete-dashboard-confirm-button');
    await expect(confirmDeleteBtn).toBeVisible();
    await confirmDeleteBtn.click();

    await expect(deleteDialog).not.toBeVisible();

    // Nach dem Löschen wurde automatisch das nächste Dashboard aktiviert
    await expect(switcherBtn).not.toContainText('Finanzen & Unit Economics (Kopie)');
  });
});
