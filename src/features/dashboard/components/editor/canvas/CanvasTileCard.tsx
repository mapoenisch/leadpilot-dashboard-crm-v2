// Executive Dashboard V2 (Auftrag 149 / P06):
// Kachelkarte auf dem Canvas mit WAI-ARIA gridcell-Semantik,
// Drag-Handle, Resize-Handles, Schnellaktionen und Renderer-Anbindung.

import type { PointerEvent as ReactPointerEvent } from 'react';
import { Copy, GripVertical, Sliders, Trash2 } from 'lucide-react';
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
import { getCatalogEntry, type DashboardView } from '../../../model/dashboardCatalog';
import { normalizeTileQuery } from '../../../model/tileQuery';
import { LazyDashboardTile, type TileDataHook } from '../../LazyDashboardTile';
import { GridResizeHandle, type ResizeDirection } from '../grid/GridResizeHandle';
import { getGridPlacementClasses } from '../grid/gridTailwindClasses';
import {
  MOBILE_SIZE_MIN_HEIGHT_CLASS,
  mobileSizeFromHeight,
  useEditorListModeContext,
  type ListModeTileInfo,
  type MobileTileSize,
} from './editorListMode';
import { MobileTileListActions } from './MobileTileListActions';
import type { TileFitMinimum } from '../../tileFit';
import { TileSectionMenu } from './TileSectionMenu';

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
  /** @deprecated Auftrag 172: ersetzt durch den Listenmodus (onListMove). */
  onMoveMobile?: (tileId: string, direction: 'up' | 'down') => void;
  useData: TileDataHook;
  globalTimeframe: string;
  globalPipeline?: string;
  className?: string;
  availableSections?: Array<{ id: string; title: string }>;
  currentSectionId?: string | null;
  onMoveTileToSection?: (tileId: string, targetSectionId: string | null) => void;
  alarm?: { status?: string; reason?: string };
  /** Auftrag 172: Listenmodus (Smartphone-Ansicht) – Position und Größe in der Liste. */
  listInfo?: ListModeTileInfo;
  onListMove?: (tileId: string, direction: 'up' | 'down') => void;
  onListResize?: (tileId: string, size: MobileTileSize) => void;
  /** Auftrag 172: Kachel per langem Drücken (Touch) aufgenommen. */
  isDragArmed?: boolean;
  /** Auftrag 174b (K2): gemessener Platzbedarf der Kachel bei Mindestfaktor (px). */
  onFitMinimum?: (tileId: string, minimum: TileFitMinimum) => void;
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
    query: tile.query,
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
  useData,
  globalTimeframe,
  globalPipeline,
  className,
  availableSections = [],
  currentSectionId,
  onMoveTileToSection,
  alarm,
  listInfo,
  onListMove,
  onListResize,
  isDragArmed = false,
  onFitMinimum,
}: CanvasTileCardProps) {
  const v1Tile = convertV2TileToV1(tile, globalTimeframe, globalPipeline);
  const filters: DashboardFilters = { pipeline: globalPipeline };
  const isMobile = activeBreakpoint === 'mobile';
  const placementClasses = getGridPlacementClasses(position, isMobile);
  const listContext = useEditorListModeContext();
  const listMode = !isPreviewMode && Boolean(listInfo && onListMove && onListResize);
  const tileTitle = tile.title?.trim() || getCatalogEntry(tile.catalogId)?.name || tile.catalogId;
  // Auftrag 174b (K2): Im Raster füllt die Kachel ihre Fläche, der Inhalt wird eingepasst.
  // In der Liste (Smartphone) bestimmt der Inhalt die Höhe wie bisher.
  const fit = !listMode && !isMobile;

  return (
    <div
      role="gridcell"
      tabIndex={0}
      data-testid={`canvas-tile-${tile.id}`}
      data-tile-id={tile.id}
      data-selected={String(isSelected)}
      data-drag-armed={isDragArmed ? 'true' : undefined}
      aria-selected={isSelected}
      aria-colindex={position.x + 1}
      aria-rowindex={position.y + 1}
      onClick={(e) => {
        e.stopPropagation();
        onSelectTile(tile.id);
      }}
      onKeyDown={(e) => {
        // Nur direkte Tastendrücke auf der Gridcell selbst behandeln; fokussierte Buttons/Schalter
        // innerhalb der Kachel (z. B. Erläuterungsschalter, Details) müssen Enter/Space behalten.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectTile(tile.id);
        }
      }}
      className={cn(
        'group relative min-w-0 rounded-xl transition-all duration-150 motion-reduce:transition-none',
        placementClasses,
        isMobile && MOBILE_SIZE_MIN_HEIGHT_CLASS[mobileSizeFromHeight(position.h)],
        listMode && 'flex flex-col',
        isDragArmed &&
          'scale-[1.02] outline-dashed outline-2 outline-offset-4 outline-primary shadow-2xl',
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-[var(--color-bg-deep,#051413)] shadow-xl z-10'
          : !isPreviewMode && 'hover:ring-1 hover:ring-primary/40',
        className,
      )}
    >
      {/* Schnellaktions-Leiste im Bearbeitungsmodus (im Listenmodus ersetzt durch die Aktionsleiste) */}
      {!isPreviewMode && !listMode && (
        <div
          data-testid={`tile-quick-actions-${tile.id}`}
          className={cn(
            'absolute bottom-full right-3 z-20 flex translate-y-[6px] items-center gap-1 rounded-md border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] p-0.5 shadow-md transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          {/* Auftrag 174b (K1): Ziehgriff in der Leiste statt über Kategorie und Titel (nur Desktop & Tablet) */}
          {!isMobile && (
            <div
              data-testid={`drag-handle-${tile.id}`}
              data-drag-handle="true"
              title="Kachel verschieben"
              onPointerDown={(e) => onPointerDownHandle(tile.id, e)}
              className="flex h-6 w-6 touch-none cursor-grab active:cursor-grabbing items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white transition-colors"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}

          {availableSections && availableSections.length > 0 && onMoveTileToSection && (
            <TileSectionMenu
              tileId={tile.id}
              availableSections={availableSections}
              currentSectionId={currentSectionId}
              onMoveTileToSection={onMoveTileToSection}
            />
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

      {/* Eigentlicher Kachel-Renderer. Auftrag 174a (L2/L4): im Raster in der belegten Fläche
          eingefasst. Auftrag 174b (K2/K5): ohne Scrollen, der Inhalt wird eingepasst. Container
          für die KPI-Schriftgröße (L2). */}
      <div
        data-testid={`tile-body-${tile.id}`}
        className={
          listMode
            ? 'w-full flex-1'
            : 'h-full w-full overflow-hidden rounded-xl [container-type:inline-size]'
        }
      >
        <LazyDashboardTile
          tile={v1Tile}
          filters={filters}
          useData={useData}
          onShowDetails={onShowDetails}
          detailsBlocked={!isPreviewMode}
          threshold={tile.threshold}
          fit={fit}
          onFitMinimum={onFitMinimum ? (minimum) => onFitMinimum(tile.id, minimum) : undefined}
          alarm={(() => {
            const tr = tile as unknown as Record<string, unknown>;
            const a =
              alarm ??
              (tr.alarm as { status?: string; reason?: string } | undefined) ??
              (tr.alarmRule as { status?: string; reason?: string } | undefined);
            return a?.status ? { status: a.status, reason: a.reason } : undefined;
          })()}
        />
      </div>

      {/* Auftrag 172: Bearbeiten per Liste (Smartphone-Ansicht) */}
      {listMode && listInfo && onListMove && onListResize && (
        <MobileTileListActions
          tileId={tile.id}
          title={tileTitle}
          info={listInfo}
          onMove={onListMove}
          onResize={onListResize}
          onEdit={listContext?.onEditTile ?? onSelectTile}
          onDuplicate={onDuplicateTile}
          onRemove={onRemoveTile}
          sectionMenu={
            availableSections.length > 0 && onMoveTileToSection ? (
              <TileSectionMenu
                tileId={tile.id}
                availableSections={availableSections}
                currentSectionId={currentSectionId}
                onMoveTileToSection={onMoveTileToSection}
                large
              />
            ) : null
          }
        />
      )}
    </div>
  );
}
