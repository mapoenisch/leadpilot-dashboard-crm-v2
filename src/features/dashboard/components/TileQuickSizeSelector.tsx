import { cn } from '@/lib/utils';
import { minSizeFor as _, sizeRank, TILE_SIZES, type TileSize } from '../model/dashboardCatalog';
import { SIZE_LABEL } from '../hooks/dashboardEditorReducer';
import { SHORT_SIZES } from './TileActionsMenu';

export interface TileQuickSizeSelectorProps {
  tileId: string;
  title: string;
  currentSize: TileSize;
  minSize: TileSize;
  locked: boolean;
  onResize?: (tileId: string, size: TileSize) => void;
}

export function TileQuickSizeSelector({
  tileId,
  title,
  currentSize,
  minSize,
  locked,
  onResize,
}: TileQuickSizeSelectorProps) {
  if (!onResize) return null;

  return (
    <div
      role="group"
      aria-label={`${title}: Spaltenbreite wählen`}
      className="flex items-center gap-1"
    >
      <span className="hidden text-[11px] font-medium text-[var(--color-text-muted)] sm:inline mr-1">
        Größe:
      </span>
      {TILE_SIZES.map((sz) => {
        const isCurrent = currentSize === sz;
        const isAllowed = sizeRank(sz) >= sizeRank(minSize);
        const disReason = !isAllowed
          ? sizeRank(minSize) >= 2
            ? 'Dieses Diagramm benötigt mindestens 9 Spalten (3/4 Breite)'
            : 'Dieses Diagramm benötigt mindestens 6 Spalten (1/2 Breite)'
          : undefined;
        return (
          <button
            key={sz}
            type="button"
            draggable={false}
            onDragStart={(e) => e.stopPropagation()}
            disabled={locked || !isAllowed}
            onClick={() => onResize(tileId, sz)}
            data-action={`size-${sz}`}
            aria-label={`${title}: Schnellwahl ${SHORT_SIZES[sz]}${disReason ? ` (${disReason})` : ''}`}
            aria-pressed={isCurrent}
            title={disReason ?? `${SIZE_LABEL[sz]} (${SHORT_SIZES[sz]})`}
            className={cn(
              'rounded px-2 py-0.5 text-[11px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[26px]',
              isCurrent
                ? 'bg-primary text-[var(--color-text-inverse)] font-bold shadow-sm'
                : isAllowed
                  ? 'bg-surface border border-solid border-border/80 text-text hover:bg-surface-hover hover:border-primary/50'
                  : 'opacity-35 cursor-not-allowed bg-transparent border border-dashed border-border/50 text-[var(--color-text-muted)]',
            )}
          >
            {SHORT_SIZES[sz]}
          </button>
        );
      })}
    </div>
  );
}
