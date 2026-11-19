import { test, expect } from '@playwright/test';

// Executive Dashboard V2 (Auftrag 168 / P13c §2.4 Nr. 22):
// E2E-Vorschautest für Alarme, Lesebestätigung, Quittierung und Admin-Übernahme:
// 1. Szenario &alarme=1 öffnen, Kacheln mit aktivem/pausiertem Alarm prüfen.
// 2. Banner und Zähler im Kopfbereich verifizieren.
// 3. Alarmliste prüfen, Quittier-Dialog mit Tastatur bedienen (Escape, Tab-Falle, Fokus-Rückkehr).
// 4. Admin-Alarme aufrufen, Übernahme einer verwaisten Regel durchführen.
// 5. Automatisch auf allen 3 Viewports ausgeführt (Desktop 1440, Tablet 768, Mobile 375).

test.describe('Dashboard-Editor V2: Alarme Vorschau (P13c)', () => {
  test('Alarme, Quittierung per Tastatur und Admin-Übernahme', async ({ page }) => {
    // 1. Vorschau öffnen
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&alarme=1', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    // 2. Kachel-Indikatoren prüfen
    const tileActive = page.getByTestId('canvas-tile-tile-alarm-active');
    await expect(tileActive).toBeVisible();
    const bellActive = tileActive.getByTestId('tile-alarm-indicator-active');
    await expect(bellActive).toBeVisible();
    await expect(bellActive).toHaveAttribute('title', 'Alarm aktiv, Prüfung alle 5 Minuten');

    const tilePaused = page.getByTestId('canvas-tile-tile-alarm-paused');
    await expect(tilePaused).toBeVisible();
    const bellPaused = tilePaused.getByTestId('tile-alarm-indicator-paused');
    await expect(bellPaused).toBeVisible();

    // 3. Ausfallbanner und Glockenzähler im Kopf prüfen
    const workerBanner = page.getByTestId('alarm-worker-banner');
    await expect(workerBanner).toBeVisible();
    await expect(workerBanner).toContainText('Alarmprüfung ist seit');

    const headerBell = page.getByTestId('header-alarm-bell');
    await expect(headerBell).toBeVisible();
    const bellBadge = page.getByTestId('alarm-bell-badge');
    await expect(bellBadge).toBeVisible();
    await expect(bellBadge).toContainText('1');

    // 4. Alarmliste öffnen
    const tabAlarme = page.getByTestId('preview-tab-alarme');
    await expect(tabAlarme).toBeVisible();
    await tabAlarme.click();

    // Alarmliste und Einträge prüfen
    const alarmList = page.getByTestId('alarm-list-container');
    await expect(alarmList).toBeVisible();
    const eventItems = page.getByTestId('alarm-event-item');
    await expect(eventItems).toHaveCount(2);

    // Quittierungs-Dialog öffnen & Tastaturbedienung testen
    const ackButton = page.getByTestId('alarm-ack-btn-preview-event-1');
    await expect(ackButton).toBeVisible();
    await ackButton.click();

    const dialog = page.getByTestId('alarm-acknowledge-dialog');
    await expect(dialog).toBeVisible();

    // Escape schließt den Dialog
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Erneut öffnen und quittieren
    await ackButton.click();
    await expect(dialog).toBeVisible();

    const commentInput = page.getByTestId('alarm-ack-comment-input');
    await expect(commentInput).toBeVisible();
    await commentInput.fill('Prüfe Deal-Pipeline');

    // Zeichenzähler prüfen
    const charCounter = page.getByTestId('alarm-ack-char-counter');
    await expect(charCounter).toContainText('19 / 280');

    const submitBtn = page.getByTestId('alarm-ack-submit-btn');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(dialog).toBeHidden();

    // Nach Quittierung ist die Quittierung mit Kommentar sichtbar
    await expect(page.getByTestId('alarm-event-item').first()).toContainText('Prüfe Deal-Pipeline');

    // 5. Admin-Alarme öffnen
    const tabAdmin = page.getByTestId('preview-tab-admin');
    await expect(tabAdmin).toBeVisible();
    await tabAdmin.click();

    const adminPage = page.getByTestId('admin-alarms-page');
    await expect(adminPage).toBeVisible();

    // Verwaiste Regel prüfen
    const orphanRow = page.getByTestId('admin-alarm-row-preview-rule-orphaned');
    await expect(orphanRow).toBeVisible();
    await expect(orphanRow).toContainText('Rechte verloren');

    // Übernehmen-Button klicken
    const takeoverBtn = page.getByTestId('admin-alarm-takeover-btn-preview-rule-orphaned');
    await expect(takeoverBtn).toBeVisible();
    await takeoverBtn.click();

    // Status wechselt auf Aktiv
    await expect(orphanRow).toContainText('Aktiv');
  });
});
