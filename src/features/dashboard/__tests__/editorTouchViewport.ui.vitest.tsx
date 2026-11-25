// Auftrag 172 (P15b §2.1) / 174a: Automatische Layoutwahl nach Bildschirmbreite (Telefon, Tablet, Resize).

import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BreakpointKey } from '../model/dashboardConfigV2';
import { useEditorTouchLayout } from '../components/editor/useEditorTouchLayout';

describe('Telefon erzwingt die Smartphone-Ansicht (Desktop-Layout bleibt erhalten)', () => {
  const originalMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function mockViewport(width: number) {
    window.matchMedia = ((query: string) => {
      const max = Number(/max-width: (\d+)px/.exec(query)?.[1] ?? Infinity);
      return {
        matches: width <= max,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    }) as unknown as typeof window.matchMedia;
  }

  it.each([
    [375, 'desktop', 'mobile', true],
    [768, 'desktop', 'tablet', false],
    [1440, 'desktop', null, false],
  ] as const)('Breite %i: %s → %s', (width, start, expected, locked) => {
    mockViewport(width);
    const setActiveBreakpoint = vi.fn();
    const { result } = renderHook(() =>
      useEditorTouchLayout({
        activeBreakpoint: start,
        setActiveBreakpoint,
        isInspectorOpen: false,
        setIsInspectorOpen: vi.fn(),
        setSelectedTileId: vi.fn(),
      }),
    );
    if (expected) expect(setActiveBreakpoint).toHaveBeenCalledWith(expected);
    else expect(setActiveBreakpoint).not.toHaveBeenCalled();
    expect(result.current.breakpointLocked).toBe(locked);
    expect(result.current.asSheet).toBe(locked);
  });

  function mockResizableViewport(initial: number) {
    let width = initial;
    const listeners = new Set<() => void>();
    window.matchMedia = ((query: string) => {
      const max = Number(/max-width: (\d+)px/.exec(query)?.[1] ?? Infinity);
      return {
        get matches() {
          return width <= max;
        },
        media: query,
        addEventListener: (_: string, cb: () => void) => listeners.add(cb),
        removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      };
    }) as unknown as typeof window.matchMedia;
    return (next: number) => {
      width = next;
      act(() => listeners.forEach((cb) => cb()));
    };
  }

  function renderWithState(start: BreakpointKey) {
    return renderHook(() => {
      const [bp, setBp] = useState<BreakpointKey>(start);
      useEditorTouchLayout({
        activeBreakpoint: bp,
        setActiveBreakpoint: setBp,
        isInspectorOpen: false,
        setIsInspectorOpen: vi.fn(),
        setSelectedTileId: vi.fn(),
      });
      return { bp, setBp };
    });
  }

  it('wählt Tablet bei jedem erneuten Verkleinern automatisch (Codex-Befund PR #222)', () => {
    const resize = mockResizableViewport(1440);
    const { result } = renderWithState('desktop');
    const seen = [result.current.bp];
    for (const w of [768, 1440, 768, 1440]) {
      resize(w);
      seen.push(result.current.bp);
    }
    expect(seen).toEqual(['desktop', 'tablet', 'desktop', 'tablet', 'desktop']);
  });

  it('eine Auswahl von Hand auf Tabletbreite bleibt beim erneuten Verkleinern erhalten', () => {
    const resize = mockResizableViewport(1440);
    const { result } = renderWithState('desktop');
    resize(768);
    expect(result.current.bp).toBe('tablet');
    act(() => result.current.setBp('desktop'));
    resize(1440);
    resize(768);
    expect(result.current.bp).toBe('desktop');
  });

  it('„Bearbeiten“ in der Liste wählt die Kachel und öffnet den Inspector', () => {
    mockViewport(375);
    const setSelectedTileId = vi.fn();
    const setIsInspectorOpen = vi.fn();
    const { result } = renderHook(() =>
      useEditorTouchLayout({
        activeBreakpoint: 'mobile',
        setActiveBreakpoint: vi.fn(),
        isInspectorOpen: false,
        setIsInspectorOpen,
        setSelectedTileId,
      }),
    );
    act(() => result.current.listContext.onEditTile('tile_arr'));
    expect(setSelectedTileId).toHaveBeenCalledWith('tile_arr');
    expect(setIsInspectorOpen).toHaveBeenCalledWith(true);
  });
});
