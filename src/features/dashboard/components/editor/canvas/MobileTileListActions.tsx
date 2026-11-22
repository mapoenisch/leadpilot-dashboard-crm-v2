// Executive Dashboard V2 (Auftrag 172 / P15b §2.1 Nr. 1 und 3):
// Immer sichtbare Aktionsleiste einer Kachel im Modus „Bearbeiten per Liste“ (Smartphone-Ansicht).
// Alle Schaltflächen sind mindestens 44 × 44 px groß und tragen sprechende Namen.

import type { MouseEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, Copy, Maximize2, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOBILE_SIZE_LABEL, nextMobileSize, type ListModeTileInfo } from './editorListMode';
import type { MobileTileSize } from './editorListMode';

export interface MobileTileListActionsProps {
  tileId: string;
  title: string;
  info: ListModeTileInfo;
  onMove: (tileId: string, direction: 'up' | 'down') => void;
  onResize: (tileId: string, size: MobileTileSize) => void;
  onEdit: (tileId: string) => void;
  onDuplicate: (tileId: string) => void;
  onRemove: (tileId: string) => void;
  /** „In Sektion verschieben…“, falls Sektionen vorhanden */
  sectionMenu?: ReactNode;
}

const BUTTON =
  'flex h-11 min-w-11 items-center justify-center gap-1 rounded-md border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] px-2 text-xs font-medium text-[var(--color-text-soft,#e6f3f1)] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40';

export function MobileTileListActions({
  tileId,
  title,
  info,
  onMove,
  onResize,
  onEdit,
  onDuplicate,
  onRemove,
  sectionMenu,
}: MobileTileListActionsProps) {
  const isFirst = info.index === 0;
  const isLast = info.index === info.total - 1;
  const next = nextMobileSize(info.size);
  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      role="group"
      aria-label={`Aktionen für ${title}, Position ${info.index + 1} von ${info.total}`}
      data-testid={`tile-list-actions-${tileId}`}
      className="mt-2 flex flex-wrap items-center gap-1.5"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        data-testid={`tile-move-up-btn-${tileId}`}
        aria-label={`${title} nach oben`}
        disabled={isFirst}
        onClick={stop(() => onMove(tileId, 'up'))}
        className={BUTTON}
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-testid={`tile-move-down-btn-${tileId}`}
        aria-label={`${title} nach unten`}
        disabled={isLast}
        onClick={stop(() => onMove(tileId, 'down'))}
        className={BUTTON}
      >
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-testid={`tile-size-btn-${tileId}`}
        data-size={info.size}
        aria-label={`Größe von ${title}: ${MOBILE_SIZE_LABEL[info.size]}. Ändern zu ${MOBILE_SIZE_LABEL[next]}`}
        onClick={stop(() => onResize(tileId, next))}
        className={BUTTON}
      >
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
        <span>{MOBILE_SIZE_LABEL[info.size]}</span>
      </button>
      <button
        type="button"
        data-testid={`tile-edit-btn-${tileId}`}
        aria-label={`${title} bearbeiten`}
        onClick={stop(() => onEdit(tileId))}
        className={cn(BUTTON, 'text-primary')}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span>Bearbeiten</span>
      </button>
      {sectionMenu}
      <button
        type="button"
        data-testid={`tile-duplicate-btn-${tileId}`}
        aria-label={`${title} duplizieren`}
        onClick={stop(() => onDuplicate(tileId))}
        className={BUTTON}
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-testid={`tile-remove-btn-${tileId}`}
        aria-label={`${title} entfernen`}
        onClick={stop(() => onRemove(tileId))}
        className={cn(BUTTON, 'text-rose-300')}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
