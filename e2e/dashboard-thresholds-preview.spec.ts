import { test, expect } from '@playwright/test';

// Executive Dashboard V2 (Auftrag 166 / P13a):
// E2E-Vorschautest für Schwellenwerte und Alarm-Badges (§2.4 Nr. 22):
// 1. Szenario &schwellenwerte=1 öffnen, Badges und Texte prüfen.
// 2. Regel hoch_ist_schlecht mit Warnung über aktuellem Wert anlegen -> kein Badge.
// 3. Grenze unter den Wert setzen -> Badge „Warnung“.
// 4. Kritisch kleiner als Warnung eingeben -> „Übernehmen“ gesperrt mit Begründung.
// 5. Speichern, neu laden, Badge bleibt erhalten.
// 6. Leseansicht (&teams=1) prüfen -> Badges sichtbar, Bearbeitung gesperrt.

async function ensureInspectorOpen(page: import('@playwright/test').Page) {
  if (await page.getByTestId('editor-inspector').isVisible()) return;
  const toggleBtn = page.getByTestId('toggle-inspector-button');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await expect(page.getByTestId('editor-inspector')).toBeVisible();
  }
}

test.describe('Dashboard-Editor V2: Schwellenwerte Vorschau (P13a)', () => {
  test('Schwellenwerte anlegen, validieren, speichern und im Viewer ansehen', async ({ page }) => {
    page.on('pageerror', (err) => console.error('E2E BROWSER ERROR:', err.message, err.stack));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('E2E CONSOLE ERROR:', msg.text());
    });

    // 1. Vorschau mit Schwellenwert-Szenario öffnen
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    // Initial-Kacheln und Badges prüfen
    const tileWarnung = page.getByTestId('canvas-tile-preview_tile_warnung');
    await expect(tileWarnung).toBeVisible();
    await expect(tileWarnung.getByTestId('tile-threshold-badge')).toContainText('Warnung');

    const tileKritisch = page.getByTestId('canvas-tile-preview_tile_kritisch');
    await expect(tileKritisch).toBeVisible();
    await expect(tileKritisch.getByTestId('tile-threshold-badge')).toContainText('Kritisch');

    const tileBetween = page.getByTestId('canvas-tile-preview_tile_alt_between');
    await expect(tileBetween).toBeVisible();
    await expect(tileBetween.getByTestId('tile-threshold-badge')).toContainText(
      'Schwellenwert prüfen',
    );

    const tileNormal = page.getByTestId('canvas-tile-preview_tile_normal');
    await expect(tileNormal).toBeVisible();
    await expect(tileNormal.getByTestId('tile-threshold-badge')).toHaveCount(0);

    // 2. Kachel auswählen und Inspector öffnen
    await tileNormal.scrollIntoViewIfNeeded();
    await tileNormal.getByRole('heading', { name: 'ARR (Normalbereich)' }).click();
    await page.waitForTimeout(300);
    await ensureInspectorOpen(page);

    // Tab „Alarme“ öffnen
    const threshTabBtn = page.getByTestId('inspector-tab-schwellenwerte');
    await expect(threshTabBtn).toBeVisible();
    await threshTabBtn.click();

    // Schwellenwert-Tab ist sichtbar
    await expect(page.getByTestId('tab-content-schwellenwerte')).toBeVisible();

    // Warnung über dem aktuellen Wert (1.234 €) setzen: 1.500
    const warnInput = page.getByTestId('threshold-warnung-input');
    await expect(warnInput).toBeVisible();
    await warnInput.fill('1500');

    // Übernehmen klicken
    const applyBtn = page.getByTestId('threshold-apply-btn');
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    // Kachel hat weiterhin kein Badge (Wert 1.234 < 1.500 ist normal)
    await expect(tileNormal.getByTestId('tile-threshold-badge')).toHaveCount(0);

    // 3. Grenze unter den Wert setzen: 1.000
    await warnInput.fill('1000');
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    // Kachel zeigt jetzt Badge „Warnung“
    await expect(tileNormal.getByTestId('tile-threshold-badge')).toBeVisible();
    await expect(tileNormal.getByTestId('tile-threshold-badge')).toContainText('Warnung');

    // 4. Kritisch kleiner als Warnung eingeben: Kritisch = 800 (< 1000)
    const critInput = page.getByTestId('threshold-kritisch-input');
    await expect(critInput).toBeVisible();
    await critInput.fill('800');

    // „Übernehmen“ gesperrt mit Fehlermeldung
    await expect(applyBtn).toBeDisabled();
    const errorMsg = page.getByTestId('threshold-error-kritisch');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('größer');

    // Fehler beheben: Kritisch = 2.500 (> 1000)
    await critInput.fill('2500');
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    // 5. Speichern und neu laden
    const saveBtn = page.getByTestId('save-button');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(
      page.getByText('Dashboard-Entwurf erfolgreich im Speicher gesichert!'),
    ).toBeVisible({ timeout: 5000 });

    // Seite neu laden
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    // Badge „Warnung“ bleibt nach dem Neuladen erhalten
    const tileNormalAfterReload = page.getByTestId('canvas-tile-preview_tile_normal');
    await expect(tileNormalAfterReload.getByTestId('tile-threshold-badge')).toBeVisible();
    await expect(tileNormalAfterReload.getByTestId('tile-threshold-badge')).toContainText(
      'Warnung',
    );

    // 6. Leseansicht testen
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1&teams=1', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    // Badges sind in der Leseansicht sichtbar
    const viewerTileWarnung = page.getByTestId('canvas-tile-preview_tile_warnung');
    await expect(viewerTileWarnung.getByTestId('tile-threshold-badge')).toBeVisible();
    await expect(viewerTileWarnung.getByTestId('tile-threshold-badge')).toContainText('Warnung');

    // Keine Bearbeitungsknöpfe im Lesemodus
    await expect(page.getByTestId('save-button')).toHaveCount(0);
  });
});
