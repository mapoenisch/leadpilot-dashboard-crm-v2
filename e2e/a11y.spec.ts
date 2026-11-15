import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseline = JSON.parse(
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'a11y-baseline.json'),
    'utf8',
  ),
) as Record<string, string[]>;

// Gate G31 (Auftrag 046, Nacharbeit Runde 3): ersetzt
// scripts/auditV21LiveAccessibility.mjs durch Standard-Scan mit Delta-Ratsche
// (Prinzip wie lint/tsc-Baselines): bekannte Verstöße aus a11y-baseline.json
// werden herausgefiltert, jeder NEUE critical/serious-Verstoß lässt den Test
// fehlschlagen. Fixes der Baseline in G35.
const ROUTES = [
  '/dashboard',
  '/company/data-basis',
  '/crm/leads',
  '/crm/live-simulation',
  '/finance/p-and-l',
  '/market/overview',
  '/dashboard-vorschau.html?bereich=editor_v2&scenario=sections',
] as const;

for (const routePath of ROUTES) {
  test(`a11y ${routePath} — keine neuen critical/serious-Verstöße`, async ({ page }) => {
    await page.goto(routePath, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    const accepted: string[] = baseline[routePath] ?? [];
    const fresh = blocking.filter((v) => !accepted.includes(v.id));
    if (fresh.length > 0) {
      const summary = fresh
        .map((v) => {
          const nodes = v.nodes
            .map((n) => `    · ${n.target.join(' ')} — ${n.html.slice(0, 160)}`)
            .join('\n');
          return `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} Knoten)\n${nodes}`;
        })
        .join('\n');
      expect(fresh.length, `${routePath}: NEUE Axe-Verstöße (critical/serious):\n${summary}`).toBe(
        0,
      );
    }
    expect(fresh.length).toBe(0);
  });
}

// Auftrag 158 (P09b §4): Zustand mit geöffnetem Menü und Neu-Dialog
test('a11y editor_v2 mit geöffnetem Switcher-Menü — keine neuen critical/serious-Verstöße', async ({
  page,
}) => {
  await page.goto('/dashboard-vorschau.html?bereich=editor_v2', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const btn = page.getByTestId('dashboard-switcher-button');
  await btn.click();
  await page.waitForSelector('[data-testid="dashboard-switcher-menu"]');

  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  const accepted: string[] = baseline['editor_v2_switcher_menu'] ?? [];
  const fresh = blocking.filter((v) => !accepted.includes(v.id));
  if (fresh.length > 0) {
    const summary = fresh
      .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} Knoten)`)
      .join('\n');
    expect(fresh.length, `editor_v2_switcher_menu: NEUE Axe-Verstöße:\n${summary}`).toBe(0);
  }
  expect(fresh.length).toBe(0);
});

test('a11y editor_v2 mit geöffnetem Neu-Dialog — keine neuen critical/serious-Verstöße', async ({
  page,
}) => {
  await page.goto('/dashboard-vorschau.html?bereich=editor_v2', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const btn = page.getByTestId('dashboard-switcher-button');
  await btn.click();
  await page.getByTestId('new-dashboard-menu-item').click();
  await page.waitForSelector('[data-testid="new-dashboard-dialog"]');

  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  const accepted: string[] = baseline['editor_v2_new_dialog'] ?? [];
  const fresh = blocking.filter((v) => !accepted.includes(v.id));
  if (fresh.length > 0) {
    const summary = fresh
      .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} Knoten)`)
      .join('\n');
    expect(fresh.length, `editor_v2_new_dialog: NEUE Axe-Verstöße:\n${summary}`).toBe(0);
  }
  expect(fresh.length).toBe(0);
});
