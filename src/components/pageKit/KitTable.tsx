import type { ReactNode } from 'react';

// Auftrag 068 / G66: Gestaltete Datentabelle der Inhaltsseiten — Kopfzeile in
// Versalien, erste Spalte optional in Markenfarbe, Summenzeilen hervorgehoben,
// Zellen dürfen Chips enthalten. Bleibt eine echte <table> (G52–G55-Semantik).
export interface KitColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  /** Zellen dieser Spalte in Markenfarbe (z. B. Plan-Spalte). */
  emphasis?: 'plan' | 'strong';
}

export interface KitTableProps {
  columns: KitColumn[];
  rows: Array<Record<string, ReactNode>>;
  caption: string;
  /** Indizes der Summen-/Kernzeilen. */
  highlightRows?: number[];
  /** Erste Spalte in Markenfarbe (Kanal-, Kunden-, Positionsnamen). */
  leadColumn?: boolean;
}

export function KitTable({
  columns,
  rows,
  caption,
  highlightRows = [],
  leadColumn = false,
}: KitTableProps) {
  return (
    <div className="pk-table-wrap">
      <table className="pk-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" data-align={column.align}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              data-highlight={highlightRows.includes(rowIndex) ? 'true' : undefined}
            >
              {columns.map((column, columnIndex) => (
                <td
                  key={column.key}
                  data-align={column.align}
                  data-emphasis={column.emphasis}
                  data-lead={leadColumn && columnIndex === 0 ? 'true' : undefined}
                >
                  {row[column.key] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
