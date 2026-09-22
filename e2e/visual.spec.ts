import { test, expect } from '@playwright/test';

// Gate G31 (Auftrag 046): ersetzt die SHA-256-Screenshot-Matrix der
// captureAuftrag0XX-Harnesses durch toHaveScreenshot mit expliziter Toleranz
// (maxDiffPixelRatio 0.02, siehe playwright.config.ts). Volle Seite, weil der
// alte Harness ebenfalls Full-Height capturte.
const ROUTES = ['/dashboard', '/crm/leads', '/finance/p-and-l', '/market/overview', '/resources/materials'];

for (const routePath of ROUTES) {
  test(`visual ${routePath}`, async ({ page }) => {
    await page.goto(routePath, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    // 067P-N3 (Step C, fail-closed): Kein Screenshot eines abgemeldeten oder
    // AUTH_REQUIRED-Zustands. Bei fehlender Sitzung scheitert der Test hier mit
    // dieser Ursache, statt eine Fehlerseite als Bilddifferenz zu melden.
    await expect(
      page.locator('[data-testid="logout-button"]'),
      'E2E-Auth fehlt: Logout-Button nicht sichtbar, kein Screenshot.',
    ).toBeVisible();
    await expect(
      page.getByText('AUTH_REQUIRED'),
      'E2E-Auth fehlt: CRM-Fehlerzustand (AUTH_REQUIRED) gerendert.',
    ).toHaveCount(0);
    if (routePath === '/crm/leads') {
      // 067P-N6-Abschluss (fail-closed Seed-Prüfung, dauerhaft): Vor Telemetrie
      // und Screenshot muss der CRM-Seed-Zustand belegt sein. Schlägt einer dieser
      // Checks fehl, ist das ein Diagnosefehler, keine Screenshot-Differenz.
      const sourceStatus = page.getByRole('status', { name: 'Status der Datenquelle' });
      await expect(sourceStatus).toContainText('Supabase CRM');
      await expect(sourceStatus).toContainText(/Status: Gesund/i);
      await expect(sourceStatus).toContainText(/Frische: Aktuell/i);
      await expect(sourceStatus).not.toContainText('SERVER_ERROR');
      await expect(page.getByText(/^1 Einträge$/i)).toBeVisible();
      // 067P-N5: Volatiler Laufzeit-Zeitstempel (Stand: …) aus dem Pixelvergleich
      // isolieren. Nur der Textknoten ab Stand: innerhalb des Datenquellenstatus
      // wird maskiert (Surface: --color-bg/--charcoal #0B211F im Dark-Theme);
      // Statuswerte, Frischeklassifizierung und Datenanzahl bleiben sichtbar.
      // Die fachliche Darstellung ist separat belegt (Sichtbarkeit + Provenance-Tests).
      const standLocator = page
        .locator('[aria-label="Status der Datenquelle"]')
        .getByText(/^Stand:/);
      await expect(
        standLocator,
        'CRM-Zeitstempel (Stand:) wird nicht gerendert.',
      ).toBeVisible();
      await expect(page).toHaveScreenshot({
        fullPage: true,
        mask: [standLocator],
        maskColor: '#0B211F',
      });
      return;
    }
    await expect(page).toHaveScreenshot({ fullPage: true });
  });
}
