import React from 'react';
import { Icon } from '../Icon';

export interface ChartEmptyStateProps {
  title?: string;
  message: string;
  requirement?: string;
  currentCount?: number;
  minRequired?: number;
  iconName?: string;
  style?: React.CSSProperties;
}

export function ChartEmptyState({
  title = 'Noch keine ausreichende Datenbasis',
  message,
  requirement,
  currentCount,
  minRequired,
  iconName = 'trendingUp',
  style,
}: ChartEmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-6) var(--space-4)',
        background: 'var(--color-bg-deep)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--color-border)',
        color: 'var(--color-text-muted)',
        gap: 'var(--space-2)',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary)',
          marginBottom: '2px',
        }}
      >
        <Icon name={iconName} size={18} />
      </div>

      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)' }}>
        {title}
      </div>

      <div style={{ fontSize: '12px', maxWidth: '380px', lineHeight: 1.4 }}>
        {message}
      </div>

      {(currentCount !== undefined || requirement) && (
        <div
          style={{
            marginTop: '6px',
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-soft)',
            fontSize: '11px',
            color: 'var(--color-primary)',
            fontWeight: 500,
          }}
        >
          {requirement || (minRequired ? `Status: ${currentCount} von ${minRequired} Läufen ausgeführt` : `Aktuell: ${currentCount} Läufe`)}
        </div>
      )}
    </div>
  );
}
