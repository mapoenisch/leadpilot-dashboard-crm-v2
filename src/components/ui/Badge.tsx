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
  /** Aufrufer-Overrides (tailwind-merge: letzter gewinnt). Kein style-Prop, siehe Issue #7. */
  className?: string;
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

export function Badge({ variant = 'cyan', size = 'md', children, icon, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)}>
      {icon}
      {children}
    </span>
  );
}
