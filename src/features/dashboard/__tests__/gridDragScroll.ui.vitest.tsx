// Auftrag 151 (P06b), Befund N-4: Pointer-Drag berücksichtigt die Scroll-Änderung des
// Containers (z. B. durch Auto-Scroll) und nicht nur die Zeigerbewegung.

import { act, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import { useGridDragAndDrop } from '../components/editor/grid/useGridDragAndDrop';

const tiles: DashboardTileConfigV2[] = [
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

describe('useGridDragAndDrop – Scroll-Delta (Auftrag 151 / N-4)', () => {
  it('rechnet die Scroll-Änderung während des Ziehens in die Zielzeile ein', () => {
    const container = fakeContainer();
    const onCommitLayout = vi.fn();
    const { result } = renderHook(() =>
      useGridDragAndDrop({
        tiles,
        breakpoint: 'desktop',
        containerRef: { current: container },
        onCommitLayout,
      }),
    );

    act(() => {
      result.current.handlePointerDown('a', {
        button: 0,
        clientX: 100,
        clientY: 100,
      } as unknown as ReactPointerEvent);
    });
    pointer('pointermove', 100, 110); // Drag aktiv, Zeiger bewegt sich < 1 Zeile

    // Container scrollt um zwei Rasterzeilen (Desktop: 80 px + 16 px Abstand), Zeiger bleibt stehen
    container.scrollTop = 2 * (80 + 16);
    pointer('pointermove', 100, 110);
    pointer('pointerup', 100, 110);

    expect(onCommitLayout).toHaveBeenCalledTimes(1);
    const moves = onCommitLayout.mock.calls[0]![0] as Array<{ tileId: string; to: { y: number } }>;
    expect(moves.find((m) => m.tileId === 'a')?.to.y).toBe(2);
  });
});
