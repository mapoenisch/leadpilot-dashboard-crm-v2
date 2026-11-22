// Auftrag 172 (P15b §2.4 Nr. 11): Druckansicht des V2-Reports enthält Status-Texte; Kiosk druckt nicht.
import { expect, test } from '@playwright/test';

test.describe('Reportexport V2', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop-1440', 'Druckansicht nur einmal prüfen');
  });

  test('Druckansicht zeigt Schwellenwert-Status, Alarm, Kopf und Fuß als Text', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed += 1;
      };
    });
    await page.goto('/dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1', {
      waitUntil: 'networkidle',
    });
    await page.getByTestId('editor-open-report').click();
    await page.getByTestId('print-submit-btn').click();

    await page.emulateMedia({ media: 'print' });
    const view = page.getByTestId('dashboard-print-view-v2');
    await expect(view).toBeVisible();
    await expect(view.locator('[data-testid^="print-tile-threshold-"]').first()).toBeVisible();
    const texts = await view
      .locator('[data-testid^="print-tile-threshold-"]')
      .evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    expect(texts.some((t) => /^Warnung: ab /.test(t))).toBe(true);
    expect(texts.some((t) => /^Kritisch: /.test(t))).toBe(true);
    await expect(page.getByTestId('print-report-dashboard')).not.toBeEmpty();
    await expect(page.getByTestId('print-report-analysed-at')).not.toBeEmpty();
    await expect(page.getByTestId('print-report-stand')).toContainText(':');
    await expect(page.getByTestId('print-report-footer')).toContainText(
      'Vertraulich – nur für berechtigte Empfänger',
    );
    // Editor-Oberfläche wird nicht mitgedruckt
    await expect(page.getByTestId('editor-top-bar')).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed))
      .toBeGreaterThan(0);

    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });

  test('Kiosk: Druck zeigt nur den Sperrhinweis', async ({ page }) => {
    await page.goto('/dashboard-vorschau.html?bereich=kiosk&ids=preview_v2_dashboard', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('kiosk-root')).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(
      page.getByTestId('kiosk-status-bar').or(page.getByTestId('kiosk-title')).first(),
    ).toBeHidden();
    const note = await page
      .getByTestId('kiosk-root')
      .evaluate((el) => getComputedStyle(el, '::before').content);
    expect(note).toContain('Drucken ist im Kiosk-Modus deaktiviert');
  });
});
