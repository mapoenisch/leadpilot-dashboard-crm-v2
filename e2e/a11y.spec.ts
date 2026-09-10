import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseline = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'a11y-baseline.json'), 'utf8')
) as Record<string, string[]>;

// Gate G31 (Auftrag 046, Nacharbeit Runde 3): ersetzt
// scripts/auditV21LiveAccessibility.mjs durch Standard-Scan mit Delta-Ratsche
// (Prinzip wie lint/tsc-Baselines): bekannte Verstöße aus a11y-baseline.json
// werden herausgefiltert, jeder NEUE critical/serious-Verstoß lässt den Test
// fehlschlagen. Fixes der Baseline in G35.
const ROUTES = ['/dashboard', '/crm/leads', '/finance/p-and-l', '/market/overview'] as const;

for (const routePath of ROUTES) {
  test(`a11y ${routePath} — keine neuen critical/serious-Verstöße`, async ({ page }) => {
    await page.goto(routePath, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // eslint-disable-next-line no-restricted-properties
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const accepted: string[] = baseline[routePath] ?? [];
    const fresh = blocking.filter((v) => !accepted.includes(v.id));
    if (fresh.length > 0) {
      const summary = fresh
        .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} Knoten)`)
        .join('\n');
      expect(fresh.length, `${routePath}: NEUE Axe-Verstöße (critical/serious):\n${summary}`).toBe(0);
    }
    expect(fresh.length).toBe(0);
  });
}
