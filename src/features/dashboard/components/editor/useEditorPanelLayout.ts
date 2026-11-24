// Executive Dashboard V2 (Auftrag 174a, Befunde L1/L3/L7):
// Seitenbereiche (Widget-Bibliothek links, Inspector rechts) nach der tatsächlich verfügbaren
// Breite des Editors statt nach der Fensterbreite. Gemessen wird die Editor-Hülle selbst, damit
// die App-Navigation daneben mitzählt.
// - „beide“: genug Platz für beide Seitenbereiche neben einer bedienbaren Arbeitsfläche,
// - „eine“: nur ein Seitenbereich neben der Arbeitsfläche, Öffnen des einen schließt den anderen,
// - „ueberlagert“: Seitenbereich liegt über der Arbeitsfläche, statt ihr die Breite zu nehmen,
// - „blatt“: Telefon (Vollbild-Blatt, Auftrag 172).
// Wechselt der Modus (Resize), gilt dieselbe Grundstellung wie beim direkten Aufruf auf dieser
// Breite. Ohne Messmöglichkeit (z. B. jsdom) bleibt das bisherige Verhalten.

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useEditorViewport, type EditorViewport } from '../../hooks/useEditorViewport';

export type EditorPanelMode = 'beide' | 'eine' | 'ueberlagert' | 'blatt';

export const LIBRARY_PANEL_PX = 280;
export const INSPECTOR_PANEL_PX = 320;
/** Kleinste Arbeitsfläche neben Seitenbereichen (Diagramm-Mindestbreite 560 px + Rand). */
export const MIN_CANVAS_PX = 600;

export function panelModeFor(shellWidth: number, viewport: EditorViewport): EditorPanelMode {
  if (viewport === 'mobile') return 'blatt';
  if (shellWidth >= LIBRARY_PANEL_PX + INSPECTOR_PANEL_PX + MIN_CANVAS_PX) return 'beide';
  if (shellWidth >= INSPECTOR_PANEL_PX + MIN_CANVAS_PX) return 'eine';
  return 'ueberlagert';
}

export interface PanelState {
  library: boolean;
  inspector: boolean;
}

/** Grundstellung je Modus; Leseansicht ohne Seitenbereiche. */
export function defaultPanelsFor(mode: EditorPanelMode, readOnly: boolean): PanelState {
  if (readOnly) return { library: false, inspector: false };
  if (mode === 'beide') return { library: true, inspector: true };
  if (mode === 'eine') return { library: false, inspector: true };
  return { library: false, inspector: false };
}

export const OVERLAY_LIBRARY_CLASS = 'absolute inset-y-0 left-0 z-30 max-w-full shadow-2xl';
export const OVERLAY_INSPECTOR_CLASS = 'absolute inset-y-0 right-0 z-30 max-w-full shadow-2xl';

export interface UseEditorPanelLayoutOptions {
  shellRef: RefObject<HTMLElement | null>;
  readOnly: boolean;
}

export interface EditorPanelLayout {
  mode: EditorPanelMode;
  isLibraryOpen: boolean;
  isInspectorOpen: boolean;
  setLibraryOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  toggleLibrary: () => void;
  toggleInspector: () => void;
}

export function useEditorPanelLayout({
  shellRef,
  readOnly,
}: UseEditorPanelLayoutOptions): EditorPanelLayout {
  const viewport = useEditorViewport();
  const [width, setWidth] = useState<number | null>(null);
  // Bisheriges Verhalten bis zur ersten Messung: Desktop beide offen, sonst beide zu
  const [panels, setPanels] = useState<PanelState>(() => {
    const isDesktop = typeof window === 'undefined' || window.innerWidth >= 1024;
    return { library: !readOnly && isDesktop, inspector: !readOnly && isDesktop };
  });

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setWidth(el.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [shellRef]);

  const measured = width !== null && width > 0;
  const mode: EditorPanelMode = measured
    ? panelModeFor(width, viewport)
    : viewport === 'mobile'
      ? 'blatt'
      : 'beide';

  // Moduswechsel (auch die erste Messung) setzt die Grundstellung dieser Breite, vor dem Zeichnen
  const appliedMode = useRef<EditorPanelMode | null>(null);
  useLayoutEffect(() => {
    if (!measured || appliedMode.current === mode) return;
    appliedMode.current = mode;
    setPanels(defaultPanelsFor(mode, readOnly));
  }, [measured, mode, readOnly]);

  const exclusive = mode !== 'beide';

  const setLibraryOpen = useCallback(
    (open: boolean) =>
      setPanels((p) => ({ library: open, inspector: open && exclusive ? false : p.inspector })),
    [exclusive],
  );
  const setInspectorOpen = useCallback(
    (open: boolean) =>
      setPanels((p) => ({ inspector: open, library: open && exclusive ? false : p.library })),
    [exclusive],
  );

  return {
    mode,
    isLibraryOpen: panels.library,
    isInspectorOpen: panels.inspector,
    setLibraryOpen,
    setInspectorOpen,
    toggleLibrary: () => setLibraryOpen(!panels.library),
    toggleInspector: () => setInspectorOpen(!panels.inspector),
  };
}
