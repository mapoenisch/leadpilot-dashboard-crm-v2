// Executive Dashboard V2 (Auftrag 157 / P09a):
// 12-Spalten-Raster für einen einzelnen Bereich (Sektion oder 'Ohne Sektion').
// Kapselt useGridDragAndDrop und useGridKeyboard auf Bereichsebene.

import { useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { BreakpointKey, DashboardTileConfigV2 } from '../../../model/dashboardConfigV2';
import type { TileMovement } from '../../../core/layoutCommands';
import type { TileDataHook } from '../../LazyDashboardTile';
import { CanvasTileCard } from '../canvas/CanvasTileCard';
import { getBreakpointLayout, GRID_CONFIGS } from '../grid/gridEngine';
import { useGridDragAndDrop } from '../grid/useGridDragAndDrop';
import { useGridKeyboard } from '../grid/useGridKeyboard';
import { getGridPlacementClasses } from '../grid/gridTailwindClasses';

export interface SectionAreaGridV2Props {
  areaId: string | null;
  areaTitle?: string;
  tiles: DashboardTileConfigV2[];
  activeBreakpoint: BreakpointKey;
  selectedTileId: string | null;
  onSelectTile: (tileId: string) => void;
  onDeselect: () => void;
  onRemoveTile: (tileId: string) => void;
  onDuplicateTile: (tileId: string) => void;
  onCommitLayout?: (moves: TileMovement[]) => void;
  onMoveMobile?: (tileId: string, direction: 'up' | 'down') => void;
  onShowDetails?: (tileId: string) => void;
  onMoveTileToSection?: (tileId: string, targetSectionId: string | null) => void;
  availableSections?: Array<{ id: string; title: string }>;
  currentSectionId?: string | null;
  isPreviewMode?: boolean;
  useData: TileDataHook;
  globalTimeframe: string;
  globalPipeline?: string;
  className?: string;
}

export function SectionAreaGridV2({
  areaId,
  areaTitle,
  tiles,
  activeBreakpoint,
  selectedTileId,
  onSelectTile,
  onDeselect,
  onRemoveTile,
  onDuplicateTile,
  onCommitLayout = () => {},
  onMoveMobile,
  onShowDetails = () => {},
  onMoveTileToSection,
  availableSections = [],
  currentSectionId,
  isPreviewMode = false,
  useData,
  globalTimeframe,
  globalPipeline,
  className,
}: SectionAreaGridV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Pointer Drag & Drop und Resizing innerhalb des Bereichs
  const { activeGhost, previewPositions, handlePointerDown, handleResizeStart } =
    useGridDragAndDrop({
      tiles,
      breakpoint: activeBreakpoint,
      containerRef,
      onCommitLayout,
      onSelectTile,
      disabled: isPreviewMode,
    });

  // 2. WAI-ARIA Grid Keyboard-Steuerung innerhalb des Bereichs
  const { announcement: gridAnnouncement } = useGridKeyboard({
    tiles,
    breakpoint: activeBreakpoint,
    selectedTileId,
    onSelectTile,
    onDeselect,
    onCommitLayout,
    disabled: isPreviewMode,
  });

  const { cols } = GRID_CONFIGS[activeBreakpoint];
  const isMobile = activeBreakpoint === 'mobile';

  // Überlappungsfreies Layout für diesen Bereich
  const layout = useMemo(
    () => getBreakpointLayout(tiles, activeBreakpoint),
    [tiles, activeBreakpoint],
  );

  const gridLabel = areaTitle ? `Sektion ${areaTitle}` : 'Dashboard-Editor Arbeitsfläche';

  return (
    <div
      ref={containerRef}
      role="grid"
      aria-label={gridLabel}
      aria-colcount={cols}
      data-testid={areaId ? `section-grid-${areaId}` : 'canvas-grid'}
      data-area-id={areaId ?? 'unsectioned'}
      className={cn(
        'w-full relative transition-all grid',
        isMobile
          ? 'grid-cols-1 auto-rows-auto gap-3'
          : activeBreakpoint === 'tablet'
            ? 'grid-cols-6 auto-rows-[72px] gap-3'
            : 'grid-cols-12 auto-rows-[80px] gap-4',
        className,
      )}
    >
      {/* Screenreader Live-Region für Bereichsansagen */}
      <div role="status" aria-live="polite" className="sr-only">
        {gridAnnouncement}
      </div>

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

      {tiles.map((tile) => {
        const isSelected = selectedTileId === tile.id;
        const pos = previewPositions?.get(tile.id) ?? layout.get(tile.id) ?? tile.layouts.desktop;

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
            globalTimeframe={globalTimeframe}
            globalPipeline={globalPipeline}
            availableSections={availableSections}
            currentSectionId={currentSectionId ?? areaId}
            onMoveTileToSection={onMoveTileToSection}
          />
        );
      })}
    </div>
  );
}
