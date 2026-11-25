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
import { useTileMinSizes } from '../grid/tileMinSizes';
import { getGridPlacementClasses } from '../grid/gridTailwindClasses';
import { useAreaListMode } from '../canvas/editorListMode';

export const ARMED_ANNOUNCEMENT =
  'Kachel aufgenommen. Zum Verschieben ziehen, zum Ablegen loslassen.';

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
  alarmRules?: Record<string, { status: string; reason?: string }>;
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
  onShowDetails = () => {},
  onMoveTileToSection,
  availableSections = [],
  currentSectionId,
  isPreviewMode = false,
  useData,
  globalTimeframe,
  globalPipeline,
  className,
  alarmRules,
}: SectionAreaGridV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auftrag 174b (K2): gemessene Mindestgröße je Kachel

  const minSizes = useTileMinSizes();

  // 1. Pointer Drag & Drop und Resizing innerhalb des Bereichs
  const { activeGhost, previewPositions, armedTileId, handlePointerDown, handleResizeStart } =
    useGridDragAndDrop({
      tiles,
      breakpoint: activeBreakpoint,
      containerRef,
      onCommitLayout,
      onSelectTile,
      disabled: isPreviewMode,
      getMinSize: minSizes.get,
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
    getMinSize: minSizes.get,
    containerRef,
  });

  const { cols } = GRID_CONFIGS[activeBreakpoint];
  const isMobile = activeBreakpoint === 'mobile';

  // Überlappungsfreies Layout für diesen Bereich
  const layout = useMemo(
    () => getBreakpointLayout(tiles, activeBreakpoint),
    [tiles, activeBreakpoint],
  );

  const gridLabel = areaTitle ? `Sektion ${areaTitle}` : 'Dashboard-Editor Arbeitsfläche';

  // Auftrag 172: Smartphone-Ansicht = Bearbeiten per Liste (Reihenfolge des Smartphone-Layouts)
  const list = useAreaListMode(tiles, activeBreakpoint, isPreviewMode, onCommitLayout);

  return (
    <>
      {/* Screenreader Live-Region für Bereichsansagen (außerhalb des grid, Auftrag 172) */}
      <div role="status" aria-live="polite" className="sr-only">
        {armedTileId ? ARMED_ANNOUNCEMENT : gridAnnouncement}
      </div>
      <div
        ref={containerRef}
        role="grid"
        aria-label={gridLabel}
        aria-colcount={cols}
        data-testid={areaId ? `section-grid-${areaId}` : 'canvas-grid'}
        data-area-id={areaId ?? 'unsectioned'}
        data-edit-mode={list.listMode ? 'liste' : 'raster'}
        className={cn(
          'w-full relative transition-all motion-reduce:transition-none grid',
          isMobile
            ? 'grid-cols-1 auto-rows-auto gap-3'
            : activeBreakpoint === 'tablet'
              ? 'grid-cols-6 auto-rows-[72px] gap-3'
              : 'grid-cols-12 auto-rows-[80px] gap-4',
          className,
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

        {/* Auftrag 172: eine Zeile mit display:contents, damit gridcells eine row als Eltern haben */}
        <div role="row" className="contents">
          {list.orderedTiles.map((tile) => {
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
                useData={useData}
                globalTimeframe={globalTimeframe}
                globalPipeline={globalPipeline}
                availableSections={availableSections}
                currentSectionId={currentSectionId ?? areaId}
                onMoveTileToSection={onMoveTileToSection}
                alarm={alarmRules ? alarmRules[tile.id] : undefined}
                isDragArmed={armedTileId === tile.id}
                onFitMinimum={minSizes.set}
                listInfo={list.listMode ? list.infoFor(tile.id) : undefined}
                onListMove={list.listMode ? list.moveTile : undefined}
                onListResize={list.listMode ? list.resizeTile : undefined}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
