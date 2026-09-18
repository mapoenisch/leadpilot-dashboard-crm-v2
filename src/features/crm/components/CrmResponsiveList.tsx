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
}

function cellValue(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

// 067J / G56: Genau ein Responsive-DOM pro Datensatz (PR-A11Y-12) —
// Viewport-gesteuert entweder Tabelle (Desktop) oder Karten (mobil),
// nie beide gleichzeitig im DOM.
export function CrmResponsiveList<T extends object>({
  columns,
  rows,
  caption,
  emptyText = 'Keine Einträge vorhanden',
  keyExtractor,
  renderMobileCard,
}: CrmResponsiveListProps<T>) {
  const isMobile = useIsMobileViewport();

  const getKey = (row: T, index: number): string => {
    if (keyExtractor) return keyExtractor(row, index);
    if (cellValue(row, 'id')) return String(cellValue(row, 'id') as string | number);
    return `row-${index}`;
  };

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
    </div>
  );
}
