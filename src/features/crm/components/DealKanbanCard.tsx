import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * Prüft auf Kalendertag-Ebene (lokale Zeitzone), ob ein Abschlussdatum
 * vor dem heutigen Kalendertag abgelaufen ist.
 */
export function isDealOverdue(closeDate?: string, isWonOrLost = false): boolean {
  if (isWonOrLost || !closeDate) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(closeDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (match) {
    const year = parseInt(match[1]!, 10);
    const month = parseInt(match[2]!, 10) - 1;
    const day = parseInt(match[3]!, 10);
    const targetDate = new Date(year, month, day, 0, 0, 0, 0);
    return targetDate.getTime() < today.getTime();
  }

  const d = new Date(closeDate);
  if (Number.isNaN(d.getTime())) return false;
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return targetDate.getTime() < today.getTime();
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
  const [menuCoords, setMenuCoords] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const stageLower = deal.stage.toLowerCase();
  const isWon = stageLower.includes('gewonnen');
  const isLost = stageLower.includes('verloren');

  // Überfälligkeits-Check auf Kalendertagebene für offene Deals
  const isOverdue = useMemo(
    () => isDealOverdue(deal.closeDate, isWon || isLost),
    [deal.closeDate, isWon, isLost],
  );

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 210;
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

      const left = Math.max(8, Math.min(windowWidth - menuWidth - 8, rect.right - menuWidth));
      // Geschätzte Menühöhe: Header (28px) + Padding/Borders (16px) + Einträge (ca. 30px je Phase, max 220px Liste)
      const estimatedHeight = Math.min(265, 44 + allStages.length * 30);
      const spaceBelow = windowHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;

      let top: number;
      let maxHeight: number;

      // Bevorzuge Platzierung nach unten, außer unterhalb reicht der Platz nicht und oben ist mehr Raum
      if (spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove) {
        top = rect.bottom + 4;
        maxHeight = Math.max(120, spaceBelow - 4);
      } else {
        const fitHeight = Math.min(estimatedHeight, spaceAbove - 4);
        top = Math.max(8, rect.top - fitHeight - 4);
        maxHeight = Math.max(120, spaceAbove - 4);
      }

      setMenuCoords({ top, left, maxHeight });
    }
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleScrollOrResize = (e: Event) => {
      // Ignoriere Scroll-Ereignisse innerhalb des Menüs (z. B. lange Phasenliste)
      if (
        menuRef.current &&
        e.target instanceof Node &&
        (e.target === menuRef.current || menuRef.current.contains(e.target))
      ) {
        return;
      }
      setMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

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
            ref={buttonRef}
            type="button"
            draggable={false}
            onDragStart={(e) => e.stopPropagation()}
            onClick={toggleMenu}
            aria-label={`${deal.dealName}: Phase ändern`}
            aria-expanded={menuOpen}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-surface-hover hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MoreVertical size={13} aria-hidden="true" />
          </button>

          {menuOpen &&
            typeof document !== 'undefined' &&
            createPortal(
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  ref={(el) => {
                    menuRef.current = el;
                    if (el && menuCoords) {
                      el.style.top = `${menuCoords.top}px`;
                      el.style.left = `${menuCoords.left}px`;
                      el.style.maxHeight = `${menuCoords.maxHeight}px`;
                    }
                  }}
                  role="menu"
                  aria-label={`Phase für ${deal.dealName} wählen`}
                  className="fixed z-50 flex flex-col min-w-[200px] max-w-[calc(100vw-16px)] rounded-lg border border-border bg-[var(--color-surface-raised,#0f2422)] p-1.5 shadow-2xl backdrop-blur-md"
                >
                  <div className="shrink-0 px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)] border-b border-border/50">
                    In Phase verschieben:
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1 overflow-y-auto min-h-0 max-h-[220px]">
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
              </>,
              document.body,
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
