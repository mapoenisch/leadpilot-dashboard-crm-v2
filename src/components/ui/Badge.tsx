import React from 'react';

export type BadgeVariant = 'cyan' | 'orange' | 'neutral' | 'mint' | 'red';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

const VARIANTS: Record<BadgeVariant, { border: string; color: string; bg?: string }> = {
  cyan: { border: 'var(--color-primary)', color: 'var(--color-primary)' },
  orange: { border: 'var(--color-accent)', color: 'var(--color-accent)' },
  neutral: { border: 'var(--color-border)', color: 'var(--color-text-muted)' },
  mint: { border: 'var(--color-success)', color: 'var(--color-success)' },
  red: { border: 'var(--color-error)', color: 'var(--color-error)' },
};

export function Badge({ variant = 'cyan', children, icon, style }: BadgeProps) {
  const v = VARIANTS[variant] || VARIANTS.cyan;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: 'var(--color-bg-deep)',
        border: `1px solid ${v.border}`,
        color: v.color,
        borderRadius: 'var(--radius-full)',
        padding: '4px 12px',
        fontSize: '11px',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}
