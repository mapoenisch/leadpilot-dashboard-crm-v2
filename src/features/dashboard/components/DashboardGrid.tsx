// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Raster der Kacheln. 1/6/12 Spalten, Spannen je
// Größe, kein automatisches Auffüllen. Im Bearbeitungsmodus trägt jede Kachel Schaltflächen zum
// Verschieben, Bearbeiten und Entfernen; Ziehen ist nur eine Ergänzung für große Bildschirme.
// Auftrag 090 (Paket F, Muster 5): ruhige Leiste je Kachel, Aktionen hinter „Kachel-Aktionen“.
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import { minSizeFor, sizeRank, TILE_SIZES, type TileSize } from '../model/dashboardCatalog';
import { activeEntryOf, tileTitle, SIZE_LABEL } from '../hooks/dashboardEditorReducer';
import type { ChartLoaders } from './charts/chartLoaders';
import { LazyDashboardTile, type TileDataHook } from './LazyDashboardTile';
import { TileResizeHandle } from './TileResizeHandle';
import { UnavailableTileSlot } from './UnavailableTileSlot';

export type FocusAction =
  'hoch' | 'runter' | 'bearbeiten' | 'entfernen' | 'kachel' | 'details' | 'groesse';

const ACTION_BUTTON = 'min-h-[44px] w-full justify-start';

const SHORT_SIZES: Record<TileSize, string> = {
  klein: '3 Sp.',
  mittel: '6 Sp.',
  gross: '9 Sp.',
  voll: '12 Sp.',
};

/** Fokusziel nach dem Entfernen der letzten Kachel: die Schaltfläche im Leerzustand. */
export const EMPTY_FOCUS = '__leer__';

export interface FocusRequest {
  id: number;
  tileId: string;
  action: FocusAction;
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
  const [overId, setOverId] = useState<string | null>(null);
  // Offene Aktionsmenüs je Kachel: bleiben beim Verschieben offen, damit der Fokus folgen kann.
  const [openMenus, setOpenMenus] = useState<ReadonlySet<string>>(() => new Set());
  // Beim Verlassen des Bearbeitungsmodus wieder eingeklappt beginnen (Codex PR #76).
  useEffect(() => {
    if (!editing) setOpenMenus(new Set());
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
    setOverId(null);
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
        className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-6 lg:grid-cols-12"
      >
        {tiles.map((tile, index) => {
          const entry = activeEntryOf(tile);
          const minSize = entry ? minSizeFor(entry, tile.view) : 'klein';
          const title = tileTitle(tile);
          const position = `Position ${index + 1} von ${tiles.length}`;
          const label = (verb: string) => `${title}: ${verb}, ${position}`;
          const onDragOver = (event: DragEvent) => {
            if (!dragId || locked) return;
            event.preventDefault();
            setOverId(tile.tileId);
          };
          const onDrop = (event: DragEvent) => {
            if (!dragId || locked) return;
            event.preventDefault();
            if (dragId !== tile.tileId) props.onMoveTo(dragId, index);
            endDrag();
          };
          return (
            <li
              key={tile.tileId}
              data-tile-id={tile.tileId}
              tabIndex={-1}
              onDragOver={editing ? onDragOver : undefined}
              onDrop={editing ? onDrop : undefined}
              className={cn(
                'relative flex min-w-0 flex-col gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary',
                SPAN[tile.size] ?? SPAN.klein,
                overId === tile.tileId && dragId !== tile.tileId && 'ring-2 ring-primary',
                dragId === tile.tileId && 'opacity-60',
              )}
            >
              {editing ? (
                <div className="flex flex-col gap-1">
                  <div
                    data-testid="tile-edit-bar"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-primary px-3 py-1 text-[12px] text-[var(--color-text-muted)]"
                  >
                    <span className="flex min-w-0 items-center gap-1 [overflow-wrap:anywhere]">
                      <span
                        draggable={!locked}
                        aria-hidden="true"
                        data-testid="drag-handle"
                        onDragStart={(event) => {
                          const item = event.currentTarget.closest('li');
                          if (item) event.dataTransfer?.setDragImage?.(item, 0, 0);
                          event.dataTransfer?.setData?.('text/plain', tile.tileId);
                          setDragId(tile.tileId);
                        }}
                        onDragEnd={endDrag}
                        className="hidden cursor-grab select-none md:inline"
                      >
                        ⠿ Ziehen zum Verschieben ·{' '}
                      </span>
                      {position}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-h-[44px]"
                      data-action="aktionen"
                      aria-expanded={openMenus.has(tile.tileId)}
                      aria-controls={`kachel-aktionen-${tile.tileId}`}
                      aria-label={label('Kachel-Aktionen')}
                      onClick={() => toggleMenu(tile.tileId)}
                    >
                      Kachel-Aktionen{' '}
                      <span aria-hidden="true">{openMenus.has(tile.tileId) ? '▴' : '▾'}</span>
                    </Button>
                  </div>
                  {/* Im Fluss statt schwebend: überdeckt weder Kachel noch ragt es auf 320 px hinaus. */}
                  {openMenus.has(tile.tileId) ? (
                    <div
                      id={`kachel-aktionen-${tile.tileId}`}
                      data-testid="tile-actions"
                      className="grid grid-cols-1 gap-1 rounded-lg border border-solid border-border bg-surface p-1 min-[300px]:grid-cols-2"
                    >
                      <Button
                        size="sm"
                        variant="secondary"
                        className={ACTION_BUTTON}
                        data-action="hoch"
                        aria-label={label('Nach oben')}
                        disabled={locked || index === 0}
                        onClick={() => props.onMove(tile.tileId, 'hoch')}
                      >
                        Nach oben
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={ACTION_BUTTON}
                        data-action="runter"
                        aria-label={label('Nach unten')}
                        disabled={locked || index === tiles.length - 1}
                        onClick={() => props.onMove(tile.tileId, 'runter')}
                      >
                        Nach unten
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={ACTION_BUTTON}
                        data-action="bearbeiten"
                        aria-label={label('Bearbeiten')}
                        disabled={locked || !activeEntryOf(tile)}
                        onClick={() => props.onEdit(tile.tileId)}
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={cn(ACTION_BUTTON, 'border-error text-error')}
                        data-action="entfernen"
                        aria-label={label('Entfernen')}
                        disabled={locked}
                        onClick={() => props.onRemove(tile.tileId)}
                      >
                        Entfernen
                      </Button>

                      {props.onResize ? (
                        <div className="col-span-1 min-[300px]:col-span-2 flex flex-col gap-1 border-t border-solid border-border/60 pt-1.5 mt-0.5">
                          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                            Größe (Spalten):
                          </span>
                          <div className="grid grid-cols-4 gap-1">
                            {TILE_SIZES.map((sz) => {
                              const isCurrent = tile.size === sz;
                              const isAllowed = sizeRank(sz) >= sizeRank(minSize);
                              return (
                                <Button
                                  key={sz}
                                  size="sm"
                                  variant={isCurrent ? 'primary' : 'secondary'}
                                  disabled={locked || !isAllowed}
                                  onClick={() => props.onResize?.(tile.tileId, sz)}
                                  className={cn(
                                    'min-h-[32px] px-1 text-xs font-medium',
                                    isCurrent && 'font-bold ring-1 ring-primary/40',
                                  )}
                                  data-action={`size-${sz}`}
                                  aria-label={`${title}: Größe auf ${SIZE_LABEL[sz]} ändern`}
                                  title={
                                    !isAllowed
                                      ? `Mindestgröße: ${SIZE_LABEL[minSize]}`
                                      : SIZE_LABEL[sz]
                                  }
                                >
                                  {SHORT_SIZES[sz]}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
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
