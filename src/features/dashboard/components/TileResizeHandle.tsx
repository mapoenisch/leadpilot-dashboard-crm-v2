import { useState, useRef, useCallback, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { TILE_SIZES, sizeRank, type TileSize } from '../model/dashboardCatalog';
import { SIZE_LABEL } from '../hooks/dashboardEditorReducer';

export interface TileResizeHandleProps {
  tileId: string;
  tileTitle: string;
  currentSize: TileSize;
  minSize: TileSize;
  locked: boolean;
  onResize: (tileId: string, nextSize: TileSize) => void;
}

export function TileResizeHandle({
  tileId,
  tileTitle,
  currentSize,
  minSize,
  locked,
  onResize,
}: TileResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewSize, setPreviewSize] = useState<TileSize | null>(null);
  const dragStartRef = useRef<{ startX: number; startRank: number } | null>(null);

  const minRank = sizeRank(minSize);
  const currentRank = sizeRank(currentSize);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (locked || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      dragStartRef.current = { startX: e.clientX, startRank: currentRank };
      setIsDragging(true);
      setPreviewSize(currentSize);
    },
    [locked, currentRank, currentSize],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragStartRef.current) return;
      e.preventDefault();
      const deltaX = e.clientX - dragStartRef.current.startX;
      const stepDelta = Math.round(deltaX / 80);
      const targetRank = Math.max(minRank, Math.min(3, dragStartRef.current.startRank + stepDelta));
      const targetSize = TILE_SIZES[targetRank] ?? currentSize;
      setPreviewSize(targetSize);
    },
    [minRank, currentSize],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragStartRef.current) return;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      const finalSize = previewSize ?? currentSize;
      dragStartRef.current = null;
      setIsDragging(false);
      setPreviewSize(null);
      if (finalSize !== currentSize) {
        onResize(tileId, finalSize);
      }
    },
    [previewSize, currentSize, onResize, tileId],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (locked) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const nextRank = Math.min(3, currentRank + 1);
        const nextSize = TILE_SIZES[nextRank];
        if (nextSize && nextSize !== currentSize) onResize(tileId, nextSize);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const prevRank = Math.max(minRank, currentRank - 1);
        const prevSize = TILE_SIZES[prevRank];
        if (prevSize && prevSize !== currentSize) onResize(tileId, prevSize);
      }
    },
    [locked, currentRank, minRank, currentSize, onResize, tileId],
  );

  const displayedSize = previewSize ?? currentSize;

  return (
    <div
      role="slider"
      data-testid="tile-resize-handle"
      aria-label={`Kachelgröße anpassen: ${tileTitle}`}
      aria-valuemin={minRank}
      aria-valuemax={3}
      aria-valuenow={sizeRank(displayedSize)}
      aria-valuetext={SIZE_LABEL[displayedSize]}
      tabIndex={locked ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      title={`Größe: ${SIZE_LABEL[displayedSize]} (Ziehen oder Pfeiltasten)`}
      className={cn(
        'group absolute bottom-1 right-1 z-10 flex h-7 w-7 cursor-ew-resize select-none items-center justify-center rounded-br-lg rounded-tl-md bg-surface/90 text-[var(--color-text-muted)] backdrop-blur-sm transition-all hover:bg-primary/20 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm border border-solid border-border/80 touch-none',
        locked && 'pointer-events-none opacity-40',
        isDragging && 'ring-2 ring-primary bg-primary text-primary-foreground scale-110 shadow-md',
      )}
    >
      <span className="text-[12px] font-bold leading-none select-none" aria-hidden="true">
        ⤡
      </span>
      {isDragging ? (
        <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded bg-surface border border-border px-2 py-0.5 text-[11px] font-semibold text-text shadow-md">
          {SIZE_LABEL[displayedSize]}
        </span>
      ) : null}
    </div>
  );
}
