import React from 'react';
import { useIsMobileViewport } from '@/hooks/useIsMobileViewport';
import { CrmDesktopTable } from './CrmDesktopTable';
import { CrmMobileCards } from './CrmMobileCards';

export interface CrmColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

export interface CrmResponsiveListProps<T = Record<string, unknown>> {
  columns: CrmColumn<T>[];
  rows: T[];
  caption: string;
  emptyText?: string;
  keyExtractor?: (row: T, index: number) => string;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

function cellValue(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

// 067J / G56: Genau ein Responsive-DOM pro Datensatz (PR-A11Y-12) —
// Viewport-gesteuert entweder Tabelle (Desktop) oder Karten (mobil),
// nie beide gleichzeitig im DOM.
// G60 (067N): Ergänzung um serverseitig gesteuerte Paginierung.
export function CrmResponsiveList<T extends object>({
  columns,
  rows,
  caption,
  emptyText = 'Keine Einträge vorhanden',
  keyExtractor,
  renderMobileCard,
  page,
  pageSize = 20,
  total,
  onPageChange,
  onPageSizeChange,
}: CrmResponsiveListProps<T>) {
  const isMobile = useIsMobileViewport();

  const getKey = (row: T, index: number): string => {
    if (keyExtractor) return keyExtractor(row, index);
    if (cellValue(row, 'id')) return String(cellValue(row, 'id') as string | number);
    return `row-${index}`;
  };

  const hasPagination = page !== undefined && total !== undefined;
  const totalPages = hasPagination ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div className="crm-v2-list-root w-full min-w-0">
      {isMobile ? (
        <CrmMobileCards
          columns={columns}
          rows={rows}
          caption={caption}
          emptyText={emptyText}
          getKey={getKey}
          cellValue={cellValue}
          renderMobileCard={renderMobileCard}
        />
      ) : (
        <CrmDesktopTable
          columns={columns}
          rows={rows}
          caption={caption}
          emptyText={emptyText}
          getKey={getKey}
          cellValue={cellValue}
        />
      )}

      {hasPagination && (
        <nav
          aria-label="Paginierung"
          className="crm-v2-pagination flex items-center justify-between flex-wrap gap-[var(--space-3)] p-[var(--space-4)] border-t border-[var(--color-border)] text-[13px] text-text"
        >
          <div className="text-[var(--color-text-muted)]" aria-live="polite">
            Seite <strong className="text-text">{page}</strong> von{' '}
            <strong className="text-text">{totalPages}</strong> ({total}{' '}
            {total === 1 ? 'Eintrag' : 'Einträge'})
          </div>

          <div className="flex items-center gap-[var(--space-3)] flex-wrap">
            {onPageSizeChange && (
              <div className="flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
                <label htmlFor="crm-page-size-select">Zeilen:</label>
                <select
                  id="crm-page-size-select"
                  aria-label="Zeilen pro Seite"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-0.5 text-text text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={1}>1</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Vorherige Seite"
                disabled={page <= 1}
                onClick={() => onPageChange?.(page - 1)}
                className="px-2.5 py-1 rounded text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)] text-text hover:bg-[var(--color-surface-hover,rgba(255,255,255,0.06))] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Zurück
              </button>
              <button
                type="button"
                aria-label="Nächste Seite"
                disabled={page >= totalPages}
                onClick={() => onPageChange?.(page + 1)}
                className="px-2.5 py-1 rounded text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)] text-text hover:bg-[var(--color-surface-hover,rgba(255,255,255,0.06))] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Weiter
              </button>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
