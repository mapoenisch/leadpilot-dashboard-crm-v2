import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type StatusChipVariant = 'cyan' | 'orange' | 'mint' | 'neutral';

export interface StatusChipProps {
  variant?: StatusChipVariant;
  label: string;
  icon?: React.ReactNode;
  pulse?: boolean;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

const VARIANTS: Record<
  StatusChipVariant,
  { border: string; color: string; bg: string; dot: string }
> = {
  cyan: {
    border: 'var(--color-primary)',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-soft)',
    dot: 'var(--color-primary)',
  },
  orange: {
    border: 'var(--color-accent)',
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-soft)',
    dot: 'var(--color-accent)',
  },
  mint: {
    border: 'var(--color-success)',
    color: 'var(--color-success)',
    bg: 'var(--color-success-soft)',
    dot: 'var(--color-success)',
  },
  neutral: {
    border: 'var(--color-border)',
    color: 'var(--color-text-muted)',
    bg: 'rgba(255, 255, 255, 0.03)',
    dot: 'var(--color-text-muted)',
  },
};


export function StatusChip({
  variant = 'neutral',
  label,
  icon,
  pulse = false,
  size = 'md',
  style,
}: StatusChipProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldPulse = pulse && !prefersReducedMotion;
  const v = VARIANTS[variant] || VARIANTS.neutral;
  const pad = size === 'sm' ? '3px 8px' : '4px 10px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
        borderRadius: 'var(--radius-full)',
        padding: pad,
        fontSize,
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {shouldPulse ? (
        <span
          className="pulse-live"
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: v.dot,
            display: 'inline-block',
          }}
        />
      ) : icon ? (
        icon
      ) : (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: v.dot,
            display: 'inline-block',
          }}
        />
      )}
      <span>{label}</span>
    </span>
  );
}
