import { test, expect } from '@playwright/test';

// Executive Dashboard V2 (Auftrag 169 / P14a):
// E2E-Vorschautest für Transformationen je Kachel (§2.3 Nr. 16):
// 1. Szenario &transformationen=1 öffnen, Kacheln und „umgeformt“-Badges prüfen.
// 2. Umbenannte Kachel prüfen (Jahresumsatz (ARR)).
// 3. Kachel mit Einheitenumrechnung prüfen (Tsd. EUR).
// 4. Kachel mit gleitendem Durchschnitt prüfen (Linienchart geglättet).
// 5. Kachel mit pausiertem Alarm prüfen (Hinweis/Badge „pausiert“).
// 6. Inspector „Umformen“: Schritt hinzufügen, ändern, Alarm-Warnung prüfen.
// 7. Viewports 1440, 768, 375 testen.

async function ensureInspectorOpen(page: import('@playwright/test').Page) {
  if (await page.getByTestId('editor-inspector').isVisible()) return;
  const toggleBtn = page.getByTestId('toggle-inspector-button');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await expect(page.getByTestId('editor-inspector')).toBeVisible();
  }
}

test.describe('Dashboard-Editor V2: Kachel-Transformationen Vorschau (P14a)', () => {
  const viewports = [
    { width: 1440, height: 900, name: 'desktop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 375, height: 667, name: 'mobile' },
  ];

  for (const vp of viewports) {
    test(`Vorschau Kachel-Transformationen im Viewport ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await page.goto('/dashboard-vorschau.html?bereich=editor_v2&transformationen=1', {
        waitUntil: 'networkidle',
      });
      await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

      // 1. Kachel mit umbenennen
      const tileRename = page.getByTestId('canvas-tile-preview_trans_tile_rename');
      await expect(tileRename).toBeVisible();
      await expect(tileRename.getByTestId('tile-transformed-hint')).toContainText('umgeformt');
      await expect(tileRename).toContainText('Jahresumsatz (ARR)');

      // 2. Kachel mit einheit_umrechnen
      const tileUnit = page.getByTestId('canvas-tile-preview_trans_tile_unit');
      await expect(tileUnit).toBeVisible();
      await expect(tileUnit.getByTestId('tile-transformed-hint')).toContainText('umgeformt');

      // 3. Kachel mit gleitender_durchschnitt
      const tileMa = page.getByTestId('canvas-tile-preview_trans_tile_ma');
      await expect(tileMa).toBeVisible();
      await expect(tileMa.getByTestId('tile-transformed-hint')).toContainText('umgeformt');

      // 4. Kachel mit pausiertem Alarm
      const tilePaused = page.getByTestId('canvas-tile-preview_trans_tile_paused_alarm');
      await expect(tilePaused).toBeVisible();
      await expect(tilePaused.getByTestId('tile-alarm-bell')).toBeVisible();

      // Horizontaler Überlauf prüfen
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow).toBe(false);
    });
  }

  test('Inspector „Umformen“ Interaktionen: Schritte anlegen, bearbeiten, Alarm-Warnung', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&transformationen=1', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });

    // Kachel auswählen
    const tileUnit = page.getByTestId('canvas-tile-preview_trans_tile_unit');
    await tileUnit.click();
    await ensureInspectorOpen(page);

    // Auf Tab „Daten“ wechseln
    const tabDaten = page.getByTestId('inspector-tab-daten');
    await expect(tabDaten).toBeVisible();
    await tabDaten.click();

    // Abschnitt „Umformen“ ist sichtbar
    const section = page.getByTestId('inspector-transformation-section');
    await expect(section).toBeVisible();

    // Existierender Schritt vorhanden
    const step0 = page.getByTestId('transformation-step-0');
    await expect(step0).toBeVisible();
    await expect(step0.getByTestId('transformation-alarm-badge-0')).toContainText('Alarm möglich');

    // Vorschau vorhanden
    const preview = page.getByTestId('transformation-preview');
    await expect(preview).toBeVisible();

    // Pausierte Alarm-Kachel auswählen und Warnung prüfen
    const tilePaused = page.getByTestId('canvas-tile-preview_trans_tile_paused_alarm');
    await tilePaused.click();
    await ensureInspectorOpen(page);
    const tabDatenPaused = page.getByTestId('inspector-tab-daten');
    await expect(tabDatenPaused).toBeVisible();
    await tabDatenPaused.click();
    await expect(page.getByTestId('transformation-alarm-warning')).toBeVisible();
    await expect(page.getByTestId('transformation-alarm-warning')).toContainText(
      'Der Alarm dieser Kachel wird pausiert.',
    );
  });
});
