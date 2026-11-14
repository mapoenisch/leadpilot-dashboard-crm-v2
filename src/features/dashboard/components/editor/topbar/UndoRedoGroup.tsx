import { RotateCcw, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UndoRedoGroupProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}

export function UndoRedoGroup({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className,
}: UndoRedoGroupProps) {
  return (
    <div
      data-testid="undo-redo-group"
      className={cn(
        'flex items-center rounded-md border border-[var(--color-border,#1b3d39)] bg-black/30 p-0.5',
        className,
      )}
    >
      <button
        type="button"
        data-testid="undo-button"
        disabled={!canUndo}
        onClick={onUndo}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded transition-colors',
          canUndo
            ? 'text-[var(--color-text-soft,#e6f3f1)] hover:bg-white/10'
            : 'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed',
        )}
        title="Rückgängig (Strg+Z / Cmd+Z)"
        aria-label="Rückgängig"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        data-testid="redo-button"
        disabled={!canRedo}
        onClick={onRedo}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded transition-colors',
          canRedo
            ? 'text-[var(--color-text-soft,#e6f3f1)] hover:bg-white/10'
            : 'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed',
        )}
        title="Wiederholen (Strg+Y / Cmd+Shift+Z)"
        aria-label="Wiederholen"
      >
        <RotateCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
