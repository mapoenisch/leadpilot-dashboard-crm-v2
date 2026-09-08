import React from 'react';

export interface Column<T = any> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  columns: Column<T>[];
  rows: T[];
  emptyText?: string;
  minWidth?: string;
}

export function Table<T extends Record<string, any>>({
  columns = [],
  rows = [],
  emptyText = 'Keine Einträge vorhanden',
  minWidth,
}: TableProps<T>) {
  return (
    <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', minWidth: minWidth || '500px', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: '13px' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{
                  textAlign: 'left',
                  padding: '10px var(--space-4)',
                  color: 'var(--color-text-muted)',
                  fontWeight: 600,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid var(--color-border)',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr 
                key={row.id || i} 
                style={{ 
                  borderBottom: '1px solid var(--color-border-soft)',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                    {col.render ? col.render(row) : row[col.key]}
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
