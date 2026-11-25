// Auftrag 174b, Codex-Befunde PR #223: Erläuterung nicht abgeschnitten; Mindestgröße folgt dem Kopf.

import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardTile } from '../components/DashboardTile';
import { placeExplanation, TileExplanationToggle } from '../components/TileExplanation';
import { TileFitBox } from '../components/TileFitBox';
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

  it('bleibt bei fremdem Scrollen offen und schließt erst, wenn der Kachelkopf wandert', () => {
    let headerTop = 200;
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.tagName === 'HEADER') {
          return {
            left: 100,
            top: headerTop,
            right: 380,
            bottom: headerTop + 40,
            width: 280,
            height: 40,
            x: 100,
            y: headerTop,
            toJSON: () => ({}),
          } as DOMRect;
        }
        return {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });
    try {
      render(
        <div>
          <div data-testid="other-scroll" />
          <header>
            <TileExplanationToggle>Erläuterung</TileExplanationToggle>
          </header>
        </div>,
      );
      fireEvent.click(screen.getByTestId('tile-explanation-toggle'));
      expect(screen.getByTestId('tile-explanation')).toBeInTheDocument();

      fireEvent.scroll(screen.getByTestId('other-scroll'));
      expect(screen.getByTestId('tile-explanation')).toBeInTheDocument();

      fireEvent.scroll(document);
      expect(screen.getByTestId('tile-explanation')).toBeInTheDocument();

      headerTop = 140;
      fireEvent.scroll(document);
      expect(screen.queryByTestId('tile-explanation')).toBeNull();
    } finally {
      rectSpy.mockRestore();
    }
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

  it('setzt die endgültige Breite vor dem Messen der Höhe beim Öffnen nach oben (Runde 2)', () => {
    const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.tagName === 'HEADER') {
          return {
            left: 100,
            top: 680,
            right: 380,
            bottom: 720,
            width: 280,
            height: 40,
            x: 100,
            y: 680,
            toJSON: () => ({}),
          } as DOMRect;
        }
        return {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) {
        if (this.dataset.testid === 'tile-explanation') {
          // Ohne feste Breite bricht der Text kaum um (80 px); mit Kachelbreite 280 px ist er 240 px hoch.
          return this.style.width === '280px' ? 240 : 80;
        }
        return 0;
      },
    });
    const innerHeightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

    try {
      render(
        <header>
          <TileExplanationToggle>Langer Zeitbezug mit Filterhinweis</TileExplanationToggle>
        </header>,
      );
      fireEvent.click(screen.getByTestId('tile-explanation-toggle'));
      const panel = screen.getByTestId('tile-explanation');
      expect(panel.style.width).toBe('280px');
      expect(panel.style.top).toBe(`${680 - 4 - 240}px`);
    } finally {
      rectSpy.mockRestore();
      if (heightDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', heightDescriptor);
      }
      if (innerHeightDescriptor) {
        Object.defineProperty(window, 'innerHeight', innerHeightDescriptor);
      }
    }
  });
});

describe('Einpassung reagiert auf breiteren Inhalt bei gleicher Höhe (Runde 2)', () => {
  const descriptors: Array<[string, PropertyDescriptor | undefined]> = [];

  beforeEach(() => {
    for (const prop of ['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight']) {
      descriptors.push([prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)]);
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get(this: HTMLElement) {
          const id = this.dataset.testid;
          if (id === 'tile-fit-box') return prop === 'clientWidth' ? 200 : 100;
          if (id === 'tile-fit-content') {
            if (prop === 'offsetHeight') return 48;
            if (prop === 'offsetWidth') {
              if (this.style.width === 'min-content') {
                return (this.textContent?.length ?? 0) > 6 ? 280 : 80;
              }
              return Number.parseFloat(this.style.width) || 200;
            }
          }
          return 0;
        },
      });
    }
    vi.stubGlobal(
      'ResizeObserver',
      class {
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
  });

  it('passt Skalierung und Mindestbreite bei neuen Daten ohne ResizeObserver neu ein', () => {
    const onMinimum = vi.fn();
    const { rerender } = render(
      <TileFitBox onMinimum={onMinimum}>
        <span>10</span>
      </TileFitBox>,
    );
    expect(screen.getByTestId('tile-fit-box').dataset.fitScale).toBe('1.000');
    expect(onMinimum).toHaveBeenLastCalledWith(
      { width: Math.ceil(120 * TILE_FIT_MIN_SCALE), height: Math.ceil(48 * TILE_FIT_MIN_SCALE) },
      expect.any(HTMLElement),
    );

    rerender(
      <TileFitBox onMinimum={onMinimum}>
        <span>1234567890</span>
      </TileFitBox>,
    );
    const scale = Number(screen.getByTestId('tile-fit-box').dataset.fitScale);
    expect(scale).toBeLessThan(0.8);
    expect(onMinimum).toHaveBeenLastCalledWith(
      { width: Math.ceil(280 * TILE_FIT_MIN_SCALE), height: Math.ceil(48 * TILE_FIT_MIN_SCALE) },
      expect.any(HTMLElement),
    );
  });

  it('reagiert über MutationObserver, wenn ein Kind seinen Text selbst verbreitert', async () => {
    const onMinimum = vi.fn();
    function DynamicChild() {
      const [text, setText] = useState('10');
      return (
        <button type="button" onClick={() => setText('1234567890')}>
          {text}
        </button>
      );
    }
    render(
      <TileFitBox onMinimum={onMinimum}>
        <DynamicChild />
      </TileFitBox>,
    );
    expect(screen.getByTestId('tile-fit-box').dataset.fitScale).toBe('1.000');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '10' }));
      await Promise.resolve();
    });

    const scale = Number(screen.getByTestId('tile-fit-box').dataset.fitScale);
    expect(scale).toBeLessThan(0.8);
    expect(onMinimum).toHaveBeenLastCalledWith(
      { width: Math.ceil(280 * TILE_FIT_MIN_SCALE), height: Math.ceil(48 * TILE_FIT_MIN_SCALE) },
      expect.any(HTMLElement),
    );
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
