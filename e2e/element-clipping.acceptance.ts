// G44 (Auftrag 067A, Block D): Echter 375px-Bounding-Box-Test für internes
// Clipping auf /resources/materials. Bewusst rot — zusätzlich zum bestehenden
// Dokument-Overflow-Test (e2e/routes.spec.ts, unverändert) wird das
// Elementrechteck beider Zielelemente gegen Viewport sowie linke und rechte
// Client-Grenze ihres tatsächlichen Overflow-Containers geprüft. Alle
// Assertions laufen per soft weiter, damit beide Elemente vollständig
// vermessen werden, auch wenn das erste bereits überläuft.
import { expect, test } from '@playwright/test';

// 067P-N (Issue #13): Der Test legt seinen Viewport selbst fest, damit
// VIEWPORT_WIDTH = 375 in jedem Playwright-Projekt gilt — auch wenn die CI
// diese Spec zusätzlich unter Desktop-/Tablet-Projekten einplant.
test.use({ viewport: { width: 375, height: 812 } });

const CLIP_LABELS = ['100% Verlustfrei integriert', 'Operations & SLA'] as const;
const VIEWPORT_WIDTH = 375;

interface ContainerGeometry {
  containerLeft: number;
  containerClientWidth: number;
  containerRectRight: number;
  foundScrollContainer: boolean;
}

async function measureScrollContainer(
  target: import('@playwright/test').Locator,
): Promise<ContainerGeometry> {
  return target.evaluate((element) => {
    const ancestors: HTMLElement[] = [];
    let current: HTMLElement | null = element.parentElement;
    while (current) {
      ancestors.push(current);
      current = current.parentElement;
    }
    const scrollContainer = ancestors.find((ancestor) => {
      const overflowX = window.getComputedStyle(ancestor).overflowX;
      return overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden';
    });
    if (!scrollContainer) {
      return {
        containerLeft: 0,
        containerClientWidth: 0,
        containerRectRight: 0,
        foundScrollContainer: false,
      };
    }
    const rect = scrollContainer.getBoundingClientRect();
    return {
      containerLeft: rect.left,
      containerClientWidth: scrollContainer.clientWidth,
      containerRectRight: rect.right,
      foundScrollContainer: true,
    };
  });
}

test('[PR-CLIP-13] beschneidet keine Inhalte im Scroll-Container', async ({ page }) => {
  await page.goto('/resources/materials');
  for (const label of CLIP_LABELS) {
    const target = page.getByText(label, { exact: true }).first();
    await expect.soft(target, `${label}: sichtbar`).toBeVisible();
    const box = await target.boundingBox();
    await expect.soft(box, `${label}: Bounding-Box vorhanden`).not.toBeNull();
    if (!box) {
      continue;
    }
    expect.soft(box.x, `${label}: linker Rand`).toBeGreaterThanOrEqual(0);
    expect.soft(box.x + box.width, `${label}: rechter Rand`).toBeLessThanOrEqual(VIEWPORT_WIDTH);
    const geometry = await measureScrollContainer(target);
    expect.soft(geometry.foundScrollContainer, `${label}: Scroll-Container gefunden`).toBe(true);
    expect
      .soft(box.x, `${label}: linke Container-Grenze`)
      .toBeGreaterThanOrEqual(geometry.containerLeft);
    expect
      .soft(
        box.x + box.width,
        `${label}: rechte Container-Grenze (clientWidth ${geometry.containerClientWidth})`,
      )
      .toBeLessThanOrEqual(geometry.containerLeft + geometry.containerClientWidth);
    expect
      .soft(box.x + box.width, `${label}: innerhalb des Scroll-Containers`)
      .toBeLessThanOrEqual(geometry.containerRectRight);
  }
});
