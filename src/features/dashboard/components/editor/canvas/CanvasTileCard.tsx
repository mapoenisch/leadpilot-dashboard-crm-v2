// Executive Dashboard V2 (Auftrag 149 / P06):
// Kachelkarte auf dem Canvas mit WAI-ARIA gridcell-Semantik,
// Drag-Handle, Resize-Handles, Schnellaktionen und Renderer-Anbindung.

import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDown, ArrowUp, Copy, FolderInput, GripVertical, Sliders, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  BreakpointKey,
  DashboardTileConfigV2,
  GridPosition,
} from '../../../model/dashboardConfigV2';
import type {
  DashboardFilters,
  DashboardPeriod,
  DashboardTileConfig,
} from '../../../model/dashboardConfig';
import type { DashboardView } from '../../../model/dashboardCatalog';
import { normalizeTileQuery } from '../../../model/tileQuery';
import { LazyDashboardTile, type TileDataHook } from '../../LazyDashboardTile';
import { GridResizeHandle, type ResizeDirection } from '../grid/GridResizeHandle';
import { getGridPlacementClasses } from '../grid/gridTailwindClasses';

export interface CanvasTileCardProps {
  tile: DashboardTileConfigV2;
  position: GridPosition;
  activeBreakpoint: BreakpointKey;
  isSelected: boolean;
  isPreviewMode?: boolean;
  onSelectTile: (tileId: string) => void;
  onRemoveTile: (tileId: string) => void;
  onDuplicateTile: (tileId: string) => void;
  onShowDetails?: (tileId: string) => void;
  onPointerDownHandle: (tileId: string, e: ReactPointerEvent) => void;
  onResizeStart: (tileId: string, dir: ResizeDirection, e: ReactPointerEvent) => void;
  onMoveMobile?: (tileId: string, direction: 'up' | 'down') => void;
  useData: TileDataHook;
  globalTimeframe: string;
  globalPipeline?: string;
  className?: string;
  availableSections?: Array<{ id: string; title: string }>;
  currentSectionId?: string | null;
  onMoveTileToSection?: (tileId: string, targetSectionId: string | null) => void;
}

export function parseTimeframeToPeriod(timeframe: string): DashboardPeriod | undefined {
  if (!timeframe.includes('/')) return undefined;
  const [from, to] = timeframe.split('/');
  if (from && to) return { from, to };
  return undefined;
}

export function convertV2TileToV1(
  tile: DashboardTileConfigV2,
  _globalTimeframe: string,
  globalPipeline?: string,
): DashboardTileConfig {
  const w = tile.layouts.desktop.w;
  const size = w >= 12 ? 'voll' : w >= 9 ? 'gross' : w >= 6 ? 'mittel' : 'klein';

  // Auftrag 154 §2.1: query ist die kanonische Abfragequelle
  const normQuery = normalizeTileQuery(tile);

  let effectivePipeline: string | undefined;
  if (normQuery.pipelineId === null) {
    effectivePipeline = undefined;
  } else if (typeof normQuery.pipelineId === 'string') {
    effectivePipeline = normQuery.pipelineId;
  } else {
    effectivePipeline = tile.pipelineOverride ?? globalPipeline;
  }

  return {
    tileId: tile.id,
    catalogId: tile.catalogId,
    title: tile.title,
    view: tile.presentation as DashboardView,
    size,
    filterMode: tile.timeframeOverride ? 'eigener_zeitraum' : 'dashboard',
    period: tile.timeframeOverride ? parseTimeframeToPeriod(tile.timeframeOverride) : undefined,
    pipeline: effectivePipeline,
  };
}

export function CanvasTileCard({
  tile,
  position,
  activeBreakpoint,
  isSelected,
  isPreviewMode = false,
  onSelectTile,
  onRemoveTile,
  onDuplicateTile,
  onShowDetails = () => {},
  onPointerDownHandle,
  onResizeStart,
  onMoveMobile,
  useData,
  globalTimeframe,
  globalPipeline,
  className,
  availableSections = [],
  currentSectionId,
  onMoveTileToSection,
}: CanvasTileCardProps) {
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const v1Tile = convertV2TileToV1(tile, globalTimeframe, globalPipeline);
  const filters: DashboardFilters = { pipeline: globalPipeline };
  const isMobile = activeBreakpoint === 'mobile';
  const placementClasses = getGridPlacementClasses(position, isMobile);

  return (
    <div
      role="gridcell"
      tabIndex={0}
      data-testid={`canvas-tile-${tile.id}`}
      data-tile-id={tile.id}
      data-selected={String(isSelected)}
      aria-selected={isSelected}
      aria-colindex={position.x + 1}
      aria-rowindex={position.y + 1}
      onClick={(e) => {
        e.stopPropagation();
        onSelectTile(tile.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectTile(tile.id);
        }
      }}
      className={cn(
        'group relative min-w-0 rounded-xl transition-all duration-150',
        placementClasses,
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-[var(--color-bg-deep,#051413)] shadow-xl z-10'
          : !isPreviewMode && 'hover:ring-1 hover:ring-primary/40',
        className,
      )}
    >
      {/* Drag-Handle im Bearbeitungsmodus (nur Desktop & Tablet) */}
      {!isPreviewMode && !isMobile && (
        <div
          data-testid={`drag-handle-${tile.id}`}
          data-drag-handle="true"
          title="Kachel verschieben"
          onPointerDown={(e) => onPointerDownHandle(tile.id, e)}
          className="absolute top-2 left-2 z-20 flex h-6 w-6 cursor-grab active:cursor-grabbing items-center justify-center rounded bg-[var(--color-bg-deep,#051413)]/80 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 hover:text-white transition-opacity"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Schnellaktions-Leiste im Bearbeitungsmodus */}
      {!isPreviewMode && (
        <div
          data-testid={`tile-quick-actions-${tile.id}`}
          className={cn(
            'absolute -top-3 right-3 z-20 flex items-center gap-1 rounded-md border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] p-0.5 shadow-md transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          {isMobile && onMoveMobile && (
            <>
              <button
                type="button"
                data-testid={`tile-move-up-btn-${tile.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveMobile(tile.id, 'up');
                }}
                className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white"
                title="Nach oben"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                data-testid={`tile-move-down-btn-${tile.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveMobile(tile.id, 'down');
                }}
                className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white"
                title="Nach unten"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </>
          )}

          {availableSections && availableSections.length > 0 && onMoveTileToSection && (
            <div className="relative">
              <button
                type="button"
                data-testid={`tile-move-section-btn-${tile.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSectionMenu((prev) => !prev);
                }}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded transition-colors',
                  showSectionMenu
                    ? 'bg-primary/20 text-primary'
                    : 'text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white',
                )}
                title="In Sektion verschieben…"
              >
                <FolderInput className="h-3 w-3" />
              </button>

              {showSectionMenu && (
                <div
                  data-testid={`tile-move-section-menu-${tile.id}`}
                  className="absolute top-7 right-0 z-50 min-w-[140px] rounded-md border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] p-1 shadow-xl text-xs space-y-0.5"
                >
                  <div className="px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                    Bereich wählen
                  </div>
                  <button
                    type="button"
                    data-testid={`tile-move-section-option-unsectioned-${tile.id}`}
                    onClick={() => {
                      onMoveTileToSection(tile.id, null);
                      setShowSectionMenu(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors',
                      currentSectionId === null || currentSectionId === undefined
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'text-[var(--color-text-soft)] hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <span>Ohne Sektion</span>
                    {(currentSectionId === null || currentSectionId === undefined) && (
                      <span className="text-[10px] text-primary">✓</span>
                    )}
                  </button>
                  {availableSections.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      data-testid={`tile-move-section-option-${sec.id}-${tile.id}`}
                      onClick={() => {
                        onMoveTileToSection(tile.id, sec.id);
                        setShowSectionMenu(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors',
                        currentSectionId === sec.id
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-[var(--color-text-soft)] hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <span className="truncate">{sec.title}</span>
                      {currentSectionId === sec.id && (
                        <span className="text-[10px] text-primary">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            data-testid={`tile-edit-btn-${tile.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTile(tile.id);
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-white/10 hover:text-primary transition-colors"
            title="Im Inspector konfigurieren"
          >
            <Sliders className="h-3 w-3" />
          </button>
          <button
            type="button"
            data-testid={`tile-duplicate-btn-${tile.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateTile(tile.id);
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white transition-colors"
            title="Kachel duplizieren"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            data-testid={`tile-remove-btn-${tile.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveTile(tile.id);
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Kachel entfernen"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Resize-Handles (nur im Edit-Modus und nicht auf Mobile) */}
      {!isPreviewMode && !isMobile && (
        <>
          <GridResizeHandle tileId={tile.id} direction="se" onResizeStart={onResizeStart} />
          <GridResizeHandle tileId={tile.id} direction="e" onResizeStart={onResizeStart} />
          <GridResizeHandle tileId={tile.id} direction="s" onResizeStart={onResizeStart} />
        </>
      )}

      {/* Eigentlicher Kachel-Renderer */}
      <div className="h-full w-full">
        <LazyDashboardTile
          tile={v1Tile}
          filters={filters}
          useData={useData}
          onShowDetails={onShowDetails}
          detailsBlocked={!isPreviewMode}
        />
      </div>
    </div>
  );
}
