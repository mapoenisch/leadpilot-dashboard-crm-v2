import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

export interface TableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  rows: T[];
  emptyText?: string;
  minWidth?: string;
}

// minWidth ist ein offener String-Prop: alle im Repo vorkommenden Werte sind
// als Variante abgebildet (Fallback = Default) — kein style-Attribut nötig.
const tableVariants = cva('w-full border-collapse font-body text-[13px]', {
  variants: {
    minWidth: {
      '500px': 'min-w-[500px]',
      '550px': 'min-w-[550px]',
      '650px': 'min-w-[650px]',
    },
  },
  defaultVariants: {
    minWidth: '500px',
  },
});

function cellValue(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function Table<T extends object>({
  columns = [],
  rows = [],
  emptyText = 'Keine Einträge vorhanden',
  minWidth,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <table
        className={cn(
          tableVariants({
            minWidth:
              minWidth === '550px' || minWidth === '650px' ? minWidth : '500px',
          })
        )}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="text-left px-4 py-[10px] text-[var(--color-text-muted)] font-semibold text-[11px] uppercase tracking-[0.05em] border-b border-solid border-border whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-5 text-center text-[var(--color-text-muted)]">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={(cellValue(row, 'id') as string | number | undefined) || i}
                className="border-b border-solid border-[var(--color-border-soft)] transition-[background_150ms_ease]"
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-text whitespace-nowrap">
                    {col.render ? col.render(row) : (cellValue(row, col.key) as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
