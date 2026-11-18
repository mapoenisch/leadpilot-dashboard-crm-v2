import { test, expect } from '@playwright/test';

// Executive Dashboard V2 (Auftrag 163 / P11b):
// E2E-Vorschautest für Team-Freigaben (§2.6 Nr. 31):
// 1. Gruppen im Switcher (Persönlich vs. Team-Dashboards)
// 2. Öffnen des Nur-Lesen-Dashboards (Hinweisbalken, keine Bearbeitung)
// 3. Persönliche Kopie anlegen
// 4. Rechteentzug-Szenario (&teams=entzogen) mit Sicherung des Entwurfs

test.describe('Dashboard-Editor V2: Team-Freigaben Vorschau (P11b)', () => {
  test('Gruppen im Switcher, Leseansicht, persönliche Kopie und Rechteentzug', async ({
    page,
  }) => {
    // 1. Vorschau mit aktivierten Team-Dashboards öffnen
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&teams=1', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });
    const switcherBtn = page.getByTestId('dashboard-switcher-button');
    await expect(switcherBtn).toBeVisible();

    // 2. Switcher öffnen und Gruppen prüfen
    await switcherBtn.click();
    const menu = page.getByTestId('dashboard-switcher-menu');
    await expect(menu).toBeVisible();

    // Persönliche Gruppe
    await expect(page.getByText('Persönlich')).toBeVisible();
    await expect(page.getByTestId('dashboard-item-preview_v2_dashboard')).toBeVisible();

    // Team-Dashboards sichtbar
    await expect(page.getByTestId('dashboard-item-preview_team_dash_write')).toBeVisible();
    const readItem = page.getByTestId('dashboard-item-preview_team_dash_read');
    await expect(readItem).toBeVisible();

    // Nur-Lesen-Badge beim Read-Only-Dashboard im Menü
    const readOnlyBadge = readItem.getByTestId('readonly-badge');
    await expect(readOnlyBadge).toBeVisible();
    await expect(readOnlyBadge).toHaveText('Nur lesen');

    // 3. Nur-Lesen-Dashboard öffnen
    await readItem.click();
    await expect(menu).not.toBeVisible();

    // Switcher-Button zeigt Team-Badge
    await expect(switcherBtn).toContainText('Team: Management');
    await expect(switcherBtn).toContainText('Management Übersicht');

    // Hinweisbalken sichtbar
    const notice = page.getByTestId('readonly-notice-banner');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Nur Lesen');

    // Im Lesemodus sind Bearbeitungselemente gesperrt bzw. nicht sichtbar
    await expect(page.getByTestId('title-display')).toBeVisible();
    await expect(page.getByTestId('title-button')).not.toBeVisible();
    await expect(page.getByTestId('toggle-library-button')).not.toBeVisible();
    await expect(page.getByTestId('save-button')).not.toBeVisible();

    // 4. Persönliche Kopie über Hinweisbalken anlegen
    const copyBtn = page.getByTestId('copy-as-personal-button');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Jetzt ist die persönliche Kopie aktiv und editierbar
    await expect(notice).not.toBeVisible();
    await expect(switcherBtn).toContainText('Persönlich');
    await expect(switcherBtn).toContainText('(Kopie)');
    await expect(page.getByTestId('title-button')).toBeVisible();
    await expect(page.getByTestId('save-button')).toBeVisible();
  });

  test('Rechteentzug-Szenario (&teams=entzogen) schützt Entwurf als persönliche Kopie', async ({
    page,
  }) => {
    // Vorschau mit simuliertem Rechteentzug öffnen
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&teams=entzogen', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    const switcherBtn = page.getByTestId('dashboard-switcher-button');
    await expect(switcherBtn).toContainText('Team Nord Vertrieb');

    // Globalen Zeitraum ändern, um den Entwurf auf "dirty" zu setzen
    const timeframeSelect = page.getByTestId('global-timeframe-select');
    await timeframeSelect.selectOption('letzte_7_tage');
    await expect(page.getByTestId('dirty-indicator')).toBeVisible();

    // Speichern versuchen
    const saveBtn = page.getByTestId('save-button');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Dialog "Bearbeitungsrechte entzogen" erscheint (§2.1 Nr. 7)
    const revokedDialog = page.getByTestId('team-access-revoked-dialog');
    await expect(revokedDialog).toBeVisible();

    // Klick auf "Entwurf als persönliche Kopie sichern"
    const saveCopyBtn = page.getByTestId('team-revoked-save-copy-button');
    await expect(saveCopyBtn).toBeVisible();
    await saveCopyBtn.click();

    // Dialog schließt, Dashboard wurde als persönliche Kopie übernommen inkl. aktuellem Entwurf
    await expect(revokedDialog).not.toBeVisible();
    await expect(switcherBtn).toContainText('Persönlich');
    await expect(switcherBtn).toContainText('(Persönliche Kopie)');
    await expect(timeframeSelect).toHaveValue('letzte_7_tage');
  });
});
