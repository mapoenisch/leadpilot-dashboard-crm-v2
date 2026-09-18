import React from 'react';
import type { CrmColumn } from './CrmResponsiveList';

export interface CrmMobileCardsProps<T = Record<string, unknown>> {
  columns: CrmColumn<T>[];
  rows: T[];
  caption: string;
  emptyText: string;
  getKey: (row: T, index: number) => string;
  cellValue: (row: object, key: string) => unknown;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
}

// 067J / G56: Mobil-DOM der CRM-Liste (semantische Kartenansicht).
// Wird nur unterhalb des Mobil-Breakpoints gerendert — nie parallel zur
// Tabellenansicht (Single-DOM-Vertrag, PR-A11Y-12).
export function CrmMobileCards<T extends object>({
  columns,
  rows,
  caption,
  emptyText,
  getKey,
  cellValue,
  renderMobileCard,
}: CrmMobileCardsProps<T>) {
  return (
    <div className="crm-v2-mobile-cards" role="region" aria-label={caption}>
      {rows.length === 0 ? (
        <div className="text-center border border-solid border-border-soft rounded-md bg-[rgba(12,28,24,0.5)] p-[var(--space-6)] text-[var(--color-text-muted)]">
          {emptyText}
        </div>
      ) : (
        rows.map((row, index) => {
          const key = getKey(row, index);
          if (renderMobileCard) {
            return <React.Fragment key={key}>{renderMobileCard(row, index)}</React.Fragment>;
          }

          // Fallback: automatische Standard-Karte aus Spalten
          const firstCol = columns[0];
          const otherCols = columns.slice(1);

          return (
            <div key={key} className="crm-v2-mobile-card">
              {firstCol && (
                <div className="crm-v2-mobile-card-header">
                  <div className="crm-v2-mobile-card-title">
                    {firstCol.render
                      ? firstCol.render(row)
                      : (cellValue(row, firstCol.key) as React.ReactNode)}
                  </div>
                </div>
              )}
              {otherCols.map((col) => (
                <div key={col.key} className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">{col.label}</span>
                  <span className="crm-v2-mobile-card-value">
                    {col.render ? col.render(row) : (cellValue(row, col.key) as React.ReactNode)}
                  </span>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
