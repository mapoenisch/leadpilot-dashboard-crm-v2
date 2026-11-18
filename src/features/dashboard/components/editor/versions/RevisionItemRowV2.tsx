// Executive Dashboard V2 (Auftrag 165 / P12):
// Einzelne Revisionszeile im Versionsbereich.

import { Clock, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { DashboardV2RevisionPageItem } from '../../../services/dashboardStorageV2Types';
import { DASHBOARD_VERSION_MESSAGES } from '../../../model/dashboardVersionMessages';
import { formatRevisionAuthor, formatRevisionDate } from './useRevisionHistory';

export interface RevisionItemRowV2Props {
  rev: DashboardV2RevisionPageItem;
  isCurrent: boolean;
  isSelected: boolean;
  selectMode: boolean;
  isFallbackMode: boolean;
  canWrite: boolean;
  onToggleSelect: () => void;
  onCompareWithCurrent: () => void;
  onExport: () => void;
  onRestore: () => void;
}

export function RevisionItemRowV2({
  rev,
  isCurrent,
  isSelected,
  selectMode,
  isFallbackMode,
  canWrite,
  onToggleSelect,
  onCompareWithCurrent,
  onExport,
  onRestore,
}: RevisionItemRowV2Props) {
  const { relative, absolute } = formatRevisionDate(rev.createdAt);
  const authorStr = formatRevisionAuthor(rev);

  const content = (
    <>
      {/* Kopf: Revision-Nummer, Badge, Datum */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white">Revision {rev.revision}</span>
          {isCurrent && (
            <span data-testid="current-revision-badge">
              <Badge
                variant="neutral"
                className="border-primary/40 bg-primary/15 text-primary text-[10px] py-0 px-1.5"
              >
                {DASHBOARD_VERSION_MESSAGES.currentBadge}
              </Badge>
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]"
          title={absolute}
        >
          <Clock className="h-3 w-3" />
          <span>{relative}</span>
        </div>
      </div>

      {/* Autor & Änderungshinweis */}
      <div className="text-xs space-y-0.5">
        <div className="text-[var(--color-text-muted)]">
          <span>Autor: </span>
          <span
            className={cn(
              'text-[var(--color-text-soft)]',
              rev.createdByActive === false && 'italic text-amber-300',
            )}
          >
            {authorStr}
          </span>
        </div>
        {rev.changeSummary && (
          <div className="text-[11px] text-[var(--color-text-soft)] italic line-clamp-2">
            „{rev.changeSummary}“
          </div>
        )}
      </div>
    </>
  );

  if (selectMode) {
    return (
      <button
        type="button"
        data-testid={`revision-item-${rev.revision}`}
        onClick={onToggleSelect}
        className={cn(
          'w-full text-left rounded border border-[var(--color-border,#1b3d39)] bg-black/20 p-3 space-y-2 transition-colors cursor-pointer hover:border-primary',
          isSelected && 'border-primary bg-primary/10',
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      data-testid={`revision-item-${rev.revision}`}
      className="rounded border border-[var(--color-border,#1b3d39)] bg-black/20 p-3 space-y-2 transition-colors"
    >
      {content}

      {/* Aktionen je Eintrag */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--color-border,#1b3d39)]/50">
        {!isFallbackMode && (
          <button
            type="button"
            data-testid={`compare-revision-${rev.revision}`}
            onClick={onCompareWithCurrent}
            className="text-[11px] text-primary hover:underline"
          >
            Mit aktuellem Stand vergleichen
          </button>
        )}

        {(!isFallbackMode || isCurrent) && (
          <button
            type="button"
            data-testid={`export-revision-${rev.revision}`}
            onClick={onExport}
            className="text-[11px] text-[var(--color-text-muted)] hover:text-white"
          >
            Exportieren
          </button>
        )}

        {canWrite && !isCurrent && (
          <button
            type="button"
            data-testid={`restore-revision-${rev.revision}`}
            onClick={onRestore}
            className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5 ml-auto"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Wiederherstellen</span>
          </button>
        )}
      </div>
    </div>
  );
}
