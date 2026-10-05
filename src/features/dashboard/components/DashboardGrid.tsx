// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Raster der Kacheln. 1/6/12 Spalten, Spannen je
// Größe, kein automatisches Auffüllen. Im Bearbeitungsmodus trägt jede Kachel Schaltflächen zum
// Verschieben, Bearbeiten und Entfernen; Ziehen ist nur eine Ergänzung für große Bildschirme.
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import { activeEntryOf } from '../hooks/dashboardEditorReducer';
import { tileTitle } from '../hooks/useDashboardEditor';
import type { ChartLoaders } from './charts/chartLoaders';
import { LazyDashboardTile, type TileDataHook } from './LazyDashboardTile';
import { UnavailableTileSlot } from './UnavailableTileSlot';

export type FocusAction = 'hoch' | 'runter' | 'bearbeiten' | 'entfernen' | 'kachel';

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
  onShowDetails: (tileId: string) => void;
  onRetryChartLoad?: () => void;
  onTileActivated?: (tileId: string) => void;
  onMove: (tileId: string, direction: 'hoch' | 'runter') => void;
  onMoveTo: (tileId: string, index: number) => void;
  onEdit: (tileId: string) => void;
  onRemove: (tileId: string) => void;
  onAdd?: () => void;
}

export function DashboardGrid(props: DashboardGridProps) {
  const { tiles, editing, locked, focusRequest } = props;
  const listRef = useRef<HTMLUListElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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
    const button = (action?: FocusAction) =>
      action
        ? item.querySelector<HTMLButtonElement>(`button[data-action="${action}"]:not(:disabled)`)
        : null;
    const target =
      focusRequest.action === 'kachel'
        ? item
        : (button(focusRequest.action) ?? button(OPPOSITE[focusRequest.action]) ?? item);
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
          <Button className="mt-3" size="sm" disabled={locked} onClick={props.onAdd}>
            Kachel hinzufügen
          </Button>
        ) : null}
      </div>
    );
  }

  const endDrag = () => {
    setDragId(null);
    setOverId(null);
  };

  return (
    <ul
      ref={listRef}
      aria-label="Dashboard-Kacheln"
      className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-6 lg:grid-cols-12"
    >
      {tiles.map((tile, index) => {
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
              'flex min-w-0 flex-col gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary',
              SPAN[tile.size] ?? SPAN.klein,
              overId === tile.tileId && dragId !== tile.tileId && 'ring-2 ring-primary',
              dragId === tile.tileId && 'opacity-60',
            )}
          >
            {editing ? (
              <div
                data-testid="tile-edit-bar"
                className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-muted)]"
              >
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
                  className="hidden cursor-grab select-none md:inline-flex"
                >
                  ⠿
                </span>
                <span className="mr-auto">{position}</span>
                <Button
                  size="sm"
                  variant="secondary"
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
                  className="border-error text-error"
                  data-action="entfernen"
                  aria-label={label('Entfernen')}
                  disabled={locked}
                  onClick={() => props.onRemove(tile.tileId)}
                >
                  Entfernen
                </Button>
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
                onRetryChartLoad={props.onRetryChartLoad}
                onActivated={props.onTileActivated}
              />
            ) : (
              <UnavailableTileSlot tile={tile} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
