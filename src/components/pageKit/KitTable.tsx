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
  /** Indizes orange hervorgehobener Zeilen (LeadPilot selbst). */
  accentRows?: number[];
  /** Erste Spalte in Markenfarbe (Kanal-, Kunden-, Positionsnamen). */
  leadColumn?: boolean;
  /** Fließtext-Tabelle: lange Wörter umbrechen statt seitlich zu scrollen. */
  wrapText?: boolean;
}

export function KitTable({
  columns,
  rows,
  caption,
  highlightRows = [],
  accentRows = [],
  leadColumn = false,
  wrapText = false,
}: KitTableProps) {
  const mark = (index: number) =>
    accentRows.includes(index) ? 'accent' : highlightRows.includes(index) ? 'true' : undefined;
  return (
    // Auf schmalen Breiten scrollt die Tabelle seitlich: per Tastatur
    // erreichbar und als benannter Bereich (axe scrollable-region-focusable).
    <div className="pk-table-wrap" role="region" aria-label={caption} tabIndex={0}>
      <table className="pk-table" data-wrap={wrapText ? 'true' : undefined}>
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
            <tr key={rowIndex} data-highlight={mark(rowIndex)}>
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
