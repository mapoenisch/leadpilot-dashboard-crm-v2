// Auftrag 174b (K2): Einpassung des Kachelinhalts und Mindestgröße im Raster.

import { describe, expect, it } from 'vitest';
import {
  computeTileFit,
  computeTileFitMinimum,
  TILE_FIT_MIN_LAYOUT_WIDTH,
  TILE_FIT_MIN_SCALE,
} from '../components/tileFit';
import { minGridSize } from '../components/editor/grid/tileMinSizes';
import { GRID_CONFIGS, MAX_TILE_HEIGHT } from '../components/editor/grid/gridEngine';

/** Diagrammartiger Inhalt: 560 px Mindestbreite, Höhe = Breite / 2 + 170 px (Legende, Ausgabe). */
const chart = (layoutWidth: number) => Math.max(560, layoutWidth) / 2 + 170;
/** Zahlenkachel: feste Höhe. */
const number = () => 60;

describe('computeTileFit', () => {
  it('lässt passenden Inhalt in voller Größe und voller Breite', () => {
    const fit = computeTileFit(600, 500, 560, chart);
    expect(fit.scale).toBe(1);
    expect(fit.layoutWidth).toBe(600);
    expect(fit.layoutHeight).toBe(470);
  });

  it('verkleinert, bis der Inhalt vollständig passt – in Breite und Höhe', () => {
    const fit = computeTileFit(392, 205, 560, chart);
    expect(fit.scale).toBeLessThan(1);
    expect(fit.layoutWidth * fit.scale).toBeLessThanOrEqual(392 + 0.5);
    expect(fit.layoutHeight * fit.scale).toBeLessThanOrEqual(205 + 0.5);
  });

  it('wählt bei breiter, flacher Fläche eine schmalere Layoutbreite und zentriert', () => {
    // Bei voller Breite wäre das Diagramm 600 px hoch; schmaler passt mehr Faktor.
    const fit = computeTileFit(1200, 300, 560, chart);
    expect(fit.layoutWidth).toBeLessThan(1200 / fit.scale);
    expect(fit.layoutHeight * fit.scale).toBeLessThanOrEqual(300.5);
    expect(fit.left).toBeGreaterThan(0);
  });

  it('nutzt für schmale Zahlenkacheln die volle Größe', () => {
    const fit = computeTileFit(156, 109, 90, number);
    expect(fit.scale).toBe(1);
  });

  it('lässt keinen halben Pixel Überstand zu, damit scrollHeight nicht aufrundet', () => {
    const lineChart = () => 385;
    const fit = computeTileFit(362, 206, 560, lineChart);
    expect(fit.layoutWidth * fit.scale).toBeLessThanOrEqual(362);
    expect(fit.layoutHeight * fit.scale).toBeLessThanOrEqual(206);
    expect(fit.top + fit.layoutHeight * fit.scale).toBeLessThanOrEqual(206);
    expect(fit.left + fit.layoutWidth * fit.scale).toBeLessThanOrEqual(362);
  });

  it('kommt auch mit einer leeren Fläche zurecht', () => {
    const fit = computeTileFit(0, 0, 560, chart);
    expect(fit.scale).toBeGreaterThan(0);
    expect(Number.isFinite(fit.layoutHeight)).toBe(true);
  });
});

describe('computeTileFitMinimum', () => {
  it('liefert den Platzbedarf bei Mindestfaktor und Mindestbreite', () => {
    const min = computeTileFitMinimum(560, chart);
    expect(min.width).toBe(Math.ceil(560 * TILE_FIT_MIN_SCALE));
    expect(min.height).toBe(Math.ceil(chart(560) * TILE_FIT_MIN_SCALE));
  });

  it('setzt eine Untergrenze für die Layoutbreite', () => {
    const min = computeTileFitMinimum(10, number);
    expect(min.width).toBe(Math.ceil(TILE_FIT_MIN_LAYOUT_WIDTH * TILE_FIT_MIN_SCALE));
  });
});

describe('minGridSize', () => {
  const { gap, rowHeight } = GRID_CONFIGS.desktop;
  // 12 Spalten à 60 px + 11 Abstände à 16 px
  const containerWidth = 12 * 60 + 11 * gap;

  it('ohne Messung gelten die festen Untergrenzen', () => {
    expect(minGridSize(undefined, containerWidth, 'desktop', 12)).toEqual({ w: 2, h: 2 });
  });

  it('rechnet den Platzbedarf in Rasterzellen um (aufgerundet)', () => {
    const min = minGridSize({ width: 470, height: 520 }, containerWidth, 'desktop', 12);
    expect(min.w).toBe(Math.ceil((470 + gap) / (60 + gap)));
    expect(min.h).toBe(Math.ceil((520 + gap) / (rowHeight + gap)));
  });

  it('begrenzt auf die verfügbaren Spalten und die Höchsthöhe', () => {
    const min = minGridSize({ width: 5000, height: 5000 }, containerWidth, 'desktop', 4);
    expect(min).toEqual({ w: 4, h: MAX_TILE_HEIGHT });
  });
});
