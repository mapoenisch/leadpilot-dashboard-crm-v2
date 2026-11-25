import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Executive Dashboard V2 (Auftrag 173 / P16a §2.3 Nr. 10):
// E2E-Vorschautest „Umstellung vorbereiten“ (ohne Server, In-Memory-Dienst):
// 1. Alle fünf Ergebnisklassen sichtbar, offene Entscheidungen gezählt.
// 2. Unterschiede per Tastatur aufklappen.
// 3. Übernahme mit Bestätigungsdialog (Escape bricht ab, Fokus kehrt zurück), danach „Gleich“.
// 4. „Pilot behalten“ ersetzt die verfallene Entscheidung.
// 5. Kein horizontaler Überlauf (läuft auf 1440/768/375).
// 6. Axe: keine kritischen/schweren Befunde in hell und dunkel, auch mit aufgeklappten Unterschieden.

test.describe('Dashboard-Editor V2: Umstellung vorbereiten (P16a)', () => {
  test('Abgleich, Übernahme als neue Revision und Entscheidung', async ({ page }) => {
    await page.goto('/dashboard-vorschau.html?bereich=umstellung', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('rollout-prep-page')).toBeVisible({ timeout: 15000 });

    // 1. Klassen und Zähler
    for (const [id, label] of [
      ['u-beide', 'Beide geändert'],
      ['u-v1', 'Alter Editor geändert'],
      ['u-ohne', 'Noch keine Pilotkopie'],
      ['u-gleich', 'Gleich'],
      ['u-nurv2', 'Nur neuer Editor'],
    ] as const) {
      await expect(page.getByTestId(`rollout-class-${id}`)).toHaveText(label);
    }
    await expect(page.getByTestId('rollout-open-count')).toHaveText('2 Entscheidungen offen.');
    await expect(page.getByTestId('rollout-decision-stale-u-beide')).toBeVisible();

    // 2. Unterschiede per Tastatur
    const toggle = page.getByTestId('rollout-diff-toggle-u-v1');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('rollout-diff-u-v1')).toContainText(
      'Reihenfolge der Kacheln geändert',
    );

    // 3. Übernahme: Escape bricht ab, Fokus zurück auf den Auslöser
    const adopt = page.getByTestId('rollout-adopt-u-v1');
    await adopt.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByTestId('rollout-adopt-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('neue Pilot-Revision 2');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(adopt).toBeFocused();
    await expect(page.getByTestId('rollout-class-u-v1')).toHaveText('Alter Editor geändert');

    await adopt.click();
    await page.getByTestId('rollout-adopt-confirm').click();
    await expect(page.getByTestId('rollout-class-u-v1')).toHaveText('Gleich');
    await expect(page.getByTestId('rollout-announcement')).toContainText(
      'als Pilot-Revision 2 übernommen',
    );
    await expect(page.getByTestId('rollout-open-count')).toHaveText('1 Entscheidung offen.');

    // 4. Pilot behalten ersetzt die verfallene Entscheidung
    await page.getByTestId('rollout-keep-u-beide').click();
    await expect(page.getByTestId('rollout-decision-u-beide')).toContainText('Pilot behalten');
    await expect(page.getByTestId('rollout-decision-stale-u-beide')).toHaveCount(0);
    await expect(page.getByTestId('rollout-open-count')).toHaveText(
      'Keine offenen Entscheidungen.',
    );

    // 5. Kein horizontaler Überlauf
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // 6. Barrierefreiheit (Axe) in beiden Themes
    for (const theme of ['dark', 'light']) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      const results = await new AxeBuilder({ page })
        .include('[data-testid="rollout-prep-page"]')
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(blocking.map((v) => `${theme}: ${v.id} (${v.nodes.length})`)).toEqual([]);
    }
  });
});
