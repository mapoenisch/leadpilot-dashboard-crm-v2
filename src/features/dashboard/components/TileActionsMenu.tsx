import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import { sizeRank, TILE_SIZES, type TileSize } from '../model/dashboardCatalog';
import { activeEntryOf, SIZE_LABEL } from '../hooks/dashboardEditorReducer';

const ACTION_BUTTON = 'min-h-[44px] w-full justify-start';

export const SHORT_SIZES: Record<TileSize, string> = {
  klein: '3 Sp.',
  mittel: '6 Sp.',
  gross: '9 Sp.',
  voll: '12 Sp.',
};

export interface TileActionsMenuProps {
  tile: DashboardTileConfig;
  index: number;
  tilesCount: number;
  locked: boolean;
  title: string;
  minSize: TileSize;
  label: (verb: string) => string;
  onMove: (tileId: string, direction: 'hoch' | 'runter') => void;
  onEdit: (tileId: string) => void;
  onRemove: (tileId: string) => void;
  onResize?: (tileId: string, size: TileSize) => void;
}

export function TileActionsMenu({
  tile,
  index,
  tilesCount,
  locked,
  title,
  minSize,
  label,
  onMove,
  onEdit,
  onRemove,
  onResize,
}: TileActionsMenuProps) {
  return (
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
        onClick={() => onMove(tile.tileId, 'hoch')}
      >
        Nach oben
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className={ACTION_BUTTON}
        data-action="runter"
        aria-label={label('Nach unten')}
        disabled={locked || index === tilesCount - 1}
        onClick={() => onMove(tile.tileId, 'runter')}
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
        onClick={() => onEdit(tile.tileId)}
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
        onClick={() => onRemove(tile.tileId)}
      >
        Entfernen
      </Button>

      {onResize ? (
        <div className="col-span-1 min-[300px]:col-span-2 flex flex-col gap-1 border-t border-solid border-border/60 pt-1.5 mt-0.5">
          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
            Größe (Spalten):
          </span>
          <div className="grid grid-cols-4 gap-1">
            {TILE_SIZES.map((sz) => {
              const isCurrent = tile.size === sz;
              const isAllowed = sizeRank(sz) >= sizeRank(minSize);
              const disReason = !isAllowed
                ? sizeRank(minSize) >= 2
                  ? 'Dieses Diagramm benötigt mindestens 9 Spalten (3/4 Breite)'
                  : 'Dieses Diagramm benötigt mindestens 6 Spalten (1/2 Breite)'
                : undefined;
              return (
                <Button
                  key={sz}
                  size="sm"
                  variant={isCurrent ? 'primary' : 'secondary'}
                  disabled={locked || !isAllowed}
                  onClick={() => onResize(tile.tileId, sz)}
                  className={cn(
                    'min-h-[32px] px-1 text-xs font-medium',
                    isCurrent && 'font-bold ring-1 ring-primary/40',
                    !isAllowed && 'opacity-35 cursor-not-allowed border-dashed',
                  )}
                  data-action={`size-${sz}`}
                  aria-label={`${title}: Größe auf ${SIZE_LABEL[sz]} ändern${disReason ? ` (${disReason})` : ''}`}
                  title={disReason ?? SIZE_LABEL[sz]}
                >
                  {SHORT_SIZES[sz]}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
