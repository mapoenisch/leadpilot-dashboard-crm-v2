// Executive Dashboard V2 (Auftrag 148 / P05):
// 12-Spalten-Canvas (Zone Mitte) des neuen Dashboard-Editors.
// Bindet bestehende Diagramm-Renderer (LazyDashboardTile / DashboardTile) an,
// steuert Kachelauswahl per Klick/Escape und bietet Schnellaktionen im Bearbeitungsmodus.

import { useEffect, useRef } from 'react';
import { Copy, Plus, Sliders, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { DashboardView } from '../../model/dashboardCatalog';
import type {
  BreakpointKey,
  DashboardConfigV2,
  DashboardTileConfigV2,
} from '../../model/dashboardConfigV2';
import type {
  DashboardFilters,
  DashboardPeriod,
  DashboardTileConfig,
} from '../../model/dashboardConfig';
import { LazyDashboardTile, type TileDataHook } from '../LazyDashboardTile';

export interface EditorCanvasV2Props {
  config: DashboardConfigV2;
  activeBreakpoint: BreakpointKey;
  selectedTileId: string | null;
  onSelectTile: (tileId: string) => void;
  onDeselect: () => void;
  onRemoveTile: (tileId: string) => void;
  onDuplicateTile: (tileId: string) => void;
  onShowDetails?: (tileId: string) => void;
  onAddTileClick?: () => void;
  isPreviewMode?: boolean;
  useData: TileDataHook;
  className?: string;
}

function parseTimeframeToPeriod(timeframe: string): DashboardPeriod | undefined {
  if (!timeframe.includes('/')) return undefined;
  const [from, to] = timeframe.split('/');
  if (from && to) return { from, to };
  return undefined;
}

/**
 * Adapterbrücke: Wandelt DashboardTileConfigV2 verlustfrei in die V1-Struktur
 * für LazyDashboardTile und bestehende Renderer um.
 */
export function convertV2TileToV1(
  tile: DashboardTileConfigV2,
  _globalTimeframe: string,
  globalPipeline?: string,
): DashboardTileConfig {
  const w = tile.layouts.desktop.w;
  const size = w >= 12 ? 'voll' : w >= 9 ? 'gross' : w >= 6 ? 'mittel' : 'klein';

  return {
    tileId: tile.id,
    catalogId: tile.catalogId,
    title: tile.title,
    view: tile.presentation as DashboardView,
    size,
    filterMode: tile.timeframeOverride ? 'eigener_zeitraum' : 'dashboard',
    period: tile.timeframeOverride ? parseTimeframeToPeriod(tile.timeframeOverride) : undefined,
    pipeline: tile.pipelineOverride ?? globalPipeline,
  };
}

/** Ermittelt die Tailwind-Klassen für die Spaltenbreite je Breakpoint */
function getColumnSpanClass(tile: DashboardTileConfigV2, breakpoint: BreakpointKey): string {
  if (breakpoint === 'mobile') {
    return 'col-span-1';
  }

  if (breakpoint === 'tablet') {
    const w = tile.layouts.tablet?.w ?? Math.min(6, tile.layouts.desktop.w);
    switch (w) {
      case 6:
        return 'col-span-6';
      case 5:
        return 'col-span-5';
      case 4:
        return 'col-span-4';
      case 3:
        return 'col-span-3';
      case 2:
        return 'col-span-2';
      case 1:
      default:
        return 'col-span-1';
    }
  }

  // Desktop (12 Spalten)
  const w = tile.layouts.desktop.w;
  switch (w) {
    case 12:
      return 'col-span-12';
    case 11:
      return 'col-span-11';
    case 10:
      return 'col-span-10';
    case 9:
      return 'col-span-9';
    case 8:
      return 'col-span-8';
    case 7:
      return 'col-span-7';
    case 6:
      return 'col-span-6';
    case 5:
      return 'col-span-5';
    case 4:
      return 'col-span-4';
    case 3:
      return 'col-span-3';
    case 2:
      return 'col-span-2';
    case 1:
    default:
      return 'col-span-1';
  }
}

export function EditorCanvasV2({
  config,
  activeBreakpoint,
  selectedTileId,
  onSelectTile,
  onDeselect,
  onRemoveTile,
  onDuplicateTile,
  onShowDetails = () => {},
  onAddTileClick,
  isPreviewMode = false,
  useData,
  className,
}: EditorCanvasV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Escape hebt Kachelauswahl auf
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTileId) {
        onDeselect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTileId, onDeselect]);

  const gridColumnsClass =
    activeBreakpoint === 'mobile'
      ? 'grid-cols-1'
      : activeBreakpoint === 'tablet'
        ? 'grid-cols-6'
        : 'grid-cols-12';

  const filters: DashboardFilters = {
    pipeline: config.globalPipeline,
  };

  return (
    <main
      ref={containerRef}
      data-testid="editor-canvas"
      data-breakpoint={activeBreakpoint}
      className={cn(
        'relative flex-1 overflow-y-auto p-4 transition-colors',
        !isPreviewMode &&
          'bg-[radial-gradient(#1b3d39_1px,transparent_1px)] [background-size:16px_16px]',
        className,
      )}
    >
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
            Wähle Kennzahlen aus der linken Widget-Bibliothek aus, um dein persönliches
            CRM-Dashboard zusammenzustellen.
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
        /* Kachel-Raster */
        <div
          data-testid="canvas-grid"
          className={cn('grid gap-4 transition-all', gridColumnsClass)}
        >
          {config.tiles.map((tile) => {
            const isSelected = selectedTileId === tile.id;
            const spanClass = getColumnSpanClass(tile, activeBreakpoint);
            const v1Tile = convertV2TileToV1(tile, config.globalTimeframe, config.globalPipeline);

            return (
              <div
                key={tile.id}
                role="button"
                tabIndex={0}
                data-testid={`canvas-tile-${tile.id}`}
                data-tile-id={tile.id}
                data-selected={String(isSelected)}
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
                  spanClass,
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-[var(--color-bg-deep,#051413)] shadow-xl z-10'
                    : !isPreviewMode && 'hover:ring-1 hover:ring-primary/40',
                )}
              >
                {/* Schnellaktions-Leiste im Bearbeitungsmodus (bei Hover oder Selektion) */}
                {!isPreviewMode && (
                  <div
                    data-testid={`tile-quick-actions-${tile.id}`}
                    className={cn(
                      'absolute -top-3 right-3 z-20 flex items-center gap-1 rounded-md border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] p-0.5 shadow-md transition-opacity',
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                  >
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
          })}
        </div>
      )}
    </main>
  );
}
