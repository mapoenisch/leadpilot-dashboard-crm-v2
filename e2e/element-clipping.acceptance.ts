// G44 (Auftrag 067A, Block D): Echter 375px-Bounding-Box-Test für internes
// Clipping auf /resources/materials. Bewusst rot — zusätzlich zum bestehenden
// Dokument-Overflow-Test (e2e/routes.spec.ts, unverändert) wird das
// Elementrechteck gegen Viewport und tatsächlichen Overflow-Container geprüft.
import { expect, test } from '@playwright/test';

const CLIP_LABELS = ['100% Verlustfrei integriert', 'Operations & SLA'] as const;
const VIEWPORT_WIDTH = 375;

interface ContainerGeometry {
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
      return { containerClientWidth: 0, containerRectRight: 0, foundScrollContainer: false };
    }
    const rect = scrollContainer.getBoundingClientRect();
    return {
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
    await expect(target, `${label}: sichtbar`).toBeVisible();
    const box = await target.boundingBox();
    expect(box, `${label}: Bounding-Box vorhanden`).not.toBeNull();
    if (!box) {
      continue;
    }
    expect(box.x, `${label}: linker Rand`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${label}: rechter Rand`).toBeLessThanOrEqual(VIEWPORT_WIDTH);
    const geometry = await measureScrollContainer(target);
    expect(geometry.foundScrollContainer, `${label}: Scroll-Container gefunden`).toBe(true);
    expect(
      box.x + box.width,
      `${label}: innerhalb des Scroll-Containers`,
    ).toBeLessThanOrEqual(geometry.containerRectRight);
  }
});
