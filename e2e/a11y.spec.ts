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

// Auftrag 159 (P10a §2.4/§5 T8): Pause-Zustand und Statusleiste „offline“.
async function addPreviewLiveTile(page: import('@playwright/test').Page) {
  if (!(await page.getByTestId('widget-library').isVisible())) {
    await page.getByTestId('toggle-library-button').click();
  }
  await page.getByTestId('library-tab-live').click();
  await page.locator('[data-testid^="add-tile-btn-live."]').first().click();
}

async function expectNoFreshViolations(
  page: import('@playwright/test').Page,
  key: string,
  label: string,
) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  const accepted: string[] = baseline[key] ?? [];
  const fresh = blocking.filter((v) => !accepted.includes(v.id));
  if (fresh.length > 0) {
    const summary = fresh
      .map(
        (v) =>
          `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} Knoten)\n${v.nodes
            .map((n) => `    · ${n.target.join(' ')}`)
            .join('\n')}`,
      )
      .join('\n');
    expect(fresh.length, `${label}: NEUE Axe-Verstöße:\n${summary}`).toBe(0);
  }
  expect(fresh.length).toBe(0);
}

test('a11y editor_v2 im Pause-Zustand — keine neuen critical/serious-Verstöße', async ({
  page,
}) => {
  await page.goto('/dashboard-vorschau.html?bereich=editor_v2', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await addPreviewLiveTile(page);
  await page.getByTestId('live-pause-button').click();
  await expect(page.getByTestId('live-pause-button')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(500);

  await expectNoFreshViolations(page, 'editor_v2_paused', 'editor_v2_paused');
});

test('a11y editor_v2 mit Statusleiste „offline“ — keine neuen critical/serious-Verstöße', async ({
  page,
}) => {
  await page.goto('/dashboard-vorschau.html?bereich=editor_v2&live=offline', {
    waitUntil: 'networkidle',
  });
  await page.evaluate(() => document.fonts.ready);
  await addPreviewLiveTile(page);
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-connection', 'offline');
  await page.waitForTimeout(500);

  await expectNoFreshViolations(page, 'editor_v2_offline', 'editor_v2_offline');
});

// Auftrag 160 (P10b-1 §5 T8): Zeitreihen-Kachel im Editor
test('a11y editor_v2 mit Zeitreihen-Kachel — keine neuen critical/serious-Verstöße', async ({
  page,
}) => {
  await page.goto('/dashboard-vorschau.html?bereich=editor_v2', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.getByTestId('widget-library').isVisible())) {
    await page.getByTestId('toggle-library-button').click();
  }
  await page.getByTestId('library-tab-crm').click();
  await page.getByTestId('add-tile-btn-crm.phaseneintritte_verlauf').click();
  await page.waitForTimeout(500);

  await expectNoFreshViolations(page, 'editor_v2_time_series', 'editor_v2_time_series');
});

