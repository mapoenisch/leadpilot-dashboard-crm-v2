import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'cyan' | 'orange' | 'neutral' | 'mint' | 'red';
export type BadgeSize = 'md' | 'sm';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

const badgeVariants = cva(
  'inline-flex items-center gap-[5px] bg-background-deep border border-solid rounded-full font-body font-semibold uppercase tracking-[0.05em]',
  {
    variants: {
      variant: {
        cyan: 'border-primary text-primary',
        orange: 'border-accent text-accent',
        neutral: 'border-border text-[var(--color-text-muted)]',
        mint: 'border-success text-success',
        red: 'border-error text-error',
      },
      // G39 Welle 2 (Auftrag 055, Block A): sm deckt die häufigsten
      // Aufrufer-Overrides ab (padding 2px 8px / 9.5px in liveKpi/*).
      // Bestehende Passthrough-Stellen bleiben unangetastet (optional).
      size: {
        md: 'px-[12px] py-[4px] text-[11px]',
        sm: 'px-[8px] py-[2px] text-[9.5px]',
      },
    },
    defaultVariants: {
      variant: 'cyan',
      size: 'md',
    },
  },
);

export function Badge({ variant = 'cyan', size = 'md', children, icon, style }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }))}
      // Ausnahme (G38-Entscheidung, Marc): style-Passthrough bleibt, weil 13
      // Konsumenten Overrides übergeben (API + Pixel identisch). Die
      // eslint-disable-next-line react/forbid-dom-props -- Passthrough des Aufrufer-style-Props, siehe Auftrag 053 Entscheidung 5
      style={style}
    >
      {icon}
      {children}
    </span>
  );
}
