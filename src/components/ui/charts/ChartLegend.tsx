import React from 'react';

export interface LegendItem {
  label: string;
  color: string;
  value?: number | string;
  sharePercent?: number;
  shape?: 'circle' | 'line' | 'dashed' | 'rect';
}

export interface ChartLegendProps {
  items: LegendItem[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  onItemHover?: (index: number | null) => void;
  style?: React.CSSProperties;
}

export function ChartLegend({
  items,
  orientation = 'horizontal',
  size = 'md',
  onItemHover,
  style,
}: ChartLegendProps) {
  const isHoriz = orientation === 'horizontal';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <div
      role="list"
      aria-label="Diagrammlegende"
      style={{
        display: 'flex',
        flexDirection: isHoriz ? 'row' : 'column',
        flexWrap: 'wrap',
        gap: isHoriz ? 'var(--space-3)' : '6px',
        alignItems: isHoriz ? 'center' : 'stretch',
        justifyContent: isHoriz ? 'center' : 'flex-start',
        fontSize,
        color: 'var(--color-text-muted)',
        ...style,
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          role="listitem"
          onMouseEnter={() => onItemHover?.(idx)}
          onMouseLeave={() => onItemHover?.(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
            cursor: onItemHover ? 'pointer' : 'default',
          }}
        >
          {/* Shape Icon */}
          {item.shape === 'line' ? (
            <span
              style={{
                width: '14px',
                height: '3px',
                background: item.color,
                borderRadius: '1px',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          ) : item.shape === 'dashed' ? (
            <span
              style={{
                width: '14px',
                height: '0px',
                borderTop: `2px dashed ${item.color}`,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          ) : item.shape === 'rect' ? (
            <span
              style={{
                width: '10px',
                height: '10px',
                background: item.color,
                borderRadius: '2px',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          ) : (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: item.color,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          )}

          <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>

          {item.value !== undefined && (
            <strong style={{ color: 'var(--color-text)', marginLeft: '2px' }}>
              {typeof item.value === 'number' ? item.value.toLocaleString('de-DE') : item.value}
            </strong>
          )}

          {item.sharePercent !== undefined && (
            <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', opacity: 0.8 }}>
              ({item.sharePercent.toFixed(0)}%)
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
