import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Gate G31 (Auftrag 046): ersetzt scripts/auditV21LiveAccessibility.mjs
// (handgebaute Checks) durch Standard-Scan. Kernrouten mit echten Pfaden
// aus src/app/routes.tsx.
const ROUTES = ['/dashboard', '/crm/leads', '/finance/p-and-l', '/market/overview'];

for (const routePath of ROUTES) {
  test(`a11y ${routePath} — keine critical/serious-Verstöße`, async ({ page }) => {
    await page.goto(routePath, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // eslint-disable-next-line no-restricted-properties
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} Knoten)`)
        .join('\n');
      expect(blocking.length, `${routePath}: Axe-Verstöße (critical/serious):\n${summary}`).toBe(0);
    }
    expect(blocking.length).toBe(0);
  });
}
