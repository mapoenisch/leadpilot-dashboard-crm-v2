import { useState, useMemo } from 'react';
import { GripVertical, MoreVertical, Calendar, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { ImportedFunnelDeal } from '@/types/crm';

export interface DealKanbanCardProps {
  deal: ImportedFunnelDeal;
  allStages: readonly string[];
  onMoveStage: (dealId: string, newStage: string) => void;
  onDragStart?: (dealId: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export function DealKanbanCard({
  deal,
  allStages,
  onMoveStage,
  onDragStart,
  onDragEnd,
  isDragging,
}: DealKanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const stageLower = deal.stage.toLowerCase();
  const isWon = stageLower.includes('gewonnen');
  const isLost = stageLower.includes('verloren');

  // Überfälligkeits-Check für offene Deals
  const isOverdue = useMemo(() => {
    if (isWon || isLost || !deal.closeDate) return false;
    const date = new Date(deal.closeDate);
    if (Number.isNaN(date.getTime())) return false;
    // Vergleich mit aktuellem Datum
    return date.getTime() < Date.now();
  }, [deal.closeDate, isWon, isLost]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', deal.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(deal.id);
  };

  return (
    <div
      role="article"
      aria-label={`Deal: ${deal.dealName}`}
      data-testid={`deal-card-${deal.id}`}
      data-deal-id={deal.id}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border border-border bg-surface/90 p-3.5 backdrop-blur-md shadow-sm transition-all duration-150',
        'hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40 scale-[0.98] border-dashed border-2 border-primary/60',
        isWon && 'border-primary/40 bg-primary/[0.04]',
        isLost && 'opacity-80 border-border/60 bg-surface/40',
      )}
    >
      {/* Header mit Titel, Drag-Handle und Tastaturmenü */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            data-testid="drag-handle"
            className="text-[var(--color-text-muted)] opacity-50 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          >
            <GripVertical size={14} />
          </span>
          <h4 className="m-0 text-sm font-semibold text-text truncate leading-snug">
            {deal.dealName}
          </h4>
        </div>

        {/* Tastaturbedienbares Menü für barrierefreien Phasenwechsel */}
        <div className="relative">
          <button
            type="button"
            draggable={false}
            onDragStart={(e) => e.stopPropagation()}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={`${deal.dealName}: Phase ändern`}
            aria-expanded={menuOpen}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-surface-hover hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MoreVertical size={13} aria-hidden="true" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                aria-label={`Phase für ${deal.dealName} wählen`}
                className="absolute right-0 top-7 z-30 min-w-[200px] rounded-lg border border-border bg-[var(--color-surface-raised,#0f2422)] p-1.5 shadow-xl backdrop-blur-md"
              >
                <div className="px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)] border-b border-border/50">
                  In Phase verschieben:
                </div>
                <div className="flex flex-col gap-0.5 mt-1 max-h-[220px] overflow-y-auto">
                  {allStages.map((stage) => {
                    const isCurrent = stage === deal.stage;
                    return (
                      <button
                        key={stage}
                        type="button"
                        role="menuitem"
                        disabled={isCurrent}
                        onClick={() => {
                          onMoveStage(deal.id, stage);
                          setMenuOpen(false);
                        }}
                        className={cn(
                          'flex items-center justify-between rounded px-2 py-1.5 text-xs text-left transition-colors',
                          isCurrent
                            ? 'bg-primary/20 text-primary font-semibold cursor-default'
                            : 'text-text hover:bg-surface-hover hover:text-primary',
                        )}
                      >
                        <span className="truncate">{stage}</span>
                        {isCurrent && <span className="text-[10px] text-primary">Aktiv</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Betrag & Fälligkeitsindikator */}
      <div className="flex items-baseline justify-between gap-2 mt-0.5">
        <span
          className={cn(
            'font-mono text-base font-bold',
            isWon
              ? 'text-primary'
              : isLost
                ? 'text-[var(--color-text-muted)] line-through'
                : 'text-accent',
          )}
        >
          {deal.amount.toLocaleString('de-DE')} €
        </span>

        {isOverdue && (
          <span title="Abschlussdatum liegt in der Vergangenheit">
            <Badge
              variant="orange"
              className="text-[10px] py-0 px-1.5 gap-1 font-semibold flex items-center"
            >
              <AlertTriangle size={10} aria-hidden="true" />
              <span>Überfällig</span>
            </Badge>
          </span>
        )}
      </div>

      {/* Footer: Close Date & Pipeline */}
      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] border-t border-border/40 pt-2 mt-0.5">
        <div className="flex items-center gap-1">
          <Calendar size={11} aria-hidden="true" />
          <span>{deal.closeDate || 'Kein Datum'}</span>
        </div>

        {deal.pipeline && (
          <span className="truncate max-w-[110px] font-medium text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border/50">
            {deal.pipeline}
          </span>
        )}
      </div>
    </div>
  );
}
