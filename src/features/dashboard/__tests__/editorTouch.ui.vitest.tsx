// Auftrag 172 (P15b §2.1): Mobile Bedienung – Listenmodus, langes Drücken, Vollbild-Blatt.

import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardConfigV2, DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import { EditorCanvasV2 } from '../components/editor/EditorCanvasV2';
import { EditorInspectorV2 } from '../components/editor/EditorInspectorV2';
import { WidgetLibraryV2 } from '../components/editor/WidgetLibraryV2';
import { LONG_PRESS_MS, useGridDragAndDrop } from '../components/editor/grid/useGridDragAndDrop';
import { useGridKeyboard } from '../components/editor/grid/useGridKeyboard';
import { useSheetBackClose, SHEET_HISTORY_KEY } from '../hooks/useSheetBackClose';
import { useEditorPreviewData } from '../preview/editorPreviewData';

const desktopTiles: DashboardTileConfigV2[] = [
  {
    id: 'a',
    catalogId: 'baseline.arr',
    title: 'A',
    presentation: 'zahl',
    layouts: { desktop: { x: 0, y: 0, w: 6, h: 4 } },
  },
  {
    id: 'b',
    catalogId: 'baseline.mrr',
    title: 'B',
    presentation: 'zahl',
    layouts: { desktop: { x: 6, y: 0, w: 6, h: 4 } },
  },
];

function fakeContainer() {
  return {
    scrollTop: 0,
    scrollLeft: 0,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, bottom: 800, right: 1200 }),
  } as unknown as HTMLDivElement;
}

function pointer(type: string, clientX: number, clientY: number) {
  act(() => {
    window.dispatchEvent(new MouseEvent(type, { clientX, clientY }));
  });
}

function touchDown(clientX: number, clientY: number) {
  return { button: 0, clientX, clientY, pointerType: 'touch' } as unknown as ReactPointerEvent;
}

describe('Tablet: Ziehen per Touch erst nach langem Drücken (§2.1 Nr. 2)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup() {
    const onCommitLayout = vi.fn();
    const hook = renderHook(() =>
      useGridDragAndDrop({
        tiles: desktopTiles,
        breakpoint: 'tablet',
        containerRef: { current: fakeContainer() },
        onCommitLayout,
      }),
    );
    return { onCommitLayout, hook };
  }

  it('Scrollen (Bewegung vor Ablauf der Haltezeit) verschiebt keine Kachel', () => {
    const { onCommitLayout, hook } = setup();
    act(() => hook.result.current.handlePointerDown('a', touchDown(100, 100)));
    pointer('pointermove', 100, 160); // Wischen nach unten = Scrollen
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS + 50));
    pointer('pointermove', 100, 400);
    pointer('pointerup', 100, 400);

    expect(hook.result.current.armedTileId).toBeNull();
    expect(onCommitLayout).not.toHaveBeenCalled();
  });

  it('kurzes Antippen ohne Halten nimmt keine Kachel auf', () => {
    const { onCommitLayout, hook } = setup();
    act(() => hook.result.current.handlePointerDown('a', touchDown(100, 100)));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 100));
    pointer('pointerup', 100, 100);
    act(() => vi.advanceTimersByTime(500));
    expect(hook.result.current.armedTileId).toBeNull();
    expect(onCommitLayout).not.toHaveBeenCalled();
  });

  it('nach ≥ 400 ms Halten ist die Kachel sichtbar aufgenommen und lässt sich ziehen', () => {
    const { onCommitLayout, hook } = setup();
    act(() => hook.result.current.handlePointerDown('a', touchDown(100, 100)));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(hook.result.current.armedTileId).toBe('a');
    expect(hook.result.current.activeGhost?.tileId).toBe('a');

    pointer('pointermove', 100, 100 + 2 * (72 + 12)); // zwei Tablet-Zeilen nach unten
    pointer('pointerup', 100, 100 + 2 * (72 + 12));
    expect(onCommitLayout).toHaveBeenCalledTimes(1);
    expect(hook.result.current.armedTileId).toBeNull();
  });

  it('Neues Kachel-Array nach der Auswahl (Sektionen) bricht das lange Drücken nicht ab', () => {
    const containerRef = { current: fakeContainer() };
    const onCommitLayout = vi.fn();
    const hook = renderHook(
      ({ tiles }) =>
        useGridDragAndDrop({ tiles, breakpoint: 'tablet', containerRef, onCommitLayout }),
      { initialProps: { tiles: desktopTiles } },
    );
    act(() => hook.result.current.handlePointerDown('a', touchDown(100, 100)));
    // Auswahl rendert neu, groupTilesBySection liefert ein neues Array mit denselben Kacheln
    hook.rerender({ tiles: [...desktopTiles] });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS + 100));
    expect(hook.result.current.armedTileId).toBe('a');
  });

  it('Maus zieht weiterhin sofort (Desktop-Verhalten unverändert)', () => {
    const { onCommitLayout, hook } = setup();
    act(() =>
      hook.result.current.handlePointerDown('a', {
        button: 0,
        clientX: 100,
        clientY: 100,
        pointerType: 'mouse',
      } as unknown as ReactPointerEvent),
    );
    pointer('pointermove', 100, 300);
    pointer('pointerup', 100, 300);
    expect(onCommitLayout).toHaveBeenCalledTimes(1);
  });
});

function mobileConfig(): DashboardConfigV2 {
  return {
    version: 2,
    id: 'dash_list',
    title: 'Liste',
    scope: 'personal',
    ownerUserId: 'u',
    organizationId: 'o',
    globalTimeframe: '30d',
    globalPipeline: 'standard',
    // Konfigurationsreihenfolge ≠ Smartphone-Reihenfolge
    tiles: [
      {
        id: 'tile_mrr',
        catalogId: 'baseline.mrr',
        title: 'MRR',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 6, y: 0, w: 6, h: 4 },
          mobile: { x: 0, y: 4, w: 1, h: 4 },
        },
      },
      {
        id: 'tile_arr',
        catalogId: 'baseline.arr',
        title: 'ARR',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 0, y: 0, w: 6, h: 4 },
          mobile: { x: 0, y: 0, w: 1, h: 4 },
        },
      },
    ],
  };
}

describe('Rastertastatur respektiert Diagrammsteuerung (CI PR #213)', () => {
  function setupKeyboard() {
    const onSelectTile = vi.fn();
    renderHook(() =>
      useGridKeyboard({
        tiles: desktopTiles,
        breakpoint: 'desktop',
        selectedTileId: 'a',
        onSelectTile,
        onDeselect: vi.fn(),
        onCommitLayout: vi.fn(),
      }),
    );
    return onSelectTile;
  }

  function pressOn(el: HTMLElement, key: string, handled: boolean) {
    document.body.appendChild(el);
    if (handled) el.addEventListener('keydown', (e) => e.preventDefault());
    act(() => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
    el.remove();
  }

  it('Pfeiltaste am Diagramm-Regler wechselt nicht zur Nachbarkachel', () => {
    const onSelectTile = setupKeyboard();
    const slider = document.createElement('div');
    slider.setAttribute('role', 'slider');
    pressOn(slider, 'ArrowRight', false);
    expect(onSelectTile).not.toHaveBeenCalled();
  });

  it('bereits behandelte Pfeiltaste (defaultPrevented) wird ignoriert', () => {
    const onSelectTile = setupKeyboard();
    pressOn(document.createElement('div'), 'ArrowRight', true);
    expect(onSelectTile).not.toHaveBeenCalled();
  });

  it('Pfeiltaste ohne Diagramm wechselt weiterhin zur Nachbarkachel', () => {
    const onSelectTile = setupKeyboard();
    pressOn(document.createElement('div'), 'ArrowRight', false);
    expect(onSelectTile).toHaveBeenCalledWith('b');
  });
});

describe('Smartphone: Bearbeiten per Liste (§2.1 Nr. 1)', () => {
  function renderList(onCommitLayout = vi.fn()) {
    render(
      <EditorCanvasV2
        config={mobileConfig()}
        activeBreakpoint="mobile"
        selectedTileId={null}
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        onCommitLayout={onCommitLayout}
        useData={useEditorPreviewData}
      />,
    );
    return onCommitLayout;
  }

  it('zeigt die Kacheln in der Reihenfolge des Smartphone-Layouts, ohne Ziehgriff', () => {
    renderList();
    expect(screen.getByTestId('canvas-grid')).toHaveAttribute('data-edit-mode', 'liste');
    const cells = screen.getAllByRole('gridcell');
    expect(cells.map((c) => c.getAttribute('data-tile-id'))).toEqual(['tile_arr', 'tile_mrr']);
    expect(screen.queryByTestId('drag-handle-tile_arr')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resize-handle-se-tile_arr')).not.toBeInTheDocument();
  });

  it('bietet je Kachel Nach oben/unten, Größe und Bearbeiten; Randpositionen sind gesperrt', () => {
    renderList();
    const first = within(screen.getByTestId('tile-list-actions-tile_arr'));
    expect(first.getByRole('button', { name: 'ARR nach oben' })).toBeDisabled();
    expect(first.getByRole('button', { name: 'ARR nach unten' })).toBeEnabled();
    expect(first.getByRole('button', { name: /Größe von ARR: Mittel/ })).toBeInTheDocument();
    expect(first.getByRole('button', { name: 'ARR bearbeiten' })).toBeInTheDocument();
    const last = within(screen.getByTestId('tile-list-actions-tile_mrr'));
    expect(last.getByRole('button', { name: 'MRR nach unten' })).toBeDisabled();
  });

  it('„Nach unten“ ändert nur das Smartphone-Layout', () => {
    const onCommitLayout = renderList();
    fireEvent.click(screen.getByTestId('tile-move-down-btn-tile_arr'));
    expect(onCommitLayout).toHaveBeenCalledTimes(1);
    const moves = onCommitLayout.mock.calls[0]![0] as Array<{
      tileId: string;
      to: { y: number };
    }>;
    expect(moves.find((m) => m.tileId === 'tile_arr')?.to.y).toBe(4);
    expect(moves.find((m) => m.tileId === 'tile_mrr')?.to.y).toBe(0);
  });

  it('„Größe“ schaltet die Höhe der Listenkachel weiter (Mittel → Groß)', () => {
    const onCommitLayout = renderList();
    fireEvent.click(screen.getByTestId('tile-size-btn-tile_arr'));
    const moves = onCommitLayout.mock.calls[0]![0] as Array<{
      tileId: string;
      to: { h: number };
    }>;
    expect(moves.find((m) => m.tileId === 'tile_arr')?.to.h).toBe(6);
  });
});

describe('Vollbild-Blatt: Browser-Zurück schließt den Inspector (§2.1 Nr. 4)', () => {
  beforeEach(() => window.history.replaceState({ usr: null, key: 'k', idx: 0 }, ''));

  it('legt beim Öffnen einen Verlaufseintrag an und schließt bei Zurück ohne Verwerfen', () => {
    const onClose = vi.fn();
    const pushSpy = vi.spyOn(window.history, 'pushState');
    renderHook(({ open }) => useSheetBackClose(open, onClose), { initialProps: { open: true } });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(window.history.state[SHEET_HISTORY_KEY]).toBe('inspector');
    // Router-Zustand bleibt erhalten
    expect(window.history.state.key).toBe('k');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { key: 'k', idx: 0 } }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    pushSpy.mockRestore();
  });

  it('Schließen-Schaltfläche nimmt den eigenen Verlaufseintrag zurück', () => {
    const onClose = vi.fn();
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const { result } = renderHook(() => useSheetBackClose(true, onClose));
    act(() => result.current());
    expect(backSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
  });
});

describe('Vollbild-Blatt: Tastaturfokus (Codex-Befund PR #213)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
      <>
        <button type="button" data-testid="trigger">
          Bearbeiten
        </button>
        {open && (
          <EditorInspectorV2
            selectedTile={null}
            config={mobileConfig()}
            onDeselect={vi.fn()}
            onTileTitleChange={vi.fn()}
            onTileViewChange={vi.fn()}
            onTileOverrideChange={vi.fn()}
            onTileThresholdChange={vi.fn()}
            onClose={onClose}
            asSheet
          />
        )}
      </>
    );
  }

  it('setzt den Fokus ins Blatt, hält Tab darin, Escape schließt, Fokus kehrt zurück', () => {
    const onClose = vi.fn();
    const view = render(<Harness open={false} onClose={onClose} />);
    screen.getByTestId('trigger').focus();
    view.rerender(<Harness open onClose={onClose} />);
    act(() => vi.advanceTimersByTime(60));
    const sheet = screen.getByTestId('editor-inspector');
    expect(document.activeElement).toBe(screen.getByTestId('close-inspector-button'));

    expect(sheet.contains(document.activeElement)).toBe(true);
    // Tab wird vom Blatt abgefangen (Fokusbegrenzung); ohne sie liefe er auf verdeckte Canvas-Aktionen
    expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(false);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    view.rerender(<Harness open={false} onClose={onClose} />);
    expect(document.activeElement).toBe(screen.getByTestId('trigger'));
  });

  it('Bibliothek als Blatt: Dialog mit Fokus auf „Schließen“, Escape schließt, Fokus kehrt zurück', () => {
    const onClose = vi.fn();
    const lib = (open: boolean) => (
      <>
        <button type="button" data-testid="trigger">
          Bibliothek
        </button>
        {open && <WidgetLibraryV2 onAddTile={vi.fn()} tileCount={0} onClose={onClose} asSheet />}
      </>
    );
    const view = render(lib(false));
    screen.getByTestId('trigger').focus();
    view.rerender(lib(true));
    act(() => vi.advanceTimersByTime(60));
    const sheet = screen.getByTestId('widget-library');
    expect(sheet).toHaveAttribute('role', 'dialog');
    expect(document.activeElement).toBe(screen.getByTestId('close-library-button'));
    expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(false);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    view.rerender(lib(false));
    expect(document.activeElement).toBe(screen.getByTestId('trigger'));
  });
});
