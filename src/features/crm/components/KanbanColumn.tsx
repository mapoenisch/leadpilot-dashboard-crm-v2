import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { ImportedFunnelDeal } from '@/types/crm';
import { DealKanbanCard } from './DealKanbanCard';

export interface KanbanColumnProps {
  stage: string;
  deals: ImportedFunnelDeal[];
  allStages: readonly string[];
  onMoveStage: (dealId: string, newStage: string) => void;
  onDragStart?: (dealId: string) => void;
  onDragEnd?: () => void;
  activeDragId?: string | null;
}

export function KanbanColumn({
  stage,
  deals,
  allStages,
  onMoveStage,
  onDragStart,
  onDragEnd,
  activeDragId,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  const stageLower = stage.toLowerCase();
  const isWon = stageLower.includes('gewonnen');
  const isLost = stageLower.includes('verloren');

  const totalAmount = useMemo(() => {
    return deals.reduce((sum, d) => sum + (d.amount || 0), 0);
  }, [deals]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) {
      setIsOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Verhindern, dass Kinder das Verlassen fälschlicherweise auslösen
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    const dealId = e.dataTransfer.getData('text/plain') || activeDragId;
    if (dealId) {
      onMoveStage(dealId, stage);
    }
  };

  return (
    <div
      role="region"
      aria-label={`Vertriebsphase: ${stage} (${deals.length} Deals)`}
      data-testid={`kanban-column-${stage}`}
      data-stage={stage}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] flex-1 rounded-xl border border-border bg-surface/50 p-3 backdrop-blur-sm transition-all duration-150',
        isWon && 'border-t-2 border-t-primary',
        isLost && 'border-t-2 border-t-[var(--color-text-muted)]',
        !isWon && !isLost && 'border-t-2 border-t-accent',
        isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/[0.08]',
      )}
    >
      {/* Spaltenkopf */}
      <div className="flex flex-col gap-1 pb-3 border-b border-border/60 select-none">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-sm font-semibold text-text truncate" title={stage}>
            {stage}
          </h3>
          <span data-testid={`column-count-${stage}`}>
            <Badge
              variant={isWon ? 'cyan' : isLost ? 'neutral' : 'orange'}
              className="text-[11px] font-semibold px-2 py-0.5"
            >
              {deals.length}
            </Badge>
          </span>
        </div>

        {/* Phasensumme */}
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">Summe:</span>
          <span
            className={cn(
              'font-mono font-bold',
              isWon ? 'text-primary' : isLost ? 'text-[var(--color-text-muted)]' : 'text-text',
            )}
            data-testid={`column-sum-${stage}`}
          >
            {totalAmount.toLocaleString('de-DE')} €
          </span>
        </div>
      </div>

      {/* Liste der Deal-Karten */}
      <div className="flex flex-col gap-2.5 pt-3 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[140px] pr-0.5">
        {deals.length === 0 ? (
          <div
            data-testid={`empty-column-${stage}`}
            className={cn(
              'flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-[var(--color-text-muted)] min-h-[100px]',
              isOver && 'border-primary/60 bg-primary/5 text-primary',
            )}
          >
            {isOver ? 'Hier ablegen' : 'Keine Deals in dieser Phase'}
          </div>
        ) : (
          deals.map((deal) => (
            <DealKanbanCard
              key={deal.id}
              deal={deal}
              allStages={allStages}
              onMoveStage={onMoveStage}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={activeDragId === deal.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
