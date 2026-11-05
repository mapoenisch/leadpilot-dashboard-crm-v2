// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Raster der Kacheln. 1/6/12 Spalten, Spannen je
// Größe, kein automatisches Auffüllen. Im Bearbeitungsmodus trägt jede Kachel Schaltflächen zum
// Verschieben, Bearbeiten und Entfernen; Ziehen ist nur eine Ergänzung für große Bildschirme.
// Auftrag 090 (Paket F, Muster 5): ruhige Leiste je Kachel, Aktionen hinter „Kachel-Aktionen“.
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import { minSizeFor, sizeRank, TILE_SIZES, type TileSize } from '../model/dashboardCatalog';
import { activeEntryOf, tileTitle, SIZE_LABEL } from '../hooks/dashboardEditorReducer';
import type { ChartLoaders } from './charts/chartLoaders';
import { LazyDashboardTile, type TileDataHook } from './LazyDashboardTile';
import { SHORT_SIZES, TileActionsMenu } from './TileActionsMenu';
import { TileResizeHandle } from './TileResizeHandle';
import { UnavailableTileSlot } from './UnavailableTileSlot';

export type FocusAction =
  'hoch' | 'runter' | 'bearbeiten' | 'entfernen' | 'kachel' | 'details' | 'groesse';

/** Fokusziel nach dem Entfernen der letzten Kachel: die Schaltfläche im Leerzustand. */
export const EMPTY_FOCUS = '__leer__';

export interface FocusRequest {
  id: number;
  tileId: string;
  action: FocusAction;
}

/** Berechnet die Zielposition unter Berücksichtigung der Vor-/Nach-Seite und des Entfernens der Quelle. */
export function calculateDropIndex(from: number, target: number, side: 'before' | 'after'): number {
  if (from === target) return from;
  return from < target
    ? side === 'before' ? target - 1 : target
    : side === 'before' ? target : target + 1;
}

const SPAN: Record<string, string> = {
  klein: 'col-span-1 md:col-span-3 lg:col-span-3',
  mittel: 'col-span-1 md:col-span-6 lg:col-span-6',
  gross: 'col-span-1 md:col-span-6 lg:col-span-9',
  voll: 'col-span-1 md:col-span-6 lg:col-span-12',
};

const OPPOSITE: Partial<Record<FocusAction, FocusAction>> = { hoch: 'runter', runter: 'hoch' };

export interface DashboardGridProps {
  tiles: readonly DashboardTileConfig[];
  filters?: DashboardFilters;
  editing: boolean;
  locked: boolean;
  useData: TileDataHook;
  chartLoaders?: ChartLoaders;
  suspended?: boolean;
  focusRequest?: FocusRequest | null;
  /** Entscheidung Marc E3 (Auftrag 077): im Bearbeitungsmodus ist „Details“ gesperrt. */
  detailsBlocked?: boolean;
  onShowDetails: (tileId: string) => void;
  onRetryChartLoad?: () => void;
  onTileActivated?: (tileId: string) => void;
  onMove: (tileId: string, direction: 'hoch' | 'runter') => void;
  onMoveTo: (tileId: string, index: number) => void;
  onResize?: (tileId: string, size: TileSize) => void;
  onEdit: (tileId: string) => void;
  onRemove: (tileId: string) => void;
  onAdd?: () => void;
  onReset?: () => void;
}

export function DashboardGrid(props: DashboardGridProps) {
  const { tiles, editing, locked, focusRequest } = props;
  const listRef = useRef<HTMLUListElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; side: 'before' | 'after' } | null>(
    null,
  );
  // Offene Aktionsmenüs je Kachel: bleiben beim Verschieben offen, damit der Fokus folgen kann.
  const [openMenus, setOpenMenus] = useState<ReadonlySet<string>>(() => new Set());
  // Beim Verlassen des Bearbeitungsmodus wieder eingeklappt beginnen (Codex PR #76).
  useEffect(() => {
    if (!editing) {
      setOpenMenus(new Set());
      setDragId(null);
      setDropTarget(null);
    }
  }, [editing]);
  const toggleMenu = (tileId: string) =>
    setOpenMenus((current) => {
      const next = new Set(current);
      if (next.has(tileId)) next.delete(tileId);
      else next.add(tileId);
      return next;
    });

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.tileId === EMPTY_FOCUS) {
      document.querySelector<HTMLElement>('[data-testid="dashboard-empty"] button')?.focus();
      return;
    }
    const item = Array.from(listRef.current?.children ?? []).find(
      (child) => child.getAttribute('data-tile-id') === focusRequest.tileId,
    ) as HTMLElement | undefined;
    if (!item) return;
    const button = (action?: FocusAction | 'aktionen') =>
      action
        ? item.querySelector<HTMLButtonElement>(`button[data-action="${action}"]:not(:disabled)`)
        : null;
    const target =
      focusRequest.action === 'kachel'
        ? item
        : (button(focusRequest.action) ??
          button(OPPOSITE[focusRequest.action]) ??
          // Menü zu: Fokus auf „Kachel-Aktionen“ statt ins Leere (Auftrag 090).
          button('aktionen') ??
          item);
    target.focus();
    // Jede Anforderung ist ein neues Objekt: nur sie löst den Fokus aus, nicht jede Neudarstellung.
  }, [focusRequest]);

  if (tiles.length === 0) {
    return (
      <div
        data-testid="dashboard-empty"
        className="rounded-xl border border-dashed border-border p-6 text-sm text-[var(--color-text-muted)]"
      >
        <p className="m-0">Dein Dashboard enthält noch keine Kacheln.</p>
        {editing && props.onAdd ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={locked} onClick={props.onAdd}>
              Kachel hinzufügen
            </Button>
            {props.onReset ? (
              <Button size="sm" variant="secondary" disabled={locked} onClick={props.onReset}>
                Auf Standard zurücksetzen
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const endDrag = () => {
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <div className="relative">
      {editing ? (
        <div
          data-testid="grid-helper-lines"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden hidden md:grid md:grid-cols-6 lg:grid-cols-12 gap-4"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="h-full rounded-xl border border-dashed border-primary/20 bg-primary/[0.015]"
            />
          ))}
        </div>
      ) : null}
      <ul
        ref={listRef}
        aria-label="Dashboard-Kacheln"
        onDragOver={(event) => {
          if (dragId) {
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          }
        }}
        className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-6 lg:grid-cols-12"
      >
        {tiles.map((tile, index) => {
          const entry = activeEntryOf(tile);
          const minSize = entry ? minSizeFor(entry, tile.view) : 'klein';
          const title = tileTitle(tile);
          const position = `Position ${index + 1} von ${tiles.length}`;
          const label = (verb: string) => `${title}: ${verb}, ${position}`;
          const onDragOver = (event: DragEvent<HTMLLIElement>) => {
            if (!dragId || locked) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            const rect = event.currentTarget.getBoundingClientRect();
            const fromIndex = tiles.findIndex((t) => t.tileId === dragId);
            const isAfter =
              rect.width > 0
                ? event.clientX > rect.left + rect.width / 2
                : fromIndex !== -1 && fromIndex < index;
            setDropTarget({ index, side: isAfter ? 'after' : 'before' });
          };
          const onDrop = (event: DragEvent<HTMLLIElement>) => {
            if (!dragId || locked) return;
            event.preventDefault();
            const fromIndex = tiles.findIndex((t) => t.tileId === dragId);
            if (fromIndex !== -1 && fromIndex !== index) {
              const side =
                dropTarget && dropTarget.index === index
                  ? dropTarget.side
                  : fromIndex < index
                    ? 'after'
                    : 'before';
              const toIndex = calculateDropIndex(fromIndex, index, side);
              if (toIndex !== fromIndex) {
                props.onMoveTo(dragId, toIndex);
              }
            }
            endDrag();
          };
          const isTarget =
            dragId !== null &&
            dropTarget !== null &&
            dropTarget.index === index &&
            dragId !== tile.tileId;
          const isDraggingThis = dragId === tile.tileId;

          return (
            <li
              key={tile.tileId}
              data-tile-id={tile.tileId}
              tabIndex={-1}
              onDragOver={editing ? onDragOver : undefined}
              onDrop={editing ? onDrop : undefined}
              className={cn(
                'relative flex min-w-0 flex-col gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-150',
                SPAN[tile.size] ?? SPAN.klein,
                isTarget && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                isDraggingThis &&
                  'opacity-40 scale-[0.98] border-dashed border-2 border-primary/60 rounded-xl',
              )}
            >
              {editing && isTarget ? (
                <div
                  data-testid="drag-ghost"
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute -inset-1 z-20 rounded-xl border-2 border-dashed border-primary bg-primary/10 shadow-lg flex items-center justify-center backdrop-blur-[1px]',
                    dropTarget.side === 'before' ? 'border-l-4' : 'border-r-4',
                  )}
                >
                  <span className="rounded bg-primary px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-inverse)] shadow">
                    Hier ablegen ({dropTarget.side === 'before' ? 'Davor' : 'Danach'})
                  </span>
                </div>
              ) : null}
              {editing ? (
                <div className="flex flex-col gap-1">
                  <div
                    data-testid="tile-edit-bar"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-primary/60 bg-surface/90 px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] shadow-sm"
                  >
                    <div className="flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]">
                      <span
                        draggable={!locked}
                        aria-hidden="true"
                        data-testid="drag-handle"
                        onDragStart={(event) => {
                          const item = event.currentTarget.closest('li');
                          if (event.dataTransfer) {
                            if (item && event.dataTransfer.setDragImage) {
                              event.dataTransfer.setDragImage(item, 20, 20);
                            }
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', tile.tileId);
                          }
                          setDragId(tile.tileId);
                        }}
                        onDragEnd={endDrag}
                        className="hidden cursor-grab active:cursor-grabbing select-none items-center gap-1 font-medium text-text hover:text-primary md:inline-flex"
                        title="Kachel anpacken und im Raster verschieben"
                      >
                        <GripVertical className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-xs">Verschieben</span>
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-normal">
                        · {position}
                      </span>
                    </div>

                    {props.onResize ? (
                      <div
                        role="group"
                        aria-label={`${title}: Spaltenbreite wählen`}
                        className="flex items-center gap-1"
                      >
                        <span className="hidden text-[11px] font-medium text-[var(--color-text-muted)] sm:inline mr-1">
                          Größe:
                        </span>
                        {TILE_SIZES.map((sz) => {
                          const isCurrent = tile.size === sz;
                          const isAllowed = sizeRank(sz) >= sizeRank(minSize);
                          const disReason = !isAllowed
                            ? sizeRank(minSize) >= 2
                              ? 'Dieses Diagramm benötigt mindestens 9 Spalten (3/4 Breite)'
                              : 'Dieses Diagramm benötigt mindestens 6 Spalten (1/2 Breite)'
                            : undefined;
                          return (
                            <button
                              key={sz}
                              type="button"
                              disabled={locked || !isAllowed}
                              onClick={() => props.onResize?.(tile.tileId, sz)}
                              data-action={`size-${sz}`}
                              aria-label={`${title}: Schnellwahl ${SHORT_SIZES[sz]}${disReason ? ` (${disReason})` : ''}`}
                              aria-pressed={isCurrent}
                              title={disReason ?? `${SIZE_LABEL[sz]} (${SHORT_SIZES[sz]})`}
                              className={cn(
                                'rounded px-2 py-0.5 text-[11px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[26px]',
                                isCurrent
                                  ? 'bg-primary text-[var(--color-text-inverse)] font-bold shadow-sm'
                                  : isAllowed
                                    ? 'bg-surface border border-solid border-border/80 text-text hover:bg-surface-hover hover:border-primary/50'
                                    : 'opacity-35 cursor-not-allowed bg-transparent border border-dashed border-border/50 text-[var(--color-text-muted)]',
                              )}
                            >
                              {SHORT_SIZES[sz]}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 min-h-[32px] px-2.5 text-xs ml-auto"
                      data-action="aktionen"
                      aria-expanded={openMenus.has(tile.tileId)}
                      aria-controls={`kachel-aktionen-${tile.tileId}`}
                      aria-label={label('Kachel-Aktionen')}
                      onClick={() => toggleMenu(tile.tileId)}
                    >
                      Aktionen{' '}
                      <span aria-hidden="true" className="ml-1">
                        {openMenus.has(tile.tileId) ? '▴' : '▾'}
                      </span>
                    </Button>
                  </div>
                  {/* Im Fluss statt schwebend: überdeckt weder Kachel noch ragt es auf 320 px hinaus. */}
                  {openMenus.has(tile.tileId) ? (
                    <TileActionsMenu
                      tile={tile}
                      index={index}
                      tilesCount={tiles.length}
                      locked={locked}
                      title={title}
                      minSize={minSize}
                      label={label}
                      onMove={props.onMove}
                      onEdit={props.onEdit}
                      onRemove={props.onRemove}
                      onResize={props.onResize}
                    />
                  ) : null}
                </div>
              ) : null}
              <div
                className={cn(
                  'flex flex-col flex-1 min-w-0',
                  dragId && 'pointer-events-none select-none',
                )}
              >
                {activeEntryOf(tile) ? (
                  <LazyDashboardTile
                    tile={tile}
                    filters={props.filters}
                    useData={props.useData}
                    chartLoaders={props.chartLoaders}
                    suspended={props.suspended}
                    onShowDetails={props.onShowDetails}
                    detailsBlocked={props.detailsBlocked}
                    onRetryChartLoad={props.onRetryChartLoad}
                    onActivated={props.onTileActivated}
                  />
                ) : (
                  <UnavailableTileSlot tile={tile} />
                )}
              </div>
              {editing && props.onResize ? (
                <TileResizeHandle
                  tileId={tile.tileId}
                  tileTitle={title}
                  currentSize={tile.size}
                  minSize={minSize}
                  locked={locked}
                  onResize={props.onResize}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
