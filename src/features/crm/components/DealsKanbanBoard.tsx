import { useState, useMemo, useCallback } from 'react';
import type { ImportedFunnelDeal } from '@/types/crm';
import { Button } from '@/components/ui/Button';
import { KanbanColumn } from './KanbanColumn';

export const KANBAN_STAGES: readonly string[] = [
  'Lead eingegangen',
  'Erstgespräch geführt',
  'Bedarfsanalyse',
  'Angebot erstellt',
  'Verhandlung',
  'Deal gewonnen',
  'Deal verloren',
];

export interface DealsKanbanBoardProps {
  deals: ImportedFunnelDeal[];
  totalDeals?: number;
  onDealStageChange?: (dealId: string, newStage: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function DealsKanbanBoard({
  deals,
  totalDeals,
  onDealStageChange,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: DealsKanbanBoardProps) {
  // Lokale optimistische Phasen-Überschreibungen
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Wirksame Deals mit Überschreibungen
  const effectiveDeals = useMemo(() => {
    return deals.map((d) => {
      const override = stageOverrides[d.id];
      if (override && override !== d.stage) {
        return { ...d, stage: override };
      }
      return d;
    });
  }, [deals, stageOverrides]);

  // Alle vorkommenden Phasen ermitteln (Standardphasen + evtl. zusätzliche aus Daten)
  const allStages = useMemo(() => {
    const known = new Set(KANBAN_STAGES);
    const extra: string[] = [];
    for (const d of effectiveDeals) {
      if (d.stage && !known.has(d.stage)) {
        known.add(d.stage);
        extra.push(d.stage);
      }
    }
    return [...KANBAN_STAGES, ...extra];
  }, [effectiveDeals]);

  // Gruppierung nach Phase
  const dealsByStage = useMemo(() => {
    const map = new Map<string, ImportedFunnelDeal[]>();
    for (const s of allStages) {
      map.set(s, []);
    }
    for (const deal of effectiveDeals) {
      const list = map.get(deal.stage);
      if (list) {
        list.push(deal);
      } else {
        map.set(deal.stage, [deal]);
      }
    }
    return map;
  }, [allStages, effectiveDeals]);

  // Gesamtstatistiken der Pipeline
  const { totalCount, totalVolume, wonVolume } = useMemo(() => {
    let count = 0;
    let volume = 0;
    let won = 0;
    for (const d of effectiveDeals) {
      count += 1;
      volume += d.amount || 0;
      if (d.stage.toLowerCase().includes('gewonnen')) {
        won += d.amount || 0;
      }
    }
    return { totalCount: count, totalVolume: volume, wonVolume: won };
  }, [effectiveDeals]);

  const isPartial = totalDeals !== undefined && totalCount < totalDeals;

  const handleMoveStage = useCallback(
    (dealId: string, newStage: string) => {
      setStageOverrides((prev) => ({
        ...prev,
        [dealId]: newStage,
      }));
      onDealStageChange?.(dealId, newStage);
    },
    [onDealStageChange],
  );

  return (
    <div className="flex flex-col gap-4 w-full min-w-0" data-testid="deals-kanban-board">
      {/* Pipeline Zusammenfassung */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-surface/70 text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-4 flex-wrap">
          <span>
            {isPartial
              ? `Pipeline-Volumen (Teilsumme: ${totalCount} von ${totalDeals} Deals):`
              : 'Pipeline-Volumen gesamt:'}{' '}
            <strong className="text-text font-mono font-bold text-sm">
              {totalVolume.toLocaleString('de-DE')} €
            </strong>
          </span>
          <span className="text-border">|</span>
          <span>
            Gewonnenes Volumen:{' '}
            <strong className="text-primary font-mono font-bold text-sm">
              {wonVolume.toLocaleString('de-DE')} €
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Aktive Deals im Board:{' '}
            <strong className="text-text font-semibold">
              {isPartial ? `${totalCount} von ${totalDeals}` : totalCount}
            </strong>
          </span>
          {hasMore && onLoadMore && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              data-testid="kanban-load-more-btn"
              className="h-7 text-xs px-2.5"
            >
              {isLoadingMore ? 'Lade nach…' : 'Weitere Deals nachladen'}
            </Button>
          )}
        </div>
      </div>

      {/* Horizontales Kanban-Spalten-Layout */}
      <div
        className="flex gap-3.5 overflow-x-auto pb-4 pt-1 w-full min-w-0 scrollbar-thin focus:outline-none"
        tabIndex={0}
        aria-label="Kanban Board Spalten"
      >
        {allStages.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={dealsByStage.get(stage) ?? []}
            allStages={allStages}
            onMoveStage={handleMoveStage}
            onDragStart={(id) => setActiveDragId(id)}
            onDragEnd={() => setActiveDragId(null)}
            activeDragId={activeDragId}
          />
        ))}
      </div>
    </div>
  );
}
