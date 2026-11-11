// Executive Dashboard V2 (Auftrag 148 & 149 / P05 & P06):
// Tastaturkürzel für den Dashboard-Editor: Undo (Cmd+Z / Ctrl+Z), Redo (Cmd+Shift+Z / Ctrl+Y),
// mit Schutz vor Auslösung in aktiven Texteingabefeldern und während Modaldialogen.

import { useEffect } from 'react';

export interface UseEditorShortcutsOptions {
  isSaving: boolean;
  showDiscardConfirm: boolean;
  isLeaving: boolean;
  hasLeaveRequest: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

export function useEditorShortcuts({
  isSaving,
  showDiscardConfirm,
  isLeaving,
  hasLeaveRequest,
  canUndo,
  canRedo,
  undo,
  redo,
}: UseEditorShortcutsOptions) {
  useEffect(() => {
    if (isSaving || showDiscardConfirm || hasLeaveRequest || isLeaving) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement | null;
      const tag = targetEl?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        targetEl?.isContentEditable
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, showDiscardConfirm, hasLeaveRequest, isLeaving, canUndo, canRedo, undo, redo]);
}
