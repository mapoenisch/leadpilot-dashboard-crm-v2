import React from 'react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
}

const VARIANTS = {
  info: { bg: 'rgba(0, 217, 198, 0.08)', border: 'var(--color-primary)', color: 'var(--color-primary)' },
  success: { bg: 'rgba(61, 220, 151, 0.08)', border: 'var(--color-success)', color: 'var(--color-success)' },
  warning: { bg: 'rgba(255, 122, 61, 0.08)', border: 'var(--color-warning)', color: 'var(--color-warning)' },
  error: { bg: 'rgba(255, 90, 95, 0.08)', border: 'var(--color-error)', color: 'var(--color-error)' },
};

export function Alert({ variant = 'info', title, children }: AlertProps) {
  const v = VARIANTS[variant] || VARIANTS.info;
  return (
    <div
      style={{
        background: v.bg,
        border: '1px solid var(--color-border-soft)',
        borderLeft: `4px solid ${v.border}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        color: 'var(--color-text)',
        fontSize: '13.5px',
      }}
    >
      {title && (
        <div style={{ fontWeight: 600, color: v.color, marginBottom: '4px' }}>
          {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
