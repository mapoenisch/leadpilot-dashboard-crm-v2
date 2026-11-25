// Executive Dashboard V2 (Auftrag 172 / P15b §2.1):
// Bedienweise des Editors nach Bildschirmgröße.
// - Telefon (< 640 px): Smartphone-Layout fest gewählt, „Bearbeiten per Liste“, Inspector und
//   Bibliothek als Vollbild-Blatt; Browser-Zurück schließt das Inspector-Blatt.
// - Tablet (640–1023 px): beim Öffnen Tablet-Layout statt Desktop, Ziehen nur nach langem Drücken.
// Das Desktop-Layout wird dabei nie verändert: die Layoutwahl ist reiner Editorzustand.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { BreakpointKey } from '../../model/dashboardConfigV2';
import { useEditorViewport, type EditorViewport } from '../../hooks/useEditorViewport';
import { useSheetBackClose } from '../../hooks/useSheetBackClose';
import type { EditorListModeContextValue } from './canvas/editorListMode';

export interface UseEditorTouchLayoutOptions {
  activeBreakpoint: BreakpointKey;
  setActiveBreakpoint: (bp: BreakpointKey) => void;
  isInspectorOpen: boolean;
  setIsInspectorOpen: (open: boolean) => void;
  setSelectedTileId: (tileId: string | null) => void;
}

export interface EditorTouchLayout {
  viewport: EditorViewport;
  /** Telefon: Layoutwahl gesperrt (immer Smartphone-Ansicht) */
  breakpointLocked: boolean;
  /** Inspector und Bibliothek als Vollbild-Blatt */
  asSheet: boolean;
  listContext: EditorListModeContextValue;
  /** Schließt den Inspector; als Blatt inklusive Verlaufseintrag */
  requestCloseInspector: () => void;
}

export const SHEET_CLASS = 'fixed inset-0 z-50 h-full w-full max-w-none border-0';

export function useEditorTouchLayout({
  activeBreakpoint,
  setActiveBreakpoint,
  isInspectorOpen,
  setIsInspectorOpen,
  setSelectedTileId,
}: UseEditorTouchLayoutOptions): EditorTouchLayout {
  const viewport = useEditorViewport();
  const isPhone = viewport === 'mobile';

  // Telefon: immer Smartphone-Layout. Tablet: einmalig beim Öffnen Tablet- statt Desktop-Layout.
  // Auftrag 174a: Automatisch gewählte Ansichten gelten nur für ihre Fensterbreite. Kehrt das
  // Fenster zur Desktop-Breite zurück (Resize), gilt wieder die Ansicht von vorher – wie bei einem
  // direkten Aufruf auf dieser Breite. Eine Auswahl von Hand bleibt unangetastet.
  const tabletApplied = useRef(false);
  const autoFrom = useRef<BreakpointKey | null>(null);
  const autoTo = useRef<BreakpointKey | null>(null);
  useEffect(() => {
    const applyAuto = (bp: BreakpointKey) => {
      if (autoFrom.current === null) autoFrom.current = activeBreakpoint;
      autoTo.current = bp;
      setActiveBreakpoint(bp);
    };
    if (isPhone) {
      if (activeBreakpoint !== 'mobile') applyAuto('mobile');
      return;
    }
    if (viewport === 'tablet') {
      if (autoTo.current === 'mobile' && activeBreakpoint === 'mobile') {
        tabletApplied.current = true;
        const from = autoFrom.current;
        applyAuto(from === null || from === 'desktop' ? 'tablet' : from);
        return;
      }
      if (!tabletApplied.current) {
        tabletApplied.current = true;
        if (activeBreakpoint === 'desktop') applyAuto('tablet');
      }
      return;
    }
    if (autoTo.current !== null) {
      const from = autoFrom.current;
      const restore = activeBreakpoint === autoTo.current;
      autoFrom.current = null;
      autoTo.current = null;
      if (restore && from) {
        // Codex-Befund PR #222: Mit der automatischen Auswahl fällt auch ihre Tablet-Sperre weg,
        // damit das nächste Verkleinern wieder Tablet wählt. Nach einer Auswahl von Hand
        // (restore = false) bleibt die Sperre, die Wahl des Nutzers gilt weiter.
        tabletApplied.current = false;
        setActiveBreakpoint(from);
      }
    }
  }, [isPhone, viewport, activeBreakpoint, setActiveBreakpoint]);

  const closeInspector = useCallback(() => setIsInspectorOpen(false), [setIsInspectorOpen]);
  const requestCloseSheet = useSheetBackClose(isPhone && isInspectorOpen, closeInspector);

  const listContext = useMemo<EditorListModeContextValue>(
    () => ({
      onEditTile: (tileId: string) => {
        setSelectedTileId(tileId);
        setIsInspectorOpen(true);
      },
    }),
    [setSelectedTileId, setIsInspectorOpen],
  );

  return {
    viewport,
    breakpointLocked: isPhone,
    asSheet: isPhone,
    listContext,
    requestCloseInspector: isPhone ? requestCloseSheet : closeInspector,
  };
}
