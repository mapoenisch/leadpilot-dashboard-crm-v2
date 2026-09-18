import React from 'react';
import type { CrmColumn } from './CrmResponsiveList';

export interface CrmDesktopTableProps<T = Record<string, unknown>> {
  columns: CrmColumn<T>[];
  rows: T[];
  caption: string;
  emptyText: string;
  getKey: (row: T, index: number) => string;
  cellValue: (row: object, key: string) => unknown;
}

// 067J / G56: Desktop-DOM der CRM-Liste (semantische HTML-Tabelle).
// Wird nur oberhalb des Mobil-Breakpoints gerendert — nie parallel zur
// Kartenansicht (Single-DOM-Vertrag, PR-A11Y-12).
export function CrmDesktopTable<T extends object>({
  columns,
  rows,
  caption,
  emptyText,
  getKey,
  cellValue,
}: CrmDesktopTableProps<T>) {
  return (
    <div className="crm-v2-desktop-table">
      <table className="crm-v2-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              // G39 Welle 2: Spaltenbreiten-Prop entfernt (0 Aufrufer per
              // Suche) — keine Laufzeit-Geometrie nötig, kein style-Prop.
              <th key={col.key} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center p-[var(--space-6)] text-[var(--color-text-muted)]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={getKey(row, index)}>
                {columns.map((col) => (
                  <td key={col.key}>
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
