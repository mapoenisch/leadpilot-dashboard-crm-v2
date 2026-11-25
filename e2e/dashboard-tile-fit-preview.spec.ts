import { test, expect, type Locator, type Page } from '@playwright/test';

// Auftrag 174b: Kacheln ohne Scrollen (K2, K5), Mindestgröße beim Ziehen (K2), Ziehgriff ohne
// Überdeckung (K1), einklappbare Erläuterung (K3), kein „Stand Stand“ (K4), unterer Griff
// verschiebt die Kachel nicht (K6). Vorschau mit Testdaten, ohne Datenbank.

const URL = '/dashboard-vorschau.html?bereich=editor_v2';

async function openEditor(page: Page) {
  page.on('dialog', (dialog) => void dialog.accept());
  await page.goto(URL, { waitUntil: 'networkidle' });
  await expect(page.getByTestId('dashboard-editor-shell-v2')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-testid="tile-fit-box"][data-fit-scale]').first()).toBeAttached();
}

async function tile(page: Page, id: string): Promise<Locator> {
  const locator = page.getByTestId(`canvas-tile-${id}`);
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  return locator;
}

/** Scroll- und Überlaufmessung aller Kacheln im Raster. */
async function overflowReport(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-testid^="canvas-tile-"]')].flatMap((t) => {
      const problems: string[] = [];
      const tileRect = t.getBoundingClientRect();
      const checks = [
        t.querySelector<HTMLElement>('[data-testid^="tile-body-"]'),
        t.querySelector<HTMLElement>('[data-testid="tile-fit-box"]'),
        t.querySelector<HTMLElement>('[data-testid="dashboard-tile"]'),
      ];
      for (const el of checks) {
        if (!el) continue;
        if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
          problems.push(`${el.dataset.testid}: scroll ${el.scrollWidth}x${el.scrollHeight}`);
        }
      }
      const content = t.querySelector<HTMLElement>('[data-testid="tile-fit-content"]');
      if (content) {
        const r = content.getBoundingClientRect();
        if (r.right > tileRect.right + 1 || r.bottom > tileRect.bottom + 1) {
          problems.push('Inhalt ragt über die Kachel');
        }
      }
      return problems.map((p) => `${t.dataset.tileId}: ${p}`);
    }),
  );
}

/** Diagramme laden als eigenes Modul nach; die Einpassung folgt im nächsten Bildaufbau. */
async function expectNoOverflow(page: Page) {
  await expect.poll(() => overflowReport(page), { timeout: 5000 }).toEqual([]);
}

test.describe('Dashboard-Editor V2: Kacheln ohne Scrollen (Auftrag 174b)', () => {
  // Die Fensterbreiten setzt der Test selbst; ein Projekt genügt.
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop-1440', 'Fensterbreiten setzt der Test selbst');
  });
  for (const vp of [
    { width: 1440, height: 900 },
    { width: 1024, height: 900 },
    { width: 768, height: 1024 },
  ]) {
    test(`kein Scrollen und kein Überstand in Kacheln bei ${vp.width} px (K2, K5)`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await openEditor(page);
      await expectNoOverflow(page);
      await page.getByTestId('preview-mode-button').click();
      await expect(page.locator('[data-testid="tile-fit-box"]').first()).toBeAttached();
      await expectNoOverflow(page);
    });
  }

  test('Verkleinern stoppt an der Mindestgröße, der Inhalt bleibt lesbar (K2)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);
    const id = 'std_baseline_umsatz';
    const card = await tile(page, id);
    await card.click({ position: { x: 30, y: 140 } });
    const before = await card.boundingBox();
    const handle = page.getByTestId(`resize-handle-se-${id}`);
    const hb = (await handle.boundingBox())!;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x - 400, hb.y - 400, { steps: 12 });
    await page.mouse.up();
    const after = (await card.boundingBox())!;
    expect(after.width).toBeLessThanOrEqual(before!.width + 1);
    const scale = Number(await card.getByTestId('tile-fit-box').getAttribute('data-fit-scale'));
    expect(scale).toBeGreaterThanOrEqual(0.8);
    await expectNoOverflow(page);
  });

  test('der Ziehgriff überdeckt weder Kategorie noch Titel (K1)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);
    const id = 'std_baseline_arr';
    const card = await tile(page, id);
    await card.click({ position: { x: 30, y: 140 } });
    const grip = (await page.getByTestId(`drag-handle-${id}`).boundingBox())!;
    const header = (await card.locator('header').boundingBox())!;
    expect(grip.y + grip.height).toBeLessThanOrEqual(header.y);
  });

  test('Erläuterung klappt auf und per Escape wieder zu (K3); kein „Stand Stand“ (K4)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);
    await expect(page.getByText(/Stand Stand/)).toHaveCount(0);
    const card = await tile(page, 'std_crm_pipeline_volumen');
    await expect(card.getByText(/closeDate/)).toHaveCount(0);
    const toggle = card.getByTestId('tile-explanation-toggle');
    await toggle.click();
    // Codex-Befund PR #223: die Überlagerung liegt außerhalb der Kachel und ist ganz sichtbar.
    const panel = page.getByTestId('tile-explanation');
    await expect(panel).toContainText('closeDate');
    const box = (await panel.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(await panel.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    expect(await card.getByTestId('tile-explanation').count()).toBe(0);
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test('Ziehen am unteren Griff ändert nur die Höhe, die Vorschau deckt sich (K6)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);
    // Tiefste Kachel des Rasters (Startzeile > 13)
    const id = 'std_uebersicht_roadmap';
    const card = await tile(page, id);
    expect(await card.getAttribute('class')).toMatch(/row-start-(1[4-9]|[2-9]\d)/);
    await card.click({ position: { x: 40, y: 100 } });
    const handle = page.getByTestId(`resize-handle-s-${id}`);
    await handle.scrollIntoViewIfNeeded();
    const hb = (await handle.boundingBox())!;
    const startTop = (await card.boundingBox())!.y;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, hb.y - 60, { steps: 8 });
    const ghost = (await page.getByTestId('canvas-drag-ghost').boundingBox())!;
    const during = (await card.boundingBox())!;
    await page.mouse.up();
    expect(Math.abs(ghost.y - during.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(during.y - startTop)).toBeLessThanOrEqual(1);
  });
});
