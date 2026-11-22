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
  // Auftrag 172: Ende der Einblendung abwarten (unter Last sonst Kontrast mitten in der Animation)
  await page.waitForFunction(() =>
    document.getAnimations().every((an) => an.playState !== 'running'),
  );
  await page.waitForTimeout(300);

  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  const accepted: string[] = baseline['editor_v2_new_dialog'] ?? [];
  const fresh = blocking.filter((v) => !accepted.includes(v.id));
  if (fresh.length > 0) {
    const summary = fresh
      .map(
        (v) =>
          `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} Knoten) ${v.nodes.map((n) => n.target.join(' ') + ' ' + n.html.slice(0, 140) + ' ' + (n.any[0]?.message ?? '')).join(' | ')}`,
      )
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

  // Kachel aktivieren, damit Fokus-/Aktivierungszustand und Inspector im Scan abgedeckt sind
  const tile = page.locator('[data-testid^="canvas-tile-"]').last();
  await tile.scrollIntoViewIfNeeded();
  await tile.click();
  await page.waitForTimeout(500);

  await expectNoFreshViolations(page, 'editor_v2_time_series', 'editor_v2_time_series');
});

// Auftrag 172 (P15b §2.2 Nr. 6): Barrierefreiheits-Abnahme aller V2-Ansichten.
// Für V2-Ansichten gibt es keine Baseline mehr: jeder critical/serious-Verstoß ist ein Fehler.
const V2 = '/dashboard-vorschau.html?bereich=editor_v2';
const V2_VIEWS: Array<{
  key: string;
  url: string;
  act?: (page: import('@playwright/test').Page) => Promise<void>;
}> = [
  {
    key: 'editor_v2_inspector_schwellenwerte',
    url: `${V2}&schwellenwerte=1`,
    act: async (page) => {
      const listEdit = page.locator(
        '[data-testid^="tile-list-actions-"] [data-testid^="tile-edit-btn-"]',
      );
      if (await listEdit.first().isVisible()) {
        await listEdit.first().click(); // Telefon: Bearbeiten per Liste öffnet das Blatt
      } else {
        await page.locator('[data-testid^="canvas-tile-"]').first().click();
        if (!(await page.getByTestId('editor-inspector').isVisible())) {
          await page.getByTestId('toggle-inspector-button').click();
        }
      }
      await page.getByTestId('inspector-tab-schwellenwerte').click();
    },
  },
  {
    key: 'editor_v2_versionen',
    url: `${V2}&versionen=1`,
    act: async (page) => {
      await page.getByTestId('editor-open-versions').click();
      await page.getByTestId('revision-history-panel').waitFor();
    },
  },
  {
    key: 'editor_v2_teams',
    url: `${V2}&teams=1`,
    act: async (page) => {
      await page.getByTestId('dashboard-switcher-button').click();
    },
  },
  {
    key: 'editor_v2_alarme',
    url: `${V2}&alarme=1`,
    act: async (page) => {
      await page.getByTestId('preview-tab-alarme').click();
      await page.getByTestId('alarm-list-container').waitFor();
    },
  },
  { key: 'editor_v2_vergleich', url: `${V2}&vergleich=1` },
  {
    key: 'editor_v2_report_dialog',
    url: V2,
    act: async (page) => {
      await page.getByTestId('editor-open-report').click();
      await page.getByRole('dialog').first().waitFor();
    },
  },
  {
    key: 'kiosk_v2',
    url: '/dashboard-vorschau.html?bereich=kiosk&ids=preview_v2_dashboard',
  },
];

for (const view of V2_VIEWS) {
  test(`a11y ${view.key} — keine critical/serious-Verstöße (Auftrag 172)`, async ({ page }) => {
    await page.goto(view.url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    if (view.act) await view.act(page);
    await page.waitForTimeout(400);
    await expectNoFreshViolations(page, view.key, view.key);
  });
}

test('a11y-Baseline enthält keine V2-Ansichten (Auftrag 172 §2.2 Nr. 6)', () => {
  const v2Keys = Object.entries(baseline).filter(
    ([key, ids]) => Array.isArray(ids) && /editor_v2|vorschau|kiosk/i.test(key) && ids.length >= 0,
  );
  expect(
    v2Keys.map(([key]) => key),
    'V2-Ansichten dürfen nicht in e2e/a11y-baseline.json stehen; Verstöße beheben statt eintragen.',
  ).toEqual([]);
});
