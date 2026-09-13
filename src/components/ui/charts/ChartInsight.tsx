import React from 'react';
import { Icon } from '../Icon';

export interface ChartInsightProps {
  type?: 'positive' | 'warning' | 'neutral';
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function ChartInsight({ type = 'neutral', title, children, style }: ChartInsightProps) {
  const isPos = type === 'positive';
  const isWarn = type === 'warning';

  const color = isPos
    ? 'var(--color-primary)'
    : isWarn
      ? 'var(--color-warning)'
      : 'var(--color-text-muted)';
  const bg = isPos
    ? 'rgba(0, 217, 198, 0.06)'
    : isWarn
      ? 'rgba(255, 122, 61, 0.06)'
      : 'rgba(255, 255, 255, 0.02)';
  const border = isPos
    ? '1px solid rgba(0, 217, 198, 0.2)'
    : isWarn
      ? '1px solid rgba(255, 122, 61, 0.2)'
      : '1px solid var(--color-border-soft)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        background: bg,
        border,
        fontSize: '12px',
        color: 'var(--color-text)',
        lineHeight: 1.4,
        ...style,
      }}
    >
      <div style={{ color, flexShrink: 0, marginTop: '1px' }}>
        <Icon name={isPos ? 'trendingUp' : isWarn ? 'alertTriangle' : 'info'} size={14} />
      </div>

      <div>
        {title && <strong style={{ color, marginRight: '4px' }}>{title}:</strong>}
        <span style={{ color: 'var(--color-text-muted)' }}>{children}</span>
      </div>
    </div>
  );
}
