import React from 'react';

export interface CrmColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
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

export function CrmResponsiveList<T extends object>({
  columns,
  rows,
  caption,
  emptyText = 'Keine Einträge vorhanden',
  keyExtractor,
  renderMobileCard,
}: CrmResponsiveListProps<T>) {
  const getKey = (row: T, index: number): string => {
    if (keyExtractor) return keyExtractor(row, index);
    if (cellValue(row, 'id')) return String(cellValue(row, 'id') as string | number);
    return `row-${index}`;
  };

  return (
    <div className="crm-v2-list-root" style={{ width: '100%', minWidth: 0 }}>
      {/* 1. Desktop & Tablet semantische HTML-Tabelle */}
      <div className="crm-v2-desktop-table">
        <table className="crm-v2-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                >
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
                  style={{
                    padding: 'var(--space-6)',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                  }}
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

      {/* 2. Mobile semantische DOM-Kartenansicht */}
      <div className="crm-v2-mobile-cards" role="region" aria-label={caption}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              background: 'rgba(12, 28, 24, 0.5)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-soft)',
            }}
          >
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
                      {firstCol.render ? firstCol.render(row) : (cellValue(row, firstCol.key) as React.ReactNode)}
                    </div>
                  </div>
                )}
                {otherCols.map((col) => (
                  <div key={col.key} className="crm-v2-mobile-card-row">
                    <span className="crm-v2-mobile-card-label">{col.label}</span>
                    <span className="crm-v2-mobile-card-value">
                      {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
