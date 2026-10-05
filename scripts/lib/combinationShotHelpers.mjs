// Auftrag 076: Ablauf- und Höhenprüfung der Kombinationskacheln, ausgelagert wegen der
// Dateigrenze von 400 Zeilen. `ctx` bringt Adressen, Breiten und Hilfsfunktionen des Hauptskripts.
import { measure } from './dashboardShotHelpers.mjs';

const COMBO_IDS = ['kombi_marge', 'kombi_cac', 'kombi_growth'];

/** Höchstbelegung (24 Kacheln, drei Kombinationen): Laden → bereit/nicht berechenbar, gleiche Höhe. */
export async function combinationHeightRows(browser, ctx) {
  const rows = [];
  for (const viewport of ctx.WIDTHS) {
    const ready = await measure(ctx, browser, viewport, { query: '&kacheln=24', scroll: true });
    const loading = await measure(ctx, browser, viewport, {
      stubObserver: true,
      query: '&kacheln=24',
      scroll: false,
    });
    const ids = Object.keys(ready.tiles);
    rows.push({
      width: viewport.width,
      tileCount: ids.length,
      combos: COMBO_IDS.map((id) => ({
        id,
        loading: loading.tiles[id],
        final: ready.tiles[id],
      })),
      finalStates: [...new Set(ready.states)].sort(),
      loadingAll: loading.states.every((state) => state === 'laden'),
      diff: ids.filter((id) => ready.tiles[id] !== loading.tiles[id]),
      gridLoading: loading.grid,
      gridReady: ready.grid,
    });
  }
  return rows;
}

const statusText = async (page) =>
  ((await page.getByTestId('combination-status').textContent()) ?? '').trim();
const focusedName = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el?.closest('label')?.textContent?.trim() ?? el?.textContent?.trim() ?? '';
  });

/** Wählt eine Option per Tastatur: fokussieren, Leertaste (Radio) bzw. Pfeil in der Gruppe. */
async function pressOn(page, locator, key) {
  await locator.focus();
  await page.keyboard.press(key);
  await page.waitForTimeout(80);
}

/**
 * Tastaturablauf im Konfigurator: erste Kennzahl, gesperrter Partner sichtbar, Partner wählen,
 * Wechsel der ersten Kennzahl verwirft, erneut wählen, hinzufügen; dann die nicht berechenbare
 * Kombination (Testdaten: Nenner 0) und Speichern. `step(name)` misst und fotografiert.
 */
export async function combinationFlow(page, step) {
  const rows = [];
  const facts = {};
  const dialog = page.getByRole('dialog');
  const first = (name) => dialog.getByRole('radio', { name: new RegExp(`^${name} `) }).first();
  const none = () => dialog.getByRole('radio', { name: /^Ohne Kombination/ });
  const trigger = page.getByRole('button', { name: 'Kachel hinzufügen' }).first();
  const tiles = () => page.locator('ul[aria-label="Dashboard-Kacheln"] > li').count();

  facts.tilesBefore = await tiles();
  await pressOn(page, trigger, 'Enter');
  await dialog.waitFor();
  await page.waitForTimeout(300);
  await pressOn(page, first('Umsatzerlöse'), 'Space');
  facts.offer = await statusText(page);
  const blocked = dialog.getByRole('radio', { name: /^ARR Nicht kombinierbar/ });
  facts.blockedDisabled = await blocked.isDisabled();
  facts.blockedReason = (
    (await blocked.locator('xpath=ancestor::label').textContent()) ?? ''
  ).trim();
  await page.getByTestId('combination-picker').scrollIntoViewIfNeeded();
  rows.push(await step('gesperrter-partner'));

  await pressOn(page, none(), 'ArrowDown');
  facts.chosen = await statusText(page);
  facts.focusAfterPick = await focusedName(page);
  await page.getByTestId('configurator-preview').getByTestId('tile-formula').waitFor();
  facts.previewFormula = (
    (await page.getByTestId('configurator-preview').getByTestId('tile-formula').textContent()) ?? ''
  ).trim();
  rows.push(await step('konfigurator-kombination'));

  await pressOn(page, first('EBITDA'), 'Space');
  facts.dropped = await statusText(page);
  facts.previewAfterDrop = await page
    .getByTestId('configurator-preview')
    .getByTestId('tile-formula')
    .count();
  await pressOn(page, none(), 'ArrowDown');
  await pressOn(page, dialog.getByRole('button', { name: 'Hinzufügen', exact: true }), 'Enter');
  await dialog.waitFor({ state: 'detached' });
  facts.tilesAfterMarge = await tiles();

  await pressOn(page, trigger, 'Enter');
  await dialog.waitFor();
  await page.waitForTimeout(300);
  await pressOn(page, first('Fully-Loaded CAC'), 'Space');
  await pressOn(page, none(), 'ArrowDown');
  const blockedText = page.getByTestId('configurator-preview').getByTestId('tile-blocked');
  await blockedText.waitFor();
  facts.notComputable = ((await blockedText.textContent()) ?? '').trim();
  rows.push(await step('nicht-berechenbar'));
  // Escape schließt nur den obersten Dialog; ohne Rückfrage ist das der Konfigurator.
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  facts.escapeClosed = (await dialog.count()) === 0;

  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.getByText('Gespeichert.').first().waitFor();
  await page.waitForTimeout(300);
  facts.saved = await page.getByRole('button', { name: 'Dashboard bearbeiten' }).isVisible();
  facts.savedStates = await page
    .locator('[data-testid="dashboard-tile"]')
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => n.querySelector('[data-testid="tile-formula"]'))
        .map((n) => n.dataset.state),
    );
  rows.push(await step('ansicht-gespeichert'));
  return { rows, facts };
}
