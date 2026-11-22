// Executive Dashboard V2 (Auftrag 165 / P12):
// Ausgelagerte Aktionsleiste der Top-Bar (Undo/Redo, Versionen, Vorschau, Inspector, Abbrechen, Speichern).

import { Eye, EyeOff, History, PanelRight, Printer, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { UndoRedoGroup } from './UndoRedoGroup';

export interface EditorTopBarActionsV2Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isPreviewMode: boolean;
  onTogglePreviewMode: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => Promise<boolean> | void;
  onCancel: () => void;
  readOnly?: boolean;
  onOpenVersions?: () => void;
  /** Auftrag 172: Report drucken/PDF (auch Leseansicht) */
  onOpenReport?: () => void;
}

export function EditorTopBarActionsV2({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isPreviewMode,
  onTogglePreviewMode,
  isInspectorOpen = true,
  onToggleInspector,
  isDirty,
  isSaving,
  onSave,
  onCancel,
  readOnly = false,
  onOpenVersions,
  onOpenReport,
}: EditorTopBarActionsV2Props) {
  return (
    <div className="flex items-center gap-2">
      {!readOnly && (
        <UndoRedoGroup canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
      )}

      {/* Versionen Button (auch in Leseansicht) */}
      {onOpenVersions && (
        <button
          type="button"
          data-testid="editor-open-versions"
          onClick={onOpenVersions}
          className="flex h-8 items-center gap-1.5 rounded border border-[var(--color-border,#1b3d39)] bg-black/20 px-2.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-white transition-colors"
          title="Versionshistorie anzeigen"
        >
          <History className="h-3.5 w-3.5" />
          <span>Versionen</span>
        </button>
      )}

      {/* Auftrag 172: Reportexport (auch in Leseansicht) */}
      {onOpenReport && (
        <button
          type="button"
          data-testid="editor-open-report"
          onClick={onOpenReport}
          className="flex h-8 items-center gap-1.5 rounded border border-[var(--color-border,#1b3d39)] bg-black/20 px-2.5 text-xs font-medium text-[var(--color-text-soft,#e6f3f1)] hover:text-white transition-colors"
          title="Report drucken oder als PDF speichern"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Report</span>
        </button>
      )}

      {/* Vorschau-Modus Schalter */}
      <button
        type="button"
        data-testid="preview-mode-button"
        onClick={onTogglePreviewMode}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-medium transition-colors',
          isPreviewMode
            ? 'border-primary/50 bg-primary/20 text-primary hover:bg-primary/30'
            : 'border-[var(--color-border,#1b3d39)] bg-black/20 text-[var(--color-text-muted)] hover:text-white',
        )}
        title="Reine Dashboard-Vorschau ohne Hilfselemente umschalten"
      >
        {isPreviewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        <span>{isPreviewMode ? 'Editor' : 'Vorschau'}</span>
      </button>

      {/* Inspector Toggle Button */}
      {!readOnly && onToggleInspector && (
        <button
          type="button"
          data-testid="toggle-inspector-button"
          onClick={onToggleInspector}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded border transition-colors',
            isInspectorOpen
              ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
              : 'border-[var(--color-border,#1b3d39)] bg-black/20 text-[var(--color-text-muted)] hover:text-white',
          )}
          title={isInspectorOpen ? 'Inspector einklappen' : 'Inspector einblenden'}
          aria-label="Inspector umschalten"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      )}

      {/* Abbrechen */}
      {!readOnly && (
        <Button
          type="button"
          data-testid="cancel-button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          className="h-8 gap-1 border-[var(--color-border,#1b3d39)] text-xs"
        >
          <X className="h-3.5 w-3.5" />
          <span>Abbrechen</span>
        </Button>
      )}

      {/* Speichern */}
      {!readOnly && (
        <Button
          type="button"
          data-testid="save-button"
          variant="primary"
          size="sm"
          disabled={!isDirty || isSaving}
          onClick={onSave}
          className="h-8 gap-1.5 text-xs font-semibold"
        >
          <Save className="h-3.5 w-3.5" />
          <span>{isSaving ? 'Speichern…' : 'Speichern'}</span>
        </Button>
      )}
    </div>
  );
}
