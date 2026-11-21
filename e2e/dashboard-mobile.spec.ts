// Auftrag 172 (P15b §2.4 Nr. 11): Mobile Bedienung des V2-Editors mit Touch-Emulation.
// Telefon (375): Bearbeiten per Liste, Inspector als Vollbild-Blatt, Browser-Zurück schließt es.
// Tablet (768): Scrollen verschiebt keine Kachel, Ziehen erst nach langem Drücken.
// Beide: Bedienelemente ≥ 44 × 44 px.
import { expect, test, type Page } from '@playwright/test';
import { findSmallTouchTargets } from './helpers/touchTargets';

const V2 = '/dashboard-vorschau.html?bereich=editor_v2';

test.use({ hasTouch: true });

async function openEditor(page: Page, query = '') {
  await page.goto(`${V2}${query}`, { waitUntil: 'networkidle' });
  await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });
}

test.describe('Telefon (375 px)', () => {
  test.beforeEach((_fixtures, info) => {
    test.skip(info.project.name !== 'mobile-375', 'nur Telefon-Viewport');
  });

  test('Liste umsortieren ändert die sichtbare Reihenfolge, Desktop-Layout bleibt', async ({
    page,
  }) => {
    await openEditor(page);
    const grid = page.locator('[data-edit-mode="liste"]').first();
    await expect(grid).toBeVisible();
    await expect(page.getByTestId('list-mode-hint')).toBeVisible();
    await expect(page.locator('[data-testid^="drag-handle-"]')).toHaveCount(0);

    const ids = () =>
      grid.locator('[role="gridcell"]').evaluateAll((els) => els.map((e) => e.dataset.tileId));
    const before = await ids();
    expect(before.length).toBeGreaterThan(1);

    await page.getByTestId(`tile-move-down-btn-${before[0]}`).tap();
    const after = await ids();
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[0]);
    await expect(page.getByTestId(`tile-move-up-btn-${after[0]}`)).toBeDisabled();
  });

  test('Inspector als Vollbild-Blatt; Browser-Zurück schließt es ohne Verwerfen', async ({
    page,
  }) => {
    await openEditor(page);
    const first = page.locator('[data-testid^="tile-edit-btn-"]').first();
    await first.tap();
    const sheet = page.getByTestId('editor-inspector');
    await expect(sheet).toHaveAttribute('data-sheet', 'true');
    await expect(sheet).toHaveAttribute('role', 'dialog');
    const box = await sheet.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(370);

    const url = page.url();
    await page.goBack();
    await expect(page.getByTestId('editor-inspector')).toHaveCount(0);
    expect(page.url()).toBe(url);
    await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible();

    // Erneut öffnen und über „Schließen“ verlassen
    await first.tap();
    await page.getByTestId('close-inspector-button').tap();
    await expect(page.getByTestId('editor-inspector')).toHaveCount(0);
  });

  test('alle Bedienelemente in Editor und Inspector ≥ 44 × 44 px', async ({ page }) => {
    await openEditor(page);
    expect(await findSmallTouchTargets(page, '[data-testid="dashboard-editor-shell-v2"]')).toEqual(
      [],
    );
    await page.locator('[data-testid^="tile-edit-btn-"]').first().tap();
    expect(await findSmallTouchTargets(page, '[data-testid="editor-inspector"]')).toEqual([]);
  });

  test('kein horizontaler Überlauf', async ({ page }) => {
    await openEditor(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBe(0);
  });
});

test.describe('Tablet (768 px)', () => {
  test.beforeEach((_fixtures, info) => {
    test.skip(info.project.name !== 'tablet-768', 'nur Tablet-Viewport');
  });

  async function dragHandle(page: Page) {
    const tile = page.locator('[data-testid^="canvas-tile-"]').first();
    await tile.tap();
    const id = await tile.getAttribute('data-tile-id');
    return { id, handle: page.getByTestId(`drag-handle-${id}`) };
  }

  async function layoutOf(page: Page, id: string | null) {
    return page.getByTestId(`canvas-tile-${id}`).evaluate((el) => el.className);
  }

  async function touchGesture(page: Page, x: number, y: number, holdMs: number, dy: number) {
    await page.evaluate(
      async ({ x, y, holdMs, dy }) => {
        const target = document.elementFromPoint(x, y)!;
        const fire = (type: string, cy: number, el: EventTarget) =>
          el.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerType: 'touch',
              pointerId: 7,
              button: 0,
              clientX: x,
              clientY: cy,
            }),
          );
        fire('pointerdown', y, target);
        const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
        if (holdMs === 0) {
          for (let i = 1; i <= 5; i++) fire('pointermove', y + (dy * i) / 5, window);
          await wait(500);
        } else {
          await wait(holdMs);
          for (let i = 1; i <= 5; i++) fire('pointermove', y + (dy * i) / 5, window);
        }
        fire('pointerup', y + dy, window);
      },
      { x, y, holdMs, dy },
    );
  }

  test('Wischen (Scrollen) über den Ziehgriff verschiebt keine Kachel', async ({ page }) => {
    await openEditor(page);
    const { id, handle } = await dragHandle(page);
    const before = await layoutOf(page, id);
    const b = (await handle.boundingBox())!;
    await touchGesture(page, b.x + b.width / 2, b.y + b.height / 2, 0, 250);
    expect(await layoutOf(page, id)).toBe(before);
  });

  test('nach langem Drücken wird die Kachel sichtbar aufgenommen und verschoben', async ({
    page,
  }) => {
    await openEditor(page);
    const { id, handle } = await dragHandle(page);
    const before = await layoutOf(page, id);
    const b = (await handle.boundingBox())!;
    await touchGesture(page, b.x + b.width / 2, b.y + b.height / 2, 500, 260);
    await expect.poll(() => layoutOf(page, id)).not.toBe(before);
  });

  test('Bedienelemente der Top-Bar ≥ 44 × 44 px', async ({ page }) => {
    await openEditor(page);
    expect(await findSmallTouchTargets(page, '[data-testid="editor-top-bar"]')).toEqual([]);
  });
});
