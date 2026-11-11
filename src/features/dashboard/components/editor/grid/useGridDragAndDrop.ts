// Executive Dashboard V2 (Auftrag 149 / P06):
// Hook für Pointer-basiertes Drag & Drop, Resizing, Auto-Scroll
// und visuelle Vorschau (Ghost / Reflow) im 12-Spalten-CSS-Grid.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type {
  BreakpointKey,
  DashboardTileConfigV2,
  GridPosition,
} from '../../../model/dashboardConfigV2';
import {
  calculateGridCoordsFromPixel,
  clamp,
  compactLayout,
  getTileGridPosition,
  GRID_CONFIGS,
  MAX_TILE_HEIGHT,
  MIN_TILE_HEIGHT,
  MIN_TILE_WIDTH,
  resolveCollisions,
} from './gridEngine';
import type { ResizeDirection } from './GridResizeHandle';

export interface UseGridDragAndDropOptions {
  tiles: readonly DashboardTileConfigV2[];
  breakpoint: BreakpointKey;
  containerRef: React.RefObject<HTMLDivElement>;
  onCommitLayout: (moves: Array<{ tileId: string; from: GridPosition; to: GridPosition }>) => void;
  onSelectTile?: (tileId: string) => void;
  disabled?: boolean;
}

export interface DragGhostState {
  tileId: string;
  position: GridPosition;
  isDropPlaceholder?: boolean;
}

const DRAG_THRESHOLD = 5; // Pixel-Mindestbewegung vor Drag-Aktivierung
const AUTO_SCROLL_EDGE_PX = 60;
const AUTO_SCROLL_SPEED = 12;

export function useGridDragAndDrop({
  tiles,
  breakpoint,
  containerRef,
  onCommitLayout,
  onSelectTile,
  disabled = false,
}: UseGridDragAndDropOptions) {
  const [activeGhost, setActiveGhost] = useState<DragGhostState | null>(null);
  const [previewPositions, setPreviewPositions] = useState<Map<string, GridPosition> | null>(null);

  // Drag-/Resize-Interaktionsstatus
  const interactionRef = useRef<{
    mode: 'none' | 'pending_drag' | 'dragging' | 'resizing';
    tileId: string;
    resizeDir?: ResizeDirection;
    startX: number;
    startY: number;
    initialPos: GridPosition;
    currentPointerX: number;
    currentPointerY: number;
  }>({
    mode: 'none',
    tileId: '',
    startX: 0,
    startY: 0,
    initialPos: { x: 0, y: 0, w: 0, h: 0 },
    currentPointerX: 0,
    currentPointerY: 0,
  });

  const autoScrollFrameRef = useRef<number | null>(null);

  // Auto-Scroll-Schleife
  const stepAutoScroll = useCallback(() => {
    const container = containerRef.current;
    const { mode, currentPointerY } = interactionRef.current;
    if (!container || (mode !== 'dragging' && mode !== 'resizing')) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const distTop = currentPointerY - rect.top;
    const distBottom = rect.bottom - currentPointerY;

    if (distTop > 0 && distTop < AUTO_SCROLL_EDGE_PX) {
      const factor = 1 - distTop / AUTO_SCROLL_EDGE_PX;
      container.scrollTop -= AUTO_SCROLL_SPEED * factor;
    } else if (distBottom > 0 && distBottom < AUTO_SCROLL_EDGE_PX) {
      const factor = 1 - distBottom / AUTO_SCROLL_EDGE_PX;
      container.scrollTop += AUTO_SCROLL_SPEED * factor;
    }

    autoScrollFrameRef.current = requestAnimationFrame(stepAutoScroll);
  }, [containerRef]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  // PointerDown auf Kachelkopf
  const handlePointerDown = useCallback(
    (tileId: string, e: ReactPointerEvent) => {
      if (disabled || e.button !== 0 || breakpoint === 'mobile') return;
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;

      onSelectTile?.(tileId);
      const pos = getTileGridPosition(tile, breakpoint);

      interactionRef.current = {
        mode: 'pending_drag',
        tileId,
        startX: e.clientX,
        startY: e.clientY,
        initialPos: { ...pos },
        currentPointerX: e.clientX,
        currentPointerY: e.clientY,
      };
    },
    [disabled, breakpoint, tiles, onSelectTile],
  );

  // Start Resizing
  const handleResizeStart = useCallback(
    (tileId: string, direction: ResizeDirection, e: ReactPointerEvent) => {
      if (disabled || e.button !== 0 || breakpoint === 'mobile') return;
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;

      e.stopPropagation();
      onSelectTile?.(tileId);
      const pos = getTileGridPosition(tile, breakpoint);

      interactionRef.current = {
        mode: 'resizing',
        tileId,
        resizeDir: direction,
        startX: e.clientX,
        startY: e.clientY,
        initialPos: { ...pos },
        currentPointerX: e.clientX,
        currentPointerY: e.clientY,
      };

      setActiveGhost({ tileId, position: { ...pos } });
      stopAutoScroll();
      autoScrollFrameRef.current = requestAnimationFrame(stepAutoScroll);
    },
    [disabled, breakpoint, tiles, onSelectTile, stepAutoScroll, stopAutoScroll],
  );

  // Global PointerMove
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const state = interactionRef.current;
      if (state.mode === 'none') return;

      state.currentPointerX = e.clientX;
      state.currentPointerY = e.clientY;

      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();

      // Aktivierung von Pending -> Dragging
      if (state.mode === 'pending_drag') {
        const dist = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
        if (dist >= DRAG_THRESHOLD) {
          state.mode = 'dragging';
          stopAutoScroll();
          autoScrollFrameRef.current = requestAnimationFrame(stepAutoScroll);
        } else {
          return;
        }
      }

      const { cols, rowHeight, gap } = GRID_CONFIGS[breakpoint];
      const colWidth = (containerRect.width - (cols - 1) * gap) / cols;

      if (state.mode === 'dragging') {
        const deltaPixelX = e.clientX - state.startX;
        const deltaPixelY = e.clientY - state.startY;

        const deltaGridX = Math.round(deltaPixelX / (colWidth + gap));
        const deltaGridY = Math.round(deltaPixelY / (rowHeight + gap));

        const targetX = clamp(state.initialPos.x + deltaGridX, 0, cols - state.initialPos.w);
        const targetY = Math.max(0, state.initialPos.y + deltaGridY);

        const targetPos: GridPosition = {
          x: targetX,
          y: targetY,
          w: state.initialPos.w,
          h: state.initialPos.h,
        };

        setActiveGhost({ tileId: state.tileId, position: targetPos });
        const collisions = resolveCollisions(tiles, state.tileId, targetPos, breakpoint);
        const compacted = compactLayout(collisions, state.tileId);
        setPreviewPositions(compacted);
      } else if (state.mode === 'resizing') {
        const deltaPixelX = e.clientX - state.startX;
        const deltaPixelY = e.clientY - state.startY;

        const deltaGridW = Math.round(deltaPixelX / (colWidth + gap));
        const deltaGridH = Math.round(deltaPixelY / (rowHeight + gap));

        let newW = state.initialPos.w;
        let newH = state.initialPos.h;

        if (state.resizeDir === 'se' || state.resizeDir === 'e') {
          newW = clamp(state.initialPos.w + deltaGridW, MIN_TILE_WIDTH, cols - state.initialPos.x);
        }
        if (state.resizeDir === 'se' || state.resizeDir === 's') {
          newH = clamp(state.initialPos.h + deltaGridH, MIN_TILE_HEIGHT, MAX_TILE_HEIGHT);
        }

        const targetPos: GridPosition = {
          x: state.initialPos.x,
          y: state.initialPos.y,
          w: newW,
          h: newH,
        };

        setActiveGhost({ tileId: state.tileId, position: targetPos });
        const collisions = resolveCollisions(tiles, state.tileId, targetPos, breakpoint);
        const compacted = compactLayout(collisions, state.tileId);
        setPreviewPositions(compacted);
      }
    };

    const onPointerUp = () => {
      const state = interactionRef.current;
      stopAutoScroll();

      if (state.mode === 'dragging' || state.mode === 'resizing') {
        if (previewPositions) {
          const moves: Array<{ tileId: string; from: GridPosition; to: GridPosition }> = [];

          for (const tile of tiles) {
            const initial = getTileGridPosition(tile, breakpoint);
            const target = previewPositions.get(tile.id);
            if (
              target &&
              (target.x !== initial.x ||
                target.y !== initial.y ||
                target.w !== initial.w ||
                target.h !== initial.h)
            ) {
              moves.push({
                tileId: tile.id,
                from: initial,
                to: target,
              });
            }
          }

          if (moves.length > 0) {
            onCommitLayout(moves);
          }
        }
      }

      interactionRef.current = {
        mode: 'none',
        tileId: '',
        startX: 0,
        startY: 0,
        initialPos: { x: 0, y: 0, w: 0, h: 0 },
        currentPointerX: 0,
        currentPointerY: 0,
      };
      setActiveGhost(null);
      setPreviewPositions(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      stopAutoScroll();
    };
  }, [
    breakpoint,
    containerRef,
    onCommitLayout,
    previewPositions,
    stepAutoScroll,
    stopAutoScroll,
    tiles,
  ]);

  // HTML5 Drag-and-Drop Unterstützung für WidgetLibrary -> Canvas
  const handleCanvasDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || breakpoint === 'mobile') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();

      const coords = calculateGridCoordsFromPixel(
        e.clientX,
        e.clientY,
        containerRect,
        container.scrollLeft,
        container.scrollTop,
        breakpoint,
      );

      const targetPos: GridPosition = {
        x: coords.x,
        y: coords.y,
        w: 6,
        h: 4,
      };

      setActiveGhost({
        tileId: '__drop_placeholder__',
        position: targetPos,
        isDropPlaceholder: true,
      });
    },
    [breakpoint, containerRef, disabled],
  );

  const handleCanvasDragLeave = useCallback(() => {
    if (activeGhost?.isDropPlaceholder) {
      setActiveGhost(null);
    }
  }, [activeGhost]);

  return {
    activeGhost,
    previewPositions,
    isInteracting: interactionRef.current.mode !== 'none',
    handlePointerDown,
    handleResizeStart,
    handleCanvasDragOver,
    handleCanvasDragLeave,
  };
}
