import { test, expect } from '@playwright/test';

// Auftrag 116 (Paket H Teil 12): Das mobile Menü per Touch bedienen.
// Ergänzt die Tastatur-/Fokus-Tests aus Auftrag 114 und den Benutzerwechsel
// aus Auftrag 115 um echte Tap-Ereignisse im Browser.
test.use({ hasTouch: true, isMobile: true });

test.describe('Mobiles Menü per Touch (Auftrag 116)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-375', 'Drawer nur auf Handybreite');
    await page.goto('/dashboard');
  });

  test('Tap öffnet das Menü, Tap auf den Hintergrund schließt und gibt den Fokus zurück', async ({
    page,
  }) => {
    const trigger = page.locator('#mobile-menu-trigger');
    await trigger.tap();

    const drawer = page.getByRole('dialog', { name: 'Hauptnavigation' });
    await expect(drawer).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Rechts neben dem Drawer (max. 280px breit) liegt nur der Hintergrund.
    await page.touchscreen.tap(350, 400);
    await expect(drawer).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('Tap auf „Menü schließen“ schließt das Menü', async ({ page }) => {
    await page.locator('#mobile-menu-trigger').tap();
    const drawer = page.getByRole('dialog', { name: 'Hauptnavigation' });
    await expect(drawer).toBeVisible();

    await drawer.getByRole('button', { name: 'Menü schließen', exact: true }).tap();
    await expect(drawer).toBeHidden();
  });

  test('Tap auf einen Navigationslink navigiert und schließt das Menü', async ({ page }) => {
    await page.locator('#mobile-menu-trigger').tap();
    const drawer = page.getByRole('dialog', { name: 'Hauptnavigation' });
    await expect(drawer).toBeVisible();

    const link = drawer.locator('a[href]:visible:not([href="/dashboard"])').first();
    const href = await link.getAttribute('href');
    await link.tap();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(drawer).toBeHidden();
  });
});
