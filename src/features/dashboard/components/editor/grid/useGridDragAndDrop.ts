// Executive Dashboard V2 (Auftrag 149 / P06):
// Hook für Pointer-basiertes Drag & Drop, Resizing, Auto-Scroll (Scroll-Delta seit Auftrag 151)
// und visuelle Vorschau (Ghost / Reflow) im 12-Spalten-CSS-Grid.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type {
  BreakpointKey,
  DashboardTileConfigV2,
  GridPosition,
} from '../../../model/dashboardConfigV2';
import type { TileMovement } from '../../../core/layoutCommands';
import { planLayoutChange } from '../editorPlacement';
import {
  calculateGridCoordsFromPixel,
  clamp,
  getBreakpointLayout,
  GRID_CONFIGS,
  MAX_TILE_HEIGHT,
  MIN_TILE_HEIGHT,
  MIN_TILE_WIDTH,
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

interface InteractionState {
  mode: 'none' | 'pending_drag' | 'dragging' | 'resizing';
  tileId: string;
  resizeDir?: ResizeDirection;
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
  initialPos: GridPosition;
  currentPointerX: number;
  currentPointerY: number;
}

const IDLE_INTERACTION: InteractionState = {
  mode: 'none',
  tileId: '',
  startX: 0,
  startY: 0,
  startScrollLeft: 0,
  startScrollTop: 0,
  initialPos: { x: 0, y: 0, w: 0, h: 0 },
  currentPointerX: 0,
  currentPointerY: 0,
};

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
  const interactionRef = useRef<InteractionState>(IDLE_INTERACTION);
  // Zuletzt geplante Layoutänderung (wird beim Loslassen committet)
  const pendingMovesRef = useRef<TileMovement[]>([]);
  const autoScrollFrameRef = useRef<number | null>(null);

  /**
   * Berechnet Ziel, Vorschau und geplante Moves aus Zeigerposition UND Scroll-Änderung des
   * Containers seit Interaktionsbeginn (Auftrag 151 / P06b, Befund N-4).
   */
  const updatePreview = useCallback(() => {
    const state = interactionRef.current;
    const container = containerRef.current;
    if (!container || (state.mode !== 'dragging' && state.mode !== 'resizing')) return;

    const { cols, rowHeight, gap } = GRID_CONFIGS[breakpoint];
    const colWidth = (container.getBoundingClientRect().width - (cols - 1) * gap) / cols;
    const deltaPixelX =
      state.currentPointerX - state.startX + container.scrollLeft - state.startScrollLeft;
    const deltaPixelY =
      state.currentPointerY - state.startY + container.scrollTop - state.startScrollTop;
    const deltaX = Math.round(deltaPixelX / (colWidth + gap));
    const deltaY = Math.round(deltaPixelY / (rowHeight + gap));
    const init = state.initialPos;

    let targetPos: GridPosition;
    if (state.mode === 'dragging') {
      targetPos = {
        x: clamp(init.x + deltaX, 0, cols - init.w),
        y: Math.max(0, init.y + deltaY),
        w: init.w,
        h: init.h,
      };
    } else {
      const growsX = state.resizeDir === 'se' || state.resizeDir === 'e';
      const growsY = state.resizeDir === 'se' || state.resizeDir === 's';
      targetPos = {
        x: init.x,
        y: init.y,
        w: growsX ? clamp(init.w + deltaX, MIN_TILE_WIDTH, cols - init.x) : init.w,
        h: growsY ? clamp(init.h + deltaY, MIN_TILE_HEIGHT, MAX_TILE_HEIGHT) : init.h,
      };
    }

    const plan = planLayoutChange(tiles, breakpoint, state.tileId, targetPos);
    pendingMovesRef.current = plan.moves;
    setActiveGhost({ tileId: state.tileId, position: targetPos });
    setPreviewPositions(plan.positions);
  }, [breakpoint, containerRef, tiles]);

  // Auto-Scroll-Schleife; aktualisiert die Vorschau auch ohne Zeigerbewegung
  const stepAutoScroll = useCallback(() => {
    const container = containerRef.current;
    const { mode, currentPointerY } = interactionRef.current;
    if (!container || (mode !== 'dragging' && mode !== 'resizing')) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const distTop = currentPointerY - rect.top;
    const distBottom = rect.bottom - currentPointerY;
    const before = container.scrollTop;

    if (distTop > 0 && distTop < AUTO_SCROLL_EDGE_PX) {
      const factor = 1 - distTop / AUTO_SCROLL_EDGE_PX;
      container.scrollTop -= AUTO_SCROLL_SPEED * factor;
    } else if (distBottom > 0 && distBottom < AUTO_SCROLL_EDGE_PX) {
      const factor = 1 - distBottom / AUTO_SCROLL_EDGE_PX;
      container.scrollTop += AUTO_SCROLL_SPEED * factor;
    }
    if (container.scrollTop !== before) updatePreview();

    autoScrollFrameRef.current = requestAnimationFrame(stepAutoScroll);
  }, [containerRef, updatePreview]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  /** Startzustand einer Interaktion inklusive Scroll-Ausgangslage */
  const beginInteraction = useCallback(
    (
      mode: InteractionState['mode'],
      tileId: string,
      e: ReactPointerEvent,
      resizeDir?: ResizeDirection,
    ): GridPosition | null => {
      const pos = getBreakpointLayout(tiles, breakpoint).get(tileId);
      if (!pos) return null;
      const container = containerRef.current;
      interactionRef.current = {
        mode,
        tileId,
        resizeDir,
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: container?.scrollLeft ?? 0,
        startScrollTop: container?.scrollTop ?? 0,
        initialPos: { ...pos },
        currentPointerX: e.clientX,
        currentPointerY: e.clientY,
      };
      pendingMovesRef.current = [];
      return pos;
    },
    [breakpoint, containerRef, tiles],
  );

  // PointerDown auf Kachelkopf
  const handlePointerDown = useCallback(
    (tileId: string, e: ReactPointerEvent) => {
      if (disabled || e.button !== 0 || breakpoint === 'mobile') return;
      if (!tiles.some((t) => t.id === tileId)) return;
      onSelectTile?.(tileId);
      beginInteraction('pending_drag', tileId, e);
    },
    [disabled, breakpoint, tiles, onSelectTile, beginInteraction],
  );

  // Start Resizing
  const handleResizeStart = useCallback(
    (tileId: string, direction: ResizeDirection, e: ReactPointerEvent) => {
      if (disabled || e.button !== 0 || breakpoint === 'mobile') return;
      if (!tiles.some((t) => t.id === tileId)) return;

      e.stopPropagation();
      onSelectTile?.(tileId);
      const pos = beginInteraction('resizing', tileId, e, direction);
      if (!pos) return;

      setActiveGhost({ tileId, position: { ...pos } });
      stopAutoScroll();
      autoScrollFrameRef.current = requestAnimationFrame(stepAutoScroll);
    },
    [disabled, breakpoint, tiles, onSelectTile, beginInteraction, stepAutoScroll, stopAutoScroll],
  );

  // Global PointerMove
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const state = interactionRef.current;
      if (state.mode === 'none') return;

      state.currentPointerX = e.clientX;
      state.currentPointerY = e.clientY;
      if (!containerRef.current) return;

      // Aktivierung von Pending -> Dragging
      if (state.mode === 'pending_drag') {
        const dist = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
        if (dist < DRAG_THRESHOLD) return;
        state.mode = 'dragging';
        stopAutoScroll();
        autoScrollFrameRef.current = requestAnimationFrame(stepAutoScroll);
      }

      updatePreview();
    };

    const onPointerUp = () => {
      const state = interactionRef.current;
      stopAutoScroll();

      if (state.mode === 'dragging' || state.mode === 'resizing') {
        const moves = pendingMovesRef.current;
        if (moves.length > 0) onCommitLayout(moves);
      }

      interactionRef.current = IDLE_INTERACTION;
      pendingMovesRef.current = [];
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
  }, [containerRef, onCommitLayout, stepAutoScroll, stopAutoScroll, updatePreview]);

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
