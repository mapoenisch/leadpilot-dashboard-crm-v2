import { test, expect } from '@playwright/test';

// Gate G35 (Auftrag 050-C, Block 2): Nachweis der ratifizierten a11y-Änderung
// (ResourceViewer: Zoom-Anzeige <span> -> <button>, siehe Revision in
// ANTIGRAVITY_AUFTRAG_050_LAYERING_KLEINBEFUNDE.md). DOM/Style, keine Baseline
// — läuft OS-unabhängig grün. Route: /resources/materials (einzige
// Resources-Route; /resources ist 404 — Marc-Entscheidung 2026-09-10).
test('resources-viewer: Zoom-Anzeige ist neutral gestylter Button', async ({ page }) => {
  await page.goto('/resources/materials', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /öffnen/ }).first().click();
  const zoom = page.getByRole('button', { name: 'Zoom auf 100 Prozent zurücksetzen' });
  await expect(zoom).toBeVisible();
  await expect(zoom).toHaveAttribute('type', 'button');

  const zoomStyle = await zoom.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      backgroundColor: cs.backgroundColor,
      borderStyle: cs.borderStyle,
      padding: cs.padding,
      fontFamily: cs.fontFamily,
      fontStyle: cs.fontStyle,
      fontWeight: cs.fontWeight,
      fontSize: cs.fontSize,
      parentFontSize: el.parentElement ? getComputedStyle(el.parentElement).fontSize : null,
    };
  });
  // Chrome-Reset: kein UA-Button-Chrome.
  expect(zoomStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(zoomStyle.borderStyle).toBe('none');
  expect(zoomStyle.padding).toBe('0px');
  // Kein UA-Button-Font: gleiche Schriftfamilie/Stil wie der benachbarte
  // Viewer-Text (volle font-Shorthand nicht vergleichbar: Button erbt 16px,
  // Sub ist designbedingt 11.5px — darum Familien-/Stil-Vergleich).
  const neighborFont = await page.locator('.resource-viewer-title-sub').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontFamily: cs.fontFamily, fontStyle: cs.fontStyle, fontWeight: cs.fontWeight };
  });
  expect(zoomStyle.fontFamily).toBe(neighborFont.fontFamily);
  expect(zoomStyle.fontStyle).toBe(neighborFont.fontStyle);
  // `font: inherit` gewinnt (inline-`fontSize: 12px` wird vom Shorthand
  // zurückgesetzt): Button-Größe = geerbte Container-Größe, kein UA-Default.
  expect(zoomStyle.fontSize).toBe(zoomStyle.parentFontSize);
});
