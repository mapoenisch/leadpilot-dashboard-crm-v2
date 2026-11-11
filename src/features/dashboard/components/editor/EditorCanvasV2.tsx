// Executive Dashboard V2 (Auftrag 149 / P06):
// 12-Spalten-Canvas (Zone Mitte) mit nativer CSS-Grid-Rasterengine,
// Kollisionserkennung, Reflow, Pointer-Drag & Drop, Resizing und WAI-ARIA grid.

import { useMemo, useRef } from 'react';
import type { DragEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { BreakpointKey, DashboardConfigV2, GridPosition } from '../../model/dashboardConfigV2';
import type { TileMovement } from '../../core/layoutCommands';
import type { TileDataHook } from '../LazyDashboardTile';
import { CanvasTileCard, convertV2TileToV1, parseTimeframeToPeriod } from './canvas/CanvasTileCard';
import { calculateGridCoordsFromPixel, getBreakpointLayout, GRID_CONFIGS } from './grid/gridEngine';
import { isAddableCatalogId } from './editorPlacement';
import { useGridDragAndDrop } from './grid/useGridDragAndDrop';
import { useGridKeyboard } from './grid/useGridKeyboard';
import { getGridPlacementClasses } from './grid/gridTailwindClasses';

export { convertV2TileToV1, parseTimeframeToPeriod };

export interface EditorCanvasV2Props {
  config: DashboardConfigV2;
  activeBreakpoint: BreakpointKey;
  selectedTileId: string | null;
  onSelectTile: (tileId: string) => void;
  onDeselect: () => void;
  onRemoveTile: (tileId: string) => void;
  onDuplicateTile: (tileId: string) => void;
  onCommitLayout?: (moves: TileMovement[]) => void;
  onAddTileAtPosition?: (catalogId: string, position: GridPosition) => void;
  onMoveMobile?: (tileId: string, direction: 'up' | 'down') => void;
  onShowDetails?: (tileId: string) => void;
  onAddTileClick?: () => void;
  isPreviewMode?: boolean;
  useData: TileDataHook;
  className?: string;
}

export function EditorCanvasV2({
  config,
  activeBreakpoint,
  selectedTileId,
  onSelectTile,
  onDeselect,
  onRemoveTile,
  onDuplicateTile,
  onCommitLayout = () => {},
  onAddTileAtPosition,
  onMoveMobile,
  onShowDetails = () => {},
  onAddTileClick,
  isPreviewMode = false,
  useData,
  className,
}: EditorCanvasV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Pointer-Drag & Drop und Resizing
  const {
    activeGhost,
    previewPositions,
    handlePointerDown,
    handleResizeStart,
    handleCanvasDragOver,
    handleCanvasDragLeave,
  } = useGridDragAndDrop({
    tiles: config.tiles,
    breakpoint: activeBreakpoint,
    containerRef,
    onCommitLayout,
    onSelectTile,
    disabled: isPreviewMode,
  });

  // 2. WAI-ARIA Grid Keyboard-Steuerung
  const { announcement } = useGridKeyboard({
    tiles: config.tiles,
    breakpoint: activeBreakpoint,
    selectedTileId,
    onSelectTile,
    onDeselect,
    onCommitLayout,
    disabled: isPreviewMode,
  });

  const { cols } = GRID_CONFIGS[activeBreakpoint];
  const isMobile = activeBreakpoint === 'mobile';

  // Überlappungsfreies, abgeleitetes Layout des aktiven Breakpoints (Auftrag 151 / P06b)
  const layout = useMemo(
    () => getBreakpointLayout(config.tiles, activeBreakpoint),
    [config.tiles, activeBreakpoint],
  );

  // HTML5 Drop von Widget-Bibliothek
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (isPreviewMode) return;
    // Nur Katalog-IDs: eigener MIME-Typ bevorzugt, `text/plain` nur nach Katalogprüfung (N-5)
    const catalogId = (
      e.dataTransfer.getData('text/leadpilot-kpi') || e.dataTransfer.getData('text/plain')
    ).trim();
    if (!isAddableCatalogId(catalogId) || !onAddTileAtPosition || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const coords = calculateGridCoordsFromPixel(
      e.clientX,
      e.clientY,
      containerRect,
      containerRef.current.scrollLeft,
      containerRef.current.scrollTop,
      activeBreakpoint,
    );

    onAddTileAtPosition(catalogId, {
      x: coords.x,
      y: coords.y,
      w: isMobile ? 1 : Math.min(6, cols),
      h: 4,
    });
  };

  return (
    <main
      ref={containerRef}
      data-testid="editor-canvas"
      data-breakpoint={activeBreakpoint}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative flex-1 overflow-y-auto p-4 transition-colors',
        !isPreviewMode &&
          'bg-[radial-gradient(#1b3d39_1px,transparent_1px)] [background-size:16px_16px]',
        className,
      )}
    >
      {/* Screenreader Live-Region für barrierefreie Ansagen */}
      <div
        role="status"
        aria-live="polite"
        data-testid="grid-a11y-announcement"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Leerzustand wenn keine Kacheln vorhanden sind */}
      {config.tiles.length === 0 ? (
        <div
          data-testid="canvas-empty-state"
          className="flex min-h-[380px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border,#1b3d39)] p-8 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Plus className="h-6 w-6" />
          </div>
          <h3 className="m-0 text-base font-semibold text-white">Dein Dashboard ist noch leer</h3>
          <p className="m-0 mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">
            Ziehe Kennzahlen per Drag & Drop aus der linken Widget-Bibliothek auf das Raster oder
            klicke auf Hinzufügen.
          </p>
          {onAddTileClick && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              data-testid="empty-state-add-btn"
              onClick={onAddTileClick}
              className="mt-4 gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Kachel aus Bibliothek hinzufügen</span>
            </Button>
          )}
        </div>
      ) : (
        /* WAI-ARIA Grid-Raster */
        <div
          role="grid"
          aria-label="Dashboard-Editor Arbeitsfläche"
          aria-colcount={cols}
          data-testid="canvas-grid"
          className={cn(
            'w-full relative transition-all grid',
            isMobile
              ? 'grid-cols-1 auto-rows-auto gap-3'
              : activeBreakpoint === 'tablet'
                ? 'grid-cols-6 auto-rows-[72px] gap-3'
                : 'grid-cols-12 auto-rows-[80px] gap-4',
          )}
        >
          {/* Drag-Ghost / Platzhalter-Vorschau */}
          {activeGhost && (
            <div
              data-testid="canvas-drag-ghost"
              className={cn(
                'pointer-events-none rounded-xl border-2 border-dashed border-primary bg-primary/15 shadow-xl z-20 min-h-[80px] transition-all duration-75',
                getGridPlacementClasses(activeGhost.position, isMobile),
              )}
            />
          )}

          {config.tiles.map((tile) => {
            const isSelected = selectedTileId === tile.id;
            const pos =
              previewPositions?.get(tile.id) ?? layout.get(tile.id) ?? tile.layouts.desktop;

            return (
              <CanvasTileCard
                key={tile.id}
                tile={tile}
                position={pos}
                activeBreakpoint={activeBreakpoint}
                isSelected={isSelected}
                isPreviewMode={isPreviewMode}
                onSelectTile={onSelectTile}
                onRemoveTile={onRemoveTile}
                onDuplicateTile={onDuplicateTile}
                onShowDetails={onShowDetails}
                onPointerDownHandle={handlePointerDown}
                onResizeStart={handleResizeStart}
                onMoveMobile={onMoveMobile}
                useData={useData}
                globalTimeframe={config.globalTimeframe}
                globalPipeline={config.globalPipeline}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
