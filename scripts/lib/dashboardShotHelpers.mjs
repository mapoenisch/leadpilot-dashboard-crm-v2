// Auftrag 074: Hilfen des Screenshot-Skripts (Dialog- und Höhenmessung), ausgelagert wegen der
// Dateigrenze von 400 Zeilen. `ctx` bringt Adressen, Breiten und Hilfsfunktionen des Hauptskripts mit.
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';

/** Navigationsschutz: ein fehlgeschlagener Modulabruf führt über „Wiederholen“ zur Rückfrage. */
export async function dialogRows(browser, ctx) {
  const { BASE_URL, EDITOR, WIDTHS, OUT_DIR, WORKSPACE, sha256, overflowOf } = ctx;
  const rows = [];
  for (const viewport of WIDTHS) {
    const context = await browser.newContext({ viewport });
    await context.route(/Depth(3dBar|3dDonut|Line|Area)Chart/, (route) => route.abort());
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}${EDITOR}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
    await page
      .getByRole('button', { name: /Nach unten, Position 1 von/ })
      .first()
      .click();
    // Die Diagrammkacheln werden erst beim Heranscrollen aktiv und laden dann ihr Modul.
    for (let i = 0; i < 12; i += 1) {
      if (await page.getByRole('button', { name: 'Wiederholen' }).count()) break;
      await page.mouse.wheel(0, viewport.height * 0.8);
      await page.waitForTimeout(250);
    }
    await page.getByRole('button', { name: 'Wiederholen' }).first().scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Wiederholen' }).first().click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(400);
    const file = `${viewport.width}-dialog.png`;
    const image = await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
    const axe = await new AxeBuilder({ page }).include(WORKSPACE).analyze();
    rows.push({
      width: viewport.width,
      name: 'dialog',
      overflowPx: await overflowOf(page),
      axeSevere: axe.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => v.id),
      file,
      sha256: sha256(image),
    });
    // „Hier bleiben“ lässt Entwurf und Seite unverändert.
    await page.getByRole('button', { name: 'Hier bleiben' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await context.close();
  }
  return rows;
}

/** Höhe jeder ganzen Kachel (Listeneintrag) und des Rasters in einem Zustand. */
async function measure(ctx, browser, viewport, { stubObserver, query, scroll }) {
  const { BASE_URL, PAGE } = ctx;
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (stubObserver) {
    await page.addInitScript(() => {
      window.IntersectionObserver = class {
        observe() {}
        disconnect() {}
        unobserve() {}
      };
    });
  }
  await page.goto(`${BASE_URL}${PAGE}?bereich=editor${query}`, { waitUntil: 'networkidle' });
  await page.locator('[data-tile-id]').first().waitFor();
  if (scroll) {
    const steps = Math.ceil(
      (await page.evaluate(() => document.body.scrollHeight)) / viewport.height,
    );
    for (let i = 0; i < steps + 1; i += 1) {
      await page.mouse.wheel(0, viewport.height * 0.9);
      await page.waitForTimeout(150);
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
  }
  const result = await page.evaluate(() => ({
    grid: Math.round(
      document.querySelector('ul[aria-label="Dashboard-Kacheln"]').getBoundingClientRect().height,
    ),
    tiles: Object.fromEntries(
      [...document.querySelectorAll('li[data-tile-id]')].map((li) => [
        li.getAttribute('data-tile-id'),
        Math.round(li.getBoundingClientRect().height),
      ]),
    ),
    states: [...document.querySelectorAll('[data-testid="dashboard-tile"]')].map((t) =>
      t.getAttribute('data-state'),
    ),
  }));
  await context.close();
  return result;
}

/** Laden → bereit und Skelett → bereit: gleiche Höhe je ganzer Kachel und für das ganze Raster. */
export async function heightRows(browser, ctx) {
  const { WIDTHS } = ctx;
  const rows = [];
  for (const viewport of WIDTHS) {
    const ready = await measure(ctx, browser, viewport, { query: '', scroll: true });
    const loading = await measure(ctx, browser, viewport, {
      stubObserver: true,
      query: '',
      scroll: false,
    });
    const skeleton = await measure(ctx, browser, viewport, {
      query: '&status=laden',
      scroll: false,
    });
    const differs = (other) =>
      Object.keys(ready.tiles).filter((id) => ready.tiles[id] !== other.tiles[id]);
    rows.push({
      width: viewport.width,
      tileCount: Object.keys(ready.tiles).length,
      readyAll: ready.states.every((state) => state === 'bereit'),
      loadingAll: loading.states.every((state) => state === 'laden'),
      skeletonAll: skeleton.states.every((state) => state === 'laden'),
      loadingDiff: differs(loading),
      skeletonDiff: differs(skeleton),
      gridReady: ready.grid,
      gridLoading: loading.grid,
      gridSkeleton: skeleton.grid,
    });
  }
  return rows;
}
