import { test, expect, type Page } from '@playwright/test';

// Executive Dashboard V2 (Auftrag 170 / P14b): E2E-Vorschautest für Vergleich, zweite Reihe,
// Heatmap und Erwartungsband (§2.3 Nr. 13). Szenario ?bereich=editor_v2&vergleich=1, Testdaten.

const URL = '/dashboard-vorschau.html?bereich=editor_v2&vergleich=1';

async function openScenario(page: Page) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });
}

async function tile(page: Page, id: string) {
  const locator = page.getByTestId(`canvas-tile-${id}`);
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  return locator;
}

async function ensureInspectorOpen(page: Page) {
  if (await page.getByTestId('editor-inspector').isVisible()) return;
  const toggle = page.getByTestId('toggle-inspector-button');
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(page.getByTestId('editor-inspector')).toBeVisible();
  }
}

test.describe('Dashboard-Editor V2: Vergleich, Verknüpfung, Heatmap (P14b)', () => {
  const viewports = [
    { width: 1440, height: 900, name: 'desktop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 375, height: 667, name: 'mobile' },
  ];

  for (const vp of viewports) {
    test(`Vorschau im Viewport ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openScenario(page);

      const compare = await tile(page, 'preview_compare_1');
      await expect(compare.getByTestId('depth-compare-line')).toBeVisible();
      await expect(compare.getByTestId('depth-line-note-compare')).toContainText('Vorperiode');

      const partial = await tile(page, 'preview_compare_2');
      await expect(partial.getByTestId('depth-line-note-partial')).toContainText(
        'Vergleich unvollständig: Daten ab',
      );

      const join = await tile(page, 'preview_compare_3');
      await expect(join.getByTestId('depth-second-series-line')).toBeVisible();
      await expect(join.getByTestId('depth-line-note-second')).toContainText('rechte Achse in x');

      const bands = await tile(page, 'preview_compare_4');
      await expect(bands.getByTestId('expectation-band')).toBeVisible();
      await expect(bands.getByTestId('depth-line-note-bands')).toContainText(
        'Üblicher Bereich der letzten 8 Tage (10.–90. Perzentil)',
      );

      const phases = await tile(page, 'preview_compare_5');
      await expect(phases.getByTestId('depth-heatmap-chart')).toBeVisible();
      await expect(phases.getByRole('rowheader', { name: 'Verhandlung' })).toBeVisible();
      await expect(phases.getByTestId('heatmap-empty-cell').first()).toHaveAttribute(
        'aria-label',
        /Keine Daten/,
      );

      const weekdays = await tile(page, 'preview_compare_6');
      await expect(weekdays.getByTestId('heatmap-legend')).toContainText('Keine Daten');
      await expect(weekdays.getByTestId('heatmap-cell').first()).toHaveAttribute(
        'aria-label',
        /KW/,
      );

      const tooFew = await tile(page, 'preview_compare_7');
      await expect(tooFew.getByTestId('depth-line-note-bands')).toContainText(
        'Zu wenig Daten für ein Erwartungsband (mind. 8 Perioden)',
      );

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
    });
  }

  test('Inspector „Vergleichen“ und Heatmap-Tastatur', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openScenario(page);

    // Heatmap: Pfeiltaste wandert eine Zeile tiefer und liest die Zelle vor.
    const heatmap = await tile(page, 'preview_compare_6');
    await heatmap.getByRole('gridcell').first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(heatmap.getByTestId('chart-readout')).toContainText('Di, KW');

    const openDataTab = async (id: string) => {
      await (await tile(page, id)).click();
      await ensureInspectorOpen(page);
      await page.getByTestId('inspector-tab-daten').click();
      await expect(page.getByTestId('inspector-compare-section')).toBeVisible();
    };

    await openDataTab('preview_compare_1');
    await expect(page.getByTestId('inspector-compare-select')).toHaveValue('vorperiode');
    await page.getByTestId('inspector-compare-select').selectOption('vorjahr');
    await expect(page.getByTestId('inspector-compare-select')).toHaveValue('vorjahr');

    await openDataTab('preview_compare_6');
    await expect(page.getByTestId('inspector-compare-blocked')).toContainText('Heatmap');
    await expect(page.getByTestId('inspector-compare-select')).toBeDisabled();
  });
});
