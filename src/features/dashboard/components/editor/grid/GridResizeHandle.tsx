// Executive Dashboard V2 (Auftrag 149 / P06):
// Interaktive Resize-Handles (Ecke unten-rechts sowie Unter- und Rechtskante)
// für das Pointer-basierte Ändern der Kachelgröße im 12-Spalten-Raster.

import type { PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/utils';

export type ResizeDirection = 'se' | 'e' | 's';

export interface GridResizeHandleProps {
  tileId: string;
  direction: ResizeDirection;
  onResizeStart: (tileId: string, direction: ResizeDirection, e: ReactPointerEvent) => void;
  className?: string;
}

export function GridResizeHandle({
  tileId,
  direction,
  onResizeStart,
  className,
}: GridResizeHandleProps) {
  const getDirectionClasses = () => {
    switch (direction) {
      case 'se':
        return 'bottom-0 right-0 h-4 w-4 cursor-se-resize flex items-end justify-end p-0.5';
      case 'e':
        return 'top-4 bottom-4 right-0 w-2 cursor-e-resize';
      case 's':
        return 'bottom-0 left-4 right-4 h-2 cursor-s-resize';
      default:
        return '';
    }
  };

  const ariaLabel =
    direction === 'se'
      ? 'Kachelgröße diagonal anpassen'
      : direction === 'e'
        ? 'Kachelbreite anpassen'
        : 'Kachelhöhe anpassen';

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label={ariaLabel}
      data-testid={`resize-handle-${direction}-${tileId}`}
      data-direction={direction}
      onPointerDown={(e) => {
        e.stopPropagation();
        onResizeStart(tileId, direction, e);
      }}
      className={cn(
        'absolute z-20 touch-none select-none transition-colors opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100',
        getDirectionClasses(),
        className,
      )}
    >
      {direction === 'se' && (
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className="text-primary/70 fill-current hover:text-primary transition-colors"
        >
          <path d="M8 8H6V6H8V8ZM8 4H6V2H8V4ZM4 8H2V6H4V8Z" />
        </svg>
      )}
    </div>
  );
}
