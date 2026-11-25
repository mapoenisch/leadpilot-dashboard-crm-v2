// Auftrag 174b, Codex-Befunde PR #223: Erläuterung nicht abgeschnitten; Mindestgröße folgt dem Kopf.

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardTile } from '../components/DashboardTile';
import { placeExplanation } from '../components/TileExplanation';
import { TILE_FIT_MIN_SCALE } from '../components/tileFit';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData } from '../data/dashboardData';

function active(id: string): ActiveCatalogEntry {
  const entry = getCatalogEntry(id);
  if (!entry || !isActiveEntry(entry)) throw new Error(`kein aktiver Eintrag ${id}`);
  return entry;
}

const TILE: DashboardTileConfig = {
  tileId: 't1',
  catalogId: 'baseline.arr',
  view: 'zahl',
  size: 'klein',
  filterMode: 'dashboard',
};

const DATA: ResolvedTileData = {
  catalogId: 'baseline.arr',
  state: 'bereit',
  value: 100,
  series: null,
  overview: null,
  unit: 'EUR',
  timeBasis: 'Aktueller Stand der importierten CRM-Deals; ein sehr langer Zeitbezug.',
  asOf: null,
  origin: { layer: 'baseline', module: 'src/domain/execData.ts', exportName: 'EXEC_KPIS_1' },
  scope: 'stammdaten',
  effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
};

function show(onFitMinimum = vi.fn()) {
  render(
    <div data-testid="clip" className="overflow-hidden">
      <DashboardTile
        tile={TILE}
        entry={active('baseline.arr')}
        data={DATA}
        onShowDetails={() => undefined}
        fit
        onFitMinimum={onFitMinimum}
      />
    </div>,
  );
  return onFitMinimum;
}

describe('Erläuterung außerhalb der abschneidenden Kachel (Befund 1)', () => {
  it('liegt per Portal außerhalb von Kachel und Rasterzelle', () => {
    show();
    fireEvent.click(screen.getByTestId('tile-explanation-toggle'));
    const panel = screen.getByTestId('tile-explanation');
    expect(screen.getByTestId('clip')).not.toContainElement(panel);
    expect(panel.parentElement).toBe(document.body);
    expect(panel.className).toContain('fixed');
  });

  it('ein Klick in die Erläuterung schließt sie nicht', () => {
    show();
    fireEvent.click(screen.getByTestId('tile-explanation-toggle'));
    fireEvent.pointerDown(screen.getByTestId('tile-explanation'));
    expect(screen.getByTestId('tile-explanation')).toBeInTheDocument();
  });

  it('öffnet unter dem Kopf, wenn dort Platz ist', () => {
    const place = placeExplanation(
      { left: 100, top: 100, bottom: 160, width: 180 },
      { width: 1440, height: 900 },
      120,
    );
    expect(place.top).toBe(164);
    expect(place.width).toBe(260);
    expect(place.maxHeight).toBeGreaterThanOrEqual(120);
  });

  it('öffnet über dem Kopf, wenn unten zu wenig Platz ist', () => {
    const place = placeExplanation(
      { left: 100, top: 700, bottom: 760, width: 300 },
      { width: 1440, height: 900 },
      200,
    );
    expect(place.top + 200).toBeLessThanOrEqual(700);
    expect(place.maxHeight).toBeGreaterThanOrEqual(200);
  });

  it('bleibt auf schmalen Fenstern im Bild', () => {
    const place = placeExplanation(
      { left: 300, top: 100, bottom: 160, width: 300 },
      { width: 375, height: 812 },
      100,
    );
    expect(place.left).toBeGreaterThanOrEqual(8);
    expect(place.left + place.width).toBeLessThanOrEqual(375 - 8);
  });
});

describe('Mindestgröße folgt dem Kachelkopf (Befund 2)', () => {
  const sizes = { header: 60, footer: 40, body: 120 };
  let observerCallback: (() => void) | null = null;
  const descriptors: Array<[string, PropertyDescriptor | undefined]> = [];

  function dim(el: HTMLElement, prop: string): number {
    const id = el.dataset.testid;
    if (id === 'tile-fit-box') return prop === 'clientWidth' ? 200 : sizes.body;
    if (id === 'tile-fit-content') return prop === 'offsetWidth' ? 100 : 50;
    if (id === 'tile-body') return prop === 'offsetWidth' ? 200 : sizes.body;
    if (id === 'dashboard-tile') {
      return prop === 'offsetWidth' ? 232 : sizes.header + sizes.body + sizes.footer;
    }
    return 0;
  }

  beforeEach(() => {
    for (const prop of ['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight']) {
      descriptors.push([prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)]);
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get(this: HTMLElement) {
          return dim(this, prop);
        },
      });
    }
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          observerCallback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
  });

  afterEach(() => {
    for (const [prop, descriptor] of descriptors.splice(0)) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, prop, descriptor);
    }
    vi.unstubAllGlobals();
    observerCallback = null;
  });

  it('meldet eine neue Gesamthöhe, wenn der Kopf wächst und der Inhalt gleich bleibt', () => {
    const onFitMinimum = show();
    const bodyMin = Math.ceil(50 * TILE_FIT_MIN_SCALE);
    expect(onFitMinimum).toHaveBeenLastCalledWith({
      width: Math.ceil(120 * TILE_FIT_MIN_SCALE) + 32,
      height: bodyMin + 60 + 40,
    });

    // Titel bricht um: Kopf 40 px höher, die Einpassfläche entsprechend niedriger.
    sizes.header = 100;
    sizes.body = 80;
    act(() => observerCallback?.());
    expect(onFitMinimum).toHaveBeenLastCalledWith({
      width: Math.ceil(120 * TILE_FIT_MIN_SCALE) + 32,
      height: bodyMin + 100 + 40,
    });
  });

  it('meldet unveränderte Werte nicht erneut', () => {
    const onFitMinimum = show();
    const calls = onFitMinimum.mock.calls.length;
    act(() => observerCallback?.());
    expect(onFitMinimum.mock.calls.length).toBe(calls);
  });
});
